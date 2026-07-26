"""
Case timeline endpoints.
Handles events (immutable) and updates (mutable) chronologically.
"""

import asyncio
import uuid as uuid_module
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.utils.responses import success_response, paginated_response
from app.utils.auth import get_current_user
from app.schemas.timeline import CaseEventCreate, CaseEventUpdate, CaseUpdateCreate
from app.models import User, Case, CaseEvent, CaseUpdate
from app.models.case import CaseTeam
from app.models.alert import CaseAlert
from app.services.audit_service import audit_log
from app.services.case_service import check_case_team_access
from app.services.email_service import notify_case_update

router = APIRouter(tags=["timeline"])


def _format_event(event: CaseEvent) -> dict:
    """Format CaseEvent to Spanish-named dict matching Evento frontend type."""
    return {
        "id": str(event.id),
        "casoId": str(event.case_id),
        "tipo": event.event_type,
        "titulo": event.title,
        "descripcion": event.description,
        "fecha": event.event_date.isoformat() if event.event_date else None,
        "fechaFin": event.event_end_date.isoformat() if event.event_end_date else None,
        "ubicacion": event.location,
        "completado": event.is_completed,
        "createdAt": event.created_at.isoformat() if event.created_at else None,
        "updatedAt": event.updated_at.isoformat() if event.updated_at else None,
    }


def _utc_iso(dt: datetime | None) -> str | None:
    """Return ISO string with explicit UTC offset, even for naive datetimes."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _format_update(update: CaseUpdate, user_names: dict | None = None) -> dict:
    """Format CaseUpdate to response dict."""
    names = user_names or {}
    creator_id = str(update.created_by) if update.created_by else None
    return {
        "id": str(update.id),
        "casoId": str(update.case_id),
        "titulo": update.title,
        "contenido": update.content,
        "tipoActualizacion": update.update_type,
        "esInterno": update.is_internal,
        "visibleAlCliente": update.is_client_visible,
        "creadoPorId": creator_id,
        "creadoPor": names.get(creator_id) if creator_id else None,
        "createdAt": _utc_iso(update.created_at),
        "updatedAt": _utc_iso(update.updated_at),
    }


@router.get(
    "/{case_id}/timeline",
    response_model=dict,
    summary="Get combined timeline",
)
async def get_case_timeline(
    case_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get timeline of events for a case, sorted chronologically. Updates have their own endpoint."""
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    await check_case_team_access(db, case_id, current_user)

    # Get events only — updates are shown in the dedicated Actualizaciones tab
    events_result = await db.execute(
        select(CaseEvent)
        .where(and_(CaseEvent.case_id == case_id, CaseEvent.is_deleted == False))
        .order_by(CaseEvent.event_date.asc())
    )
    events = events_result.scalars().all()

    timeline_items = [_format_event(e) for e in events]

    total = len(timeline_items)
    start = (page - 1) * limit
    paginated_items = timeline_items[start:start + limit]

    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=paginated_items, total=total, page=page, pages=pages, limit=limit, meta={})


@router.get(
    "/{case_id}/events",
    response_model=dict,
    summary="List events only",
)
async def list_events(
    case_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("-event_date"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    await check_case_team_access(db, case_id, current_user)

    count_result = await db.execute(
        select(func.count(CaseEvent.id)).where(
            and_(CaseEvent.case_id == case_id, CaseEvent.is_deleted == False)
        )
    )
    total = count_result.scalar() or 0

    query = select(CaseEvent).where(
        and_(CaseEvent.case_id == case_id, CaseEvent.is_deleted == False)
    )

    safe_sort_fields = {"event_date", "created_at", "title"}
    sort_field = sort.lstrip("-")
    if sort_field not in safe_sort_fields:
        sort_field = "event_date"

    col = getattr(CaseEvent, sort_field)
    query = query.order_by(col.desc() if sort.startswith("-") else col)
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    events = result.scalars().all()

    data = [_format_event(e) for e in events]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.post(
    "/{case_id}/events",
    response_model=dict,
    summary="Create event",
    status_code=status.HTTP_201_CREATED,
)
async def create_event(
    case_id: str,
    request: CaseEventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    await check_case_team_access(db, case_id, current_user)

    event = CaseEvent(
        case_id=case_id,
        law_firm_id=current_user.law_firm_id,
        event_type=request.event_type,
        title=request.title,
        description=request.description,
        event_date=request.event_date,
        event_end_date=request.event_end_date,
        location=request.location,
        is_reminder_set=request.is_reminder_set,
        reminder_days_before=request.reminder_days_before,
        is_completed=False,
        is_deleted=False,
        created_by=current_user.id,
    )

    db.add(event)
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="CREATE",
        entity_type="CaseEvent",
        entity_id=event.id,
        description=f"Event created: {event.title}",
    )

    return success_response(data=_format_event(event), meta={})


@router.patch(
    "/{case_id}/events/{event_id}",
    response_model=dict,
    summary="Update event",
)
async def update_event(
    case_id: str,
    event_id: str,
    request: CaseEventUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    event = await db.get(CaseEvent, event_id)
    if not event or event.is_deleted or str(event.case_id) != case_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    await check_case_team_access(db, case_id, current_user)

    if request.event_type is not None:
        event.event_type = request.event_type
    if request.title is not None:
        event.title = request.title
    if request.description is not None:
        event.description = request.description
    if request.event_date is not None:
        event.event_date = request.event_date
    if request.event_end_date is not None:
        event.event_end_date = request.event_end_date
    if request.location is not None:
        event.location = request.location
    if request.is_reminder_set is not None:
        event.is_reminder_set = request.is_reminder_set
    if request.reminder_days_before is not None:
        event.reminder_days_before = request.reminder_days_before
    if request.is_completed is not None:
        event.is_completed = request.is_completed

    event.updated_at = datetime.utcnow()
    await db.commit()

    return success_response(data=_format_event(event), meta={})


@router.delete(
    "/{case_id}/events/{event_id}",
    response_model=dict,
    summary="Delete event",
)
async def delete_event(
    case_id: str,
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    event = await db.get(CaseEvent, event_id)
    if not event or event.is_deleted or str(event.case_id) != case_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    event.is_deleted = True
    event.deleted_at = datetime.utcnow()
    await db.commit()

    return success_response(data={"message": "Event deleted"}, meta={})


@router.get(
    "/{case_id}/updates",
    response_model=dict,
    summary="List updates/comments",
)
async def list_updates(
    case_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    sort: str = Query("-created_at"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        case_uuid = uuid_module.UUID(case_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    case = await db.get(Case, case_uuid)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    count_result = await db.execute(
        select(func.count(CaseUpdate.id)).where(
            and_(CaseUpdate.case_id == case_uuid, CaseUpdate.is_deleted == False)
        )
    )
    total = count_result.scalar() or 0

    query = select(CaseUpdate).where(
        and_(CaseUpdate.case_id == case_uuid, CaseUpdate.is_deleted == False)
    )

    safe_sort_fields = {"created_at", "updated_at"}
    sort_field = sort.lstrip("-")
    if sort_field not in safe_sort_fields:
        sort_field = "created_at"

    col = getattr(CaseUpdate, sort_field)
    query = query.order_by(col.desc() if sort.startswith("-") else col)
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    updates = result.scalars().all()

    # Batch-load creator names in one query
    creator_ids = {u.created_by for u in updates if u.created_by}
    user_names: dict = {}
    if creator_ids:
        user_rows = (await db.execute(
            select(User).where(User.id.in_(creator_ids))
        )).scalars().all()
        user_names = {str(u.id): f"{u.first_name} {u.last_name}".strip() or u.email for u in user_rows}

    data = [_format_update(u, user_names) for u in updates]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.post(
    "/{case_id}/updates",
    response_model=dict,
    summary="Create update/comment",
    status_code=status.HTTP_201_CREATED,
)
async def create_update(
    case_id: str,
    request: CaseUpdateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        case_uuid = uuid_module.UUID(case_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    case = await db.get(Case, case_uuid)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    # Auto-generate title from content if not provided
    auto_title = request.title or (
        request.content[:77] + "..." if len(request.content) > 80 else request.content
    )

    update = CaseUpdate(
        case_id=case_uuid,
        law_firm_id=current_user.law_firm_id,
        title=auto_title,
        content=request.content,
        update_type=request.update_type or "general",
        is_internal=request.is_internal,
        is_client_visible=request.is_client_visible,
        is_deleted=False,
        created_by=current_user.id,
    )

    db.add(update)
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="CREATE",
        entity_type="CaseUpdate",
        entity_id=update.id,
        description=f"Update created: {update.title}",
    )

    creator_name = f"{current_user.first_name} {current_user.last_name}".strip() or current_user.email

    # ── Notificaciones al equipo del caso ─────────────────────────────
    team_result = await db.execute(
        select(CaseTeam)
        .where(and_(CaseTeam.case_id == case_uuid, CaseTeam.is_deleted == False))
        .options(selectinload(CaseTeam.user))
    )
    team_members = team_result.scalars().all()

    # In-app alert (una sola, visible para toda la firma)
    alert = CaseAlert(
        case_id=case_uuid,
        law_firm_id=current_user.law_firm_id,
        alert_type="custom",
        severity="info",
        title=f"Nueva actualización: {update.title}",
        message=f"El usuario {creator_name} publicó una nueva actualización en el caso «{case.title}».",
        alert_date=datetime.now(timezone.utc),
        source="auto",
        is_read=False,
        is_acknowledged=False,
        is_resolved=False,
        is_deleted=False,
    )
    db.add(alert)
    await db.commit()

    # Emails a cada miembro del equipo (excepto quien creó la actualización)
    email_tasks = [
        notify_case_update(
            to_email=m.user.email,
            to_name=f"{m.user.first_name} {m.user.last_name}".strip() or m.user.email,
            case_title=case.title,
            update_title=update.title,
            update_content=update.content,
            created_by=creator_name,
        )
        for m in team_members
        if m.user
        and not m.user.is_deleted
        and m.user.email
        and m.user.id != current_user.id
    ]
    if email_tasks:
        asyncio.ensure_future(asyncio.gather(*email_tasks, return_exceptions=True))
    # ──────────────────────────────────────────────────────────────────

    return success_response(data=_format_update(update, {str(current_user.id): creator_name}), meta={})


@router.patch(
    "/updates/{update_id}",
    response_model=dict,
    summary="Edit update",
)
async def edit_update(
    update_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Edit a case update. Only the original creator can edit."""
    update = await db.get(CaseUpdate, update_id)

    if not update or update.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Update not found")

    # Check creator (created_by from AuditMixin)
    if update.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own updates")

    case = await db.get(Case, update.case_id)
    if not case or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    await check_case_team_access(db, update.case_id, current_user)

    # Accept Spanish or English field names
    content = request.get("contenido") or request.get("content")
    title = request.get("titulo") or request.get("title")
    update_type = request.get("tipoActualizacion") or request.get("update_type")

    if content is not None:
        update.content = content
    if title is not None:
        update.title = title
    if update_type is not None:
        update.update_type = update_type

    update.updated_at = datetime.utcnow()
    update.updated_by = current_user.id

    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="CaseUpdate",
        entity_id=update.id,
        description=f"Update edited: {update.title}",
    )

    return success_response(data=_format_update(update), meta={})


@router.delete(
    "/updates/{update_id}",
    response_model=dict,
    summary="Delete update",
)
async def delete_update(
    update_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update = await db.get(CaseUpdate, update_id)

    if not update or update.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Update not found")

    if update.created_by != current_user.id:
        from app.utils.auth import check_role
        if not check_role(current_user.role, ["admin_firma", "super_admin"]):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own updates")

    case = await db.get(Case, update.case_id)
    if not case or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    update.is_deleted = True
    update.deleted_at = datetime.utcnow()
    await db.commit()

    return success_response(data={"message": "Update deleted"}, meta={})
