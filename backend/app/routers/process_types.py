"""
Process type catalog endpoints.
Handles process type management (predefined legal process categories).
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.database import get_db
from app.utils.responses import success_response, paginated_response, error_response
from app.utils.auth import get_current_user, check_role
from app.schemas.process_types import ProcessTypeCreateRequest, ProcessTypeUpdateRequest
from app.models import User, ProcessType
from app.services.audit_service import audit_log

router = APIRouter(tags=["process_types"])


@router.get(
    "",
    response_model=dict,
    summary="List process types",
    description="List all process types for the law firm",
)
async def list_process_types(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("name"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List process types.
    All authenticated users can view process types.
    """
    query = select(ProcessType).where(
        and_(
            ProcessType.law_firm_id == current_user.law_firm_id,
            ProcessType.is_deleted == False,
        )
    )

    if search:
        query = query.where(
            ProcessType.name.ilike(f"%{search}%") |
            ProcessType.description.ilike(f"%{search}%")
        )

    # Get total count
    count_result = await db.execute(
        select(func.count(ProcessType.id)).where(
            and_(
                ProcessType.law_firm_id == current_user.law_firm_id,
                ProcessType.is_deleted == False,
            )
        )
    )
    total = count_result.scalar()

    # Apply sorting
    if sort.startswith("-"):
        query = query.order_by(getattr(ProcessType, sort[1:]).desc())
    else:
        query = query.order_by(getattr(ProcessType, sort))

    # Apply pagination
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    process_types = result.scalars().all()

    data = [
        {
            "id": pt.id,
            "name": pt.name,
            "description": pt.description,
            "code": pt.code,
            "is_active": pt.is_active,
            "created_at": pt.created_at.isoformat() if pt.created_at else None,
        }
        for pt in process_types
    ]

    pages = (total + limit - 1) // limit
    return paginated_response(
        data=data,
        total=total,
        page=page,
        pages=pages,
        limit=limit,
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.post(
    "",
    response_model=dict,
    summary="Create process type",
    description="Create a new process type (admin_firma and senior only)",
    status_code=status.HTTP_201_CREATED,
)
async def create_process_type(
    request: ProcessTypeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new process type.
    Only admin_firma and abogado_senior can create process types.
    """
    # Check authorization
    if not check_role(current_user.role, ["admin_firma", "abogado_senior", "super_admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only firm administrators and senior lawyers can create process types",
        )

    # Check for duplicate code
    result = await db.execute(
        select(ProcessType).where(
            and_(
                ProcessType.law_firm_id == current_user.law_firm_id,
                ProcessType.code == request.code,
            )
        )
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Process type code already exists",
        )

    process_type = ProcessType(
        law_firm_id=current_user.law_firm_id,
        name=request.name,
        description=request.description,
        code=request.code,
        is_active=True,
        is_deleted=False,
    )

    db.add(process_type)
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="CREATE",
        entity_type="ProcessType",
        entity_id=process_type.id,
        description=f"Process type created: {process_type.name}",
    )

    return success_response(
        data={
            "id": process_type.id,
            "name": process_type.name,
            "description": process_type.description,
            "code": process_type.code,
            "is_active": process_type.is_active,
            "created_at": process_type.created_at.isoformat() if process_type.created_at else None,
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.patch(
    "/{type_id}",
    response_model=dict,
    summary="Update process type",
    description="Update process type details",
)
async def update_process_type(
    type_id: str,
    request: ProcessTypeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update process type.
    Only admin_firma and senior can update.
    """
    # Check authorization
    if not check_role(current_user.role, ["admin_firma", "abogado_senior", "super_admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only firm administrators and senior lawyers can update process types",
        )

    process_type = await db.get(ProcessType, type_id)

    if not process_type or process_type.is_deleted or process_type.law_firm_id != current_user.law_firm_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Process type not found",
        )

    old_values = {
        "name": process_type.name,
        "description": process_type.description,
        "is_active": process_type.is_active,
    }

    if request.name is not None:
        process_type.name = request.name
    if request.description is not None:
        process_type.description = request.description
    if request.is_active is not None:
        process_type.is_active = request.is_active

    process_type.updated_at = datetime.utcnow()
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="ProcessType",
        entity_id=process_type.id,
        description=f"Process type updated: {process_type.name}",
        old_values=old_values,
        new_values={
            "name": process_type.name,
            "description": process_type.description,
            "is_active": process_type.is_active,
        },
    )

    return success_response(
        data={
            "id": process_type.id,
            "name": process_type.name,
            "description": process_type.description,
            "code": process_type.code,
            "is_active": process_type.is_active,
            "updated_at": process_type.updated_at.isoformat() if process_type.updated_at else None,
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.delete(
    "/{type_id}",
    response_model=dict,
    summary="Delete process type",
    description="Soft delete a process type",
)
async def delete_process_type(
    type_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Soft delete a process type.
    Only admin_firma and senior can delete.
    """
    # Check authorization
    if not check_role(current_user.role, ["admin_firma", "abogado_senior", "super_admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only firm administrators and senior lawyers can delete process types",
        )

    process_type = await db.get(ProcessType, type_id)

    if not process_type or process_type.is_deleted or process_type.law_firm_id != current_user.law_firm_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Process type not found",
        )

    process_type.is_deleted = True
    process_type.updated_at = datetime.utcnow()
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="DELETE",
        entity_type="ProcessType",
        entity_id=process_type.id,
        description=f"Process type deleted: {process_type.name}",
    )

    return success_response(
        data={"message": "Process type deleted successfully"},
        meta={"timestamp": datetime.utcnow().isoformat()},
    )
