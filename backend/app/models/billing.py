"""BillingAdjustment model — manual adjustments to process billing."""

import uuid
from typing import Optional
from decimal import Decimal

from sqlalchemy import String, Text, Numeric, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class BillingAdjustment(BaseModel):
    """
    A manual billing adjustment (positive or negative) attached to a process.
    Allows adding discounts, extra charges or corrections to the computed total.
    """

    __tablename__ = "billing_adjustments"

    process_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("case_processes.id", ondelete="CASCADE"),
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    nombre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Override the created_by from AuditMixin — same FK definition, already inherited.
    # The AuditMixin already declares created_by, so we do NOT redeclare it here.

    # Relationships
    process: Mapped["CaseProcess"] = relationship(
        "CaseProcess",
        foreign_keys=[process_id],
    )


# Avoid circular imports
from app.models.process import CaseProcess
