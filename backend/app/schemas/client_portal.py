"""
Client portal schemas.
Schemas for external client authentication and data.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional


class ClientLoginRequest(BaseModel):
    """External client login request."""
    email: EmailStr
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "client@example.com",
                "password": "secure_password"
            }
        }


class ClientCaseResponse(BaseModel):
    """Case data visible to external client."""
    id: str
    case_number: str
    title: str
    status: str
    process_type: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "id": "case-123",
                "case_number": "2026-ABC-0001",
                "title": "Smith vs. Jones",
                "status": "open",
                "process_type": "civil",
                "created_at": "2026-01-15T10:30:00"
            }
        }


class ClientEventResponse(BaseModel):
    """Public event visible to client."""
    id: str
    title: str
    description: Optional[str] = None
    event_date: Optional[str] = None
    event_type: str

    class Config:
        json_schema_extra = {
            "example": {
                "id": "event-456",
                "title": "Trial Scheduled",
                "description": "Trial scheduled for March 15, 2026",
                "event_date": "2026-03-15",
                "event_type": "milestone"
            }
        }


class ClientDocumentResponse(BaseModel):
    """Document visible to client."""
    id: str
    file_name: str
    file_type: str
    file_size: int
    created_at: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "id": "doc-789",
                "file_name": "motion.pdf",
                "file_type": "application/pdf",
                "file_size": 245680,
                "created_at": "2026-02-20T14:00:00"
            }
        }
