import uuid
from enum import Enum
from typing import Optional
from datetime import datetime

from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Integer, JSON, LargeBinary
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class DocumentType(str, Enum):
    """Types of documents."""

    LEGAL_BRIEF = "legal_brief"
    CONTRACT = "contract"
    COURT_FILING = "court_filing"
    CORRESPONDENCE = "correspondence"
    EVIDENCE = "evidence"
    PLEADING = "pleading"
    MOTION = "motion"
    DISCOVERY = "discovery"
    OTHER = "other"


class DocumentStatus(str, Enum):
    """Document workflow status."""

    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    FILED = "filed"
    ARCHIVED = "archived"


class Document(BaseModel):
    """Document entity representing files in cases."""

    __tablename__ = "documents"

    # Basic Information
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Multi-tenancy
    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Case Association
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Document Details
    document_type: Mapped[DocumentType] = mapped_column(String(50), nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(String(50), default="draft", nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)

    # S3 Storage
    s3_bucket: Mapped[str] = mapped_column(String(255), nullable=False)
    s3_key: Mapped[str] = mapped_column(String(500), nullable=False)
    s3_version_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Document Metadata
    created_by_document: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_latest_version: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Access Control
    is_confidential: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    encryption_key_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Dates
    uploaded_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    modified_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    filed_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Tags and Metadata
    tags: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    custom_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # OCR and AI Processing
    has_ocr: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ocr_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extraction_status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False
    )  # pending, processing, completed, failed

    # Relationships
    law_firm: Mapped["LawFirm"] = relationship(
        "LawFirm",
        foreign_keys=[law_firm_id],
    )

    case: Mapped["Case"] = relationship(
        "Case",
        back_populates="documents",
        foreign_keys=[case_id],
    )

    created_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="documents_created",
        foreign_keys=[created_by_document],
    )

    doc_metadata: Mapped[list["DocumentMetadata"]] = relationship(
        "DocumentMetadata",
        back_populates="document",
        cascade="all, delete-orphan",
        foreign_keys="DocumentMetadata.document_id",
    )


class DocumentMetadata(BaseModel):
    """Extracted metadata from documents."""

    __tablename__ = "document_metadata"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )

    law_firm_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("law_firms.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Metadata fields
    key: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[Optional[float]] = mapped_column(nullable=True)  # 0.0 to 1.0
    source: Mapped[str] = mapped_column(String(50), nullable=False)  # manual, ocr, ai_extraction, user_input

    # Relationships
    document: Mapped[Document] = relationship(
        Document,
        back_populates="doc_metadata",
        foreign_keys=[document_id],
    )


# Import at the end to avoid circular imports
from app.models.law_firm import LawFirm
from app.models.case import Case
from app.models.user import User
