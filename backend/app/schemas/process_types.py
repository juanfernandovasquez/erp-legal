"""
Process type schemas.
Schemas for legal process type management.
"""

from pydantic import BaseModel, Field
from typing import Optional


class ProcessTypeCreateRequest(BaseModel):
    """Create process type request."""
    name: str = Field(..., min_length=1, max_length=255, description="Process type name")
    description: Optional[str] = Field(None, description="Detailed description")
    code: str = Field(..., min_length=1, max_length=50, description="Unique code")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Civil Litigation",
                "description": "General civil litigation cases",
                "code": "CIVIL"
            }
        }


class ProcessTypeUpdateRequest(BaseModel):
    """Update process type request."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Civil Litigation - Updated",
                "is_active": True
            }
        }


class ProcessTypeResponse(BaseModel):
    """Process type response."""
    id: str
    name: str
    description: Optional[str]
    code: str
    is_active: bool
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        json_schema_extra = {
            "example": {
                "id": "ptype-123",
                "name": "Civil Litigation",
                "description": "General civil litigation cases",
                "code": "CIVIL",
                "is_active": True,
                "created_at": "2026-01-01T08:00:00",
                "updated_at": "2026-03-15T10:30:00"
            }
        }
