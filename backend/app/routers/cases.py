"""
Case management endpoints.
Accepts Spanish field names from frontend, maps to English DB columns.
Returns Spanish field names so frontend Caso type is satisfied.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.utils.responses import success_response, paginated_response
from app.utils.auth import get_current_user, check_role
from app.schemas.case import CaseCreate, CaseUpdate, AddTeamMemberRequest
from app.models import User, Case, CaseTeam, Client
from app.models.case import CaseClient
from app.services.audit_service import audit_log
from app.services.case_service import (
    check_parent_can_close,
    generate_case_number,
    check_case_team_access,
)

router = APIRouter(tags=["cases"])


def _format_case(case: Case) -> dict:
    """Convert a Case model (with loaded relationships) to the Spanish JSON the frontend expects."""
    abogados = []
    asistentes = []
    principal = None
    principal_id = None
    cliente_data = None
    cliente_id = None

    for ct in (case.case_teams or []):
        if ct.is_deleted:
            continue
        nombre = ""
        if ct.user:
            nombre = f"{ct.user.first_name} {ct.user.last_name}".strip()
        member_dict = {
            "id": str(ct.user_id),
            "nombre": nombre,
            "email": ct.user.email if ct.user else "",
            "rol": ct.role,
        }
        if ct.role in ("admin_firma", "abogado_senior", "abogado_junior", "principal"):
            abogados.append(member_dict)
        else:
            asistentes.append(member_dict)
        if ct.is_lead and principal is None:
            principal = member_dict
            principal_id = str(ct.user_id)

    for cc in (case.case_clients or []):
        if cc.is_deleted:
            continue
        if cc.client:
            cliente_data = {
                "id": str(cc.client_id),
                "nombre": cc.client.name,
                "email": cc.client.email or "",
            }
            cliente_id = str(cc.client_id)
            break

    return {
        "id": str(case.id),
        "titulo": case.title,
        "descripcion": case.description,
        "estado": case.status,
        "tipoSolicitud": case.case_type,
        "clienteId": cliente_id,
        "cliente": cliente_data,
        "bufeteId": str(case.law_firm_id),
        "abogadoPrincipal": principal,
        "abogadoPrincipalId": principal_id,
        "fechaApertura": case.opened_date.isoformat() if case.opened_date else None,
        "fechaCierre": case.closed_date.isoformat() if case.closed_date else None,
        "montoAsegurado": float(case.budget_amount) if case.budget_amount else None,
        "abogados": abogados,
        "asistentes": asistentes,
        "createdAt": case.created_at.isoformat() if case.created_at else None,
        "updatedAt": case.updated_at.isoformat() if case.updated_at else None,
    }


async def _load_case_full(db: AsyncSession, case_id: str) -> Case:
    """Load a case with all needed relationships."""
    result = await db.execute(
        select(Case)
        .where(Case.id == case_id)
        .options(
            selectinload(Case.case_teams).selectinload(CaseTeam.user),
            selectinload(Case.case_clients).selectinload(CaseClient.client),
        )
    )
    return result.unique().scalars().first()


@router.get("", response_model=dict, summary="List cases")
async def list_cases(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base_query = (
        select(Case)
        .where(
            and_(
                Case.law_firm_id == current_user.law_firm_id,
                Case.is_deleted == False,
                Case.parent_case_id == None,
            )
        )
        .options(
            selectinload(Case.case_teams).selectinload(CaseTeam.user),
            selectinload(Case.case_clients).selectinload(CaseClient.client),
        )
    )

    if status:
        base_query = base_query.where(Case.status == status)

    if search:
        base_query = base_query.where(
            or_(
                Case.case_number.ilike(f"%{search}%"),
                Case.title.ilike(f"%{search}%"),
            )
        )

    # Total count
    count_query = select(func.count(Case.id)).where(
        and_(
            Case.law_firm_id == current_user.law_firm_id,
            Case.is_deleted == False,
            Case.parent_case_id == None,
        )
    )
    if status:
        count_query = count_query.where(Case.status == status)
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    base_query = base_query.order_by(Case.created_at.desc()).offset((page - 1) * limit).limit(limit)

    result = await db.execute(base_query)
    cases = result.unique().scalars().all()

    data = [_format_case(c) for c in cases]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(
        data=data,
        total=total,
        page=page,
        pages=pages,
        limit=limit,
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.post("", response_model=dict, summary="Create case", status_code=status.HTTP_201_CREATED)
async def create_case(
    request: CaseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not check_role(current_user.role, ["admin_firma", "abogado_senior", "super_admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only firm administrators and senior lawyers can create cases",
        )

    case_number = await generate_case_number(db, str(current_user.law_firm_id))

    new_case = Case(
        law_firm_id=current_user.law_firm_id,
        case_number=case_number,
        title=request.titulo,
        description=request.descripcion,
        case_type=request.tipoSolicitud or "other",
        status=request.estado or "activo",
        budget_amount=request.montoAsegurado,
        opened_date=datetime.utcnow(),
        is_deleted=False,
    )

    db.add(new_case)
    await db.flush()

    # Add creator as lead team member
    team_member = CaseTeam(
        case_id=new_case.id,
        user_id=current_user.id,
        law_firm_id=current_user.law_firm_id,
        role=current_user.role or "principal",
        is_lead=True,
        assigned_date=datetime.utcnow(),
    )
    db.add(team_member)

    # If a separate abogado principal was specified, add them too
    if request.abogadoPrincipalId and request.abogadoPrincipalId != str(current_user.id):
        try:
            lead = CaseTeam(
                case_id=new_case.id,
                user_id=request.abogadoPrincipalId,
                law_firm_id=current_user.law_firm_id,
                role="abogado_senior",
                is_lead=True,
                assigned_date=datetime.utcnow(),
            )
            db.add(lead)
        except Exception:
            pass  # If user doesn't exist, skip

    # Link client if provided
    if request.clienteId:
        case_client = CaseClient(
            case_id=new_case.id,
            client_id=request.clienteId,
            law_firm_id=current_user.law_firm_id,
            role="principal",
            is_primary=True,
        )
        db.add(case_client)

    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="CREATE",
        entity_type="Case",
        entity_id=new_case.id,
        description=f"New case created: {new_case.case_number}",
    )

    full_case = await _load_case_full(db, str(new_case.id))
    return success_response(
        data=_format_case(full_case),
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.get("/{case_id}", response_model=dict, summary="Get case details")
async def get_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await _load_case_full(db, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    return success_response(
        data=_format_case(case),
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.patch("/{case_id}", response_model=dict, summary="Update case")
async def update_case(
    case_id: str,
    request: CaseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    if request.estado == "inactivo" and case.status != "inactivo":
        await check_parent_can_close(db, case_id)

    if request.titulo is not None:
        case.title = request.titulo
    if request.descripcion is not None:
        case.description = request.descripcion
    if request.tipoSolicitud is not None:
        case.case_type = request.tipoSolicitud
    if request.montoAsegurado is not None:
        case.budget_amount = request.montoAsegurado
    if request.estado is not None:
        case.status = request.estado

    case.updated_at = datetime.utcnow()
    await db.commit()

    full_case = await _load_case_full(db, case_id)
    return success_response(
        data=_format_case(full_case),
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.delete("/{case_id}", response_model=dict, summary="Delete case")
async def delete_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    if not check_role(current_user.role, ["admin_firma", "super_admin"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    case.is_deleted = True
    case.deleted_at = datetime.utcnow()
    await db.commit()

    return success_response(data={"message": "Case deleted"}, meta={})


@router.get("/{case_id}/sub-cases", response_model=dict, summary="List sub-cases")
async def list_sub_cases(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    result = await db.execute(
        select(Case)
        .where(and_(Case.parent_case_id == case_id, Case.is_deleted == False))
        .options(
            selectinload(Case.case_teams).selectinload(CaseTeam.user),
            selectinload(Case.case_clients).selectinload(CaseClient.client),
        )
        .order_by(Case.created_at.desc())
    )
    sub_cases = result.unique().scalars().all()
    data = [_format_case(s) for s in sub_cases]
    return success_response(data=data, meta={"total": len(data)})


@router.post("/{case_id}/sub-cases", response_model=dict, summary="Create sub-case", status_code=201)
async def create_sub_case(
    case_id: str,
    request: CaseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parent_case = await db.get(Case, case_id)
    if not parent_case or parent_case.is_deleted or parent_case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent case not found")

    case_number = await generate_case_number(db, str(current_user.law_firm_id))

    sub_case = Case(
        law_firm_id=current_user.law_firm_id,
        case_number=case_number,
        title=request.titulo,
        description=request.descripcion,
        case_type=request.tipoSolicitud or "other",
        parent_case_id=case_id,
        status="activo",
        opened_date=datetime.utcnow(),
        is_deleted=False,
    )
    db.add(sub_case)
    await db.flush()

    team_member = CaseTeam(
        case_id=sub_case.id,
        user_id=current_user.id,
        law_firm_id=current_user.law_firm_id,
        role=current_user.role or "principal",
        is_lead=True,
        assigned_date=datetime.utcnow(),
    )
    db.add(team_member)
    await db.commit()

    full_case = await _load_case_full(db, str(sub_case.id))
    return success_response(data=_format_case(full_case), meta={})


@router.get("/{case_id}/team", response_model=dict, summary="List case team members")
async def list_case_team(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    result = await db.execute(
        select(CaseTeam)
        .where(and_(CaseTeam.case_id == case_id, CaseTeam.is_deleted == False))
        .options(selectinload(CaseTeam.user))
    )
    team_members = result.scalars().all()

    data = []
    for member in team_members:
        nombre = ""
        if member.user:
            nombre = f"{member.user.first_name} {member.user.last_name}".strip()
        data.append({
            "user_id": str(member.user_id),
            "nombre": nombre,
            "email": member.user.email if member.user else "",
            "role": member.role,
            "is_lead": member.is_lead,
            "assigned_date": member.assigned_date.isoformat() if member.assigned_date else None,
        })

    return success_response(data=data, meta={"total": len(data)})


@router.post("/{case_id}/team", response_model=dict, summary="Add team member", status_code=201)
async def add_team_member(
    case_id: str,
    request: AddTeamMemberRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    user = await db.get(User, request.user_id)
    if not user or user.is_deleted or user.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user")

    # Check if already on team
    result = await db.execute(
        select(CaseTeam).where(
            and_(CaseTeam.case_id == case_id, CaseTeam.user_id == request.user_id)
        )
    )
    existing = result.scalars().first()

    if existing:
        existing.is_deleted = False
        existing.role = request.role
    else:
        team_member = CaseTeam(
            case_id=case_id,
            user_id=request.user_id,
            law_firm_id=current_user.law_firm_id,
            role=request.role,
            is_lead=False,
            assigned_date=datetime.utcnow(),
        )
        db.add(team_member)

    await db.commit()
    return success_response(data={"message": "Team member added"}, meta={})


@router.delete("/{case_id}/team/{user_id}", response_model=dict, summary="Remove team member")
async def remove_team_member(
    case_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await db.get(Case, case_id)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    result = await db.execute(
        select(CaseTeam).where(
            and_(CaseTeam.case_id == case_id, CaseTeam.user_id == user_id)
        )
    )
    team_member = result.scalars().first()

    if not team_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found")

    team_member.is_deleted = True
    team_member.deleted_at = datetime.utcnow()
    await db.commit()
    return success_response(data={"message": "Team member removed"}, meta={})


@router.get("/{case_id}/hours", response_model=dict, summary="List hours for a case")
async def list_case_hours(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Proxy endpoint — the hours router handles /hours/ paths but the frontend
    calls /cases/{id}/hours too."""
    from app.models.task import CaseHours

    case = await db.get(Case, case_id)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    result = await db.execute(
        select(CaseHours)
        .where(and_(CaseHours.case_id == case_id, CaseHours.is_deleted == False))
        .options(selectinload(CaseHours.user))
        .order_by(CaseHours.work_date.desc())
    )
    hours_list = result.scalars().all()

    data = [
        {
            "id": str(h.id),
            "casoId": str(h.case_id),
            "usuarioId": str(h.user_id),
            "usuario": {
                "id": str(h.user_id),
                "nombre": f"{h.user.first_name} {h.user.last_name}".strip() if h.user else "",
            } if h.user else None,
            "fechaRegistro": h.work_date.isoformat() if h.work_date else None,
            "horasTrabajas": float(h.hours),
            "descripcion": h.description or "",
            "tipo": "consulta",
            "createdAt": h.created_at.isoformat() if h.created_at else None,
            "updatedAt": h.updated_at.isoformat() if h.updated_at else None,
        }
        for h in hours_list
    ]
    return success_response(data=data, meta={"total": len(data)})


@router.post("/{case_id}/hours", response_model=dict, summary="Log hours for a case", status_code=201)
async def create_case_hours(
    case_id: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.task import CaseHours
    from fastapi import Body

    case = await db.get(Case, case_id)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    hours_val = float(request.get("horas") or request.get("hours") or 1)
    rate = float(request.get("tarifaHora") or request.get("hourly_rate") or 0)
    work_date_str = request.get("fechaTrabajo") or request.get("work_date")
    work_date = datetime.fromisoformat(work_date_str) if work_date_str else datetime.utcnow()

    new_hours = CaseHours(
        case_id=case_id,
        user_id=current_user.id,
        law_firm_id=current_user.law_firm_id,
        hours=hours_val,
        description=request.get("descripcion") or request.get("description") or "",
        work_date=work_date,
        hourly_rate=rate,
        total_amount=hours_val * rate,
        is_billable=request.get("esFacturable", True),
    )
    db.add(new_hours)
    await db.commit()

    return success_response(data={"id": str(new_hours.id), "message": "Hours logged"}, meta={})


@router.get("/{case_id}/tasks", response_model=dict, summary="List tasks for a case")
async def list_case_tasks(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import uuid as uuid_module
    from app.models.task import Task

    try:
        case_uuid = uuid_module.UUID(case_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    case = await db.get(Case, case_uuid)
    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    result = await db.execute(
        select(Task)
        .where(and_(Task.case_id == case_uuid, Task.is_deleted == False))
        .options(selectinload(Task.assignee))
        .order_by(Task.created_at.desc())
    )
    tasks = result.scalars().all()

    data = [
        {
            "id": str(t.id),
            "casoId": str(t.case_id),
            "titulo": t.title,
            "descripcion": t.description,
            "estado": t.status,
            "prioridad": t.priority,
            "asignadoA": {
                "id": str(t.assignee_id),
                "nombre": f"{t.assignee.first_name} {t.assignee.last_name}".strip() if t.assignee else "",
            } if t.assignee_id else None,
            "asignadoAId": str(t.assignee_id) if t.assignee_id else None,
            "fechaVencimiento": t.due_date.isoformat() if t.due_date else None,
            "createdAt": t.created_at.isoformat() if t.created_at else None,
            "updatedAt": t.updated_at.isoformat() if t.updated_at else None,
        }
        for t in tasks
    ]
    return success_response(data=data, meta={"total": len(data)})
