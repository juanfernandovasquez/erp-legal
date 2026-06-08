import uuid
from enum import Enum
from typing import Optional
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Numeric, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class TaskStatus(str, Enum):
    """Task status values."""

    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    BLOCKED = "blocked"
    DONE = "done"
    CANCELLED = "cancelled"


class TaskPriority(str, Enum):
    """Task priority levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Task(BaseModel):
    """Tasks associated with a case."""

    __tablename__ = "tasks"

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Basic Information
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Assignment
    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Task Details
    status: Mapped[TaskStatus] = mapped_column(String(50), default="todo", nullable=False)
    priority: Mapped[TaskPriority] = mapped_column(String(50), default="medium", nullable=False)

    # Dates
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    presentation_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Estimation
    estimated_hours: Mapped[Optional[float]] = mapped_column(nullable=True)
    actual_hours: Mapped[float] = mapped_column(Numeric(8, 2), default=0, nullable=False)

    # Billing
    hourly_rate: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    is_billable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Progress
    progress_percentage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Metadata
    tags: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Process (stage/phase) this task belongs to — nullable for legacy tasks
    process_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("case_processes.id", ondelete="RESTRICT"),
        nullable=True,
    )

    # Parent task (subtasks)
    parent_task_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    case: Mapped["Case"] = relationship(
        "Case",
        back_populates="tasks",
        foreign_keys=[case_id],
    )

    assignee: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="tasks",
        foreign_keys=[assignee_id],
    )

    parent_task: Mapped[Optional["Task"]] = relationship(
        "Task",
        foreign_keys="[Task.parent_task_id]",
        back_populates="subtasks",
        remote_side="Task.id",
    )

    subtasks: Mapped[list["Task"]] = relationship(
        "Task",
        foreign_keys="[Task.parent_task_id]",
        back_populates="parent_task",
        cascade="all, delete-orphan",
    )

    case_hours: Mapped[list["CaseHours"]] = relationship(
        "CaseHours",
        back_populates="task",
        cascade="all, delete-orphan",
        foreign_keys="CaseHours.task_id",
    )

    task_schedules: Mapped[list["TaskSchedule"]] = relationship(
        "TaskSchedule",
        back_populates="task",
        cascade="all, delete-orphan",
        foreign_keys="TaskSchedule.task_id",
    )

    process: Mapped[Optional["CaseProcess"]] = relationship(
        "CaseProcess",
        back_populates="tasks",
        foreign_keys=[process_id],
    )


class CaseHours(BaseModel):
    """Hours tracked for cases and tasks."""

    __tablename__ = "case_hours"

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
    )

    task_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Hours Details
    hours: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    work_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Billing
    hourly_rate: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    is_billable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    invoice_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Status
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    case: Mapped["Case"] = relationship(
        "Case",
        back_populates="case_hours",
        foreign_keys=[case_id],
    )

    task: Mapped[Optional["Task"]] = relationship(
        "Task",
        back_populates="case_hours",
        foreign_keys=[task_id],
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="case_hours",
        foreign_keys=[user_id],
    )


class InvoiceMetrics(BaseModel):
    """Billing and invoice metrics for cases."""

    __tablename__ = "invoice_metrics"

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Billing Metrics
    total_billable_hours: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    total_billed_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    total_paid_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    outstanding_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)

    # Invoice Details
    last_invoice_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    next_invoice_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    invoice_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    case: Mapped["Case"] = relationship(
        "Case",
        back_populates="invoice_metrics",
        foreign_keys=[case_id],
    )


class TaskSchedule(BaseModel):
    """Scheduled recurring tasks."""

    __tablename__ = "task_schedules"

    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Scheduling
    recurrence_pattern: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # daily, weekly, monthly, yearly, custom
    recurrence_rule: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # RRULE format
    next_occurrence: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_occurrence: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # End date for recurrence
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Is active
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    task: Mapped["Task"] = relationship(
        "Task",
        back_populates="task_schedules",
        foreign_keys=[task_id],
    )


# Import at the end to avoid circular imports
from app.models.case import Case
from app.models.user import User
from app.models.law_firm import LawFirm
