"""
Admin dashboard endpoints.
Provides metrics and analytics for law firm administrators.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from app.database import get_db
from app.utils.responses import success_response, error_response
from app.utils.auth import get_current_user, check_role
from app.models import (
    User,
    Case,
    Task,
    CaseAlert,
    CaseHours,
    AuditLog,
    CaseTeam,
)
from app.services.case_service import check_case_team_access

router = APIRouter(tags=["admin"])


@router.get(
    "/dashboard",
    response_model=dict,
    summary="Get dashboard metrics",
    description="Overview metrics for all authenticated law firm members",
)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get dashboard with key metrics.
    Accessible to all authenticated members of the law firm.
    Admins see firm-wide stats; others see the same (scoped to their firm).
    """
    law_firm_id = current_user.law_firm_id

    # Two canonical statuses
    ACTIVE_STATUSES = ["activo"]
    CLOSED_STATUSES = ["inactivo"]

    # --- Cases ---
    active_cases_result = await db.execute(
        select(func.count(Case.id)).where(
            and_(
                Case.law_firm_id == law_firm_id,
                Case.is_deleted == False,
                Case.status.in_(ACTIVE_STATUSES),
            )
        )
    )
    active_cases = active_cases_result.scalar() or 0

    total_cases_result = await db.execute(
        select(func.count(Case.id)).where(
            and_(
                Case.law_firm_id == law_firm_id,
                Case.is_deleted == False,
            )
        )
    )
    total_cases = total_cases_result.scalar() or 0

    closed_cases_result = await db.execute(
        select(func.count(Case.id)).where(
            and_(
                Case.law_firm_id == law_firm_id,
                Case.is_deleted == False,
                Case.status.in_(CLOSED_STATUSES),
            )
        )
    )
    closed_cases = closed_cases_result.scalar() or 0

    # Cases by status breakdown
    cases_by_status_result = await db.execute(
        select(Case.status, func.count(Case.id).label("count"))
        .where(
            and_(
                Case.law_firm_id == law_firm_id,
                Case.is_deleted == False,
            )
        )
        .group_by(Case.status)
    )
    cases_by_status = {s: c for s, c in cases_by_status_result.all()}

    # --- Tasks (firm-wide via JOIN) ---
    # Only count tasks that belong to active cases (not cerrado/archivado)
    PENDING_TASK_STATUSES = ["todo", "pendiente", "pending"]
    pending_tasks_result = await db.execute(
        select(func.count(Task.id))
        .join(Case, Task.case_id == Case.id)
        .where(
            and_(
                Task.is_deleted == False,
                Task.status.in_(PENDING_TASK_STATUSES),
                Case.law_firm_id == law_firm_id,
                Case.is_deleted == False,
                Case.status.in_(ACTIVE_STATUSES),
            )
        )
    )
    pending_tasks = pending_tasks_result.scalar() or 0

    in_progress_tasks_result = await db.execute(
        select(func.count(Task.id))
        .join(Case, Task.case_id == Case.id)
        .where(
            and_(
                Task.is_deleted == False,
                Task.status.in_(["en_progreso", "in_progress"]),
                Case.law_firm_id == law_firm_id,
                Case.is_deleted == False,
                Case.status.in_(ACTIVE_STATUSES),
            )
        )
    )
    in_progress_tasks = in_progress_tasks_result.scalar() or 0

    # Overdue tasks (past due_date, not completed) — only from active cases
    now = datetime.utcnow()
    overdue_tasks_result = await db.execute(
        select(func.count(Task.id))
        .join(Case, Task.case_id == Case.id)
        .where(
            and_(
                Task.is_deleted == False,
                Task.due_date < now,
                Task.status.notin_(["completado", "completed", "rechazado"]),
                Case.law_firm_id == law_firm_id,
                Case.is_deleted == False,
                Case.status.in_(ACTIVE_STATUSES),
            )
        )
    )
    overdue_tasks = overdue_tasks_result.scalar() or 0

    # --- Alerts ---
    overdue_alerts_result = await db.execute(
        select(func.count(CaseAlert.id))
        .join(Case, CaseAlert.case_id == Case.id)
        .where(
            and_(
                CaseAlert.is_deleted == False,
                CaseAlert.due_date < now,
                CaseAlert.is_resolved == False,
                Case.law_firm_id == law_firm_id,
            )
        )
    )
    overdue_alerts = overdue_alerts_result.scalar() or 0

    # --- Team ---
    users_result = await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.law_firm_id == law_firm_id,
                User.is_deleted == False,
            )
        )
    )
    total_users = users_result.scalar() or 0

    # --- Hours this month ---
    first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    hours_result = await db.execute(
        select(func.sum(CaseHours.hours))
        .join(Case, CaseHours.case_id == Case.id)
        .where(
            and_(
                CaseHours.is_deleted == False,
                CaseHours.work_date >= first_day_of_month.date(),
                Case.law_firm_id == law_firm_id,
            )
        )
    )
    hours_this_month = float(hours_result.scalar() or 0)

    # Top members by case assignment
    top_members_result = await db.execute(
        select(
            User.id,
            User.first_name,
            User.last_name,
            func.count(CaseTeam.id).label("case_count"),
        )
        .select_from(CaseTeam)
        .join(User, CaseTeam.user_id == User.id)
        .join(Case, CaseTeam.case_id == Case.id)
        .where(
            and_(
                Case.law_firm_id == law_firm_id,
                CaseTeam.is_deleted == False,
            )
        )
        .group_by(User.id, User.first_name, User.last_name)
        .order_by(func.count(CaseTeam.id).desc())
        .limit(5)
    )
    top_members = [
        {
            "user_id": str(uid),
            "name": f"{fn} {ln}".strip(),
            "case_count": cnt,
        }
        for uid, fn, ln, cnt in top_members_result.all()
    ]

    return success_response(
        data={
            "cases": {
                "active": active_cases,
                "total": total_cases,
                "closed": closed_cases,
                "by_status": cases_by_status,
            },
            "tasks": {
                "pending": pending_tasks,
                "in_progress": in_progress_tasks,
                "overdue": overdue_tasks,
            },
            "alerts": {
                "overdue": overdue_alerts,
            },
            "hours": {
                "this_month": hours_this_month,
            },
            "team": {
                "total_users": total_users,
                "top_members": top_members,
            },
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.get(
    "/audit-logs",
    response_model=dict,
    summary="Query audit logs",
    description="View audit logs for the law firm (admin_firma only)",
)
async def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("-created_at"),
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Query audit logs.
    Only firm administrators can view audit logs.
    Supports filtering and date range queries.
    """
    # Check authorization
    if not check_role(current_user.role, ["admin_firma", "super_admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only firm administrators can access audit logs",
        )

    query = select(AuditLog).where(
        AuditLog.law_firm_id == current_user.law_firm_id
    )

    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)

    if action:
        query = query.where(AuditLog.action == action)

    if user_id:
        query = query.where(AuditLog.user_id == user_id)

    if start_date:
        try:
            start = datetime.fromisoformat(start_date)
            query = query.where(AuditLog.created_at >= start)
        except ValueError:
            pass

    if end_date:
        try:
            end = datetime.fromisoformat(end_date)
            query = query.where(AuditLog.created_at <= end)
        except ValueError:
            pass

    # Get total count
    count_result = await db.execute(
        select(func.count(AuditLog.id)).select_from(
            select(AuditLog).where(
                AuditLog.law_firm_id == current_user.law_firm_id
            ).subquery()
        )
    )
    total = count_result.scalar() or 0

    # Apply sorting
    if sort.startswith("-"):
        query = query.order_by(getattr(AuditLog, sort[1:]).desc())
    else:
        query = query.order_by(getattr(AuditLog, sort))

    # Apply pagination
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    logs = result.scalars().all()

    data = [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.resource_type,
            "entity_id": str(log.resource_id) if log.resource_id else None,
            "user_id": str(log.user_id) if log.user_id else None,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]

    pages = (total + limit - 1) // limit
    return success_response(
        data=data,
        meta={
            "timestamp": datetime.utcnow().isoformat(),
            "total": total,
            "page": page,
            "pages": pages,
            "limit": limit,
        },
    )
