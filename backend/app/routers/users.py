"""
User management endpoints.
Handles user CRUD operations within a law firm.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_

from app.database import get_db
from app.utils.responses import success_response, paginated_response
from app.utils.auth import get_current_user, check_role, get_password_hash
from app.schemas.user import UserCreate, UserUpdate
from app.models import User, LawFirm
from app.services.audit_service import audit_log

router = APIRouter(tags=["users"])


def _format_user(user: User) -> dict:
    """Convert User model to response dict with Spanish field names."""
    nombre = f"{user.first_name} {user.last_name}".strip()
    return {
        "id": str(user.id),
        "nombre": nombre,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "rol": user.role,
        "role": user.role,
        "bufeteId": str(user.law_firm_id),
        "estado": "activo" if user.is_active else "inactivo",
        "isActive": user.is_active,
        "jobTitle": user.job_title,
        "department": user.department,
        "avatarUrl": user.avatar_url,
        "lastLogin": user.last_login.isoformat() if user.last_login else None,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "updatedAt": user.updated_at.isoformat() if user.updated_at else None,
    }


@router.get(
    "",
    response_model=dict,
    summary="List users in law firm",
)
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("-created_at"),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).where(
        and_(
            User.law_firm_id == current_user.law_firm_id,
            User.is_deleted == False,
        )
    )

    if search:
        query = query.where(
            or_(
                User.first_name.ilike(f"%{search}%"),
                User.last_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )

    if role:
        query = query.where(User.role == role)

    count_result = await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.law_firm_id == current_user.law_firm_id,
                User.is_deleted == False,
            )
        )
    )
    total = count_result.scalar() or 0

    safe_sort_fields = {"created_at", "updated_at", "first_name", "last_name", "email"}
    sort_field = sort.lstrip("-")
    if sort_field not in safe_sort_fields:
        sort_field = "created_at"

    col = getattr(User, sort_field)
    query = query.order_by(col.desc() if sort.startswith("-") else col)
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    users = result.scalars().all()

    data = [_format_user(u) for u in users]
    pages = (total + limit - 1) // limit if total > 0 else 1
    return paginated_response(data=data, total=total, page=page, pages=pages, limit=limit, meta={})


@router.post(
    "",
    response_model=dict,
    summary="Create new user",
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    request: UserCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not check_role(current_user.role, ["admin_firma", "super_admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only firm administrators can create users",
        )

    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    if result.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    new_user = User(
        first_name=request.first_name,
        last_name=request.last_name,
        email=request.email,
        password_hash=get_password_hash(request.password),
        phone=request.phone,
        job_title=request.job_title,
        department=request.department,
        law_firm_id=current_user.law_firm_id,
        role=request.role,
        is_active=True,
        is_deleted=False,
    )

    db.add(new_user)
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="CREATE",
        entity_type="User",
        entity_id=new_user.id,
        description=f"New user created: {new_user.email} ({new_user.role})",
    )

    return success_response(data=_format_user(new_user), meta={})


@router.get(
    "/me",
    response_model=dict,
    summary="Get current user profile",
)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    return success_response(data=_format_user(current_user), meta={})


@router.get(
    "/{user_id}",
    response_model=dict,
    summary="Get user details",
)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)

    if not user or user.is_deleted or user.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return success_response(data=_format_user(user), meta={})


@router.patch(
    "/{user_id}",
    response_model=dict,
    summary="Update user",
)
async def update_user(
    user_id: str,
    request: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)

    if not user or user.is_deleted or user.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    is_self_update = str(user_id) == str(current_user.id)
    is_admin = check_role(current_user.role, ["admin_firma", "super_admin"])

    if not is_self_update and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile",
        )

    if request.role and request.role != user.role and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot change user role")

    if request.first_name is not None:
        user.first_name = request.first_name
    if request.last_name is not None:
        user.last_name = request.last_name
    if request.phone is not None:
        user.phone = request.phone
    if request.job_title is not None:
        user.job_title = request.job_title
    if request.department is not None:
        user.department = request.department
    if request.role is not None and is_admin:
        user.role = request.role
    if request.is_active is not None and is_admin:
        user.is_active = request.is_active

    user.updated_at = datetime.utcnow()
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="User",
        entity_id=user.id,
        description=f"User updated: {user.email}",
    )

    return success_response(data=_format_user(user), meta={})


@router.delete(
    "/{user_id}",
    response_model=dict,
    summary="Delete user",
)
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not check_role(current_user.role, ["admin_firma", "super_admin"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only firm administrators can delete users",
        )

    user = await db.get(User, user_id)

    if not user or user.is_deleted or user.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.role == "admin_firma":
        result = await db.execute(
            select(func.count(User.id)).where(
                and_(
                    User.law_firm_id == current_user.law_firm_id,
                    User.role == "admin_firma",
                    User.is_deleted == False,
                    User.id != user.id,
                )
            )
        )
        admin_count = result.scalar() or 0
        if admin_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last administrator",
            )

    user.is_deleted = True
    user.updated_at = datetime.utcnow()
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="DELETE",
        entity_type="User",
        entity_id=user.id,
        description=f"User deleted: {user.email}",
    )

    return success_response(data={"message": "User deleted successfully"}, meta={})
