"""
Time tracking endpoints.
Handles hour registration and summaries.
"""

import uuid as uuid_module
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.utils.responses import success_response, paginated_response
from app.utils.auth import get_current_user
from app.models import User, Case, CaseHours, Task, CaseProcess
from app.models.billing import BillingAdjustment
from sqlalchemy.orm import joinedload
from app.services.audit_service import audit_log
from app.services.case_service import check_case_team_access
from app.services import email_service

router = APIRouter(tags=["hours"])


async def _recalculate_flat_billing_for_case(
    db: AsyncSession, case_id: uuid_module.UUID
) -> None:
    """
    If the case has tipo_facturacion='flat', redistribute precio_facturacion
    proportionally across ALL non-deleted hour records of the case.

    Formula per record:
        total_amount = precio_facturacion * (record_hours / total_case_hours)

    Called after any create / update / delete of a CaseHours record.
    Does nothing for hourly-rate cases or cases without a flat fee set.
    """
    case = await db.get(Case, case_id)
    if not case or case.tipo_facturacion != "flat" or not case.precio_facturacion:
        return

    flat_fee = float(case.precio_facturacion)

    all_hours = (
        await db.execute(
            select(CaseHours).where(
                and_(
                    CaseHours.case_id == case_id,
                    CaseHours.is_deleted == False,
                )
            )
        )
    ).scalars().all()

    if not all_hours:
        return

    total_hours = sum(float(h.hours) for h in all_hours)
    if total_hours == 0:
        return

    for h in all_hours:
        h.total_amount = round(flat_fee * (float(h.hours) / total_hours), 2)
        h.updated_at = datetime.utcnow()

    await db.flush()


async def _recalculate_flat_billing_for_task(
    db: AsyncSession, task_id: uuid_module.UUID
) -> None:
    """
    If the task belongs to a flat-rate process (CaseProcess.tipo_tarifa='plana'),
    redistribute the process tarifa proportionally across all non-deleted hour
    records linked to tasks in that process.

    Does nothing for hourly-rate processes or tasks without a process.
    """
    task = await db.get(Task, task_id)
    if not task or not task.process_id:
        return

    process = await db.get(CaseProcess, task.process_id)
    if not process or process.tipo_tarifa != "plana" or not process.tarifa:
        return

    flat_fee = float(process.tarifa)

    task_ids = (
        await db.execute(
            select(Task.id).where(
                and_(Task.process_id == task.process_id, Task.is_deleted == False)
            )
        )
    ).scalars().all()

    if not task_ids:
        return

    all_hours = (
        await db.execute(
            select(CaseHours).where(
                and_(
                    CaseHours.task_id.in_(task_ids),
                    CaseHours.is_deleted == False,
                )
            )
        )
    ).scalars().all()

    if not all_hours:
        return

    total_hours = sum(float(h.hours) for h in all_hours)
    if total_hours == 0:
        return

    for h in all_hours:
        h.total_amount = round(flat_fee * (float(h.hours) / total_hours), 2)
        h.updated_at = datetime.utcnow()

    await db.flush()


def _format_entry(entry: CaseHours, include_case: bool = False) -> dict:
    """Convert CaseHours to Spanish-named response dict."""
    user_name = None
    if entry.user:
        user_name = f"{entry.user.first_name} {entry.user.last_name}".strip()

    d = {
        "id": str(entry.id),
        "casoId": str(entry.case_id),
        "tareaId": str(entry.task_id) if entry.task_id else None,
        "usuarioId": str(entry.user_id),
        "usuario": {"id": str(entry.user_id), "nombre": user_name} if user_name else None,
        "horas": float(entry.hours) if entry.hours is not None else 0.0,
        "descripcion": entry.description,
        "fechaRegistro": entry.work_date.date().isoformat() if entry.work_date else None,
        "tarifaHora": float(entry.hourly_rate) if entry.hourly_rate is not None else 0.0,
        "montoTotal": float(entry.total_amount) if entry.total_amount is not None else 0.0,
        "esBonificable": entry.is_billable,
        "aprobado": entry.is_approved,
        "createdAt": entry.created_at.isoformat() if entry.created_at else None,
        "updatedAt": entry.updated_at.isoformat() if entry.updated_at else None,
    }
    if include_case and entry.case:
        d["numeroCaso"] = entry.case.case_number
    return d


@router.post(
    "/cases/{case_id}/hours/recalculate",
    response_model=dict,
    summary="Recalculate flat billing amounts for all hour records in a case",
)
async def recalculate_case_hours(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger a one-off flat billing recalculation for all existing hour records
    in the case. Useful to correct records created before the automatic
    recalculation was in place. No-op for hourly-rate cases.
    """
    try:
        case_uuid = uuid_module.UUID(case_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    case = await db.get(Case, case_uuid)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    await _recalculate_flat_billing_for_case(db, case_uuid)
    await db.commit()
    return success_response(data={"recalculated": True}, meta={})


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
    try:
        case_uuid = uuid_module.UUID(case_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    case = await db.get(Case, case_uuid)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    # Build filters incrementally so count matches the actual filtered results
    filters = [
        CaseHours.case_id == case_uuid,
        CaseHours.is_deleted == False,
    ]

    if user_id:
        try:
            filters.append(CaseHours.user_id == uuid_module.UUID(user_id))
        except (ValueError, AttributeError):
            pass

    if start_date:
        try:
            filters.append(CaseHours.work_date >= datetime.fromisoformat(start_date))
        except ValueError:
            pass

    if end_date:
        try:
            filters.append(CaseHours.work_date <= datetime.fromisoformat(end_date))
        except ValueError:
            pass

    combined = and_(*filters)
    query = select(CaseHours).where(combined)

    count_result = await db.execute(
        select(func.count(CaseHours.id)).where(combined)
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
    try:
        case_uuid = uuid_module.UUID(case_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    case = await db.get(Case, case_uuid)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    # Accept Spanish or English field names — use explicit None checks to avoid or-operator falsy bugs
    def _get(key_es: str, key_en: str, default=None):
        val = request.get(key_es)
        if val is None:
            val = request.get(key_en)
        return val if val is not None else default

    print(f"DEBUG register_hours — request body: {dict(request)}", flush=True)

    user_id_str = _get("usuarioId", "user_id") or str(current_user.id)
    hours_raw = _get("horas", "hours")
    description = _get("descripcion", "description")
    work_date_str = _get("fechaRegistro", "work_date")
    task_id_raw = _get("tareaId", "task_id")
    is_billable = _get("esBonificable", "is_billable", True)

    # Validate and convert hours
    if hours_raw is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hours required")
    try:
        hours_val = float(hours_raw)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid hours value")
    if hours_val <= 0 or hours_val > 24:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hours must be between 0 and 24")

    # Validate and convert hourly rate
    hourly_rate_raw = _get("tarifaHora", "hourly_rate", 0)
    try:
        hourly_rate = float(hourly_rate_raw) if hourly_rate_raw is not None else 0.0
    except (TypeError, ValueError):
        hourly_rate = 0.0

    # All roles can log hours for any member of the same firm

    try:
        user_uuid = uuid_module.UUID(user_id_str)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user")

    user = await db.get(User, user_uuid)
    if not user or user.is_deleted or user.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user")

    work_date = datetime.utcnow()
    if work_date_str:
        try:
            # If the frontend sends a date-only string (no time component), store as
            # noon UTC so that UTC±12h timezone differences never shift the date.
            normalized = work_date_str if "T" in work_date_str else work_date_str + "T12:00:00"
            work_date = datetime.fromisoformat(normalized)
        except Exception:
            pass

    total_amount = round(hours_val * hourly_rate, 2)

    import uuid as _uuid
    entry = CaseHours(
        case_id=case_uuid,
        law_firm_id=current_user.law_firm_id,
        user_id=user_uuid,  # use the resolved user, not always current_user
        task_id=_uuid.UUID(task_id_raw) if isinstance(task_id_raw, str) else task_id_raw,
        hours=hours_val,
        description=description,
        work_date=work_date,
        hourly_rate=hourly_rate,
        total_amount=total_amount,
        is_billable=bool(is_billable),
        is_deleted=False,
    )

    db.add(entry)
    await db.flush()  # get entry.id without committing yet

    # Flat billing recalculation (case-level takes priority; process-level as fallback)
    task_uuid_for_flat = None
    if isinstance(task_id_raw, str):
        try:
            task_uuid_for_flat = uuid_module.UUID(task_id_raw)
        except (ValueError, AttributeError):
            pass
    elif isinstance(task_id_raw, uuid_module.UUID):
        task_uuid_for_flat = task_id_raw

    await _recalculate_flat_billing_for_case(db, case_uuid)
    if task_uuid_for_flat:
        await _recalculate_flat_billing_for_task(db, task_uuid_for_flat)

    await db.commit()

    # Reload with user (get updated total_amount after flat recalculation)
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

    # Email notification — hours logged on a task
    try:
        if entry.task_id:
            task_obj = await db.get(Task, entry.task_id)
            if task_obj and task_obj.assignee_id and task_obj.assignee_id != current_user.id:
                from sqlalchemy.orm import selectinload as _sli
                res_u = await db.execute(
                    select(User).where(User.id == task_obj.assignee_id)
                )
                assignee = res_u.scalars().first()
                if assignee and assignee.email:
                    case_obj = await db.get(Case, entry.case_id)
                    work_date_str = entry.work_date.date().isoformat() if entry.work_date else ""
                    logged_by = f"{current_user.first_name} {current_user.last_name}".strip()
                    await email_service.notify_hours_logged(
                        to_email=assignee.email,
                        to_name=f"{assignee.first_name} {assignee.last_name}".strip(),
                        task_title=task_obj.title,
                        case_title=case_obj.title if case_obj else "",
                        hours=hours_val,
                        logged_by=logged_by,
                        work_date=work_date_str,
                        description=description,
                    )
    except Exception:
        pass

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

    # All roles can update any hour entry within the same firm

    # Accept Spanish or English field names — explicit None checks avoid falsy-value bugs (e.g. hours=0, description="")
    def _get(key_es: str, key_en: str):
        val = request.get(key_es)
        return val if val is not None else request.get(key_en)

    hours_val = _get("horas", "hours")
    description = _get("descripcion", "description")
    work_date_str = _get("fechaRegistro", "work_date")
    hourly_rate = _get("tarifaHora", "hourly_rate")

    if hours_val is not None:
        hours_val = float(hours_val)
        if hours_val <= 0 or hours_val > 24:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hours must be between 0 and 24")
        entry.hours = hours_val

    if description is not None:
        entry.description = description

    if work_date_str is not None:
        try:
            normalized = work_date_str if "T" in work_date_str else work_date_str + "T12:00:00"
            entry.work_date = datetime.fromisoformat(normalized)
        except Exception:
            pass

    if hourly_rate is not None:
        entry.hourly_rate = float(hourly_rate)
        entry.total_amount = round(float(entry.hours) * float(hourly_rate), 2)

    entry.updated_at = datetime.utcnow()

    if hours_val is not None:
        await db.flush()
        case = await db.get(Case, entry.case_id)
        if case and case.tipo_facturacion == "flat":
            # Flat billing: redistribute fee among all case hours
            await _recalculate_flat_billing_for_case(db, entry.case_id)
            if entry.task_id:
                await _recalculate_flat_billing_for_task(db, entry.task_id)
        else:
            # Hourly billing: recalculate this entry's total when hours changed
            entry.total_amount = round(float(entry.hours) * float(entry.hourly_rate), 2)

    await db.commit()

    # Reload with user
    try:
        entry_uuid_reload = uuid_module.UUID(entry_id)
    except (ValueError, AttributeError):
        entry_uuid_reload = entry_id
    result = await db.execute(
        select(CaseHours).where(CaseHours.id == entry_uuid_reload).options(selectinload(CaseHours.user))
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
    try:
        entry_uuid = uuid_module.UUID(entry_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hour entry not found")

    entry = await db.get(CaseHours, entry_uuid)

    if not entry or entry.is_deleted or entry.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hour entry not found")

    # All roles can delete any hour entry within the same firm

    # Capture ids before deleting so we can recalculate flat billing
    case_id_for_flat = entry.case_id
    task_id_for_flat = entry.task_id

    entry.is_deleted = True
    entry.deleted_at = datetime.utcnow()
    await db.flush()  # mark deleted within transaction — excluded from next queries

    # Flat billing: redistribute fee among remaining hours
    await _recalculate_flat_billing_for_case(db, case_id_for_flat)
    if task_id_for_flat:
        await _recalculate_flat_billing_for_task(db, task_id_for_flat)

    await db.commit()

    return success_response(data={"message": "Hour entry deleted"}, meta={})


@router.get(
    "/hours/firm-hours",
    response_model=dict,
    summary="Get all hours for the law firm (all users, all cases)",
)
async def get_firm_hours(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=1000),
    sort: str = Query("-work_date"),
    case_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [
        CaseHours.law_firm_id == current_user.law_firm_id,
        CaseHours.is_deleted == False,
        # Excluir horas de casos soft-deleted (is_deleted=True en la tabla cases)
        Case.is_deleted == False,
    ]

    if case_id:
        try:
            filters.append(CaseHours.case_id == uuid_module.UUID(case_id))
        except (ValueError, AttributeError):
            pass

    if user_id:
        try:
            filters.append(CaseHours.user_id == uuid_module.UUID(user_id))
        except (ValueError, AttributeError):
            pass

    if start_date:
        try:
            filters.append(CaseHours.work_date >= datetime.fromisoformat(start_date))
        except ValueError:
            pass

    if end_date:
        try:
            filters.append(CaseHours.work_date <= datetime.fromisoformat(end_date))
        except ValueError:
            pass

    combined = and_(*filters)

    count_result = await db.execute(
        select(func.count(CaseHours.id))
        .join(Case, CaseHours.case_id == Case.id)
        .where(combined)
    )
    total = count_result.scalar() or 0

    safe_sort_fields = {"work_date", "created_at", "hours"}
    sort_field = sort.lstrip("-")
    if sort_field not in safe_sort_fields:
        sort_field = "work_date"

    col = getattr(CaseHours, sort_field)
    query = (
        select(CaseHours)
        .join(Case, CaseHours.case_id == Case.id)
        .where(combined)
        .order_by(col.desc() if sort.startswith("-") else col)
        .offset((page - 1) * limit)
        .limit(limit)
        .options(selectinload(CaseHours.user), selectinload(CaseHours.case))
    )

    result = await db.execute(query)
    entries = result.scalars().all()

    data = [_format_entry(e, include_case=True) for e in entries]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.get(
    "/hours/firm-adjustments",
    response_model=dict,
    summary="Get all billing adjustments for the law firm (for global billing dashboard)",
)
async def get_firm_adjustments(
    limit: int = Query(1000, ge=1, le=5000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BillingAdjustment)
        .join(Case, BillingAdjustment.case_id == Case.id)
        .where(
            and_(
                BillingAdjustment.law_firm_id == current_user.law_firm_id,
                BillingAdjustment.is_deleted == False,
                Case.is_deleted == False,
            )
        )
        .order_by(BillingAdjustment.fecha_aplicacion.asc().nullslast(), BillingAdjustment.created_at.asc())
        .limit(limit)
        .options(selectinload(BillingAdjustment.case))
    )
    adjustments = result.scalars().all()

    data = [
        {
            "id": str(a.id),
            "casoId": str(a.case_id),
            "casoTitulo": a.case.title if a.case else None,
            "moneda": a.case.moneda_facturacion if a.case else "PEN",
            "descripcion": a.descripcion,
            "monto": float(a.monto),
            "fechaAplicacion": a.fecha_aplicacion.isoformat() if a.fecha_aplicacion else None,
            "createdAt": a.created_at.isoformat() if a.created_at else None,
        }
        for a in adjustments
    ]
    return paginated_response(data=data, total=len(data), page=1, pages=1, limit=limit, meta={})


@router.get(
    "/hours/my-hours",
    response_model=dict,
    summary="Get current user's hours",
)
async def get_my_hours(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=1000),
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
    try:
        case_uuid = uuid_module.UUID(case_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    case = await db.get(Case, case_uuid)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    base_filter = and_(
        CaseHours.case_id == case_uuid,
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
