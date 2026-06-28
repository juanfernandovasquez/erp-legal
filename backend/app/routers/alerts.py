"""
Alert and deadline management endpoints.
Handles alert creation, status tracking, and deadline monitoring.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.utils.responses import success_response, paginated_response
from app.utils.auth import get_current_user
from app.schemas.alert import CaseAlertCreate, CaseAlertUpdate
from app.models import User, Case, CaseAlert
from app.services.audit_service import audit_log
from app.services.case_service import check_case_team_access

router = APIRouter(tags=["alerts"])


def _format_alert(alert: CaseAlert) -> dict:
    """Convert CaseAlert model to response dict with Spanish field names."""
    # Derive a status string from boolean fields
    if alert.is_resolved:
        estado = "resuelta"
    elif alert.is_acknowledged:
        estado = "reconocida"
    elif alert.is_read:
        estado = "leida"
    else:
        estado = "pendiente"

    return {
        "id": str(alert.id),
        "casoId": str(alert.case_id),
        "bufeteId": str(alert.law_firm_id),
        "tipo": alert.alert_type,
        "severidad": alert.severity,
        "titulo": alert.title,
        "mensaje": alert.message,
        "fechaAlerta": alert.alert_date.isoformat() if alert.alert_date else None,
        "fechaVencimiento": alert.due_date.isoformat() if alert.due_date else None,
        "estado": estado,
        "isRead": alert.is_read,
        "isAcknowledged": alert.is_acknowledged,
        "acknowledgedAt": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
        "isResolved": alert.is_resolved,
        "resolvedAt": alert.resolved_at.isoformat() if alert.resolved_at else None,
        "resolutionNotes": alert.resolution_notes,
        "source": getattr(alert, "source", "manual"),
        "tareaId": str(alert.task_id) if getattr(alert, "task_id", None) else None,
        "createdAt": alert.created_at.isoformat() if alert.created_at else None,
        "updatedAt": alert.updated_at.isoformat() if alert.updated_at else None,
    }


@router.get(
    "/alerts",
    response_model=dict,
    summary="List firm alerts",
    description="List unresolved alerts for the current user's law firm",
)
async def list_my_alerts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List alerts for the current user's law firm.
    Shows unresolved alerts by default.
    """
    base_filter = and_(
        CaseAlert.law_firm_id == current_user.law_firm_id,
        CaseAlert.is_deleted == False,
    )

    query = select(CaseAlert).where(base_filter)

    # Filter by status_filter if provided
    if status_filter == "pendiente":
        query = query.where(CaseAlert.is_resolved == False)
    elif status_filter == "resuelta":
        query = query.where(CaseAlert.is_resolved == True)
    else:
        # Default: show unresolved
        query = query.where(CaseAlert.is_resolved == False)

    count_result = await db.execute(
        select(func.count(CaseAlert.id)).where(base_filter).where(CaseAlert.is_resolved == False)
    )
    total = count_result.scalar() or 0

    query = query.order_by(CaseAlert.due_date.asc().nullslast()).offset((page - 1) * limit).limit(limit)
    query = query.options(selectinload(CaseAlert.case))

    result = await db.execute(query)
    alerts = result.scalars().all()

    data = [_format_alert(a) for a in alerts]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.get(
    "/cases/{case_id}/alerts",
    response_model=dict,
    summary="List case alerts",
)
async def list_case_alerts(
    case_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    await check_case_team_access(db, case_id, current_user)

    base_filter = and_(
        CaseAlert.case_id == case_id,
        CaseAlert.is_deleted == False,
    )
    query = select(CaseAlert).where(base_filter)

    if status_filter == "resuelta":
        query = query.where(CaseAlert.is_resolved == True)
    elif status_filter == "pendiente":
        query = query.where(CaseAlert.is_resolved == False)

    count_result = await db.execute(
        select(func.count(CaseAlert.id)).where(base_filter)
    )
    total = count_result.scalar() or 0

    query = query.order_by(CaseAlert.due_date.asc().nullslast()).offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    alerts = result.scalars().all()

    data = [_format_alert(a) for a in alerts]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.post(
    "/cases/{case_id}/alerts",
    response_model=dict,
    summary="Create alert",
    status_code=status.HTTP_201_CREATED,
)
async def create_alert(
    case_id: str,
    request: CaseAlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    await check_case_team_access(db, case_id, current_user)

    alert = CaseAlert(
        case_id=case_id,
        law_firm_id=current_user.law_firm_id,
        alert_type=request.alert_type,
        severity=request.severity or "info",
        title=request.title,
        message=request.message,
        alert_date=datetime.utcnow(),
        due_date=request.due_date,
        source="manual",
        is_read=False,
        is_acknowledged=False,
        is_resolved=False,
        is_deleted=False,
        created_by=current_user.id,
    )

    db.add(alert)
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="CREATE",
        entity_type="CaseAlert",
        entity_id=alert.id,
        description=f"Alert created: {alert.title}",
    )

    return success_response(data=_format_alert(alert), meta={})


@router.patch(
    "/alerts/{alert_id}",
    response_model=dict,
    summary="Update alert",
)
async def update_alert(
    alert_id: str,
    request: CaseAlertUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    alert = await db.get(CaseAlert, alert_id)

    if not alert or alert.is_deleted or alert.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    case = await db.get(Case, alert.case_id)
    if not case or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    await check_case_team_access(db, alert.case_id, current_user)

    if request.severity is not None:
        alert.severity = request.severity
    if request.title is not None:
        alert.title = request.title
    if request.message is not None:
        alert.message = request.message
    if request.is_read is not None:
        alert.is_read = request.is_read
    if request.is_acknowledged is not None:
        alert.is_acknowledged = request.is_acknowledged
        if request.is_acknowledged and not alert.acknowledged_at:
            alert.acknowledged_at = datetime.utcnow()
    if request.is_resolved is not None:
        alert.is_resolved = request.is_resolved
        if request.is_resolved and not alert.resolved_at:
            alert.resolved_at = datetime.utcnow()
    if request.resolution_notes is not None:
        alert.resolution_notes = request.resolution_notes

    alert.updated_at = datetime.utcnow()
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="CaseAlert",
        entity_id=alert.id,
        description=f"Alert updated: {alert.title}",
    )

    return success_response(data=_format_alert(alert), meta={})


@router.delete(
    "/alerts/{alert_id}",
    response_model=dict,
    summary="Delete alert",
)
async def delete_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    alert = await db.get(CaseAlert, alert_id)

    if not alert or alert.is_deleted or alert.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.is_deleted = True
    alert.deleted_at = datetime.utcnow()
    await db.commit()

    return success_response(data={"message": "Alert deleted"}, meta={})


@router.get(
    "/alerts/summary",
    response_model=dict,
    summary="Get alerts summary",
)
async def get_alerts_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get summary of firm's alerts grouped by resolution status."""
    base_filter = and_(
        CaseAlert.law_firm_id == current_user.law_firm_id,
        CaseAlert.is_deleted == False,
    )

    total_result = await db.execute(
        select(func.count(CaseAlert.id)).where(base_filter)
    )
    total = total_result.scalar() or 0

    pending_result = await db.execute(
        select(func.count(CaseAlert.id)).where(
            and_(base_filter, CaseAlert.is_resolved == False)
        )
    )
    pending = pending_result.scalar() or 0

    resolved_result = await db.execute(
        select(func.count(CaseAlert.id)).where(
            and_(base_filter, CaseAlert.is_resolved == True)
        )
    )
    resolved = resolved_result.scalar() or 0

    # Overdue: due_date in past, not resolved
    overdue_result = await db.execute(
        select(func.count(CaseAlert.id)).where(
            and_(
                base_filter,
                CaseAlert.is_resolved == False,
                CaseAlert.due_date < datetime.utcnow(),
            )
        )
    )
    overdue = overdue_result.scalar() or 0

    return success_response(
        data={
            "total": total,
            "pending": pending,
            "resolved": resolved,
            "overdue": overdue,
        },
        meta={},
    )
