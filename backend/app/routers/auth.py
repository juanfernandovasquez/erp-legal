"""
Authentication endpoints for Legal ERP.
Handles login, logout, token refresh, registration, and user profile.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
from app.config import settings

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
            detail="Email o contraseña incorrectos",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.",
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

    # Generate email verification token
    verification_token = secrets.token_urlsafe(32)
    verification_expires = datetime.now(timezone.utc) + timedelta(hours=24)

    # Create admin user (not verified yet)
    admin_user = User(
        first_name=request.full_name.split()[0] if request.full_name else "Admin",
        last_name=" ".join(request.full_name.split()[1:]) if request.full_name and len(request.full_name.split()) > 1 else "User",
        email=request.email,
        password_hash=get_password_hash(request.password),
        law_firm_id=law_firm.id,
        role="admin_firma",
        is_verified=False,
        email_verification_token=verification_token,
        email_verification_expires=verification_expires,
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

    # Send verification email
    from app.services.email_service import send_verification_email
    verification_url = f"{settings.frontend_url}/verify-email?token={verification_token}"
    await send_verification_email(admin_user.email, admin_user.get_full_name(), verification_url)

    return success_response(
        data={
            "email_sent": True,
            "email": admin_user.email,
            "message": "Registro exitoso. Revisa tu correo para confirmar tu cuenta.",
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

    nombre = f"{current_user.first_name} {current_user.last_name}".strip()
    return success_response(
        data={
            "user": {
                "id": str(current_user.id),
                "nombre": nombre,
                "firstName": current_user.first_name,
                "lastName": current_user.last_name,
                "email": current_user.email,
                "phone": current_user.phone,
                "telefono": current_user.phone or "",
                "rol": current_user.role,
                "role": current_user.role,
                "bufeteId": str(current_user.law_firm_id),
                "law_firm_id": str(current_user.law_firm_id),
                "avatarUrl": current_user.avatar_url,
                "createdAt": current_user.created_at.isoformat() if current_user.created_at else None,
                "updatedAt": current_user.updated_at.isoformat() if current_user.updated_at else None,
            },
            "law_firm": {
                "id": str(law_firm.id),
                "name": law_firm.name,
            } if law_firm else None,
            "permissions": get_user_permissions(current_user.role),
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.get(
    "/verify-email",
    response_model=dict,
    summary="Verify email address",
)
async def verify_email(token: str = Query(...), db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(User).where(
            and_(
                User.email_verification_token == token,
                User.is_deleted == False,
            )
        )
    )
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=400, detail="Token de verificación inválido.")

    if user.email_verification_expires and user.email_verification_expires < now:
        raise HTTPException(status_code=400, detail="El enlace de verificación ha expirado. Solicita uno nuevo.")

    user.is_verified = True
    user.email_verification_token = None
    user.email_verification_expires = None
    await db.commit()

    return success_response(
        data={"message": "Correo verificado correctamente. Ya puedes iniciar sesión."},
        meta={"timestamp": now.isoformat()},
    )


@router.post(
    "/forgot-password",
    response_model=dict,
    summary="Request password reset",
)
async def forgot_password(request: dict, db: AsyncSession = Depends(get_db)):
    email = request.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=422, detail="El email es obligatorio.")

    result = await db.execute(
        select(User).where(and_(User.email == email, User.is_deleted == False))
    )
    user = result.scalars().first()

    # Always return success to avoid email enumeration
    if not user or not user.is_verified:
        return success_response(
            data={"message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña."},
            meta={"timestamp": datetime.utcnow().isoformat()},
        )

    reset_token = secrets.token_urlsafe(32)
    user.password_reset_token = reset_token
    user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.commit()

    from app.services.email_service import send_password_reset_email
    reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"
    await send_password_reset_email(user.email, user.get_full_name(), reset_url)

    return success_response(
        data={"message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña."},
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.post(
    "/reset-password",
    response_model=dict,
    summary="Reset password using token",
)
async def reset_password(request: dict, db: AsyncSession = Depends(get_db)):
    token = request.get("token", "").strip()
    new_password = request.get("password", "").strip()

    if not token or not new_password:
        raise HTTPException(status_code=422, detail="Token y contraseña son obligatorios.")

    if len(new_password) < 8:
        raise HTTPException(status_code=422, detail="La contraseña debe tener al menos 8 caracteres.")

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(User).where(
            and_(
                User.password_reset_token == token,
                User.is_deleted == False,
            )
        )
    )
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=400, detail="Token inválido o ya utilizado.")

    if user.password_reset_expires and user.password_reset_expires < now:
        raise HTTPException(status_code=400, detail="El enlace ha expirado. Solicita uno nuevo.")

    user.password_hash = get_password_hash(new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    user.last_password_change = now
    await db.commit()

    return success_response(
        data={"message": "Contraseña actualizada correctamente. Ya puedes iniciar sesión."},
        meta={"timestamp": now.isoformat()},
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
