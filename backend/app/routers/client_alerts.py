"""
Alertas personalizadas por cliente — recordatorios con envío por email.
"""

from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.utils.responses import success_response, paginated_response
from app.utils.auth import get_current_user
from app.models import User, Client
from app.models.client_alert import ClientAlertRule

router = APIRouter()


def _fmt(rule: ClientAlertRule, users_map: dict | None = None) -> dict:
    destinatarios = rule.destinatarios or []
    destinatarios_info = []
    if users_map:
        for uid in destinatarios:
            u = users_map.get(str(uid))
            if u:
                destinatarios_info.append({"id": str(u.id), "nombre": f"{u.first_name} {u.last_name}".strip(), "email": u.email})
    return {
        "id": str(rule.id),
        "clientId": str(rule.client_id),
        "titulo": rule.titulo,
        "descripcion": rule.descripcion,
        "fecha": rule.fecha.isoformat() if rule.fecha else None,
        "esAnual": rule.es_anual,
        "diasAnticipacion": rule.dias_anticipacion,
        "destinatarios": destinatarios,
        "destinatariosInfo": destinatarios_info,
        "isActive": rule.is_active,
        "createdAt": rule.created_at.isoformat() if rule.created_at else None,
        "updatedAt": rule.updated_at.isoformat() if rule.updated_at else None,
    }


async def _get_client_or_404(client_id: str, user: User, db: AsyncSession) -> Client:
    client = await db.get(Client, client_id)
    if not client or client.is_deleted or client.law_firm_id != user.law_firm_id:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client


@router.get("/clients/{client_id}/alert-rules", response_model=dict)
async def list_alert_rules(
    client_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, current_user, db)

    result = await db.execute(
        select(ClientAlertRule).where(
            and_(
                ClientAlertRule.client_id == client_id,
                ClientAlertRule.law_firm_id == current_user.law_firm_id,
                ClientAlertRule.is_deleted == False,
            )
        ).order_by(ClientAlertRule.fecha.asc())
    )
    rules = result.scalars().all()

    # Load users for destinatarios
    all_user_ids = set()
    for r in rules:
        for uid in (r.destinatarios or []):
            all_user_ids.add(uid)

    users_map: dict = {}
    if all_user_ids:
        u_result = await db.execute(
            select(User).where(User.id.in_(all_user_ids), User.is_deleted == False)
        )
        for u in u_result.scalars().all():
            users_map[str(u.id)] = u

    data = [_fmt(r, users_map) for r in rules]
    return paginated_response(data=data, total=len(data), page=1, pages=1, limit=100, meta={})


@router.post("/clients/{client_id}/alert-rules", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_alert_rule(
    client_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, current_user, db)

    titulo = (body.get("titulo") or "").strip()
    if not titulo:
        raise HTTPException(status_code=422, detail="El título es obligatorio")

    fecha_raw = body.get("fecha")
    if not fecha_raw:
        raise HTTPException(status_code=422, detail="La fecha es obligatoria")
    try:
        fecha = date.fromisoformat(str(fecha_raw))
    except ValueError:
        raise HTTPException(status_code=422, detail="Formato de fecha inválido (YYYY-MM-DD)")

    rule = ClientAlertRule(
        law_firm_id=current_user.law_firm_id,
        client_id=client_id,
        titulo=titulo,
        descripcion=body.get("descripcion") or None,
        fecha=fecha,
        es_anual=bool(body.get("esAnual", False)),
        dias_anticipacion=int(body.get("diasAnticipacion", 1)),
        destinatarios=body.get("destinatarios") or [],
        is_active=True,
        is_deleted=False,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return success_response(data=_fmt(rule), meta={})


@router.patch("/clients/{client_id}/alert-rules/{rule_id}", response_model=dict)
async def update_alert_rule(
    client_id: str,
    rule_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, current_user, db)

    rule = await db.get(ClientAlertRule, rule_id)
    if not rule or rule.is_deleted or str(rule.client_id) != client_id:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    if "titulo" in body and body["titulo"]:
        rule.titulo = body["titulo"].strip()
    if "descripcion" in body:
        rule.descripcion = body["descripcion"] or None
    if "fecha" in body and body["fecha"]:
        rule.fecha = date.fromisoformat(str(body["fecha"]))
    if "esAnual" in body:
        rule.es_anual = bool(body["esAnual"])
    if "diasAnticipacion" in body:
        rule.dias_anticipacion = int(body["diasAnticipacion"])
    if "destinatarios" in body:
        rule.destinatarios = body["destinatarios"] or []
    if "isActive" in body:
        rule.is_active = bool(body["isActive"])

    rule.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(rule)
    return success_response(data=_fmt(rule), meta={})


@router.delete("/clients/{client_id}/alert-rules/{rule_id}", response_model=dict)
async def delete_alert_rule(
    client_id: str,
    rule_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_client_or_404(client_id, current_user, db)

    rule = await db.get(ClientAlertRule, rule_id)
    if not rule or rule.is_deleted or str(rule.client_id) != client_id:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    rule.is_deleted = True
    rule.deleted_at = datetime.utcnow()
    await db.commit()
    return success_response(data={"deleted": True}, meta={})
