from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class TaskCreate(BaseModel):
    """Create task request."""

    case_id: uuid.UUID = Field(..., description="Case ID")

    title: str = Field(..., min_length=1, max_length=255, description="Task title")
    description: Optional[str] = Field(None, description="Task description")

    assignee_id: Optional[uuid.UUID] = Field(None, description="Assignee ID")

    status: str = Field(default="todo", description="Task status")
    priority: str = Field(default="medium", description="Task priority")

    due_date: Optional[datetime] = Field(None, description="Due date")
    start_date: Optional[datetime] = Field(None, description="Start date")

    estimated_hours: Optional[float] = Field(None, description="Estimated hours")
    hourly_rate: Optional[float] = Field(None, description="Hourly rate")

    is_billable: bool = Field(default=True, description="Is billable")

    parent_task_id: Optional[uuid.UUID] = Field(None, description="Parent task ID")

    tags: Optional[list[str]] = Field(None, description="Task tags")
    notes: Optional[str] = Field(None, description="Task notes")

    model_config = {"from_attributes": True}


class TaskUpdate(BaseModel):
    """Update task request."""

    title: Optional[str] = Field(None, max_length=255, description="Task title")
    description: Optional[str] = Field(None, description="Task description")

    assignee_id: Optional[uuid.UUID] = Field(None, description="Assignee ID")

    status: Optional[str] = Field(None, description="Task status")
    priority: Optional[str] = Field(None, description="Task priority")

    due_date: Optional[datetime] = Field(None, description="Due date")
    start_date: Optional[datetime] = Field(None, description="Start date")
    completed_date: Optional[datetime] = Field(None, description="Completed date")

    estimated_hours: Optional[float] = Field(None, description="Estimated hours")
    actual_hours: Optional[float] = Field(None, description="Actual hours")
    hourly_rate: Optional[float] = Field(None, description="Hourly rate")

    progress_percentage: Optional[int] = Field(None, ge=0, le=100, description="Progress percentage")

    is_billable: Optional[bool] = Field(None, description="Is billable")

    tags: Optional[list[str]] = Field(None, description="Task tags")
    notes: Optional[str] = Field(None, description="Task notes")

    model_config = {"from_attributes": True}


class TaskResponse(BaseModel):
    """Task response."""

    id: uuid.UUID = Field(..., description="Task ID")
    case_id: uuid.UUID = Field(..., description="Case ID")

    title: str = Field(..., description="Task title")
    description: Optional[str] = Field(None, description="Task description")

    assignee_id: Optional[uuid.UUID] = Field(None, description="Assignee ID")

    status: str = Field(..., description="Task status")
    priority: str = Field(..., description="Task priority")

    due_date: Optional[datetime] = Field(None, description="Due date")
    start_date: Optional[datetime] = Field(None, description="Start date")
    completed_date: Optional[datetime] = Field(None, description="Completed date")

    estimated_hours: Optional[float] = Field(None, description="Estimated hours")
    actual_hours: float = Field(..., description="Actual hours")
    hourly_rate: Optional[float] = Field(None, description="Hourly rate")

    progress_percentage: int = Field(..., ge=0, le=100, description="Progress percentage")

    is_billable: bool = Field(..., description="Is billable")

    tags: Optional[list[str]] = Field(None, description="Task tags")
    notes: Optional[str] = Field(None, description="Task notes")

    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")

    model_config = {"from_attributes": True}


class CaseHoursCreate(BaseModel):
    """Create case hours request."""

    case_id: uuid.UUID = Field(..., description="Case ID")
    task_id: Optional[uuid.UUID] = Field(None, description="Task ID")

    hours: float = Field(..., gt=0, description="Hours worked")
    description: Optional[str] = Field(None, description="Work description")
    work_date: datetime = Field(..., description="Work date")

    hourly_rate: float = Field(..., gt=0, description="Hourly rate")
    is_billable: bool = Field(default=True, description="Is billable")

    model_config = {"from_attributes": True}


class CaseHoursResponse(BaseModel):
    """Case hours response."""

    id: uuid.UUID = Field(..., description="Hours ID")
    case_id: uuid.UUID = Field(..., description="Case ID")
    task_id: Optional[uuid.UUID] = Field(None, description="Task ID")
    user_id: uuid.UUID = Field(..., description="User ID")

    hours: float = Field(..., description="Hours worked")
    description: Optional[str] = Field(None, description="Work description")
    work_date: datetime = Field(..., description="Work date")

    hourly_rate: float = Field(..., description="Hourly rate")
    total_amount: float = Field(..., description="Total amount")
    is_billable: bool = Field(..., description="Is billable")
    invoice_id: Optional[str] = Field(None, description="Invoice ID")

    is_approved: bool = Field(..., description="Is approved")

    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = {"from_attributes": True}
