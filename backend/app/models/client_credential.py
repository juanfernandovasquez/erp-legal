"""ClientCredential — múltiples credenciales institucionales por cliente."""

import uuid
from typing import Optional

from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ClientCredential(BaseModel):
    """
    Credencial institucional ligada a un cliente.
    Permite guardar usuario/contraseña de cualquier institución
    (SUNAT SOL, SUNARP, SBS, etc.) con un título libre.
    """

    __tablename__ = "client_credentials"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    titulo: Mapped[str] = mapped_column(String(100), nullable=False)
    usuario: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    clave: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    client: Mapped["Client"] = relationship("Client", foreign_keys=[client_id])


from app.models.client import Client
