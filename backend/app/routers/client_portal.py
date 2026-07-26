"""
Client portal endpoints.
Clients authenticate with RUC + password and can view their cases and timeline.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy import func as sa_func

from app.database import get_db
from app.utils.responses import success_response, paginated_response
from app.utils.auth import create_access_token, verify_password, get_current_client
from app.schemas.client_portal import ClientPortalLoginRequest
from app.models import Case, CaseTeam
from app.models.client import Client
from app.models.case import CaseClient
from app.models.timeline import CaseEvent, CaseUpdate
from app.models.user import User

router = APIRouter(tags=["Portal Cliente"])

CASE_STATUS_ES = {
    "draft": "Borrador",
    "active": "Activo",
    "suspended": "Suspendido",
    "closed": "Cerrado",
    "archived": "Archivado",
}

CASE_TYPE_ES = {
    "civil": "Civil",
    "criminal": "Penal",
    "administrative": "Administrativo",
    "labor": "Laboral",
    "intellectual_property": "Propiedad Intelectual",
    "commercial": "Comercial",
    "family": "Familia",
    "other": "Otro",
}

EVENT_TYPE_ES = {
    "hearing": "Audiencia",
    "trial": "Juicio",
    "deposition": "Declaración",
    "motion_hearing": "Vista de Moción",
    "settlement_conference": "Conferencia de Conciliación",
    "deadline": "Plazo",
    "filing": "Presentación",
    "status_update": "Actualización",
    "document_received": "Documento Recibido",
    "other": "Otro",
}


@router.post(
    "/auth",
    response_model=dict,
    summary="Client portal login (RUC + password)",
)
async def portal_login(
    request: ClientPortalLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    ruc = (request.ruc or "").strip()
    if not ruc or not request.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="RUC y contraseña son requeridos",
        )

    result = await db.execute(
        select(Client).where(
            and_(
                sa_func.trim(Client.tax_id) == ruc,
                Client.portal_access_enabled == True,
                Client.is_deleted == False,
            )
        )
    )
    client = result.scalars().first()

    if not client or not client.portal_password_hash or not verify_password(
        request.password, client.portal_password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="RUC o contraseña incorrectos",
        )

    access_token = create_access_token(
        data={
            "sub": str(client.id),
            "client_id": str(client.id),
            "law_firm_id": str(client.law_firm_id),
            "role": "cliente",
        }
    )

    return success_response(
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "client": {
                "id": str(client.id),
                "nombre": client.name,
                "ruc": client.tax_id,
            },
        },
        meta={},
    )


@router.get(
    "/me",
    response_model=dict,
    summary="Client profile (portal)",
)
async def get_portal_me(
    current_client: Client = Depends(get_current_client),
):
    return success_response(
        data={
            "id": str(current_client.id),
            "nombre": current_client.name,
            "ruc": current_client.tax_id,
            "email": current_client.email,
            "phone": current_client.phone,
            "clientType": current_client.client_type,
            "organizationName": current_client.organization_name,
            "streetAddress": current_client.street_address,
            "city": current_client.city,
            "state": current_client.state,
            "country": current_client.country,
        },
        meta={},
    )


@router.get(
    "/cases",
    response_model=dict,
    summary="Client's cases (portal)",
)
async def get_portal_cases(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    base_where = and_(
        CaseClient.client_id == current_client.id,
        CaseClient.is_deleted == False,
        Case.is_deleted == False,
    )

    count_result = await db.execute(
        select(func.count(Case.id))
        .join(CaseClient, and_(CaseClient.case_id == Case.id))
        .where(base_where)
    )
    total = count_result.scalar() or 0

    query = (
        select(Case)
        .join(CaseClient, and_(CaseClient.case_id == Case.id))
        .where(base_where)
        .order_by(Case.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(query)
    cases = result.scalars().all()

    data = [
        {
            "id": str(c.id),
            "caseNumber": c.case_number,
            "titulo": c.title,
            "estado": c.status,
            "estadoLabel": CASE_STATUS_ES.get(c.status, c.status),
            "tipoSolicitud": c.case_type,
            "tipoLabel": CASE_TYPE_ES.get(c.case_type, c.case_type),
            "openedDate": c.opened_date.isoformat() if c.opened_date else None,
        }
        for c in cases
    ]

    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.get(
    "/cases/{case_id}",
    response_model=dict,
    summary="Case detail (portal)",
)
async def get_portal_case(
    case_id: str,
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    # Verify this client is linked to this case
    link_result = await db.execute(
        select(CaseClient).where(
            and_(
                CaseClient.case_id == case_id,
                CaseClient.client_id == current_client.id,
                CaseClient.is_deleted == False,
            )
        )
    )
    if not link_result.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso no encontrado")

    case = await db.get(Case, case_id)
    if not case or case.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso no encontrado")

    # Load team members
    team_result = await db.execute(
        select(CaseTeam)
        .where(and_(CaseTeam.case_id == case_id, CaseTeam.is_deleted == False))
        .options(selectinload(CaseTeam.user))
    )
    team_members = team_result.scalars().all()
    team = [
        {
            "nombre": f"{m.user.first_name} {m.user.last_name}".strip() if m.user else "—",
            "rol": m.role,
            "esLider": m.is_lead,
        }
        for m in team_members
        if m.user and not m.user.is_deleted
    ]

    return success_response(
        data={
            "id": str(case.id),
            "caseNumber": case.case_number,
            "titulo": case.title,
            "descripcion": case.description,
            "estado": case.status,
            "estadoLabel": CASE_STATUS_ES.get(case.status, case.status),
            "tipoSolicitud": case.case_type,
            "tipoLabel": CASE_TYPE_ES.get(case.case_type, case.case_type),
            "openedDate": case.opened_date.isoformat() if case.opened_date else None,
            "closedDate": case.closed_date.isoformat() if case.closed_date else None,
            "courtName": case.court_name,
            "courtLocation": case.court_location,
            "judgeName": case.judge_name,
            "plaintiff": case.plaintiff,
            "defendant": case.defendant,
            "team": team,
        },
        meta={},
    )


@router.get(
    "/cases/{case_id}/timeline",
    response_model=dict,
    summary="Case timeline (portal)",
)
async def get_portal_case_timeline(
    case_id: str,
    current_client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    # Verify access
    link_result = await db.execute(
        select(CaseClient).where(
            and_(
                CaseClient.case_id == case_id,
                CaseClient.client_id == current_client.id,
                CaseClient.is_deleted == False,
            )
        )
    )
    if not link_result.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso no encontrado")

    # CaseEvents (all are visible to client)
    events_result = await db.execute(
        select(CaseEvent)
        .where(and_(CaseEvent.case_id == case_id, CaseEvent.is_deleted == False))
    )
    events = events_result.scalars().all()

    # CaseUpdates (only client-visible ones)
    updates_result = await db.execute(
        select(CaseUpdate)
        .where(
            and_(
                CaseUpdate.case_id == case_id,
                CaseUpdate.is_deleted == False,
                CaseUpdate.is_client_visible == True,
            )
        )
    )
    updates = updates_result.scalars().all()

    # Merge and sort by date descending
    timeline = []

    for e in events:
        timeline.append({
            "id": str(e.id),
            "tipo": "evento",
            "tipoLabel": EVENT_TYPE_ES.get(e.event_type, e.event_type),
            "titulo": e.title,
            "descripcion": e.description,
            "fecha": e.event_date.isoformat() if e.event_date else None,
            "location": e.location,
            "isCompleted": e.is_completed,
        })

    for u in updates:
        timeline.append({
            "id": str(u.id),
            "tipo": "actualizacion",
            "tipoLabel": "Actualización",
            "titulo": u.title,
            "descripcion": u.content,
            "fecha": u.created_at.isoformat() if u.created_at else None,
            "location": None,
            "isCompleted": None,
        })

    timeline.sort(key=lambda x: x["fecha"] or "", reverse=True)

    return success_response(data=timeline, meta={"total": len(timeline)})
