"""
Task management endpoints.
Accepts Spanish field names from frontend, returns Spanish names in responses.
"""

import uuid as uuid_module
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload, contains_eager

from app.database import get_db
from app.utils.responses import success_response, paginated_response
from app.utils.auth import get_current_user
from app.models import User, Case, Task, CaseProcess, CaseHours, Client
from app.models.case import CaseClient
from app.models.case import CaseClient
from app.services.audit_service import audit_log
from app.services.case_service import check_case_team_access
from app.services import email_service

router = APIRouter(tags=["tasks"])


async def _get_client_names(db: AsyncSession, case_ids: set) -> dict:
    """Return {case_id_str: client_name} for the primary client of each case."""
    if not case_ids:
        return {}
    rows = (await db.execute(
        select(CaseClient.case_id, Client.name)
        .join(Client, Client.id == CaseClient.client_id)
        .where(
            and_(
                CaseClient.case_id.in_(case_ids),
                CaseClient.is_primary == True,
                CaseClient.is_deleted == False,
            )
        )
    )).all()
    return {str(row.case_id): row.name for row in rows}

# Cases with these statuses are considered "inactive".
# Tasks that belong to inactive cases are hidden from global/my-tasks views
# but remain visible when browsing a specific case (Cases → Case → Tareas).
INACTIVE_CASE_STATUSES = ["inactivo"]


def _format_task(task: Task, client_names: dict | None = None) -> dict:
    """Convert Task model to Spanish-named dict for frontend Tarea type."""
    names = client_names or {}
    assignee_data = None
    if task.assignee:
        assignee_data = {
            "id": str(task.assignee_id),
            "nombre": f"{task.assignee.first_name} {task.assignee.last_name}".strip(),
            "email": task.assignee.email,
            "rol": task.assignee.role,
            "bufeteId": str(task.assignee.law_firm_id),
            "createdAt": task.assignee.created_at.isoformat() if task.assignee.created_at else None,
            "updatedAt": task.assignee.updated_at.isoformat() if task.assignee.updated_at else None,
        }
    return {
        "id": str(task.id),
        "casoId": str(task.case_id),
        "casoTitulo": task.case.title if task.case else None,
        "procesoId": str(task.process_id) if task.process_id else None,
        "procesoTitulo": task.process.titulo if task.process else None,
        "clienteNombre": names.get(str(task.case_id)),
        "titulo": task.title,
        "descripcion": task.description,
        "estado": task.status,
        "prioridad": task.priority,
        "asignadoA": assignee_data,
        "asignadoAId": str(task.assignee_id) if task.assignee_id else None,
        "fechaPresentacion": task.presentation_date.date().isoformat() if task.presentation_date else None,
        "fechaVencimiento": task.due_date.date().isoformat() if task.due_date else None,
        "completadoEn": task.completed_date.date().isoformat() if task.completed_date else None,
        "createdAt": task.created_at.isoformat() if task.created_at else None,
        "updatedAt": task.updated_at.isoformat() if task.updated_at else None,
    }


@router.get("/tasks", response_model=dict, summary="List all tasks for the law firm")
async def list_all_tasks(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    assignee_filter: Optional[str] = Query(None, alias="assignee"),
    case_filter: Optional[str] = Query(None, alias="case_id"),
    client_filter: Optional[str] = Query(None, alias="client_id"),
    due_filter: Optional[str] = Query(None, alias="due"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import timedelta

    conditions = [
        Task.law_firm_id == current_user.law_firm_id,
        Task.is_deleted == False,
    ]

    if status_filter:
        conditions.append(Task.status == status_filter)

    if priority_filter:
        conditions.append(Task.priority == priority_filter)

    if assignee_filter == "me":
        conditions.append(Task.assignee_id == current_user.id)
    elif assignee_filter == "unassigned":
        conditions.append(Task.assignee_id == None)
    elif assignee_filter:
        try:
            conditions.append(Task.assignee_id == uuid_module.UUID(assignee_filter))
        except (ValueError, AttributeError):
            pass

    if case_filter:
        try:
            conditions.append(Task.case_id == uuid_module.UUID(case_filter))
        except (ValueError, AttributeError):
            pass

    # Client filter: join through case_clients
    client_uuid = None
    if client_filter:
        try:
            client_uuid = uuid_module.UUID(client_filter)
        except (ValueError, AttributeError):
            pass

    now = datetime.utcnow()
    if due_filter == "overdue":
        conditions.append(Task.due_date < now)
        conditions.append(Task.status != "done")
        conditions.append(Task.status != "completado")
    elif due_filter == "today":
        conditions.append(Task.due_date >= now.replace(hour=0, minute=0, second=0))
        conditions.append(Task.due_date < now.replace(hour=23, minute=59, second=59))
    elif due_filter == "this_week":
        conditions.append(Task.due_date >= now)
        conditions.append(Task.due_date <= now + timedelta(days=7))
    elif due_filter == "this_month":
        conditions.append(Task.due_date >= now)
        conditions.append(Task.due_date <= now + timedelta(days=30))

    count_q = select(func.count(Task.id)).where(and_(*conditions))
    main_q = (
        select(Task)
        .where(and_(*conditions))
        .options(selectinload(Task.assignee), selectinload(Task.case), selectinload(Task.process))
        .order_by(Task.due_date.asc().nulls_last(), Task.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )

    # Hide tasks from inactive (cerrado/archivado) cases in the global view.
    # Exception: if the caller already filtered by a specific case, honour that
    # explicitly (the user navigated into that case on purpose).
    if not case_filter:
        count_q = count_q.join(Case, Case.id == Task.case_id).where(
            Case.status.notin_(INACTIVE_CASE_STATUSES),
            Case.is_deleted == False,
        )
        main_q = main_q.join(Case, Case.id == Task.case_id).where(
            Case.status.notin_(INACTIVE_CASE_STATUSES),
            Case.is_deleted == False,
        )
    else:
        # Even when filtering by a specific case, exclude deleted cases
        count_q = count_q.join(Case, Case.id == Task.case_id).where(Case.is_deleted == False)
        main_q = main_q.join(Case, Case.id == Task.case_id).where(Case.is_deleted == False)

    if client_uuid is not None:
        count_q = (
            count_q
            .join(CaseClient, CaseClient.case_id == Task.case_id)
            .where(CaseClient.client_id == client_uuid)
        )
        main_q = (
            main_q
            .join(CaseClient, CaseClient.case_id == Task.case_id)
            .where(CaseClient.client_id == client_uuid)
        )

    count_result = await db.execute(count_q)
    total = count_result.scalar() or 0

    query = main_q
    result = await db.execute(query)
    tasks = result.scalars().all()

    client_names = await _get_client_names(db, {t.case_id for t in tasks})
    data = [_format_task(t, client_names) for t in tasks]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.get("/tasks/my-tasks", response_model=dict, summary="Get current user's tasks")
async def get_my_tasks(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).where(
        and_(
            Task.assignee_id == current_user.id,
            Task.law_firm_id == current_user.law_firm_id,
            Task.is_deleted == False,
        )
    ).options(selectinload(Task.assignee), selectinload(Task.case), selectinload(Task.process))

    if status_filter:
        query = query.where(Task.status == status_filter)

    # Exclude tasks from inactive cases (same rule as the global list)
    query = query.join(Case, Case.id == Task.case_id).where(
        Case.status.notin_(INACTIVE_CASE_STATUSES)
    )

    count_query = select(func.count(Task.id)).where(
        and_(
            Task.assignee_id == current_user.id,
            Task.law_firm_id == current_user.law_firm_id,
            Task.is_deleted == False,
        )
    )
    if status_filter:
        count_query = count_query.where(Task.status == status_filter)
    count_query = count_query.join(Case, Case.id == Task.case_id).where(
        Case.status.notin_(INACTIVE_CASE_STATUSES)
    )
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"[my-tasks] user_id={current_user.id} law_firm_id={current_user.law_firm_id} total={total}")

    query = query.order_by(Task.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    tasks = result.scalars().all()

    logger.warning(f"[my-tasks] tasks found: {len(tasks)}")

    client_names = await _get_client_names(db, {t.case_id for t in tasks})
    data = [_format_task(t, client_names) for t in tasks]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.get("/cases/{case_id}/tasks", response_model=dict, summary="List case tasks")
async def list_case_tasks(
    case_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
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

    query = select(Task).where(
        and_(Task.case_id == case_uuid, Task.is_deleted == False)
    ).options(selectinload(Task.assignee), selectinload(Task.case), selectinload(Task.process))

    if status_filter:
        query = query.where(Task.status == status_filter)

    count_result = await db.execute(
        select(func.count(Task.id)).where(and_(Task.case_id == case_uuid, Task.is_deleted == False))
    )
    total = count_result.scalar() or 0
    pages = (total + limit - 1) // limit if total > 0 else 1

    query = query.order_by(Task.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    tasks = result.scalars().all()

    data = [_format_task(t) for t in tasks]
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.post("/cases/{case_id}/tasks", response_model=dict, summary="Create task", status_code=201)
async def create_task(
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

    # Accept both Spanish and English field names
    title = request.get("titulo") or request.get("title") or ""
    description = request.get("descripcion") or request.get("description")
    priority = request.get("prioridad") or request.get("priority") or "medium"
    assignee_id = request.get("asignadoAId") or request.get("assignee_id")
    due_date_str = request.get("fechaVencimiento") or request.get("due_date")
    presentation_date_str = request.get("fechaPresentacion") or request.get("presentation_date")
    task_status = request.get("estado") or request.get("status") or "todo"
    process_id_raw = request.get("procesoId") or request.get("process_id")

    def _parse_date(s: str):
        """Parse date string, normalizing date-only strings to noon UTC to avoid timezone shifts."""
        normalized = s if "T" in s else s + "T12:00:00"
        return datetime.fromisoformat(normalized)

    due_date = None
    if due_date_str:
        try:
            due_date = _parse_date(due_date_str)
        except Exception:
            due_date = None

    presentation_date = None
    if presentation_date_str:
        try:
            presentation_date = _parse_date(presentation_date_str)
        except Exception:
            presentation_date = None

    assignee_uuid = None
    if assignee_id:
        try:
            assignee_uuid = uuid_module.UUID(assignee_id)
        except (ValueError, AttributeError):
            assignee_uuid = None

    # Validate process_id if provided
    process_uuid = None
    if process_id_raw:
        try:
            process_uuid = uuid_module.UUID(process_id_raw)
            proc = await db.get(CaseProcess, process_uuid)
            if not proc or proc.is_deleted or proc.case_id != case_uuid:
                raise HTTPException(status_code=422, detail="El proceso no pertenece a este caso")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=422, detail="process_id inválido")

    task = Task(
        case_id=case_uuid,
        law_firm_id=current_user.law_firm_id,
        title=title,
        description=description,
        status=task_status,
        priority=priority,
        due_date=due_date,
        presentation_date=presentation_date,
        assignee_id=assignee_uuid,
        process_id=process_uuid,
        is_deleted=False,
    )

    db.add(task)
    await db.commit()

    # Reload with assignee
    result = await db.execute(
        select(Task).where(Task.id == task.id).options(selectinload(Task.assignee), selectinload(Task.case), selectinload(Task.process))
    )
    task = result.scalars().first()

    try:
        await audit_log(
            db=db,
            law_firm_id=str(current_user.law_firm_id),
            user_id=str(current_user.id),
            action="CREATE",
            entity_type="Task",
            entity_id=str(task.id),
        )
        await db.commit()
    except Exception:
        pass

    # Email notification — new task assigned
    if task.assignee and task.assignee.email and task.assignee_id != current_user.id:
        try:
            await email_service.notify_task_assigned(
                to_email=task.assignee.email,
                to_name=f"{task.assignee.first_name} {task.assignee.last_name}".strip(),
                task_title=task.title,
                case_title=task.case.title if task.case else "",
                priority=task.priority,
                due_date=task.due_date.date().isoformat() if task.due_date else None,
                assigned_by=f"{current_user.first_name} {current_user.last_name}".strip(),
            )
        except Exception:
            pass

    return success_response(data=_format_task(task), meta={})


@router.get("/tasks/{task_id}", response_model=dict, summary="Get task")
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        task_uuid = uuid_module.UUID(task_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    result = await db.execute(
        select(Task).where(Task.id == task_uuid).options(selectinload(Task.assignee))
    )
    task = result.scalars().first()

    if not task or task.is_deleted or task.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    return success_response(data=_format_task(task), meta={})


@router.patch("/tasks/{task_id}", response_model=dict, summary="Update task")
async def update_task(
    task_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        task_uuid = uuid_module.UUID(task_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    result = await db.execute(
        select(Task).where(Task.id == task_uuid).options(selectinload(Task.assignee))
    )
    task = result.scalars().first()

    if not task or task.is_deleted or task.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    old_assignee_id = task.assignee_id
    old_status = task.status

    # Accept Spanish or English field names
    if "titulo" in request:
        task.title = request["titulo"]
    elif "title" in request:
        task.title = request["title"]

    if "descripcion" in request:
        task.description = request["descripcion"]
    elif "description" in request:
        task.description = request["description"]

    if "estado" in request:
        task.status = request["estado"]
    elif "status" in request:
        task.status = request["status"]

    if "prioridad" in request:
        task.priority = request["prioridad"]
    elif "priority" in request:
        task.priority = request["priority"]

    if "asignadoAId" in request:
        raw_assignee = request["asignadoAId"]
        if raw_assignee:
            try:
                task.assignee_id = uuid_module.UUID(raw_assignee)
            except (ValueError, AttributeError):
                task.assignee_id = None
        else:
            task.assignee_id = None
    elif "assignee_id" in request:
        raw_assignee = request["assignee_id"]
        if raw_assignee:
            try:
                task.assignee_id = uuid_module.UUID(raw_assignee)
            except (ValueError, AttributeError):
                task.assignee_id = None
        else:
            task.assignee_id = None

    def _parse_date(s: str):
        normalized = s if "T" in s else s + "T12:00:00"
        return datetime.fromisoformat(normalized)

    if "fechaVencimiento" in request and request["fechaVencimiento"]:
        try:
            task.due_date = _parse_date(request["fechaVencimiento"])
        except Exception:
            pass
    elif "due_date" in request and request["due_date"]:
        try:
            task.due_date = _parse_date(request["due_date"])
        except Exception:
            pass

    if "fechaPresentacion" in request and request["fechaPresentacion"]:
        try:
            task.presentation_date = _parse_date(request["fechaPresentacion"])
        except Exception:
            pass
    elif "presentation_date" in request and request["presentation_date"]:
        try:
            task.presentation_date = _parse_date(request["presentation_date"])
        except Exception:
            pass

    if "procesoId" in request or "process_id" in request:
        raw_proc = request.get("procesoId") or request.get("process_id")
        if raw_proc:
            try:
                task.process_id = uuid_module.UUID(raw_proc)
            except (ValueError, AttributeError):
                pass

    task.updated_at = datetime.utcnow()
    task.updated_by = current_user.id
    await db.commit()

    result2 = await db.execute(
        select(Task)
        .where(Task.id == task_uuid)
        .options(selectinload(Task.assignee), selectinload(Task.case))
    )
    task = result2.scalars().first()

    # Email notifications after update
    try:
        assignee = task.assignee
        if assignee and assignee.email:
            assigned_by = f"{current_user.first_name} {current_user.last_name}".strip()
            # Newly assigned
            if task.assignee_id != old_assignee_id and task.assignee_id != current_user.id:
                await email_service.notify_task_assigned(
                    to_email=assignee.email,
                    to_name=f"{assignee.first_name} {assignee.last_name}".strip(),
                    task_title=task.title,
                    case_title=task.case.title if task.case else "",
                    priority=task.priority,
                    due_date=task.due_date.date().isoformat() if task.due_date else None,
                    assigned_by=assigned_by,
                )
            # Status changed
            elif task.status != old_status:
                await email_service.notify_task_status_changed(
                    to_email=assignee.email,
                    to_name=f"{assignee.first_name} {assignee.last_name}".strip(),
                    task_title=task.title,
                    case_title=task.case.title if task.case else "",
                    old_status=old_status,
                    new_status=task.status,
                    changed_by=assigned_by,
                )
    except Exception:
        pass

    client_names = await _get_client_names(db, {task.case_id})
    return success_response(data=_format_task(task, client_names), meta={})


@router.delete("/tasks/{task_id}", response_model=dict, summary="Soft-delete a task and its hours")
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Soft-deletes a task AND all hour records associated with it.
    Does not affect the user who created/was assigned to the task.
    """
    from sqlalchemy import update as sa_update

    try:
        task_uuid = uuid_module.UUID(task_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    result = await db.execute(select(Task).where(Task.id == task_uuid))
    task = result.scalars().first()

    if not task or task.is_deleted or task.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    now = datetime.utcnow()

    # Soft-delete associated hours first
    await db.execute(
        sa_update(CaseHours)
        .where(CaseHours.task_id == task_uuid, CaseHours.is_deleted == False)
        .values(is_deleted=True, deleted_at=now)
    )

    # Soft-delete the task
    task.is_deleted = True
    task.deleted_at = now
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="DELETE",
        entity_type="Task",
        entity_id=task.id,
        description=f"Task deleted: {task.title}",
    )

    return success_response(data={"message": "Task and its hours deleted"}, meta={})
