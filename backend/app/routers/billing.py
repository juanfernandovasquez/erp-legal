"""
Billing endpoints for process-level billing summaries and adjustments.
"""

import io
import uuid as uuid_module
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.utils.responses import success_response
from app.utils.auth import get_current_user
from app.models import User, CaseProcess, Task
from app.models.task import CaseHours
from app.models.billing import BillingAdjustment
from app.models.case import Case, CaseClient
from app.models.client import Client
from app.models.law_firm import LawFirm
from app.models.user import User as UserModel

router = APIRouter(tags=["Facturación"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _format_adjustment(adj: BillingAdjustment) -> dict:
    return {
        "id": str(adj.id),
        "procesoId": str(adj.process_id),
        "nombre": adj.nombre,
        "descripcion": adj.descripcion,
        "monto": float(adj.monto),
        "createdAt": adj.created_at.isoformat() if adj.created_at else None,
        "updatedAt": adj.updated_at.isoformat() if adj.updated_at else None,
    }


async def _get_process_or_404(
    db: AsyncSession, process_id: str, law_firm_id: uuid_module.UUID
) -> CaseProcess:
    try:
        proc_uuid = uuid_module.UUID(process_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Proceso no encontrado")

    proc = await db.get(CaseProcess, proc_uuid)
    if not proc or proc.is_deleted or proc.law_firm_id != law_firm_id:
        raise HTTPException(status_code=404, detail="Proceso no encontrado")
    return proc


async def _compute_subtotal_horas(
    db: AsyncSession, proc: CaseProcess
) -> float:
    """
    For 'por_horas' processes: SUM(case_hours.total_amount) via tasks.
    For 'plana' processes: return the flat tarifa.
    For NULL tipo_tarifa: SUM hours-based total.
    """
    if proc.tipo_tarifa == "plana":
        return float(proc.tarifa) if proc.tarifa is not None else 0.0

    # por_horas or null: aggregate from case_hours via tasks
    result = await db.execute(
        select(func.coalesce(func.sum(CaseHours.total_amount), 0))
        .join(Task, CaseHours.task_id == Task.id)
        .where(
            and_(
                Task.process_id == proc.id,
                Task.is_deleted == False,
                CaseHours.is_deleted == False,
            )
        )
    )
    return float(result.scalar() or 0)


async def _load_adjustments(
    db: AsyncSession, proc_id: uuid_module.UUID
) -> list[BillingAdjustment]:
    result = await db.execute(
        select(BillingAdjustment).where(
            and_(
                BillingAdjustment.process_id == proc_id,
                BillingAdjustment.is_deleted == False,
            )
        ).order_by(BillingAdjustment.created_at.asc())
    )
    return result.scalars().all()


# ── GET /processes/{process_id}/billing ──────────────────────────────────────

@router.get(
    "/processes/{process_id}/billing",
    response_model=dict,
    summary="Resumen de facturación de un proceso",
)
async def get_billing_summary(
    process_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    proc = await _get_process_or_404(db, process_id, current_user.law_firm_id)

    subtotal = await _compute_subtotal_horas(db, proc)
    adjustments = await _load_adjustments(db, proc.id)

    total_ajustes = sum(float(a.monto) for a in adjustments)
    total_final = round(subtotal + total_ajustes, 2)

    return success_response(
        data={
            "procesoId": str(proc.id),
            "subtotalHoras": round(subtotal, 2),
            "ajustes": [_format_adjustment(a) for a in adjustments],
            "totalAjustes": round(total_ajustes, 2),
            "totalFinal": total_final,
            "moneda": proc.moneda or "PEN",
            "tipoTarifa": proc.tipo_tarifa,
        },
        meta={},
    )


# ── POST /processes/{process_id}/billing/adjustments ─────────────────────────

@router.post(
    "/processes/{process_id}/billing/adjustments",
    response_model=dict,
    status_code=201,
    summary="Crear ajuste de facturación",
)
async def create_adjustment(
    process_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    proc = await _get_process_or_404(db, process_id, current_user.law_firm_id)

    descripcion = (request.get("descripcion") or "").strip()
    if not descripcion:
        raise HTTPException(status_code=422, detail="La descripción es requerida")

    monto_raw = request.get("monto")
    if monto_raw is None:
        raise HTTPException(status_code=422, detail="El monto es requerido")
    try:
        monto = float(monto_raw)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="El monto debe ser un número")

    nombre = (request.get("nombre") or "").strip() or None

    adj = BillingAdjustment(
        process_id=proc.id,
        law_firm_id=current_user.law_firm_id,
        nombre=nombre,
        descripcion=descripcion,
        monto=monto,
        created_by=current_user.id,
        is_deleted=False,
    )
    db.add(adj)
    await db.commit()
    await db.refresh(adj)

    return success_response(data=_format_adjustment(adj), meta={})


# ── PATCH /processes/{process_id}/billing/adjustments/{adj_id} ───────────────

@router.patch(
    "/processes/{process_id}/billing/adjustments/{adj_id}",
    response_model=dict,
    summary="Actualizar ajuste de facturación",
)
async def update_adjustment(
    process_id: str,
    adj_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    proc = await _get_process_or_404(db, process_id, current_user.law_firm_id)

    try:
        adj_uuid = uuid_module.UUID(adj_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Ajuste no encontrado")

    adj = await db.get(BillingAdjustment, adj_uuid)
    if not adj or adj.is_deleted or adj.process_id != proc.id:
        raise HTTPException(status_code=404, detail="Ajuste no encontrado")

    if "nombre" in request:
        adj.nombre = (request["nombre"] or "").strip() or None
    if "descripcion" in request:
        descripcion = (request["descripcion"] or "").strip()
        if not descripcion:
            raise HTTPException(status_code=422, detail="La descripción es requerida")
        adj.descripcion = descripcion
    if "monto" in request:
        try:
            adj.monto = float(request["monto"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail="El monto debe ser un número")

    adj.updated_at = datetime.utcnow()
    adj.updated_by = current_user.id
    await db.commit()
    await db.refresh(adj)

    return success_response(data=_format_adjustment(adj), meta={})


# ── DELETE /processes/{process_id}/billing/adjustments/{adj_id} ──────────────

@router.delete(
    "/processes/{process_id}/billing/adjustments/{adj_id}",
    response_model=dict,
    summary="Eliminar ajuste de facturación (soft-delete)",
)
async def delete_adjustment(
    process_id: str,
    adj_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    proc = await _get_process_or_404(db, process_id, current_user.law_firm_id)

    try:
        adj_uuid = uuid_module.UUID(adj_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Ajuste no encontrado")

    adj = await db.get(BillingAdjustment, adj_uuid)
    if not adj or adj.is_deleted or adj.process_id != proc.id:
        raise HTTPException(status_code=404, detail="Ajuste no encontrado")

    adj.is_deleted = True
    adj.deleted_at = datetime.utcnow()
    adj.deleted_by = current_user.id
    await db.commit()

    return success_response(data={"message": "Ajuste eliminado"}, meta={})


# ── GET /processes/{process_id}/billing/pdf ───────────────────────────────────

@router.get(
    "/processes/{process_id}/billing/pdf",
    summary="Generar PDF de facturación del proceso",
)
async def generate_billing_pdf(
    process_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    )
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

    proc = await _get_process_or_404(db, process_id, current_user.law_firm_id)

    # Load law firm
    law_firm = await db.get(LawFirm, current_user.law_firm_id)
    firm_name = law_firm.name if law_firm else "Estudio Legal"

    # Load case
    case = await db.get(Case, proc.case_id)

    # Load primary client via case_clients
    client_name = None
    if case:
        cc_result = await db.execute(
            select(CaseClient)
            .where(
                and_(
                    CaseClient.case_id == case.id,
                    CaseClient.is_deleted == False,
                )
            )
            .order_by(CaseClient.is_primary.desc())
            .limit(1)
            .options(selectinload(CaseClient.client))
        )
        cc = cc_result.scalars().first()
        if cc and cc.client:
            client_name = cc.client.name

    # Load hours with user (only for por_horas or null tipo_tarifa)
    hours_rows = []
    if proc.tipo_tarifa != "plana":
        hours_result = await db.execute(
            select(CaseHours)
            .join(Task, CaseHours.task_id == Task.id)
            .where(
                and_(
                    Task.process_id == proc.id,
                    Task.is_deleted == False,
                    CaseHours.is_deleted == False,
                )
            )
            .order_by(CaseHours.work_date.asc())
            .options(selectinload(CaseHours.user))
        )
        hours_rows = hours_result.scalars().all()

    # Load adjustments
    adjustments = await _load_adjustments(db, proc.id)

    subtotal = await _compute_subtotal_horas(db, proc)
    total_ajustes = sum(float(a.monto) for a in adjustments)
    total_final = round(subtotal + total_ajustes, 2)
    moneda = proc.moneda or "PEN"
    simbolo = "S/" if moneda == "PEN" else "USD"

    def fmt_money(amount: float) -> str:
        return f"{simbolo} {amount:,.2f}"

    # ── Build PDF ──────────────────────────────────────────────────────────────
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    style_title = ParagraphStyle(
        "titulo",
        parent=styles["Title"],
        fontSize=18,
        textColor=colors.HexColor("#1e3a5f"),
        spaceAfter=6,
    )
    style_subtitle = ParagraphStyle(
        "subtitulo",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#6b7280"),
        spaceAfter=2,
    )
    style_section = ParagraphStyle(
        "seccion",
        parent=styles["Normal"],
        fontSize=11,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#1e3a5f"),
        spaceBefore=12,
        spaceAfter=4,
    )
    style_body = ParagraphStyle(
        "cuerpo",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#374151"),
        spaceAfter=2,
    )
    style_total = ParagraphStyle(
        "total",
        parent=styles["Normal"],
        fontSize=13,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#065f46"),
        spaceBefore=8,
    )

    story = []

    # Header
    story.append(Paragraph(firm_name, style_title))
    story.append(Paragraph(f"Factura de proceso — {datetime.utcnow().strftime('%d/%m/%Y')}", style_subtitle))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb"), spaceAfter=12))

    # Cliente
    story.append(Paragraph("CLIENTE", style_section))
    story.append(Paragraph(client_name or "Sin cliente asignado", style_body))

    # Caso
    if case:
        story.append(Paragraph("CASO", style_section))
        story.append(Paragraph(f"N° {case.case_number} — {case.title}", style_body))

    # Proceso
    story.append(Paragraph("PROCESO", style_section))
    story.append(Paragraph(f"<b>{proc.titulo}</b>", style_body))
    if proc.tipo_tarifa:
        tipo_label = "Por horas" if proc.tipo_tarifa == "por_horas" else "Tarifa plana"
        story.append(Paragraph(f"Tipo de tarifa: {tipo_label}", style_body))
    if proc.fecha_inicio:
        story.append(Paragraph(f"Inicio: {proc.fecha_inicio.strftime('%d/%m/%Y')}", style_body))
    if proc.fecha_fin:
        story.append(Paragraph(f"Fin: {proc.fecha_fin.strftime('%d/%m/%Y')}", style_body))

    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb"), spaceAfter=8))

    # Detalle de horas or tarifa plana
    if proc.tipo_tarifa == "plana":
        story.append(Paragraph("HONORARIO", style_section))
        story.append(Paragraph(f"Honorario fijo: <b>{fmt_money(subtotal)}</b>", style_body))
    else:
        story.append(Paragraph("DETALLE DE HORAS", style_section))
        if hours_rows:
            table_data = [["Descripción", "Fecha", "Horas", "Tarifa", "Subtotal"]]
            for h in hours_rows:
                user_name = ""
                if h.user:
                    user_name = f"{h.user.first_name} {h.user.last_name}".strip()
                desc = h.description or user_name or "—"
                fecha = h.work_date.strftime("%d/%m/%Y") if h.work_date else "—"
                horas_val = float(h.hours) if h.hours else 0
                tarifa_val = float(h.hourly_rate) if h.hourly_rate else 0
                subtotal_val = float(h.total_amount) if h.total_amount else 0
                table_data.append([
                    desc,
                    fecha,
                    f"{horas_val:.2f}",
                    fmt_money(tarifa_val),
                    fmt_money(subtotal_val),
                ])

            col_widths = [7 * cm, 2.5 * cm, 2 * cm, 3 * cm, 3 * cm]
            hours_table = Table(table_data, colWidths=col_widths)
            hours_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
                ("ALIGN", (0, 0), (1, -1), "LEFT"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(hours_table)
        else:
            story.append(Paragraph("Sin horas registradas para este proceso.", style_body))

    story.append(Spacer(1, 0.3 * cm))

    # Ajustes
    if adjustments:
        story.append(Paragraph("AJUSTES", style_section))
        adj_data = [["Nombre", "Descripción", "Monto"]]
        for a in adjustments:
            adj_data.append([
                a.nombre or "—",
                a.descripcion,
                fmt_money(float(a.monto)),
            ])
        adj_col_widths = [4 * cm, 9.5 * cm, 4 * cm]
        adj_table = Table(adj_data, colWidths=adj_col_widths)
        adj_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#374151")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
            ("ALIGN", (0, 0), (1, -1), "LEFT"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e5e7eb")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(adj_table)

    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#d1d5db"), spaceAfter=8))

    # Totals summary
    summary_data = [
        ["Subtotal horas:", fmt_money(subtotal)],
        ["Total ajustes:", fmt_money(total_ajustes)],
    ]
    summary_table = Table(summary_data, colWidths=[13.5 * cm, 4 * cm])
    summary_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#374151")),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(summary_table)

    story.append(Spacer(1, 0.3 * cm))
    total_data = [["TOTAL A COBRAR:", fmt_money(total_final)]]
    total_table = Table(total_data, colWidths=[13.5 * cm, 4 * cm])
    total_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 13),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#065f46")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(total_table)

    doc.build(story)

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=factura_proceso.pdf"},
    )
