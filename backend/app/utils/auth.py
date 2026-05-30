"""
Authentication utilities and dependencies.
JWT token handling, password validation, and role-based access control.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, List
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.utils.security import (
    create_access_token as create_access_token_base,
    create_refresh_token as create_refresh_token_base,
    verify_password as verify_password_base,
    hash_password as hash_password_base,
    verify_token,
    extract_user_from_token,
)
from app.config import get_settings

settings = get_settings()

# OAuth2 scheme for documentation
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="api/v1/auth/login",
    description="Bearer token authentication",
)


def get_authorization_header(request: Request) -> Optional[str]:
    """Extract Authorization header from request."""
    return request.headers.get("Authorization")


def get_bearer_token(authorization: str = Depends(get_authorization_header)) -> str:
    """Extract bearer token from Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )

    return parts[1]


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return hash_password_base(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    return verify_password_base(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create an access token with custom data.
    Data dict should contain at minimum: sub (user_id), law_firm_id, role
    """
    if expires_delta is None:
        expires_delta = timedelta(hours=settings.jwt_expiration_hours)

    now = datetime.now(timezone.utc)
    expire = now + expires_delta

    to_encode = data.copy()
    to_encode.update({"exp": expire, "iat": now, "type": "access"})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """
    Create a refresh token.
    Data dict should contain at minimum: sub (user_id)
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.jwt_refresh_expiration_days)

    to_encode = data.copy()
    to_encode.update({"exp": expire, "iat": now, "type": "refresh"})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


async def get_current_user(
    token: str = Depends(get_bearer_token),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current authenticated user from JWT token.
    Used as dependency in endpoints requiring authentication.
    """
    payload = decode_token(token)
    user_id: str = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user = await db.get(User, user_id)

    if user is None or user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


def check_role(user_role: str, allowed_roles: List[str]) -> bool:
    """
    Check if user's role is in allowed roles.
    Used for role-based access control.
    """
    return user_role in allowed_roles


def require_role(*allowed_roles: str):
    """
    Dependency for endpoints that require specific roles.
    Usage: @app.get("/admin", dependencies=[Depends(require_role("admin_firma"))])
    """
    async def role_checker(current_user: User = Depends(get_current_user)):
        if not check_role(current_user.role, list(allowed_roles)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker
