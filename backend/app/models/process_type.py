import uuid
from typing import Optional

from sqlalchemy import String, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ProcessType(BaseModel):
    """Legal process types (court procedures, administrative processes, etc.)."""

    __tablename__ = "process_types"

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Basic Information
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Details
    category: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # civil, criminal, administrative, labor, etc.
    jurisdiction: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    court_level: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # first_instance, appeals, cassation, etc.

    # Process Information
    average_duration_days: Mapped[Optional[int]] = mapped_column(nullable=True)
    standard_document_requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    typical_steps: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    estimated_cost: Mapped[Optional[float]] = mapped_column(nullable=True)

    # Configuration
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_standard: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )  # Pre-defined vs custom

    # Relationships
    law_firm: Mapped["LawFirm"] = relationship(
        "LawFirm",
        back_populates="process_types",
        foreign_keys=[law_firm_id],
    )

    cases: Mapped[list["Case"]] = relationship(
        "Case",
        back_populates="process_type",
        cascade="all, delete-orphan",
        foreign_keys="Case.process_type_id",
    )


# Import at the end to avoid circular imports
from app.models.law_firm import LawFirm
from app.models.case import Case
