import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from fastapi.security import OAuth2PasswordBearer
from app.config import settings


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def create_access_token(
    user_id: uuid.UUID,
    law_firm_id: uuid.UUID,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> tuple[str, datetime]:
    """
    Create a JWT access token.
    Returns (token, expiration_datetime)
    """
    if expires_delta is None:
        expires_delta = timedelta(hours=settings.jwt_expiration_hours)

    now = datetime.now(timezone.utc)
    expire = now + expires_delta

    payload = {
        "sub": str(user_id),
        "law_firm_id": str(law_firm_id),
        "role": role,
        "exp": expire,
        "iat": now,
        "type": "access",
    }

    encoded_jwt = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    return encoded_jwt, expire


def create_refresh_token(
    user_id: uuid.UUID,
    law_firm_id: uuid.UUID,
) -> tuple[str, datetime]:
    """
    Create a JWT refresh token.
    Returns (token, expiration_datetime)
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.jwt_refresh_expiration_days)

    payload = {
        "sub": str(user_id),
        "law_firm_id": str(law_firm_id),
        "exp": expire,
        "iat": now,
        "type": "refresh",
    }

    encoded_jwt = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    return encoded_jwt, expire


def verify_token(token: str) -> dict:
    """
    Verify and decode a JWT token.
    Raises jwt.InvalidTokenError if token is invalid.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise jwt.InvalidTokenError("Token has expired")
    except jwt.InvalidTokenError:
        raise jwt.InvalidTokenError("Invalid token")


def extract_user_from_token(token: str) -> tuple[uuid.UUID, uuid.UUID, str]:
    """
    Extract user_id, law_firm_id, and role from token.
    Returns (user_id, law_firm_id, role)
    """
    payload = verify_token(token)

    user_id = uuid.UUID(payload.get("sub"))
    law_firm_id = uuid.UUID(payload.get("law_firm_id"))
    role = payload.get("role", "")

    return user_id, law_firm_id, role


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength based on settings.
    Returns (is_valid, error_message)
    """
    if len(password) < settings.password_min_length:
        return False, f"Password must be at least {settings.password_min_length} characters"

    if settings.password_require_uppercase and not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"

    if settings.password_require_numbers and not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"

    if settings.password_require_special_chars:
        special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        if not any(c in special_chars for c in password):
            return False, "Password must contain at least one special character"

    return True, None
