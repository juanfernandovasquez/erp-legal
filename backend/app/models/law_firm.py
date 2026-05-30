import uuid
from typing import Optional

from sqlalchemy import String, Text, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class LawFirm(BaseModel):
    """Law firm entity representing an organization."""

    __tablename__ = "law_firms"

    # Multi-tenant is implicit - this IS the tenant
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Contact Information
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Address
    street_address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Organization Details
    registration_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Logo and branding
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str] = mapped_column(String(7), default="#000000", nullable=False)
    secondary_color: Mapped[str] = mapped_column(String(7), default="#FFFFFF", nullable=False)

    # Settings
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    max_users: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    max_cases: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    max_storage_gb: Mapped[int] = mapped_column(Integer, default=100, nullable=False)

    # Subscription/Billing
    subscription_plan: Mapped[str] = mapped_column(
        String(50), default="standard", nullable=False
    )  # basic, standard, premium, enterprise

    # Relationships
    users: Mapped[list["User"]] = relationship(
        "User",
        back_populates="law_firm",
        cascade="all, delete-orphan",
        foreign_keys="User.law_firm_id",
    )

    cases: Mapped[list["Case"]] = relationship(
        "Case",
        back_populates="law_firm",
        cascade="all, delete-orphan",
        foreign_keys="Case.law_firm_id",
    )

    clients: Mapped[list["Client"]] = relationship(
        "Client",
        back_populates="law_firm",
        cascade="all, delete-orphan",
        foreign_keys="Client.law_firm_id",
    )

    process_types: Mapped[list["ProcessType"]] = relationship(
        "ProcessType",
        back_populates="law_firm",
        cascade="all, delete-orphan",
        foreign_keys="ProcessType.law_firm_id",
    )

    external_credentials: Mapped[list["ExternalCredential"]] = relationship(
        "ExternalCredential",
        back_populates="law_firm",
        cascade="all, delete-orphan",
        foreign_keys="ExternalCredential.law_firm_id",
    )

    audit_logs: Mapped[list["AuditLog"]] = relationship(
        "AuditLog",
        back_populates="law_firm",
        cascade="all, delete-orphan",
        foreign_keys="AuditLog.law_firm_id",
    )


# Import at the end to avoid circular imports
from app.models.user import User
from app.models.case import Case
from app.models.client import Client
from app.models.process_type import ProcessType
from app.models.credential import ExternalCredential
from app.models.audit import AuditLog
