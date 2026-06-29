"""BillingAdjustment model — manual adjustments to case-level billing."""

import uuid
from typing import Optional
from decimal import Decimal
from datetime import date

from sqlalchemy import String, Text, Numeric, ForeignKey, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class BillingAdjustment(BaseModel):
    """
    A manual billing adjustment (positive or negative) attached to a case.
    Allows adding discounts, extra charges or corrections to the computed total.
    """

    __tablename__ = "billing_adjustments"

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

    nombre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fecha_aplicacion: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship(
        "Case",
        foreign_keys=[case_id],
    )


# Avoid circular imports
from app.models.case import Case
