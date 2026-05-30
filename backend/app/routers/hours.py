"""
Time tracking endpoints.
Handles hour registration and summaries.
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
from app.models import User, Case, CaseHours
from app.services.audit_service import audit_log
from app.services.case_service import check_case_team_access

router = APIRouter(tags=["hours"])


def _format_entry(entry: CaseHours, include_case: bool = False) -> dict:
    """Convert CaseHours to Spanish-named response dict."""
    user_name = None
    if entry.user:
        user_name = f"{entry.user.first_name} {entry.user.last_name}".strip()

    d = {
        "id": str(entry.id),
        "casoId": str(entry.case_id),
        "usuarioId": str(entry.user_id),
        "usuario": {"id": str(entry.user_id), "nombre": user_name} if user_name else None,
        "horas": float(entry.hours),
        "descripcion": entry.description,
        "fechaRegistro": entry.work_date.isoformat() if entry.work_date else None,
        "tarifaHora": float(entry.hourly_rate) if entry.hourly_rate else 0,
        "montoTotal": float(entry.total_amount) if entry.total_amount else 0,
        "esBonificable": entry.is_billable,
        "aprobado": entry.is_approved,
        "createdAt": entry.created_at.isoformat() if entry.created_at else None,
        "updatedAt": entry.updated_at.isoformat() if entry.updated_at else None,
    }
    if include_case and entry.case:
        d["numeroCaso"] = entry.case.case_number
    return d


@router.get(
    "/cases/{case_id}/hours",
    response_model=dict,
    summary="List hours for case",
)
async def list_case_hours(
    case_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("-work_date"),
    user_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    await check_case_team_access(db, case_id, current_user)

    base_filter = and_(
        CaseHours.case_id == case_id,
        CaseHours.is_deleted == False,
    )
    query = select(CaseHours).where(base_filter)

    if user_id:
        query = query.where(CaseHours.user_id == user_id)

    if start_date:
        try:
            start = datetime.fromisoformat(start_date)
            query = query.where(CaseHours.work_date >= start)
        except ValueError:
            pass

    if end_date:
        try:
            end = datetime.fromisoformat(end_date)
            query = query.where(CaseHours.work_date <= end)
        except ValueError:
            pass

    count_result = await db.execute(
        select(func.count(CaseHours.id)).where(base_filter)
    )
    total = count_result.scalar() or 0

    # Safe sorting
    safe_sort_fields = {"work_date", "created_at", "hours"}
    sort_field = sort.lstrip("-")
    if sort_field not in safe_sort_fields:
        sort_field = "work_date"

    col = getattr(CaseHours, sort_field)
    query = query.order_by(col.desc() if sort.startswith("-") else col)
    query = query.offset((page - 1) * limit).limit(limit)
    query = query.options(selectinload(CaseHours.user))

    result = await db.execute(query)
    entries = result.scalars().all()

    data = [_format_entry(e) for e in entries]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.post(
    "/cases/{case_id}/hours",
    response_model=dict,
    summary="Register hours",
    status_code=status.HTTP_201_CREATED,
)
async def register_hours(
    case_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    # Accept Spanish or English field names
    user_id_str = request.get("usuarioId") or request.get("user_id") or str(current_user.id)
    hours_val = request.get("horas") or request.get("hours")
    description = request.get("descripcion") or request.get("description")
    work_date_str = request.get("fechaRegistro") or request.get("work_date")
    hourly_rate = float(request.get("tarifaHora") or request.get("hourly_rate") or 0)
    is_billable = request.get("esBonificable") or request.get("is_billable") or True
    task_id = request.get("tareaId") or request.get("task_id")

    if not hours_val:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hours required")

    hours_val = float(hours_val)
    if hours_val <= 0 or hours_val > 24:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hours must be between 0 and 24")

    # Check permission to log for others
    if user_id_str != str(current_user.id):
        from app.utils.auth import check_role
        if not check_role(current_user.role, ["admin_firma", "super_admin"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only register hours for yourself",
            )

    user = await db.get(User, user_id_str)
    if not user or user.is_deleted or user.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user")

    work_date = datetime.utcnow()
    if work_date_str:
        try:
            work_date = datetime.fromisoformat(work_date_str)
        except Exception:
            pass

    total_amount = hours_val * hourly_rate

    entry = CaseHours(
        case_id=case_id,
        law_firm_id=current_user.law_firm_id,
        user_id=user_id_str,
        task_id=task_id,
        hours=hours_val,
        description=description,
        work_date=work_date,
        hourly_rate=hourly_rate,
        total_amount=total_amount,
        is_billable=bool(is_billable),
        is_deleted=False,
    )

    db.add(entry)
    await db.commit()

    # Reload with user
    result = await db.execute(
        select(CaseHours).where(CaseHours.id == entry.id).options(selectinload(CaseHours.user))
    )
    entry = result.scalars().first()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="CREATE",
        entity_type="CaseHours",
        entity_id=entry.id,
        description=f"Hours registered: {hours_val} hours",
    )

    return success_response(data=_format_entry(entry), meta={})


@router.patch(
    "/hours/{entry_id}",
    response_model=dict,
    summary="Update hour entry",
)
async def update_hours(
    entry_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CaseHours).where(CaseHours.id == entry_id).options(selectinload(CaseHours.user))
    )
    entry = result.scalars().first()

    if not entry or entry.is_deleted or entry.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hour entry not found")

    from app.utils.auth import check_role
    is_self = str(entry.user_id) == str(current_user.id)
    is_admin = check_role(current_user.role, ["admin_firma", "super_admin"])

    if not is_self and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own hour entries",
        )

    # Accept Spanish or English field names
    hours_val = request.get("horas") or request.get("hours")
    description = request.get("descripcion") or request.get("description")
    work_date_str = request.get("fechaRegistro") or request.get("work_date")
    hourly_rate = request.get("tarifaHora") or request.get("hourly_rate")

    if hours_val is not None:
        hours_val = float(hours_val)
        if hours_val <= 0 or hours_val > 24:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hours must be between 0 and 24")
        entry.hours = hours_val

    if description is not None:
        entry.description = description

    if work_date_str is not None:
        try:
            entry.work_date = datetime.fromisoformat(work_date_str)
        except Exception:
            pass

    if hourly_rate is not None:
        entry.hourly_rate = float(hourly_rate)
        entry.total_amount = float(entry.hours) * float(hourly_rate)

    entry.updated_at = datetime.utcnow()
    await db.commit()

    # Reload
    result = await db.execute(
        select(CaseHours).where(CaseHours.id == entry_id).options(selectinload(CaseHours.user))
    )
    entry = result.scalars().first()

    return success_response(data=_format_entry(entry), meta={})


@router.delete(
    "/hours/{entry_id}",
    response_model=dict,
    summary="Delete hour entry",
)
async def delete_hours(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await db.get(CaseHours, entry_id)

    if not entry or entry.is_deleted or entry.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hour entry not found")

    from app.utils.auth import check_role
    is_self = str(entry.user_id) == str(current_user.id)
    is_admin = check_role(current_user.role, ["admin_firma", "super_admin"])

    if not is_self and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    entry.is_deleted = True
    entry.deleted_at = datetime.utcnow()
    await db.commit()

    return success_response(data={"message": "Hour entry deleted"}, meta={})


@router.get(
    "/hours/my-hours",
    response_model=dict,
    summary="Get current user's hours",
)
async def get_my_hours(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("-work_date"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base_filter = and_(
        CaseHours.user_id == current_user.id,
        CaseHours.is_deleted == False,
    )
    query = select(CaseHours).where(base_filter)

    if start_date:
        try:
            start = datetime.fromisoformat(start_date)
            query = query.where(CaseHours.work_date >= start)
        except ValueError:
            pass

    if end_date:
        try:
            end = datetime.fromisoformat(end_date)
            query = query.where(CaseHours.work_date <= end)
        except ValueError:
            pass

    count_result = await db.execute(
        select(func.count(CaseHours.id)).where(base_filter)
    )
    total = count_result.scalar() or 0

    safe_sort_fields = {"work_date", "created_at", "hours"}
    sort_field = sort.lstrip("-")
    if sort_field not in safe_sort_fields:
        sort_field = "work_date"

    col = getattr(CaseHours, sort_field)
    query = query.order_by(col.desc() if sort.startswith("-") else col)
    query = query.offset((page - 1) * limit).limit(limit)
    query = query.options(selectinload(CaseHours.user), selectinload(CaseHours.case))

    result = await db.execute(query)
    entries = result.scalars().all()

    data = [_format_entry(e, include_case=True) for e in entries]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.get(
    "/cases/{case_id}/hours/summary",
    response_model=dict,
    summary="Get hours summary",
)
async def get_hours_summary(
    case_id: str,
    group_by: str = Query("user", pattern="^(user|day)$"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    await check_case_team_access(db, case_id, current_user)

    base_filter = and_(
        CaseHours.case_id == case_id,
        CaseHours.is_deleted == False,
    )
    query = select(CaseHours).where(base_filter)

    if start_date:
        try:
            query = query.where(CaseHours.work_date >= datetime.fromisoformat(start_date))
        except ValueError:
            pass
    if end_date:
        try:
            query = query.where(CaseHours.work_date <= datetime.fromisoformat(end_date))
        except ValueError:
            pass

    result = await db.execute(query.options(selectinload(CaseHours.user)))
    entries = result.scalars().all()

    summary = {}

    if group_by == "user":
        for entry in entries:
            uid = str(entry.user_id)
            if uid not in summary:
                nombre = (
                    f"{entry.user.first_name} {entry.user.last_name}".strip()
                    if entry.user else None
                )
                summary[uid] = {"usuarioId": uid, "nombre": nombre, "totalHoras": 0.0}
            summary[uid]["totalHoras"] += float(entry.hours)
        data = list(summary.values())
    else:  # day
        for entry in entries:
            day = entry.work_date.date().isoformat() if entry.work_date else "unknown"
            if day not in summary:
                summary[day] = {"fecha": day, "totalHoras": 0.0}
            summary[day]["totalHoras"] += float(entry.hours)
        data = sorted(summary.values(), key=lambda x: x["fecha"])

    total_hours = sum(float(e.hours) for e in entries)

    return success_response(
        data={"summary": data, "totalHoras": total_hours, "groupBy": group_by},
        meta={},
    )
