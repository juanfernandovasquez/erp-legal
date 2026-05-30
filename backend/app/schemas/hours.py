"""
Hour entry schemas.
Schemas for time tracking and hour registration.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class HourEntryCreateRequest(BaseModel):
    """Create hour entry request."""
    user_id: str = Field(..., description="User ID registering the hours")
    hours: float = Field(..., gt=0, le=24, description="Number of hours (0-24)")
    task_type: str = Field(default="general", description="Type of work performed")
    description: Optional[str] = Field(None, description="Description of work")
    work_date: Optional[date] = Field(None, description="Date of work (defaults to today)")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user-123",
                "hours": 8.5,
                "task_type": "research",
                "description": "Legal research for Smith case",
                "work_date": "2026-04-10"
            }
        }


class HourEntryUpdateRequest(BaseModel):
    """Update hour entry request."""
    hours: Optional[float] = Field(None, gt=0, le=24)
    task_type: Optional[str] = None
    description: Optional[str] = None
    work_date: Optional[date] = None

    class Config:
        json_schema_extra = {
            "example": {
                "hours": 9.0,
                "description": "Revised legal research time"
            }
        }


class HourEntryResponse(BaseModel):
    """Hour entry response."""
    id: str
    case_id: str
    user_id: str
    hours: float
    task_type: str
    description: Optional[str]
    work_date: Optional[str]
    created_at: Optional[str]

    class Config:
        json_schema_extra = {
            "example": {
                "id": "hours-456",
                "case_id": "case-123",
                "user_id": "user-123",
                "hours": 8.5,
                "task_type": "research",
                "description": "Legal research for Smith case",
                "work_date": "2026-04-10",
                "created_at": "2026-04-10T14:30:00"
            }
        }


class HourSummaryResponse(BaseModel):
    """Hours summary response."""
    total_hours: float
    group_by: str
    summary: list

    class Config:
        json_schema_extra = {
            "example": {
                "total_hours": 40.5,
                "group_by": "user",
                "summary": [
                    {
                        "user_id": "user-123",
                        "user_name": "John Doe",
                        "total_hours": 16.0
                    },
                    {
                        "user_id": "user-456",
                        "user_name": "Jane Smith",
                        "total_hours": 24.5
                    }
                ]
            }
        }
