"""
Billing endpoints for case-level billing summaries, adjustments and PDF.
"""

import io
import uuid as uuid_module
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.utils.responses import success_response
from app.utils.auth import get_current_user
from app.models import User
from app.models.task import Task, CaseHours
from app.models.billing import BillingAdjustment
from app.models.case import Case, CaseClient
from app.models.law_firm import LawFirm

router = APIRouter(tags=["Facturación"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _format_adjustment(adj: BillingAdjustment, case: "Case | None" = None) -> dict:
    return {
        "id": str(adj.id),
        "casoId": str(adj.case_id),
        "casoTitulo": case.title if case else None,
        "moneda": case.moneda_facturacion if case else None,
        "nombre": adj.nombre,
        "descripcion": adj.descripcion,
        "monto": float(adj.monto),
        "fechaAplicacion": adj.fecha_aplicacion.isoformat() if adj.fecha_aplicacion else None,
        "createdAt": adj.created_at.isoformat() if adj.created_at else None,
        "updatedAt": adj.updated_at.isoformat() if adj.updated_at else None,
    }


async def _get_case_or_404(
    db: AsyncSession, case_id: str, law_firm_id: uuid_module.UUID
) -> Case:
    try:
        case_uuid = uuid_module.UUID(case_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Caso no encontrado")

    case = await db.get(Case, case_uuid)
    if not case or case.is_deleted or case.law_firm_id != law_firm_id:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return case


async def _compute_subtotal(db: AsyncSession, case: Case) -> float:
    """
    For 'flat' cases: return precio_facturacion.
    For 'por_horas' or NULL: SUM(case_hours.total_amount) for the case.
    """
    if case.tipo_facturacion == "flat":
        return float(case.precio_facturacion) if case.precio_facturacion is not None else 0.0

    result = await db.execute(
        select(func.coalesce(func.sum(CaseHours.total_amount), 0))
        .where(
            and_(
                CaseHours.case_id == case.id,
                CaseHours.is_deleted == False,
            )
        )
    )
    return float(result.scalar() or 0)


async def _load_adjustments(
    db: AsyncSession, case_id: uuid_module.UUID
) -> list:
    result = await db.execute(
        select(BillingAdjustment).where(
            and_(
                BillingAdjustment.case_id == case_id,
                BillingAdjustment.is_deleted == False,
            )
        ).order_by(BillingAdjustment.created_at.asc())
    )
    return result.scalars().all()


# ── GET /cases/{case_id}/billing ─────────────────────────────────────────────

@router.get(
    "/cases/{case_id}/billing",
    response_model=dict,
    summary="Resumen de facturación de un caso",
)
async def get_billing_summary(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await _get_case_or_404(db, case_id, current_user.law_firm_id)

    subtotal = await _compute_subtotal(db, case)
    adjustments = await _load_adjustments(db, case.id)

    total_ajustes = sum(float(a.monto) for a in adjustments)
    total_final = round(subtotal + total_ajustes, 2)

    return success_response(
        data={
            "casoId": str(case.id),
            "subtotalHoras": round(subtotal, 2),
            "ajustes": [_format_adjustment(a, case) for a in adjustments],
            "totalAjustes": round(total_ajustes, 2),
            "totalFinal": total_final,
            "moneda": case.moneda_facturacion or "PEN",
            "tipoFacturacion": case.tipo_facturacion,
        },
        meta={},
    )


# ── POST /cases/{case_id}/billing/adjustments ────────────────────────────────

@router.post(
    "/cases/{case_id}/billing/adjustments",
    response_model=dict,
    status_code=201,
    summary="Crear ajuste de facturación",
)
async def create_adjustment(
    case_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await _get_case_or_404(db, case_id, current_user.law_firm_id)

    descripcion = (request.get("descripcion") or "").strip() or None

    monto_raw = request.get("monto")
    if monto_raw is None:
        raise HTTPException(status_code=422, detail="El monto es requerido")
    try:
        monto = float(monto_raw)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="El monto debe ser un número")

    fecha_aplicacion = None
    if request.get("fechaAplicacion"):
        try:
            fecha_aplicacion = date.fromisoformat(request["fechaAplicacion"])
        except (ValueError, TypeError):
            pass

    adj = BillingAdjustment(
        case_id=case.id,
        law_firm_id=current_user.law_firm_id,
        nombre=None,
        descripcion=descripcion or "",
        monto=monto,
        fecha_aplicacion=fecha_aplicacion,
        created_by=current_user.id,
        is_deleted=False,
    )
    db.add(adj)
    await db.commit()
    await db.refresh(adj)

    return success_response(data=_format_adjustment(adj), meta={})


# ── PATCH /cases/{case_id}/billing/adjustments/{adj_id} ──────────────────────

@router.patch(
    "/cases/{case_id}/billing/adjustments/{adj_id}",
    response_model=dict,
    summary="Editar ajuste de facturación",
)
async def update_adjustment(
    case_id: str,
    adj_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await _get_case_or_404(db, case_id, current_user.law_firm_id)

    try:
        adj_uuid = uuid_module.UUID(adj_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Ajuste no encontrado")

    adj = await db.get(BillingAdjustment, adj_uuid)
    if not adj or adj.is_deleted or adj.case_id != case.id:
        raise HTTPException(status_code=404, detail="Ajuste no encontrado")

    if "descripcion" in request:
        adj.descripcion = (request["descripcion"] or "").strip() or ""
    if "monto" in request:
        try:
            adj.monto = float(request["monto"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail="El monto debe ser un número")
    if "fechaAplicacion" in request:
        if request["fechaAplicacion"]:
            try:
                adj.fecha_aplicacion = date.fromisoformat(request["fechaAplicacion"])
            except (ValueError, TypeError):
                pass
        else:
            adj.fecha_aplicacion = None

    adj.updated_at = datetime.utcnow()
    adj.updated_by = current_user.id
    await db.commit()
    await db.refresh(adj)

    return success_response(data=_format_adjustment(adj), meta={})


# ── DELETE /cases/{case_id}/billing/adjustments/{adj_id} ─────────────────────

@router.delete(
    "/cases/{case_id}/billing/adjustments/{adj_id}",
    response_model=dict,
    summary="Eliminar ajuste de facturación (soft-delete)",
)
async def delete_adjustment(
    case_id: str,
    adj_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await _get_case_or_404(db, case_id, current_user.law_firm_id)

    try:
        adj_uuid = uuid_module.UUID(adj_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Ajuste no encontrado")

    adj = await db.get(BillingAdjustment, adj_uuid)
    if not adj or adj.is_deleted or adj.case_id != case.id:
        raise HTTPException(status_code=404, detail="Ajuste no encontrado")

    adj.is_deleted = True
    adj.deleted_at = datetime.utcnow()
    adj.deleted_by = current_user.id
    await db.commit()

    return success_response(data={"message": "Ajuste eliminado"}, meta={})


# ── GET /cases/{case_id}/billing/pdf ─────────────────────────────────────────

@router.get(
    "/cases/{case_id}/billing/pdf",
    summary="Generar PDF de facturación del caso",
)
async def generate_billing_pdf(
    case_id: str,
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

    case = await _get_case_or_404(db, case_id, current_user.law_firm_id)

    # Load law firm
    law_firm = await db.get(LawFirm, current_user.law_firm_id)
    firm_name = law_firm.name if law_firm else "Estudio Legal"

    # Load primary client
    client_name = None
    cc_result = await db.execute(
        select(CaseClient)
        .where(and_(CaseClient.case_id == case.id, CaseClient.is_deleted == False))
        .order_by(CaseClient.is_primary.desc())
        .limit(1)
        .options(selectinload(CaseClient.client))
    )
    cc = cc_result.scalars().first()
    if cc and cc.client:
        client_name = cc.client.name

    # Load hours
    hours_rows = []
    if case.tipo_facturacion != "flat":
        hours_result = await db.execute(
            select(CaseHours)
            .where(and_(CaseHours.case_id == case.id, CaseHours.is_deleted == False))
            .order_by(CaseHours.work_date.asc())
            .options(selectinload(CaseHours.user))
        )
        hours_rows = hours_result.scalars().all()

    adjustments = await _load_adjustments(db, case.id)
    subtotal = await _compute_subtotal(db, case)
    total_ajustes = sum(float(a.monto) for a in adjustments)
    total_final = round(subtotal + total_ajustes, 2)
    moneda = case.moneda_facturacion or "PEN"
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
        "titulo", parent=styles["Title"], fontSize=18,
        textColor=colors.HexColor("#1e3a5f"), spaceAfter=6,
    )
    style_subtitle = ParagraphStyle(
        "subtitulo", parent=styles["Normal"], fontSize=9,
        textColor=colors.HexColor("#6b7280"), spaceAfter=2,
    )
    style_section = ParagraphStyle(
        "seccion", parent=styles["Normal"], fontSize=11,
        fontName="Helvetica-Bold", textColor=colors.HexColor("#1e3a5f"),
        spaceBefore=12, spaceAfter=4,
    )
    style_body = ParagraphStyle(
        "cuerpo", parent=styles["Normal"], fontSize=9,
        textColor=colors.HexColor("#374151"), spaceAfter=2,
    )

    story = []

    story.append(Paragraph(firm_name, style_title))
    story.append(Paragraph(
        f"Factura — {datetime.utcnow().strftime('%d/%m/%Y')}", style_subtitle
    ))
    story.append(HRFlowable(
        width="100%", thickness=1,
        color=colors.HexColor("#e5e7eb"), spaceAfter=12
    ))

    story.append(Paragraph("CLIENTE", style_section))
    story.append(Paragraph(client_name or "Sin cliente asignado", style_body))

    story.append(Paragraph("CASO", style_section))
    story.append(Paragraph(f"N° {case.case_number} — {case.title}", style_body))
    if case.tipo_facturacion:
        tipo_label = "Por horas" if case.tipo_facturacion == "por_horas" else "Tarifa plana"
        story.append(Paragraph(f"Tipo de facturación: {tipo_label}", style_body))

    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(
        width="100%", thickness=0.5,
        color=colors.HexColor("#e5e7eb"), spaceAfter=8
    ))

    # Hours or flat
    if case.tipo_facturacion == "flat":
        story.append(Paragraph("HONORARIO", style_section))
        story.append(Paragraph(
            f"Honorario fijo: <b>{fmt_money(subtotal)}</b>", style_body
        ))
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
                table_data.append([
                    desc,
                    fecha,
                    f"{float(h.hours or 0):.2f}",
                    fmt_money(float(h.hourly_rate or 0)),
                    fmt_money(float(h.total_amount or 0)),
                ])
            col_widths = [7 * cm, 2.5 * cm, 2 * cm, 3 * cm, 3 * cm]
            hours_table = Table(table_data, colWidths=col_widths)
            hours_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
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
            story.append(Paragraph("Sin horas registradas para este caso.", style_body))

    story.append(Spacer(1, 0.3 * cm))

    if adjustments:
        story.append(Paragraph("AJUSTES", style_section))
        adj_data = [["Nombre", "Descripción", "Monto"]]
        for a in adjustments:
            adj_data.append([a.nombre or "—", a.descripcion, fmt_money(float(a.monto))])
        adj_table = Table(adj_data, colWidths=[4 * cm, 9.5 * cm, 4 * cm])
        adj_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#374151")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
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
    story.append(HRFlowable(
        width="100%", thickness=1,
        color=colors.HexColor("#d1d5db"), spaceAfter=8
    ))

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
    total_table = Table([["TOTAL A COBRAR:", fmt_money(total_final)]], colWidths=[13.5 * cm, 4 * cm])
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
        headers={"Content-Disposition": "attachment; filename=factura.pdf"},
    )
