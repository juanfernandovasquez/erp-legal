import uuid
from enum import Enum
from typing import Optional
from datetime import datetime

from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Integer, Numeric, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class CaseStatus(str, Enum):
    """Case status values."""

    DRAFT = "draft"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CLOSED = "closed"
    ARCHIVED = "archived"


class CasePriority(str, Enum):
    """Case priority levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CaseType(str, Enum):
    """Types of legal cases."""

    CIVIL = "civil"
    CRIMINAL = "criminal"
    ADMINISTRATIVE = "administrative"
    LABOR = "labor"
    INTELLECTUAL_PROPERTY = "intellectual_property"
    COMMERCIAL = "commercial"
    FAMILY = "family"
    OTHER = "other"


class Case(BaseModel):
    """Case entity representing a legal case."""

    __tablename__ = "cases"

    # Basic Information
    case_number: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Multi-tenancy
    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Case Hierarchy
    parent_case_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Case Details
    case_type: Mapped[CaseType] = mapped_column(String(50), nullable=False)
    status: Mapped[CaseStatus] = mapped_column(String(50), default="draft", nullable=False)
    priority: Mapped[CasePriority] = mapped_column(String(50), default="medium", nullable=False)

    # Dates
    opened_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Court Information
    court_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    court_location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    judge_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Parties
    plaintiff: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    defendant: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    opponent_representation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Tracking
    budget_amount: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    budget_currency: Mapped[Optional[str]] = mapped_column(String(3), default="PEN", nullable=True)
    spent_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    estimated_completion_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # External References
    external_case_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    process_type_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("process_types.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Billing
    # tipo_facturacion: 'flat' | 'por_horas'
    tipo_facturacion: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    # moneda_facturacion: 'PEN' | 'USD'
    moneda_facturacion: Mapped[Optional[str]] = mapped_column(String(3), nullable=True, default="PEN")
    # precio: flat fee or hourly rate
    precio_facturacion: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)

    # Metadata
    tags: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    law_firm: Mapped["LawFirm"] = relationship(
        "LawFirm",
        back_populates="cases",
        foreign_keys=[law_firm_id],
    )

    parent_case: Mapped[Optional["Case"]] = relationship(
        "Case",
        foreign_keys="[Case.parent_case_id]",
        back_populates="child_cases",
        remote_side="Case.id",
    )

    child_cases: Mapped[list["Case"]] = relationship(
        "Case",
        foreign_keys="[Case.parent_case_id]",
        back_populates="parent_case",
        cascade="all, delete-orphan",
    )

    process_type: Mapped[Optional["ProcessType"]] = relationship(
        "ProcessType",
        back_populates="cases",
        foreign_keys=[process_type_id],
    )

    case_teams: Mapped[list["CaseTeam"]] = relationship(
        "CaseTeam",
        back_populates="case",
        cascade="all, delete-orphan",
        foreign_keys="CaseTeam.case_id",
    )

    case_team_history: Mapped[list["CaseTeamHistory"]] = relationship(
        "CaseTeamHistory",
        back_populates="case",
        cascade="all, delete-orphan",
        foreign_keys="CaseTeamHistory.case_id",
    )

    external_reviewers: Mapped[list["ExternalReviewer"]] = relationship(
        "ExternalReviewer",
        back_populates="case",
        cascade="all, delete-orphan",
        foreign_keys="ExternalReviewer.case_id",
    )

    case_clients: Mapped[list["CaseClient"]] = relationship(
        "CaseClient",
        back_populates="case",
        cascade="all, delete-orphan",
        foreign_keys="CaseClient.case_id",
    )

    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="case",
        cascade="all, delete-orphan",
        foreign_keys="Document.case_id",
    )

    case_events: Mapped[list["CaseEvent"]] = relationship(
        "CaseEvent",
        back_populates="case",
        cascade="all, delete-orphan",
        foreign_keys="CaseEvent.case_id",
    )

    case_updates: Mapped[list["CaseUpdate"]] = relationship(
        "CaseUpdate",
        back_populates="case",
        cascade="all, delete-orphan",
        foreign_keys="CaseUpdate.case_id",
    )

    tasks: Mapped[list["Task"]] = relationship(
        "Task",
        back_populates="case",
        cascade="all, delete-orphan",
        foreign_keys="Task.case_id",
    )

    processes: Mapped[list["CaseProcess"]] = relationship(
        "CaseProcess",
        back_populates="case",
        cascade="all, delete-orphan",
        foreign_keys="CaseProcess.case_id",
        order_by="CaseProcess.orden",
    )

    case_hours: Mapped[list["CaseHours"]] = relationship(
        "CaseHours",
        back_populates="case",
        cascade="all, delete-orphan",
        foreign_keys="CaseHours.case_id",
    )

    invoice_metrics: Mapped[list["InvoiceMetrics"]] = relationship(
        "InvoiceMetrics",
        back_populates="case",
        cascade="all, delete-orphan",
        foreign_keys="InvoiceMetrics.case_id",
    )

    case_alerts: Mapped[list["CaseAlert"]] = relationship(
        "CaseAlert",
        back_populates="case",
        cascade="all, delete-orphan",
        foreign_keys="CaseAlert.case_id",
    )

    legal_registries: Mapped[list["LegalRegistry"]] = relationship(
        "LegalRegistry",
        back_populates="case",
        cascade="all, delete-orphan",
        foreign_keys="LegalRegistry.case_id",
    )


class CaseTeam(BaseModel):
    """Team members assigned to a case."""

    __tablename__ = "case_teams"

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Role in this case
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    is_lead: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    assigned_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    case: Mapped[Case] = relationship(
        Case,
        back_populates="case_teams",
        foreign_keys=[case_id],
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="case_teams",
        foreign_keys=[user_id],
    )


class CaseTeamHistory(BaseModel):
    """History of team member changes for audit purposes."""

    __tablename__ = "case_team_history"

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    action: Mapped[str] = mapped_column(String(50), nullable=False)  # assigned, removed, changed_role
    previous_role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    new_role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    case: Mapped[Case] = relationship(
        Case,
        back_populates="case_team_history",
        foreign_keys=[case_id],
    )


class ExternalReviewer(BaseModel):
    """External reviewers assigned to a case."""

    __tablename__ = "external_reviewers"

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # External reviewer details
    external_name: Mapped[str] = mapped_column(String(255), nullable=False)
    external_email: Mapped[str] = mapped_column(String(255), nullable=False)
    external_organization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Access control
    can_view_documents: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_comment: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_download: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Dates
    assigned_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    access_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    case: Mapped[Case] = relationship(
        Case,
        back_populates="external_reviewers",
        foreign_keys=[case_id],
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="external_reviewer_instances",
        foreign_keys=[user_id],
    )


class CaseClient(BaseModel):
    """Link between a case and client(s)."""

    __tablename__ = "case_clients"

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
    )

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

    # Role of this client in the case
    role: Mapped[str] = mapped_column(String(100), nullable=False)  # plaintiff, defendant, etc.
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    case: Mapped[Case] = relationship(
        Case,
        back_populates="case_clients",
        foreign_keys=[case_id],
    )

    client: Mapped["Client"] = relationship(
        "Client",
        back_populates="cases",
        foreign_keys=[client_id],
    )


# Import at the end to avoid circular imports
from app.models.law_firm import LawFirm
from app.models.user import User
from app.models.process_type import ProcessType
from app.models.document import Document
from app.models.timeline import CaseEvent, CaseUpdate
from app.models.task import Task, CaseHours, InvoiceMetrics
from app.models.alert import CaseAlert, LegalRegistry
from app.models.client import Client
from app.models.process import CaseProcess
