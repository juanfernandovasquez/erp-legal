from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class CaseEventCreate(BaseModel):
    """Create case event request."""

    event_type: str = Field(..., description="Event type")
    title: str = Field(..., min_length=1, max_length=255, description="Event title")
    description: Optional[str] = Field(None, description="Event description")

    event_date: datetime = Field(..., description="Event date")
    event_end_date: Optional[datetime] = Field(None, description="Event end date")

    location: Optional[str] = Field(None, max_length=255, description="Location")

    is_reminder_set: bool = Field(default=False, description="Is reminder set")
    reminder_days_before: Optional[int] = Field(None, description="Reminder days before")

    model_config = {"from_attributes": True}


class CaseEventUpdate(BaseModel):
    """Update case event request."""

    event_type: Optional[str] = Field(None, description="Event type")
    title: Optional[str] = Field(None, max_length=255, description="Event title")
    description: Optional[str] = Field(None, description="Event description")

    event_date: Optional[datetime] = Field(None, description="Event date")
    event_end_date: Optional[datetime] = Field(None, description="Event end date")

    location: Optional[str] = Field(None, max_length=255, description="Location")

    is_reminder_set: Optional[bool] = Field(None, description="Is reminder set")
    reminder_days_before: Optional[int] = Field(None, description="Reminder days before")

    is_completed: Optional[bool] = Field(None, description="Is completed")

    model_config = {"from_attributes": True}


class CaseEventResponse(BaseModel):
    """Case event response."""

    id: uuid.UUID = Field(..., description="Event ID")
    case_id: uuid.UUID = Field(..., description="Case ID")

    event_type: str = Field(..., description="Event type")
    title: str = Field(..., description="Event title")
    description: Optional[str] = Field(None, description="Event description")

    event_date: datetime = Field(..., description="Event date")
    event_end_date: Optional[datetime] = Field(None, description="Event end date")

    location: Optional[str] = Field(None, description="Location")

    is_reminder_set: bool = Field(..., description="Is reminder set")
    reminder_days_before: Optional[int] = Field(None, description="Reminder days before")

    is_completed: bool = Field(..., description="Is completed")

    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")

    model_config = {"from_attributes": True}


class CaseUpdateCreate(BaseModel):
    """Create case update request."""

    content: str = Field(..., min_length=1, description="Update content")
    title: Optional[str] = Field(None, max_length=255, description="Update title (auto-generated if omitted)")
    update_type: str = Field(default="general", description="Update type")
    is_internal: bool = Field(default=True, description="Is internal")
    is_client_visible: bool = Field(default=False, description="Is client visible")

    model_config = {"from_attributes": True}


class CaseUpdateResponse(BaseModel):
    """Case update response."""

    id: uuid.UUID = Field(..., description="Update ID")
    case_id: uuid.UUID = Field(..., description="Case ID")

    title: str = Field(..., description="Update title")
    content: str = Field(..., description="Update content")

    update_type: str = Field(..., description="Update type")

    is_internal: bool = Field(..., description="Is internal")
    is_client_visible: bool = Field(..., description="Is client visible")

    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")

    model_config = {"from_attributes": True}
