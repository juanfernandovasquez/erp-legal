"""
Case process (stage/phase) endpoints.
Each case can have multiple ordered processes; tasks must belong to a process.
Creating or completing a process auto-generates a timeline event.
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
from app.models import User, Case, CaseProcess, Task
from app.models.timeline import CaseEvent
from app.services.audit_service import audit_log

router = APIRouter(tags=["processes"])


def _format_process(proc: CaseProcess, task_counts: Optional[dict] = None) -> dict:
    """Convert CaseProcess model to Spanish-named dict for the frontend."""
    counts = task_counts or {}
    return {
        "id": str(proc.id),
        "casoId": str(proc.case_id),
        "titulo": proc.titulo,
        "descripcion": proc.descripcion,
        "estado": proc.estado,
        "orden": proc.orden,
        "fechaInicio": proc.fecha_inicio.isoformat() if proc.fecha_inicio else None,
        "fechaFin": proc.fecha_fin.isoformat() if proc.fecha_fin else None,
        "totalTareas": counts.get(str(proc.id), {}).get("total", 0),
        "tareasCompletadas": counts.get(str(proc.id), {}).get("done", 0),
        "createdAt": proc.created_at.isoformat() if proc.created_at else None,
        "updatedAt": proc.updated_at.isoformat() if proc.updated_at else None,
    }


async def _create_timeline_event(
    db: AsyncSession,
    case_id: uuid_module.UUID,
    law_firm_id: uuid_module.UUID,
    user_id: uuid_module.UUID,
    event_type: str,
    title: str,
    description: str,
) -> None:
    """Insert an immutable CaseEvent into the timeline."""
    try:
        event = CaseEvent(
            case_id=case_id,
            law_firm_id=law_firm_id,
            event_type=event_type,
            title=title,
            description=description,
            event_date=datetime.utcnow(),
            created_by=user_id,
            is_deleted=False,
        )
        db.add(event)
        await db.flush()
    except Exception:
        # Timeline entry is best-effort; don't fail the main operation
        pass


# ── List processes for a case ─────────────────────────────────────────────────

@router.get(
    "/cases/{case_id}/processes",
    response_model=dict,
    summary="List processes for a case",
)
async def list_case_processes(
    case_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        case_uuid = uuid_module.UUID(case_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Case not found")

    case = await db.get(Case, case_uuid)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=404, detail="Case not found")

    query = (
        select(CaseProcess)
        .where(
            and_(
                CaseProcess.case_id == case_uuid,
                CaseProcess.is_deleted == False,
            )
        )
        .order_by(CaseProcess.orden.asc(), CaseProcess.created_at.asc())
        .offset((page - 1) * limit)
        .limit(limit)
    )

    count_q = select(func.count(CaseProcess.id)).where(
        and_(CaseProcess.case_id == case_uuid, CaseProcess.is_deleted == False)
    )

    total = (await db.execute(count_q)).scalar() or 0
    processes = (await db.execute(query)).scalars().all()

    # Collect task counts per process in one query
    if processes:
        proc_ids = [p.id for p in processes]
        tc_q = (
            select(Task.process_id, func.count(Task.id).label("total"))
            .where(and_(Task.process_id.in_(proc_ids), Task.is_deleted == False))
            .group_by(Task.process_id)
        )
        done_q = (
            select(Task.process_id, func.count(Task.id).label("done"))
            .where(
                and_(
                    Task.process_id.in_(proc_ids),
                    Task.is_deleted == False,
                    Task.status.in_(["completado", "done"]),
                )
            )
            .group_by(Task.process_id)
        )
        tc_rows = (await db.execute(tc_q)).all()
        done_rows = (await db.execute(done_q)).all()

        counts: dict = {}
        for row in tc_rows:
            counts.setdefault(str(row.process_id), {})["total"] = row.total
        for row in done_rows:
            counts.setdefault(str(row.process_id), {})["done"] = row.done
    else:
        counts = {}

    data = [_format_process(p, counts) for p in processes]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


# ── Create process ────────────────────────────────────────────────────────────

@router.post(
    "/cases/{case_id}/processes",
    response_model=dict,
    status_code=201,
    summary="Create a process for a case",
)
async def create_case_process(
    case_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        case_uuid = uuid_module.UUID(case_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Case not found")

    case = await db.get(Case, case_uuid)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=404, detail="Case not found")

    titulo = (request.get("titulo") or "").strip()
    if not titulo:
        raise HTTPException(status_code=422, detail="El título del proceso es requerido")

    descripcion = request.get("descripcion")
    estado = request.get("estado", "pendiente")

    # Auto-calculate next order number
    max_orden_result = await db.execute(
        select(func.coalesce(func.max(CaseProcess.orden), 0)).where(
            and_(CaseProcess.case_id == case_uuid, CaseProcess.is_deleted == False)
        )
    )
    next_orden = (max_orden_result.scalar() or 0) + 1

    proc = CaseProcess(
        case_id=case_uuid,
        law_firm_id=current_user.law_firm_id,
        titulo=titulo,
        descripcion=descripcion,
        estado=estado,
        orden=next_orden,
        created_by=current_user.id,
        is_deleted=False,
    )
    db.add(proc)
    await db.flush()

    # Auto timeline event
    await _create_timeline_event(
        db=db,
        case_id=case_uuid,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        event_type="proceso_iniciado",
        title=f"Proceso iniciado: {titulo}",
        description=descripcion or f"Se inició el proceso '{titulo}' en el caso.",
    )

    await db.commit()

    try:
        await audit_log(
            db=db,
            law_firm_id=str(current_user.law_firm_id),
            user_id=str(current_user.id),
            action="CREATE",
            entity_type="CaseProcess",
            entity_id=str(proc.id),
        )
        await db.commit()
    except Exception:
        pass

    return success_response(data=_format_process(proc), meta={})


# ── Update process ────────────────────────────────────────────────────────────

@router.patch(
    "/processes/{process_id}",
    response_model=dict,
    summary="Update a process",
)
async def update_case_process(
    process_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        proc_uuid = uuid_module.UUID(process_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Process not found")

    proc = await db.get(CaseProcess, proc_uuid)
    if not proc or proc.is_deleted or proc.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=404, detail="Process not found")

    old_estado = proc.estado

    if "titulo" in request and request["titulo"]:
        proc.titulo = request["titulo"].strip()
    if "descripcion" in request:
        proc.descripcion = request["descripcion"]
    if "estado" in request:
        proc.estado = request["estado"]
    if "orden" in request:
        proc.orden = int(request["orden"])
    if "fechaInicio" in request and request["fechaInicio"]:
        try:
            proc.fecha_inicio = datetime.fromisoformat(request["fechaInicio"])
        except Exception:
            pass
    if "fechaFin" in request and request["fechaFin"]:
        try:
            proc.fecha_fin = datetime.fromisoformat(request["fechaFin"])
        except Exception:
            pass

    proc.updated_at = datetime.utcnow()
    proc.updated_by = current_user.id
    await db.flush()

    # Auto timeline event when a process is completed
    if old_estado != "completado" and proc.estado == "completado":
        await _create_timeline_event(
            db=db,
            case_id=proc.case_id,
            law_firm_id=current_user.law_firm_id,
            user_id=current_user.id,
            event_type="proceso_completado",
            title=f"Proceso completado: {proc.titulo}",
            description=f"El proceso '{proc.titulo}' fue marcado como completado.",
        )

    await db.commit()
    return success_response(data=_format_process(proc), meta={})


# ── Delete process ────────────────────────────────────────────────────────────

@router.delete(
    "/processes/{process_id}",
    response_model=dict,
    summary="Soft-delete a process",
)
async def delete_case_process(
    process_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        proc_uuid = uuid_module.UUID(process_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Process not found")

    proc = await db.get(CaseProcess, proc_uuid)
    if not proc or proc.is_deleted or proc.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=404, detail="Process not found")

    # Check for active tasks
    active_tasks_count = (
        await db.execute(
            select(func.count(Task.id)).where(
                and_(Task.process_id == proc_uuid, Task.is_deleted == False)
            )
        )
    ).scalar() or 0

    if active_tasks_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"No se puede eliminar el proceso porque tiene {active_tasks_count} tarea(s) activa(s). Elimina o reasigna las tareas primero.",
        )

    proc.is_deleted = True
    proc.deleted_at = datetime.utcnow()
    proc.deleted_by = current_user.id
    await db.commit()

    return success_response(data={"message": "Proceso eliminado"}, meta={})
