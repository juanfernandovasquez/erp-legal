"""
Client management endpoints.
Handles client CRUD and case-client relationships.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case as sa_case
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.utils.responses import success_response, paginated_response
from app.utils.auth import get_current_user, check_role
from app.schemas.client import ClientCreate, ClientUpdate
from app.models import User, Client, Case, CaseClient
from app.models.task import Task
from app.services.audit_service import audit_log

router = APIRouter(tags=["clients"])


def _format_client(client: Client) -> dict:
    """Convert Client model to response dict."""
    return {
        "id": str(client.id),
        "nombre": client.name,
        "name": client.name,
        "email": client.email,
        "phone": client.phone,
        "streetAddress": client.street_address,
        "city": client.city,
        "state": client.state,
        "postalCode": client.postal_code,
        "country": client.country,
        "clientType": client.client_type,
        "organizationName": client.organization_name,
        "taxId": client.tax_id,
        "isActive": client.is_active,
        "isPreferred": client.is_preferred,
        "usuarioSol": client.usuario_sol,
        "claveSol": client.clave_sol,
        "createdAt": client.created_at.isoformat() if client.created_at else None,
        "updatedAt": client.updated_at.isoformat() if client.updated_at else None,
    }


@router.get(
    "",
    response_model=dict,
    summary="List clients",
)
async def list_clients(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("-created_at"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Client).where(
        and_(
            Client.law_firm_id == current_user.law_firm_id,
            Client.is_deleted == False,
        )
    )

    if search:
        query = query.where(
            Client.name.ilike(f"%{search}%") |
            Client.email.ilike(f"%{search}%")
        )

    count_result = await db.execute(
        select(func.count(Client.id)).where(
            and_(
                Client.law_firm_id == current_user.law_firm_id,
                Client.is_deleted == False,
            )
        )
    )
    total = count_result.scalar() or 0

    # Safe sorting
    safe_sort_fields = {"created_at", "updated_at", "name", "email"}
    sort_field = sort.lstrip("-")
    if sort_field not in safe_sort_fields:
        sort_field = "created_at"
        sort = "-created_at"

    col = getattr(Client, sort_field)
    query = query.order_by(col.desc() if sort.startswith("-") else col)
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    clients = result.scalars().all()

    data = [_format_client(c) for c in clients]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.post(
    "",
    response_model=dict,
    summary="Create client",
    status_code=status.HTTP_201_CREATED,
)
async def create_client(
    request: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check for duplicate email
    result = await db.execute(
        select(Client).where(
            and_(
                Client.law_firm_id == current_user.law_firm_id,
                Client.email == request.email,
            )
        )
    )
    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Client email already exists")

    client = Client(
        law_firm_id=current_user.law_firm_id,
        name=request.name,
        email=request.email,
        phone=request.phone,
        street_address=request.street_address,
        city=request.city,
        state=request.state,
        postal_code=request.postal_code,
        country=request.country,
        client_type=request.client_type or "individual",
        organization_name=request.organization_name,
        registration_number=request.registration_number,
        tax_id=request.tax_id,
        primary_contact_name=request.primary_contact_name,
        primary_contact_email=request.primary_contact_email,
        primary_contact_phone=request.primary_contact_phone,
        industry=request.industry,
        website=request.website,
        notes=request.notes,
        is_preferred=request.is_preferred,
        usuario_sol=request.usuario_sol,
        clave_sol=request.clave_sol,
        is_deleted=False,
    )

    db.add(client)
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="CREATE",
        entity_type="Client",
        entity_id=client.id,
        description=f"Client created: {client.name}",
    )

    return success_response(data=_format_client(client), meta={})


@router.get(
    "/summary",
    response_model=dict,
    summary="Get per-client stats (cases and tasks counts)",
)
async def get_clients_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a dict keyed by client_id with case and task counts.
    Used by the clients list page to show activity stats per client.
    """
    law_firm_id = current_user.law_firm_id
    now = datetime.utcnow()

    ACTIVE_STATUSES = ["activo"]

    # --- Active cases per client ---
    active_cases_q = await db.execute(
        select(
            CaseClient.client_id,
            func.count(Case.id).label("active_cases"),
        )
        .join(Case, Case.id == CaseClient.case_id)
        .where(
            and_(
                Case.law_firm_id == law_firm_id,
                Case.is_deleted == False,
                CaseClient.is_deleted == False,
                Case.status.in_(ACTIVE_STATUSES),
            )
        )
        .group_by(CaseClient.client_id)
    )
    active_cases_map = {str(row.client_id): row.active_cases for row in active_cases_q.all()}

    # --- Task counts per client (via case) ---
    # pending, in_progress, overdue — one query using conditional aggregation
    task_counts_q = await db.execute(
        select(
            CaseClient.client_id,
            func.count(
                sa_case(
                    (Task.status.in_(["pendiente", "pending", "todo"]), 1),
                    else_=None,
                )
            ).label("pending_tasks"),
            func.count(
                sa_case(
                    (Task.status.in_(["en_progreso", "in_progress", "in_review"]), 1),
                    else_=None,
                )
            ).label("in_progress_tasks"),
            func.count(
                sa_case(
                    (
                        and_(
                            Task.due_date < now,
                            Task.status.notin_(["completado", "completed", "done", "rechazado", "cancelled", "cancelado"]),
                        ),
                        1,
                    ),
                    else_=None,
                )
            ).label("overdue_tasks"),
            func.count(
                sa_case(
                    (Task.status.in_(["completado", "completed", "done"]), 1),
                    else_=None,
                )
            ).label("completed_tasks"),
        )
        .join(Case, Case.id == CaseClient.case_id)
        .join(Task, Task.case_id == Case.id)
        .where(
            and_(
                Case.law_firm_id == law_firm_id,
                Case.is_deleted == False,
                Case.status == "activo",
                CaseClient.is_deleted == False,
                Task.is_deleted == False,
            )
        )
        .group_by(CaseClient.client_id)
    )

    task_counts_map: dict = {}
    for row in task_counts_q.all():
        task_counts_map[str(row.client_id)] = {
            "pending_tasks": row.pending_tasks or 0,
            "in_progress_tasks": row.in_progress_tasks or 0,
            "overdue_tasks": row.overdue_tasks or 0,
            "completed_tasks": row.completed_tasks or 0,
        }

    EMPTY_TASKS = {"pending_tasks": 0, "in_progress_tasks": 0, "overdue_tasks": 0, "completed_tasks": 0}

    # Merge both maps — include all client IDs seen in either
    all_ids = set(active_cases_map.keys()) | set(task_counts_map.keys())
    summary = {
        cid: {
            "active_cases": active_cases_map.get(cid, 0),
            **task_counts_map.get(cid, EMPTY_TASKS),
        }
        for cid in all_ids
    }

    return success_response(data=summary, meta={})


@router.get(
    "/{client_id}",
    response_model=dict,
    summary="Get client details",
)
async def get_client(
    client_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = await db.get(Client, client_id)

    if not client or client.is_deleted or client.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    return success_response(data=_format_client(client), meta={})


@router.patch(
    "/{client_id}",
    response_model=dict,
    summary="Update client",
)
async def update_client(
    client_id: str,
    request: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = await db.get(Client, client_id)

    if not client or client.is_deleted or client.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    if request.name is not None:
        client.name = request.name
    if request.email is not None:
        result = await db.execute(
            select(Client).where(
                and_(
                    Client.law_firm_id == current_user.law_firm_id,
                    Client.email == request.email,
                    Client.id != client.id,
                )
            )
        )
        if result.scalars().first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        client.email = request.email
    if request.phone is not None:
        client.phone = request.phone
    if request.street_address is not None:
        client.street_address = request.street_address
    if request.city is not None:
        client.city = request.city
    if request.state is not None:
        client.state = request.state
    if request.postal_code is not None:
        client.postal_code = request.postal_code
    if request.country is not None:
        client.country = request.country
    if request.client_type is not None:
        client.client_type = request.client_type
    if request.organization_name is not None:
        client.organization_name = request.organization_name
    if request.tax_id is not None:
        client.tax_id = request.tax_id
    if request.notes is not None:
        client.notes = request.notes
    if request.is_active is not None:
        client.is_active = request.is_active
    if request.is_preferred is not None:
        client.is_preferred = request.is_preferred
    if request.usuario_sol is not None:
        client.usuario_sol = request.usuario_sol
    if request.clave_sol is not None:
        client.clave_sol = request.clave_sol

    client.updated_at = datetime.utcnow()
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="Client",
        entity_id=client.id,
        description=f"Client updated: {client.name}",
    )

    return success_response(data=_format_client(client), meta={})


@router.delete(
    "/{client_id}",
    response_model=dict,
    summary="Delete client",
)
async def delete_client(
    client_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = await db.get(Client, client_id)

    if not client or client.is_deleted or client.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    client.is_deleted = True
    client.deleted_at = datetime.utcnow()
    await db.commit()

    return success_response(data={"message": "Client deleted"}, meta={})


@router.get(
    "/{client_id}/cases",
    response_model=dict,
    summary="Get client's cases",
)
async def get_client_cases(
    client_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = await db.get(Client, client_id)

    if not client or client.is_deleted or client.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    # Cases are linked via CaseClient junction table
    query = (
        select(Case)
        .join(CaseClient, and_(CaseClient.case_id == Case.id, CaseClient.is_deleted == False))
        .where(
            and_(
                CaseClient.client_id == client_id,
                Case.law_firm_id == current_user.law_firm_id,
                Case.is_deleted == False,
            )
        )
    )

    if status_filter:
        query = query.where(Case.status == status_filter)

    count_query = (
        select(func.count(Case.id))
        .join(CaseClient, and_(CaseClient.case_id == Case.id, CaseClient.is_deleted == False))
        .where(
            and_(
                CaseClient.client_id == client_id,
                Case.law_firm_id == current_user.law_firm_id,
                Case.is_deleted == False,
            )
        )
    )
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    query = query.order_by(Case.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    cases = result.scalars().all()

    data = [
        {
            "id": str(case.id),
            "caseNumber": case.case_number,
            "titulo": case.title,
            "estado": case.status,
            "tipoSolicitud": case.case_type,
            "createdAt": case.created_at.isoformat() if case.created_at else None,
        }
        for case in cases
    ]

    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})
