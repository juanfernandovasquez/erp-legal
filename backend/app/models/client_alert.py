"""ClientAlertRule — recordatorios personalizados ligados a un cliente."""

import uuid
from datetime import date
from typing import Optional

from sqlalchemy import String, Text, Date, Boolean, Integer, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ClientAlertRule(BaseModel):
    """
    Regla de alerta personalizada para un cliente.
    El cron diario evalúa si hoy == fecha_evento - dias_anticipacion
    y, si coincide, envía un email a cada destinatario.
    """

    __tablename__ = "client_alert_rules"

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )

    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    es_anual: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dias_anticipacion: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    destinatarios: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # [user_id, ...]
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    client: Mapped["Client"] = relationship("Client", foreign_keys=[client_id])


from app.models.client import Client
