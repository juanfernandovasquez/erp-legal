import uuid
from enum import Enum
from typing import Optional
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class UserRole(str, Enum):
    """User role types in the system. Two tiers: admin and regular user."""

    ADMIN = "admin_firma"       # Full access: manage users, all cases, settings
    USER = "abogado_junior"     # Regular user: work on assigned cases/tasks


class User(BaseModel):
    """User entity representing a person with access to the system."""

    __tablename__ = "users"

    # Basic Information
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Authentication
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    google_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)
    google_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Role and Permissions
    role: Mapped[UserRole] = mapped_column(String(50), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Multi-tenancy
    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Profile Information
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Activity Tracking
    last_password_change: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Two-Factor Authentication
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Email verification
    email_verification_token: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    email_verification_expires: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Password reset
    password_reset_token: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    password_reset_expires: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    law_firm: Mapped["LawFirm"] = relationship(
        "LawFirm",
        back_populates="users",
        foreign_keys=[law_firm_id],
    )

    case_teams: Mapped[list["CaseTeam"]] = relationship(
        "CaseTeam",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="CaseTeam.user_id",
    )

    external_reviewer_instances: Mapped[list["ExternalReviewer"]] = relationship(
        "ExternalReviewer",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="ExternalReviewer.user_id",
    )

    tasks: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="assignee",
        cascade="all, delete-orphan",
        foreign_keys="Task.assignee_id",
    )

    case_hours: Mapped[list["CaseHours"]] = relationship(
        "CaseHours",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="CaseHours.user_id",
    )

    documents_created: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="created_by_user",
        cascade="all, delete-orphan",
        foreign_keys="Document.created_by_document",
    )

    def set_password(self, password: str) -> None:
        """Hash and set password."""
        from app.utils.security import hash_password

        self.password_hash = hash_password(password)

    def verify_password(self, password: str) -> bool:
        """Verify password against hash."""
        from app.utils.security import verify_password

        return verify_password(password, self.password_hash)

    def get_full_name(self) -> str:
        """Get user's full name."""
        return f"{self.first_name} {self.last_name}"


# Import at the end to avoid circular imports
from app.models.law_firm import LawFirm
from app.models.case import CaseTeam, ExternalReviewer
from app.models.task import Task, CaseHours
from app.models.document import Document
