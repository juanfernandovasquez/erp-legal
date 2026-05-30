import uuid
from typing import Optional
from datetime import datetime

from sqlalchemy import String, Text, DateTime, ForeignKey, JSON, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin, Base


class AuditLog(TimestampMixin, Base):
    """
    Audit log for tracking all changes in the system.
    NOTE: This table does NOT use soft delete (no is_deleted, deleted_at, etc.).
    All records are permanent for compliance and legal requirements.
    """

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # User Information
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Action Details
    action: Mapped[str] = mapped_column(String(100), nullable=False)  # create, update, delete, login, etc.
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)  # case, user, document, etc.
    resource_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Changes
    old_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Request Information
    http_method: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    endpoint: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Status
    status_code: Mapped[Optional[int]] = mapped_column(nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    law_firm: Mapped["LawFirm"] = relationship(
        "LawFirm",
        back_populates="audit_logs",
        foreign_keys=[law_firm_id],
    )

    user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[user_id],
    )


class IAAnalysisResult(TimestampMixin, Base):
    """Results from AI analysis of documents."""

    __tablename__ = "ia_analysis_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Analysis Details
    analysis_type: Mapped[str] = mapped_column(String(100), nullable=False)  # summarization, classification, entity_extraction, etc.
    status: Mapped[str] = mapped_column(String(50), default="processing", nullable=False)  # processing, completed, failed

    # Results
    result_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(nullable=True)  # 0.0 to 1.0

    # Processing
    processing_time_ms: Mapped[Optional[int]] = mapped_column(nullable=True)
    model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Error Handling
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class IAAuditLog(TimestampMixin, Base):
    """Audit log for AI analysis activities."""

    __tablename__ = "ia_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Activity
    action: Mapped[str] = mapped_column(String(100), nullable=False)  # analysis_requested, analysis_reviewed, analysis_rejected, etc.
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # References
    analysis_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)


class IAFeedback(TimestampMixin, Base):
    """User feedback on AI analysis results."""

    __tablename__ = "ia_feedback"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    analysis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ia_analysis_results.id", ondelete="CASCADE"),
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Feedback
    rating: Mapped[int] = mapped_column(nullable=False)  # 1-5 stars
    is_accurate: Mapped[Optional[bool]] = mapped_column(nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    corrections: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class AnonimizacionRule(TimestampMixin, Base):
    """Rules for anonymizing sensitive data in documents."""

    __tablename__ = "anonimizacion_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Rule Details
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    pattern_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # regex, entity_type, keyword, etc.
    pattern: Mapped[str] = mapped_column(Text, nullable=False)

    # Replacement
    replacement_text: Mapped[str] = mapped_column(String(255), nullable=False)  # [NOMBRE], [RFC], etc.

    # Configuration
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    priority: Mapped[int] = mapped_column(default=0, nullable=False)

    # Description
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


# Import at the end to avoid circular imports
from app.models.law_firm import LawFirm
from app.models.user import User
from app.models.document import Document
