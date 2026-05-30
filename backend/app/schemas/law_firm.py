from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional
from datetime import datetime
import uuid


class LawFirmCreate(BaseModel):
    """Create law firm request."""

    name: str = Field(..., min_length=1, max_length=255, description="Law firm name")
    slug: str = Field(..., min_length=1, max_length=100, description="URL-friendly slug")
    email: EmailStr = Field(..., description="Law firm email")
    phone: Optional[str] = Field(None, max_length=20, description="Law firm phone")
    website: Optional[HttpUrl] = Field(None, description="Law firm website")
    description: Optional[str] = Field(None, description="Law firm description")

    street_address: Optional[str] = Field(None, max_length=255, description="Street address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State/Province")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal code")
    country: Optional[str] = Field(None, max_length=100, description="Country")

    registration_number: Optional[str] = Field(None, max_length=100, description="Registration number")
    tax_id: Optional[str] = Field(None, max_length=100, description="Tax ID")

    primary_color: str = Field(default="#000000", description="Primary color (hex)")
    secondary_color: str = Field(default="#FFFFFF", description="Secondary color (hex)")

    subscription_plan: str = Field(
        default="standard",
        description="Subscription plan (basic, standard, premium, enterprise)",
    )

    model_config = {"from_attributes": True}


class LawFirmUpdate(BaseModel):
    """Update law firm request."""

    name: Optional[str] = Field(None, max_length=255, description="Law firm name")
    email: Optional[EmailStr] = Field(None, description="Law firm email")
    phone: Optional[str] = Field(None, max_length=20, description="Law firm phone")
    website: Optional[HttpUrl] = Field(None, description="Law firm website")
    description: Optional[str] = Field(None, description="Law firm description")

    street_address: Optional[str] = Field(None, max_length=255, description="Street address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State/Province")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal code")
    country: Optional[str] = Field(None, max_length=100, description="Country")

    primary_color: Optional[str] = Field(None, description="Primary color (hex)")
    secondary_color: Optional[str] = Field(None, description="Secondary color (hex)")

    subscription_plan: Optional[str] = Field(None, description="Subscription plan")
    is_active: Optional[bool] = Field(None, description="Is law firm active")

    model_config = {"from_attributes": True}


class LawFirmResponse(BaseModel):
    """Law firm response."""

    id: uuid.UUID = Field(..., description="Law firm ID")
    name: str = Field(..., description="Law firm name")
    slug: str = Field(..., description="URL-friendly slug")
    email: str = Field(..., description="Law firm email")
    phone: Optional[str] = Field(None, description="Law firm phone")
    website: Optional[str] = Field(None, description="Law firm website")
    description: Optional[str] = Field(None, description="Law firm description")

    street_address: Optional[str] = Field(None, description="Street address")
    city: Optional[str] = Field(None, description="City")
    state: Optional[str] = Field(None, description="State/Province")
    postal_code: Optional[str] = Field(None, description="Postal code")
    country: Optional[str] = Field(None, description="Country")

    registration_number: Optional[str] = Field(None, description="Registration number")
    tax_id: Optional[str] = Field(None, description="Tax ID")

    logo_url: Optional[str] = Field(None, description="Logo URL")
    primary_color: str = Field(..., description="Primary color")
    secondary_color: str = Field(..., description="Secondary color")

    is_active: bool = Field(..., description="Is law firm active")
    max_users: int = Field(..., description="Maximum users allowed")
    max_cases: int = Field(..., description="Maximum cases allowed")
    max_storage_gb: int = Field(..., description="Maximum storage in GB")

    subscription_plan: str = Field(..., description="Subscription plan")

    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")

    model_config = {"from_attributes": True}


class LawFirmListResponse(BaseModel):
    """Law firm list response."""

    id: uuid.UUID = Field(..., description="Law firm ID")
    name: str = Field(..., description="Law firm name")
    email: str = Field(..., description="Law firm email")
    is_active: bool = Field(..., description="Is law firm active")
    subscription_plan: str = Field(..., description="Subscription plan")
    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = {"from_attributes": True}
