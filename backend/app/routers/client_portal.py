"""
External client portal endpoints.
Provides read-only access for external reviewers to their assigned cases.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.database import get_db
from app.utils.responses import success_response, paginated_response
from app.utils.auth import create_access_token, verify_password, get_current_user
from app.schemas.client_portal import ClientLoginRequest
from app.models import User, Case, CaseEvent, CaseUpdate, Document, CaseTeam

router = APIRouter(tags=["client_portal"])


@router.post(
    "/auth",
    response_model=dict,
    summary="Client portal login",
)
async def client_login(
    request: ClientLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate as an external reviewer/client."""
    result = await db.execute(
        select(User).where(
            and_(
                User.email == request.email,
                User.is_deleted == False,
                User.role == "revisor_externo",
            )
        )
    )
    user = result.scalars().first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "law_firm_id": str(user.law_firm_id),
            "role": user.role,
        }
    )

    return success_response(
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "nombre": user.get_full_name(),
            },
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.get(
    "/cases",
    response_model=dict,
    summary="Get assigned cases (external reviewer)",
)
async def get_client_visible_cases(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get cases the external reviewer is assigned to."""
    # External reviewers see cases where they're on the team
    query = (
        select(Case)
        .join(CaseTeam, and_(CaseTeam.case_id == Case.id, CaseTeam.is_deleted == False))
        .where(
            and_(
                CaseTeam.user_id == current_user.id,
                Case.law_firm_id == current_user.law_firm_id,
                Case.is_deleted == False,
            )
        )
    )

    count_result = await db.execute(
        select(func.count(Case.id))
        .join(CaseTeam, and_(CaseTeam.case_id == Case.id, CaseTeam.is_deleted == False))
        .where(
            and_(
                CaseTeam.user_id == current_user.id,
                Case.law_firm_id == current_user.law_firm_id,
                Case.is_deleted == False,
            )
        )
    )
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


@router.get(
    "/cases/{case_id}",
    response_model=dict,
    summary="Get case details (external reviewer)",
)
async def get_client_case_details(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get case details for an assigned case."""
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    return success_response(
        data={
            "id": str(case.id),
            "caseNumber": case.case_number,
            "titulo": case.title,
            "descripcion": case.description,
            "estado": case.status,
            "tipoSolicitud": case.case_type,
            "createdAt": case.created_at.isoformat() if case.created_at else None,
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.get(
    "/cases/{case_id}/timeline",
    response_model=dict,
    summary="Get case timeline (external reviewer)",
)
async def get_public_case_timeline(
    case_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get case events for an assigned case."""
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    count_result = await db.execute(
        select(func.count(CaseEvent.id)).where(
            and_(CaseEvent.case_id == case_id, CaseEvent.is_deleted == False)
        )
    )
    total = count_result.scalar() or 0

    query = (
        select(CaseEvent)
        .where(and_(CaseEvent.case_id == case_id, CaseEvent.is_deleted == False))
        .order_by(CaseEvent.event_date.asc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(query)
    events = result.scalars().all()

    data = [
        {
            "id": str(event.id),
            "titulo": event.title,
            "descripcion": event.description,
            "fecha": event.event_date.isoformat() if event.event_date else None,
            "tipo": event.event_type,
            "createdAt": event.created_at.isoformat() if event.created_at else None,
        }
        for event in events
    ]

    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.get(
    "/cases/{case_id}/documents",
    response_model=dict,
    summary="Get case documents (external reviewer)",
)
async def get_public_case_documents(
    case_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get documents for an assigned case."""
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    count_result = await db.execute(
        select(func.count(Document.id)).where(
            and_(Document.case_id == case_id, Document.is_deleted == False)
        )
    )
    total = count_result.scalar() or 0

    query = (
        select(Document)
        .where(and_(Document.case_id == case_id, Document.is_deleted == False))
        .order_by(Document.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(query)
    documents = result.scalars().all()

    data = [
        {
            "id": str(doc.id),
            "fileName": doc.file_name,
            "fileType": doc.file_type,
            "fileSize": doc.file_size,
            "createdAt": doc.created_at.isoformat() if doc.created_at else None,
        }
        for doc in documents
    ]

    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})
