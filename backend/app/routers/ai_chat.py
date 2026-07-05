"""
AI chat endpoint — uses Claude to answer questions about a case.
Fetches case context (details, client, processes, tasks, hours) and passes it
to the Anthropic API along with the conversation history.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.utils.auth import get_current_user
from app.utils.responses import success_response
from app.config import settings
from app.models import User, Case, Task, CaseHours, CaseClient, Client
from app.models.process import CaseProcess

router = APIRouter(tags=["IA"])

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL = "claude-haiku-4-5-20251001"


async def _build_case_context(case_id: str, law_firm_id: str, db: AsyncSession) -> str:
    """Fetch case data and format it as context for the AI."""
    case_result = await db.execute(
        select(Case).where(
            and_(Case.id == case_id, Case.law_firm_id == law_firm_id, Case.is_deleted == False)
        )
    )
    caso = case_result.scalar_one_or_none()
    if not caso:
        return ""

    lines = [
        f"PROCESO: {caso.title}",
        f"Estado: {caso.status}",
        f"Descripción: {caso.description or 'Sin descripción'}",
        f"Fecha apertura: {caso.opened_date.date() if caso.opened_date else 'N/A'}",
        f"Fecha vencimiento: {caso.due_date.date() if caso.due_date else 'Sin fecha'}",
        f"Tipo de facturación: {caso.tipo_facturacion or 'No definido'}",
        f"Prioridad: {caso.priority}",
    ]
    if caso.plaintiff:
        lines.append(f"Demandante: {caso.plaintiff}")
    if caso.defendant:
        lines.append(f"Demandado: {caso.defendant}")
    if caso.court_name:
        lines.append(f"Juzgado: {caso.court_name}")

    # Clients via CaseClient join
    client_result = await db.execute(
        select(Client)
        .join(CaseClient, CaseClient.client_id == Client.id)
        .where(and_(CaseClient.case_id == case_id, CaseClient.is_deleted == False))
    )
    clients = client_result.scalars().all()
    if clients:
        client_names = ", ".join(
            c.organization_name or c.name for c in clients
        )
        lines.append(f"Cliente(s): {client_names}")

    # Subprocesses
    proc_result = await db.execute(
        select(CaseProcess).where(
            and_(CaseProcess.case_id == case_id, CaseProcess.is_deleted == False)
        )
    )
    processes = proc_result.scalars().all()
    if processes:
        lines.append(f"\nSUBPROCESOS ({len(processes)}):")
        for p in processes:
            lines.append(f"  - {p.titulo} [{p.status}]")

    # Tasks
    task_result = await db.execute(
        select(Task).where(
            and_(Task.case_id == case_id, Task.is_deleted == False)
        ).order_by(Task.due_date)
    )
    tasks = task_result.scalars().all()
    if tasks:
        pending = [t for t in tasks if t.status not in ("completado", "done", "cancelled", "cancelado")]
        done_count = len([t for t in tasks if t.status in ("completado", "done")])
        lines.append(f"\nTAREAS: {len(tasks)} total, {len(pending)} pendientes, {done_count} completadas")
        if pending:
            lines.append("Tareas pendientes:")
            for t in pending[:10]:
                due = f" | Vence: {t.due_date.date()}" if t.due_date else ""
                lines.append(f"  - [{t.status}] {t.title}{due}")

    # Hours summary
    hours_result = await db.execute(
        select(CaseHours).where(
            and_(CaseHours.case_id == case_id, CaseHours.is_deleted == False)
        )
    )
    hours = hours_result.scalars().all()
    if hours:
        total_h = sum(h.hours or 0 for h in hours)
        total_amt = sum(h.total_amount or 0 for h in hours)
        lines.append(f"\nHORAS REGISTRADAS: {total_h:.1f} h — Total facturado: S/ {total_amt:,.2f}")

    return "\n".join(lines)


@router.post("/cases/{case_id}/ai/chat")
async def ai_chat(
    case_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="IA no configurada (falta ANTHROPIC_API_KEY)")

    message = (body.get("message") or "").strip()
    history = body.get("history") or []

    if not message:
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío")

    context = await _build_case_context(case_id, str(current_user.law_firm_id), db)
    if not context:
        raise HTTPException(status_code=404, detail="Proceso no encontrado")

    system_prompt = (
        "Eres un asistente legal que trabaja para el estudio Katarzyna. "
        "Respondes siempre en español, en tono profesional pero conversacional, como si hablaras directamente con el abogado. "
        "Sé directo y conciso. No uses encabezados, títulos, guiones de lista ni ningún símbolo de formato (nada de #, **, -, *). "
        "Escribe en párrafos cortos y naturales, como en una conversación. "
        "Si necesitas enumerar cosas, hazlo dentro del párrafo separando con comas o 'y'. "
        "Tienes acceso al contexto del proceso legal actual y lo usas para dar respuestas precisas. "
        "Si te preguntan sobre derecho peruano, responde con conocimiento general pero aclara cuando algo requiere verificación específica.\n\n"
        f"CONTEXTO DEL PROCESO ACTUAL:\n{context}"
    )

    messages = [*history, {"role": "user", "content": message}]

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": CLAUDE_MODEL,
                "max_tokens": 1024,
                "system": system_prompt,
                "messages": messages,
            },
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Error de la IA: {resp.text}")

    data = resp.json()
    reply = data["content"][0]["text"]

    return success_response(data={"reply": reply})
