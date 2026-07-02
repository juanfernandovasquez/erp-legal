from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
import uuid


class ClientCreate(BaseModel):
    """Create client request."""

    name: str = Field(..., min_length=1, max_length=255, description="Client name")
    client_type: str = Field(..., description="Client type")
    email: Optional[EmailStr] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")

    organization_name: Optional[str] = Field(None, max_length=255, description="Organization name")
    registration_number: Optional[str] = Field(None, max_length=100, description="Registration number")
    tax_id: Optional[str] = Field(None, max_length=100, description="Tax ID")

    street_address: Optional[str] = Field(None, max_length=255, description="Street address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State/Province")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal code")
    country: Optional[str] = Field(None, max_length=100, description="Country")

    primary_contact_name: Optional[str] = Field(None, max_length=255, description="Primary contact name")
    primary_contact_email: Optional[EmailStr] = Field(None, description="Primary contact email")
    primary_contact_phone: Optional[str] = Field(None, max_length=20, description="Primary contact phone")

    industry: Optional[str] = Field(None, max_length=100, description="Industry")
    website: Optional[str] = Field(None, max_length=255, description="Website")

    notes: Optional[str] = Field(None, description="Notes")
    tags: Optional[list[str]] = Field(None, description="Tags")

    is_preferred: bool = Field(default=False, description="Is preferred")

    usuario_sol: Optional[str] = Field(None, max_length=100, description="Usuario SOL (SUNAT)")
    clave_sol: Optional[str] = Field(None, max_length=255, description="Clave SOL (SUNAT)")

    model_config = {"from_attributes": True}


class ClientUpdate(BaseModel):
    """Update client request."""

    name: Optional[str] = Field(None, max_length=255, description="Client name")
    email: Optional[EmailStr] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    client_type: Optional[str] = Field(None, description="Client type")

    organization_name: Optional[str] = Field(None, max_length=255, description="Organization name")
    registration_number: Optional[str] = Field(None, max_length=100, description="Registration number")
    tax_id: Optional[str] = Field(None, max_length=100, description="Tax ID")

    street_address: Optional[str] = Field(None, max_length=255, description="Street address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    state: Optional[str] = Field(None, max_length=100, description="State/Province")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal code")
    country: Optional[str] = Field(None, max_length=100, description="Country")

    primary_contact_name: Optional[str] = Field(None, max_length=255, description="Primary contact name")
    primary_contact_email: Optional[EmailStr] = Field(None, description="Primary contact email")
    primary_contact_phone: Optional[str] = Field(None, max_length=20, description="Primary contact phone")

    industry: Optional[str] = Field(None, max_length=100, description="Industry")
    website: Optional[str] = Field(None, max_length=255, description="Website")

    notes: Optional[str] = Field(None, description="Notes")
    tags: Optional[list[str]] = Field(None, description="Tags")

    is_active: Optional[bool] = Field(None, description="Is active")
    is_preferred: Optional[bool] = Field(None, description="Is preferred")

    usuario_sol: Optional[str] = Field(None, max_length=100, description="Usuario SOL (SUNAT)")
    clave_sol: Optional[str] = Field(None, max_length=255, description="Clave SOL (SUNAT)")

    model_config = {"from_attributes": True}


class ClientResponse(BaseModel):
    """Client response."""

    id: uuid.UUID = Field(..., description="Client ID")
    name: str = Field(..., description="Client name")
    client_type: str = Field(..., description="Client type")
    email: str = Field(..., description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")

    organization_name: Optional[str] = Field(None, description="Organization name")
    registration_number: Optional[str] = Field(None, description="Registration number")
    tax_id: Optional[str] = Field(None, description="Tax ID")

    street_address: Optional[str] = Field(None, description="Street address")
    city: Optional[str] = Field(None, description="City")
    state: Optional[str] = Field(None, description="State/Province")
    postal_code: Optional[str] = Field(None, description="Postal code")
    country: Optional[str] = Field(None, description="Country")

    primary_contact_name: Optional[str] = Field(None, description="Primary contact name")
    primary_contact_email: Optional[str] = Field(None, description="Primary contact email")
    primary_contact_phone: Optional[str] = Field(None, description="Primary contact phone")

    industry: Optional[str] = Field(None, description="Industry")
    website: Optional[str] = Field(None, description="Website")

    notes: Optional[str] = Field(None, description="Notes")
    tags: Optional[list[str]] = Field(None, description="Tags")

    is_active: bool = Field(..., description="Is active")
    is_preferred: bool = Field(..., description="Is preferred")

    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")

    model_config = {"from_attributes": True}


class ClientListResponse(BaseModel):
    """Client list response."""

    id: uuid.UUID = Field(..., description="Client ID")
    name: str = Field(..., description="Client name")
    client_type: str = Field(..., description="Client type")
    email: str = Field(..., description="Email address")

    is_active: bool = Field(..., description="Is active")
    is_preferred: bool = Field(..., description="Is preferred")

    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = {"from_attributes": True}
