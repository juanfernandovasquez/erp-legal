"""
Case timeline endpoints.
Handles events (immutable) and updates (mutable) chronologically.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.database import get_db
from app.utils.responses import success_response, paginated_response
from app.utils.auth import get_current_user
from app.schemas.timeline import CaseEventCreate, CaseEventUpdate, CaseUpdateCreate
from app.models import User, Case, CaseEvent, CaseUpdate
from app.services.audit_service import audit_log
from app.services.case_service import check_case_team_access

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


def _format_update(update: CaseUpdate) -> dict:
    """Format CaseUpdate to response dict."""
    return {
        "id": str(update.id),
        "casoId": str(update.case_id),
        "titulo": update.title,
        "contenido": update.content,
        "tipoActualizacion": update.update_type,
        "esInterno": update.is_internal,
        "visibleAlCliente": update.is_client_visible,
        "createdAt": update.created_at.isoformat() if update.created_at else None,
        "updatedAt": update.updated_at.isoformat() if update.updated_at else None,
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
    """Get combined timeline of events and updates for a case, sorted chronologically."""
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    await check_case_team_access(db, case_id, current_user)

    # Get events
    events_result = await db.execute(
        select(CaseEvent)
        .where(and_(CaseEvent.case_id == case_id, CaseEvent.is_deleted == False))
        .order_by(CaseEvent.event_date.asc())
    )
    events = events_result.scalars().all()

    # Get updates
    updates_result = await db.execute(
        select(CaseUpdate)
        .where(and_(CaseUpdate.case_id == case_id, CaseUpdate.is_deleted == False))
        .order_by(CaseUpdate.created_at.asc())
    )
    updates = updates_result.scalars().all()

    # Combine and sort by date
    timeline_items = []

    for event in events:
        item = _format_event(event)
        item["_type"] = "evento"
        item["_timestamp"] = event.event_date.isoformat() if event.event_date else ""
        timeline_items.append(item)

    for update in updates:
        item = _format_update(update)
        item["_type"] = "actualizacion"
        item["_timestamp"] = update.created_at.isoformat() if update.created_at else ""
        timeline_items.append(item)

    # Sort chronologically
    timeline_items.sort(key=lambda x: x.get("_timestamp", ""))

    # Remove internal sort keys
    for item in timeline_items:
        item.pop("_type", None)
        item.pop("_timestamp", None)

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
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("-created_at"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    await check_case_team_access(db, case_id, current_user)

    count_result = await db.execute(
        select(func.count(CaseUpdate.id)).where(
            and_(CaseUpdate.case_id == case_id, CaseUpdate.is_deleted == False)
        )
    )
    total = count_result.scalar() or 0

    query = select(CaseUpdate).where(
        and_(CaseUpdate.case_id == case_id, CaseUpdate.is_deleted == False)
    )

    safe_sort_fields = {"created_at", "updated_at", "title"}
    sort_field = sort.lstrip("-")
    if sort_field not in safe_sort_fields:
        sort_field = "created_at"

    col = getattr(CaseUpdate, sort_field)
    query = query.order_by(col.desc() if sort.startswith("-") else col)
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    updates = result.scalars().all()

    data = [_format_update(u) for u in updates]
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
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    await check_case_team_access(db, case_id, current_user)

    update = CaseUpdate(
        case_id=case_id,
        law_firm_id=current_user.law_firm_id,
        title=request.title,
        content=request.content,
        update_type=request.update_type,
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

    return success_response(data=_format_update(update), meta={})


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
