import uuid
from enum import Enum
from typing import Optional
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, JSON, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class CaseEventType(str, Enum):
    """Types of case events."""

    HEARING = "hearing"
    TRIAL = "trial"
    DEPOSITION = "deposition"
    MOTION_HEARING = "motion_hearing"
    SETTLEMENT_CONFERENCE = "settlement_conference"
    DEADLINE = "deadline"
    FILING = "filing"
    STATUS_UPDATE = "status_update"
    DOCUMENT_RECEIVED = "document_received"
    OTHER = "other"


class CaseEvent(BaseModel):
    """Timeline events for a case."""

    __tablename__ = "case_events"

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

    # Event Details
    event_type: Mapped[CaseEventType] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Event Timing
    event_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    event_end_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Location
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Metadata
    is_reminder_set: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reminder_days_before: Mapped[Optional[int]] = mapped_column(nullable=True)

    # Status
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    case: Mapped["Case"] = relationship(
        "Case",
        back_populates="case_events",
        foreign_keys=[case_id],
    )


class CaseUpdate(BaseModel):
    """Case status updates and internal notes."""

    __tablename__ = "case_updates"

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

    # Update Content
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Update Type
    update_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # status_change, progress_update, issue_found, milestone_reached, etc.

    # Visibility
    is_internal: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )  # Internal-only vs visible to clients
    is_client_visible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    case: Mapped["Case"] = relationship(
        "Case",
        back_populates="case_updates",
        foreign_keys=[case_id],
    )


# Import at the end to avoid circular imports
from app.models.case import Case
