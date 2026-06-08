"""CaseProcess model — stages/phases within a legal case."""

import uuid
from typing import Optional
from datetime import datetime

from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class CaseProcess(BaseModel):
    """
    A process (stage/phase) that belongs to a case.
    Tasks must be assigned to a process; each case can have
    multiple ordered processes representing work done over time.
    """

    __tablename__ = "case_processes"

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

    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # pendiente | en_progreso | completado | cancelado
    estado: Mapped[str] = mapped_column(String(50), default="pendiente", nullable=False)

    orden: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    fecha_inicio: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    fecha_fin: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Billing
    # tipo_tarifa: 'plana' | 'por_horas'
    tipo_tarifa: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    tarifa: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    # moneda: 'PEN' | 'USD'
    moneda: Mapped[Optional[str]] = mapped_column(String(3), nullable=True, default="PEN")

    # Relationships
    case: Mapped["Case"] = relationship(
        "Case",
        back_populates="processes",
        foreign_keys=[case_id],
    )

    tasks: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="process",
        foreign_keys="Task.process_id",
        cascade="all, delete-orphan",
    )


# Avoid circular imports
from app.models.case import Case
from app.models.task import Task
