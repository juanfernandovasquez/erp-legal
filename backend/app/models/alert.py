import uuid
from enum import Enum
from typing import Optional
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, Boolean, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class AlertType(str, Enum):
    """Types of case alerts."""

    DEADLINE_APPROACHING = "deadline_approaching"
    DOCUMENT_DUE = "document_due"
    HEARING_SCHEDULED = "hearing_scheduled"
    PAYMENT_DUE = "payment_due"
    TASK_OVERDUE = "task_overdue"
    TEAM_MEMBER_CHANGE = "team_member_change"
    STATUS_CHANGE = "status_change"
    CUSTOM = "custom"


class AlertSeverity(str, Enum):
    """Alert severity levels."""

    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class CaseAlert(BaseModel):
    """Alerts and notifications for cases."""

    __tablename__ = "case_alerts"

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

    # Alert Details
    alert_type: Mapped[AlertType] = mapped_column(String(50), nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(String(50), default="info", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    # Dates
    alert_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Status
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Resolution
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Source
    source: Mapped[str] = mapped_column(String(10), default="manual", nullable=False)

    # Task link (for auto-generated deadline alerts)
    task_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Metadata
    alert_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship(
        "Case",
        back_populates="case_alerts",
        foreign_keys=[case_id],
    )


class LegalRegistry(BaseModel):
    """Legal registries and compliance tracking for cases."""

    __tablename__ = "legal_registries"

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

    # Registry Details
    registry_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # court_filing, regulatory_submission, compliance_checklist, etc.
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status
    status: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # pending, submitted, approved, rejected, archived
    submission_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    approval_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Reference
    reference_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    external_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Completion
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completion_percentage: Mapped[int] = mapped_column(default=0, nullable=False)

    # Metadata
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship(
        "Case",
        back_populates="legal_registries",
        foreign_keys=[case_id],
    )


# Import at the end to avoid circular imports
from app.models.case import Case
