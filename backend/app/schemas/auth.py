from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
import uuid


class TokenResponse(BaseModel):
    """Token response containing access and refresh tokens."""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")

    model_config = {"from_attributes": True}


class TokenPayload(BaseModel):
    """JWT token payload."""

    sub: uuid.UUID = Field(..., description="User ID")
    law_firm_id: uuid.UUID = Field(..., description="Law firm ID")
    role: str = Field(..., description="User role")
    exp: datetime = Field(..., description="Token expiration")
    iat: datetime = Field(..., description="Token issued at")
    type: str = Field(default="access", description="Token type (access or refresh)")

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    """User login request."""

    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., min_length=1, description="User password")

    model_config = {"from_attributes": True}


class GoogleOAuth2Request(BaseModel):
    """Google OAuth2 login request."""

    id_token: str = Field(..., description="Google ID token")

    model_config = {"from_attributes": True}


class RefreshTokenRequest(BaseModel):
    """Request to refresh access token."""

    refresh_token: str = Field(..., description="Refresh token")

    model_config = {"from_attributes": True}


class UserRegistrationRequest(BaseModel):
    """User registration request."""

    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(
        ..., min_length=8, description="Password (min 8 characters)"
    )
    law_firm_id: uuid.UUID = Field(..., description="Law firm ID")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")

    model_config = {"from_attributes": True}


class ChangePasswordRequest(BaseModel):
    """Change password request."""

    current_password: str = Field(..., description="Current password")
    new_password: str = Field(
        ..., min_length=8, description="New password (min 8 characters)"
    )
    confirm_password: str = Field(..., description="Password confirmation")

    model_config = {"from_attributes": True}


class ResetPasswordRequest(BaseModel):
    """Password reset request."""

    email: EmailStr = Field(..., description="User email")

    model_config = {"from_attributes": True}


class ConfirmPasswordResetRequest(BaseModel):
    """Confirm password reset request."""

    token: str = Field(..., description="Password reset token")
    new_password: str = Field(
        ..., min_length=8, description="New password (min 8 characters)"
    )
    confirm_password: str = Field(..., description="Password confirmation")

    model_config = {"from_attributes": True}


class EnableMFARequest(BaseModel):
    """Enable MFA request."""

    password: str = Field(..., description="User password for confirmation")

    model_config = {"from_attributes": True}


class VerifyMFARequest(BaseModel):
    """Verify MFA code request."""

    code: str = Field(..., min_length=6, max_length=6, description="MFA code")

    model_config = {"from_attributes": True}


class DisableMFARequest(BaseModel):
    """Disable MFA request."""

    password: str = Field(..., description="User password for confirmation")

    model_config = {"from_attributes": True}


class LogoutRequest(BaseModel):
    """User logout request."""

    refresh_token: Optional[str] = Field(
        None, description="Refresh token to revoke"
    )

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    """Login response with tokens and user info."""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    user: dict = Field(..., description="User information")

    model_config = {"from_attributes": True}


class RegisterRequest(BaseModel):
    """Law firm registration request."""

    firm_name: str = Field(..., min_length=1, max_length=255, description="Law firm name")
    email: EmailStr = Field(..., description="Admin user email")
    password: str = Field(..., min_length=8, description="Admin password")
    full_name: str = Field(..., min_length=1, max_length=255, description="Admin full name")
    registration_number: Optional[str] = Field(None, max_length=100, description="Law firm registration number")

    model_config = {"from_attributes": True}


class UserProfileResponse(BaseModel):
    """User profile response."""

    id: uuid.UUID = Field(..., description="User ID")
    email: EmailStr = Field(..., description="Email")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    role: str = Field(..., description="User role")
    is_active: bool = Field(..., description="Is user active")
    law_firm_id: uuid.UUID = Field(..., description="Law firm ID")

    model_config = {"from_attributes": True}
