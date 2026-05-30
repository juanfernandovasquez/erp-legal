from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class DocumentCreate(BaseModel):
    """Create document request."""

    title: str = Field(..., min_length=1, max_length=255, description="Document title")
    description: Optional[str] = Field(None, description="Document description")

    case_id: uuid.UUID = Field(..., description="Case ID")

    document_type: str = Field(..., description="Document type")
    file_name: str = Field(..., description="Original file name")

    is_confidential: bool = Field(default=False, description="Is document confidential")
    tags: Optional[list[str]] = Field(None, description="Document tags")

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    """Update document request."""

    title: Optional[str] = Field(None, max_length=255, description="Document title")
    description: Optional[str] = Field(None, description="Document description")

    document_type: Optional[str] = Field(None, description="Document type")
    status: Optional[str] = Field(None, description="Document status")

    is_confidential: Optional[bool] = Field(None, description="Is document confidential")
    tags: Optional[list[str]] = Field(None, description="Document tags")

    model_config = {"from_attributes": True}


class DocumentResponse(BaseModel):
    """Document response."""

    id: uuid.UUID = Field(..., description="Document ID")
    title: str = Field(..., description="Document title")
    description: Optional[str] = Field(None, description="Document description")

    case_id: uuid.UUID = Field(..., description="Case ID")

    document_type: str = Field(..., description="Document type")
    status: str = Field(..., description="Document status")

    file_name: str = Field(..., description="File name")
    file_size: int = Field(..., description="File size in bytes")
    mime_type: str = Field(..., description="MIME type")

    is_confidential: bool = Field(..., description="Is confidential")
    is_encrypted: bool = Field(..., description="Is encrypted")

    uploaded_date: datetime = Field(..., description="Upload date")
    modified_date: Optional[datetime] = Field(None, description="Modified date")
    filed_date: Optional[datetime] = Field(None, description="Filed date")

    tags: Optional[list[str]] = Field(None, description="Document tags")
    has_ocr: bool = Field(..., description="Has OCR")
    extraction_status: str = Field(..., description="Extraction status")

    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    """Document list response."""

    id: uuid.UUID = Field(..., description="Document ID")
    title: str = Field(..., description="Document title")

    document_type: str = Field(..., description="Document type")
    status: str = Field(..., description="Document status")

    file_name: str = Field(..., description="File name")
    file_size: int = Field(..., description="File size")

    uploaded_date: datetime = Field(..., description="Upload date")

    model_config = {"from_attributes": True}


class DocumentMetadataResponse(BaseModel):
    """Document metadata response."""

    id: uuid.UUID = Field(..., description="Metadata ID")
    document_id: uuid.UUID = Field(..., description="Document ID")

    key: str = Field(..., description="Metadata key")
    value: str = Field(..., description="Metadata value")
    confidence: Optional[float] = Field(None, description="Confidence score")
    source: str = Field(..., description="Metadata source")

    model_config = {"from_attributes": True}
