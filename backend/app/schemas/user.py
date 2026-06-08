from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime
import uuid

# Valid roles: admin_firma (Administrador) | abogado_junior (Usuario)
UserRoleType = Literal["admin_firma", "abogado_junior"]


class UserCreate(BaseModel):
    """Create user request."""

    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    role: str = Field(..., description="User role: admin_firma or abogado_junior")

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Update user request."""

    first_name: Optional[str] = Field(None, max_length=100, description="First name")
    last_name: Optional[str] = Field(None, max_length=100, description="Last name")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    role: Optional[str] = Field(None, description="User role (admin only)")
    password: Optional[str] = Field(
        None, min_length=8,
        description="New password — admins can set for any user; regular users only for themselves"
    )

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    """User response."""

    id: uuid.UUID = Field(..., description="User ID")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    email: str = Field(..., description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    avatar_url: Optional[str] = Field(None, description="Avatar URL")
    role: str = Field(..., description="User role")
    law_firm_id: uuid.UUID = Field(..., description="Law firm ID")
    is_verified: bool = Field(..., description="Is user email verified")
    mfa_enabled: bool = Field(..., description="Is MFA enabled")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """User list response."""

    id: uuid.UUID = Field(..., description="User ID")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    email: str = Field(..., description="Email address")
    role: str = Field(..., description="User role")

    model_config = {"from_attributes": True}


class UserProfileResponse(BaseModel):
    """User profile response."""

    id: uuid.UUID = Field(..., description="User ID")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    email: str = Field(..., description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    avatar_url: Optional[str] = Field(None, description="Avatar URL")
    bio: Optional[str] = Field(None, description="Bio")
    role: str = Field(..., description="User role")
    law_firm_id: uuid.UUID = Field(..., description="Law firm ID")
    mfa_enabled: bool = Field(..., description="Is MFA enabled")

    model_config = {"from_attributes": True}


class SetPasswordRequest(BaseModel):
    """Set password request."""

    password: str = Field(..., min_length=8, description="New password")
    confirm_password: str = Field(..., description="Password confirmation")

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    """Update own profile request."""

    first_name: Optional[str] = Field(None, max_length=100, description="First name")
    last_name: Optional[str] = Field(None, max_length=100, description="Last name")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    bio: Optional[str] = Field(None, description="Bio")
    avatar_url: Optional[str] = Field(None, description="Avatar URL")

    model_config = {"from_attributes": True}
