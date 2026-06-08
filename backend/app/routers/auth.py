"""
Authentication endpoints for Legal ERP.
Handles login, logout, token refresh, registration, and user profile.
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.utils.responses import success_response, error_response
from app.utils.auth import (
    get_current_user,
    create_access_token,
    create_refresh_token,
    verify_password,
    get_password_hash,
)

router = APIRouter(tags=["auth"])


# Assume these schemas and models exist
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RegisterRequest,
    UserProfileResponse,
)
from app.models import User, LawFirm


@router.post(
    "/login",
    response_model=dict,
    summary="User login",
    description="Authenticate with email and password, returns JWT access token and refresh token",
)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Login with email and password.

    Returns access_token, refresh_token, and user profile.
    """
    result = await db.execute(
        select(User).where(
            and_(
                User.email == request.email,
                User.is_deleted == False
            )
        )
    )
    user = result.scalars().first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Get law firm info
    law_firm = await db.get(LawFirm, user.law_firm_id)

    # Create tokens
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "law_firm_id": str(user.law_firm_id),
            "role": user.role,
        }
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Log the login action
    from app.services.audit_service import audit_log
    await audit_log(
        db=db,
        law_firm_id=str(user.law_firm_id),
        user_id=str(user.id),
        action="LOGIN",
        entity_type="User",
        entity_id=str(user.id),
        description=f"User {user.email} logged in",
    )

    return success_response(
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.get_full_name(),
                "role": user.role,
                "law_firm_id": str(user.law_firm_id),
                "law_firm_name": law_firm.name if law_firm else None,
            },
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.post(
    "/logout",
    response_model=dict,
    summary="User logout",
    description="Revoke current JWT token",
)
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Logout current user by revoking token.
    In production, you might add token to blacklist or revocation list.
    """
    from app.services.audit_service import audit_log
    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="LOGOUT",
        entity_type="User",
        entity_id=current_user.id,
        description=f"User {current_user.email} logged out",
    )

    return success_response(
        data={"message": "Successfully logged out"},
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.post(
    "/refresh",
    response_model=dict,
    summary="Refresh access token",
    description="Use refresh token to get new access token",
)
async def refresh_token(request: RefreshTokenRequest):
    """
    Refresh access token using a valid refresh token.
    """
    try:
        from app.utils.auth import decode_token

        payload = decode_token(request.refresh_token)
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        new_access_token = create_access_token(data={"sub": user_id})

        return success_response(
            data={
                "access_token": new_access_token,
                "token_type": "bearer",
            },
            meta={"timestamp": datetime.utcnow().isoformat()},
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )


@router.post(
    "/register",
    response_model=dict,
    summary="Register new law firm",
    description="Create new law firm with initial admin user (first-time setup)",
    status_code=status.HTTP_201_CREATED,
)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Register a new law firm with initial admin user.
    This endpoint is typically disabled after initial setup.
    """
    # Check if email already exists
    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El email ya está registrado",
        )

    # Check if firm name already exists
    result = await db.execute(
        select(LawFirm).where(LawFirm.name == request.firm_name)
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un bufete registrado con ese nombre",
        )

    # Create law firm
    import uuid
    law_firm = LawFirm(
        name=request.firm_name,
        slug=request.firm_name.lower().replace(" ", "-"),
        email=request.email,
        registration_number=request.registration_number,
        is_active=True,
        is_deleted=False,
    )
    db.add(law_firm)
    await db.flush()

    # Create admin user
    admin_user = User(
        first_name=request.full_name.split()[0] if request.full_name else "Admin",
        last_name=" ".join(request.full_name.split()[1:]) if request.full_name and len(request.full_name.split()) > 1 else "User",
        email=request.email,
        password_hash=get_password_hash(request.password),
        law_firm_id=law_firm.id,
        role="admin_firma",
        is_deleted=False,
    )
    db.add(admin_user)
    await db.commit()
    await db.refresh(law_firm)
    await db.refresh(admin_user)

    # Log registration
    from app.services.audit_service import audit_log
    await audit_log(
        db=db,
        law_firm_id=str(law_firm.id),
        user_id=str(admin_user.id),
        action="REGISTER",
        entity_type="LawFirm",
        entity_id=str(law_firm.id),
        description=f"New law firm registered: {law_firm.name}",
    )

    access_token = create_access_token(
        data={
            "sub": str(admin_user.id),
            "law_firm_id": str(law_firm.id),
            "role": admin_user.role,
        }
    )
    refresh_token = create_refresh_token(data={"sub": str(admin_user.id)})

    return success_response(
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "law_firm": {
                "id": str(law_firm.id),
                "name": law_firm.name,
            },
            "user": {
                "id": str(admin_user.id),
                "email": admin_user.email,
                "full_name": admin_user.get_full_name(),
                "role": admin_user.role,
            },
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.get(
    "/me",
    response_model=dict,
    summary="Get current user profile",
    description="Retrieve authenticated user profile and permissions",
)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current authenticated user profile with permissions.
    """
    law_firm = await db.get(LawFirm, current_user.law_firm_id)

    return success_response(
        data={
            "user": {
                "id": str(current_user.id),
                "email": current_user.email,
                "full_name": current_user.get_full_name(),
                "role": current_user.role,
                "law_firm_id": str(current_user.law_firm_id),
                "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
            },
            "law_firm": {
                "id": str(law_firm.id),
                "name": law_firm.name,
            } if law_firm else None,
            "permissions": get_user_permissions(current_user.role),
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


def get_user_permissions(role: str) -> dict:
    """
    Get permissions based on user role.
    """
    permissions_map = {
        "super_admin": {
            "manage_law_firms": True,
            "manage_users": True,
            "view_all_cases": True,
            "manage_cases": True,
            "manage_audit_logs": True,
        },
        "admin_firma": {
            "manage_users": True,
            "view_all_cases": True,
            "manage_cases": True,
            "manage_process_types": True,
            "view_dashboard": True,
        },
        "abogado_senior": {
            "manage_cases": True,
            "view_all_cases": True,
            "manage_process_types": True,
        },
        "abogado_junior": {
            "manage_cases": True,
        },
        "administrativo": {
            "view_cases": True,
        },
        "revisor_externo": {
            "view_cases": True,
        },
    }
    return permissions_map.get(role, {})
