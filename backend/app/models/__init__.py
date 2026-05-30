from app.models.base import Base, BaseModel, TimestampMixin, AuditMixin

from app.models.law_firm import LawFirm
from app.models.user import User, UserRole
from app.models.case import (
    Case,
    CaseTeam,
    CaseTeamHistory,
    ExternalReviewer,
    CaseClient,
    CaseStatus,
    CasePriority,
    CaseType,
)
from app.models.document import Document, DocumentMetadata, DocumentType, DocumentStatus
from app.models.timeline import CaseEvent, CaseUpdate, CaseEventType
from app.models.task import (
    Task,
    CaseHours,
    InvoiceMetrics,
    TaskSchedule,
    TaskStatus,
    TaskPriority,
)
from app.models.alert import CaseAlert, LegalRegistry, AlertType, AlertSeverity
from app.models.process_type import ProcessType
from app.models.process import CaseProcess
from app.models.credential import ExternalCredential
from app.models.client import Client, ClientType
from app.models.audit import (
    AuditLog,
    IAAnalysisResult,
    IAAuditLog,
    IAFeedback,
    AnonimizacionRule,
)

__all__ = [
    # Base
    "Base",
    "BaseModel",
    "TimestampMixin",
    "AuditMixin",
    # Law Firm & Tenancy
    "LawFirm",
    # User Management
    "User",
    "UserRole",
    # Cases
    "Case",
    "CaseTeam",
    "CaseTeamHistory",
    "ExternalReviewer",
    "CaseClient",
    "CaseStatus",
    "CasePriority",
    "CaseType",
    # Documents
    "Document",
    "DocumentMetadata",
    "DocumentType",
    "DocumentStatus",
    # Timeline
    "CaseEvent",
    "CaseUpdate",
    "CaseEventType",
    # Tasks
    "Task",
    "CaseHours",
    "InvoiceMetrics",
    "TaskSchedule",
    "TaskStatus",
    "TaskPriority",
    # Alerts
    "CaseAlert",
    "LegalRegistry",
    "AlertType",
    "AlertSeverity",
    # Process Types
    "ProcessType",
    # Case Processes (stages)
    "CaseProcess",
    # Credentials
    "ExternalCredential",
    # Clients
    "Client",
    "ClientType",
    # Audit & AI
    "AuditLog",
    "IAAnalysisResult",
    "IAAuditLog",
    "IAFeedback",
    "AnonimizacionRule",
]
