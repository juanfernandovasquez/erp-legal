import uuid
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User
from app.utils.security import verify_token, oauth2_scheme
from app.config import settings


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current authenticated user from JWT token.
    Raises HTTPException if token is invalid or user not found.
    """
    try:
        payload = verify_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from database
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current authenticated user (alias for get_current_user)."""
    return current_user


def require_roles(*allowed_roles: str):
    """
    Dependency to require specific user roles.

    Usage:
        @app.get("/admin-only")
        async def admin_endpoint(user: User = Depends(require_roles("admin_firma", "super_admin"))):
            ...
    """
    async def check_roles(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This operation requires one of these roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return check_roles


async def get_law_firm_id(
    current_user: User = Depends(get_current_active_user),
) -> uuid.UUID:
    """
    Get law firm ID from current user.
    """
    return current_user.law_firm_id


async def get_current_law_firm_id(
    token: str = Depends(oauth2_scheme),
) -> uuid.UUID:
    """
    Extract law firm ID from JWT token.
    """
    try:
        payload = verify_token(token)
        law_firm_id_str: str = payload.get("law_firm_id")

        if law_firm_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )

        return uuid.UUID(law_firm_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )


def optional_user():
    """
    Optional user dependency - returns None if no token provided.
    """
    async def get_optional_user(
        token: Optional[str] = Depends(oauth2_scheme),
        session: AsyncSession = Depends(get_db),
    ) -> Optional[User]:
        if not token:
            return None

        try:
            payload = verify_token(token)
            user_id_str: str = payload.get("sub")

            if user_id_str is None:
                return None

            user_id = uuid.UUID(user_id_str)

            result = await session.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            return user
        except Exception:
            return None

    return get_optional_user
