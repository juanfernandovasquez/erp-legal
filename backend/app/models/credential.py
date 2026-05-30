import uuid
from typing import Optional
from datetime import datetime

from sqlalchemy import String, Text, ForeignKey, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class ExternalCredential(BaseModel):
    """Encrypted credentials for external integrations."""

    __tablename__ = "external_credentials"

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Service Information
    service_name: Mapped[str] = mapped_column(String(100), nullable=False)
    service_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # court_system, document_repository, email, etc.

    # Credential Details (encrypted)
    access_key: Mapped[str] = mapped_column(String(500), nullable=False)  # Encrypted
    secret_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Encrypted
    token: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Encrypted
    username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Encrypted
    password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Encrypted

    # Encryption Information
    encryption_key_id: Mapped[str] = mapped_column(String(255), nullable=False)
    encryption_algorithm: Mapped[str] = mapped_column(String(50), default="AES-256-GCM", nullable=False)

    # Metadata
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Expiration
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_validated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    law_firm: Mapped["LawFirm"] = relationship(
        "LawFirm",
        back_populates="external_credentials",
        foreign_keys=[law_firm_id],
    )

    def decrypt_access_key(self) -> str:
        """Decrypt access key using encryption utility."""
        from app.utils.encryption import decrypt_field

        return decrypt_field(self.access_key, self.encryption_key_id)

    def decrypt_secret_key(self) -> Optional[str]:
        """Decrypt secret key using encryption utility."""
        from app.utils.encryption import decrypt_field

        if not self.secret_key:
            return None
        return decrypt_field(self.secret_key, self.encryption_key_id)

    def decrypt_token(self) -> Optional[str]:
        """Decrypt token using encryption utility."""
        from app.utils.encryption import decrypt_field

        if not self.token:
            return None
        return decrypt_field(self.token, self.encryption_key_id)

    def decrypt_username(self) -> Optional[str]:
        """Decrypt username using encryption utility."""
        from app.utils.encryption import decrypt_field

        if not self.username:
            return None
        return decrypt_field(self.username, self.encryption_key_id)

    def decrypt_password(self) -> Optional[str]:
        """Decrypt password using encryption utility."""
        from app.utils.encryption import decrypt_field

        if not self.password:
            return None
        return decrypt_field(self.password, self.encryption_key_id)


# Import at the end to avoid circular imports
from app.models.law_firm import LawFirm
