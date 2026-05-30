from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class CaseAlertCreate(BaseModel):
    """Create case alert request."""

    case_id: uuid.UUID = Field(..., description="Case ID")

    alert_type: str = Field(..., description="Alert type")
    severity: str = Field(default="info", description="Alert severity")

    title: str = Field(..., min_length=1, max_length=255, description="Alert title")
    message: str = Field(..., min_length=1, description="Alert message")

    due_date: Optional[datetime] = Field(None, description="Due date")

    model_config = {"from_attributes": True}


class CaseAlertUpdate(BaseModel):
    """Update case alert request."""

    severity: Optional[str] = Field(None, description="Alert severity")
    title: Optional[str] = Field(None, max_length=255, description="Alert title")
    message: Optional[str] = Field(None, description="Alert message")

    is_read: Optional[bool] = Field(None, description="Is read")
    is_acknowledged: Optional[bool] = Field(None, description="Is acknowledged")
    is_resolved: Optional[bool] = Field(None, description="Is resolved")
    resolution_notes: Optional[str] = Field(None, description="Resolution notes")

    model_config = {"from_attributes": True}


class CaseAlertResponse(BaseModel):
    """Case alert response."""

    id: uuid.UUID = Field(..., description="Alert ID")
    case_id: uuid.UUID = Field(..., description="Case ID")

    alert_type: str = Field(..., description="Alert type")
    severity: str = Field(..., description="Alert severity")

    title: str = Field(..., description="Alert title")
    message: str = Field(..., description="Alert message")

    alert_date: datetime = Field(..., description="Alert date")
    due_date: Optional[datetime] = Field(None, description="Due date")

    is_read: bool = Field(..., description="Is read")
    is_acknowledged: bool = Field(..., description="Is acknowledged")
    acknowledged_at: Optional[datetime] = Field(None, description="Acknowledged at")

    is_resolved: bool = Field(..., description="Is resolved")
    resolved_at: Optional[datetime] = Field(None, description="Resolved at")
    resolution_notes: Optional[str] = Field(None, description="Resolution notes")

    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = {"from_attributes": True}


class LegalRegistryCreate(BaseModel):
    """Create legal registry request."""

    case_id: uuid.UUID = Field(..., description="Case ID")

    registry_type: str = Field(..., description="Registry type")
    title: str = Field(..., min_length=1, max_length=255, description="Registry title")
    description: Optional[str] = Field(None, description="Registry description")

    status: str = Field(default="pending", description="Registry status")

    due_date: Optional[datetime] = Field(None, description="Due date")

    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    external_url: Optional[str] = Field(None, max_length=500, description="External URL")

    notes: Optional[str] = Field(None, description="Notes")
    tags: Optional[list[str]] = Field(None, description="Tags")

    model_config = {"from_attributes": True}


class LegalRegistryUpdate(BaseModel):
    """Update legal registry request."""

    title: Optional[str] = Field(None, max_length=255, description="Registry title")
    description: Optional[str] = Field(None, description="Registry description")

    status: Optional[str] = Field(None, description="Registry status")

    due_date: Optional[datetime] = Field(None, description="Due date")

    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    external_url: Optional[str] = Field(None, max_length=500, description="External URL")

    is_completed: Optional[bool] = Field(None, description="Is completed")
    completion_percentage: Optional[int] = Field(None, ge=0, le=100, description="Completion percentage")

    notes: Optional[str] = Field(None, description="Notes")
    tags: Optional[list[str]] = Field(None, description="Tags")

    model_config = {"from_attributes": True}


class LegalRegistryResponse(BaseModel):
    """Legal registry response."""

    id: uuid.UUID = Field(..., description="Registry ID")
    case_id: uuid.UUID = Field(..., description="Case ID")

    registry_type: str = Field(..., description="Registry type")
    title: str = Field(..., description="Registry title")
    description: Optional[str] = Field(None, description="Registry description")

    status: str = Field(..., description="Registry status")

    submission_date: Optional[datetime] = Field(None, description="Submission date")
    approval_date: Optional[datetime] = Field(None, description="Approval date")
    due_date: Optional[datetime] = Field(None, description="Due date")

    reference_number: Optional[str] = Field(None, description="Reference number")
    external_url: Optional[str] = Field(None, description="External URL")

    is_completed: bool = Field(..., description="Is completed")
    completion_percentage: int = Field(..., ge=0, le=100, description="Completion percentage")

    notes: Optional[str] = Field(None, description="Notes")
    tags: Optional[list[str]] = Field(None, description="Tags")

    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")

    model_config = {"from_attributes": True}
