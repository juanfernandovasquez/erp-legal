"""
Document management endpoints.
Handles document uploads, downloads, and S3 integration.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.database import get_db
from app.utils.responses import success_response, paginated_response, error_response
from app.utils.auth import get_current_user
from app.schemas.document import DocumentCreate
from app.models import User, Case, Document
from app.services.audit_service import audit_log
from app.services.document_service import (
    generate_presigned_upload_url,
    generate_presigned_download_url,
    validate_document_file,
    calculate_file_hash,
)
from app.services.case_service import check_case_team_access

router = APIRouter(tags=["documents"])


@router.get(
    "/cases/{case_id}/documents",
    response_model=dict,
    summary="List documents for case",
    description="List all documents uploaded for a case",
)
async def list_case_documents(
    case_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("-created_at"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List documents for a case.
    """
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    # Check access
    await check_case_team_access(db, case_id, current_user)

    # Get total count
    count_result = await db.execute(
        select(func.count(Document.id)).where(
            and_(
                Document.case_id == case_id,
                Document.is_deleted == False,
            )
        )
    )
    total = count_result.scalar()

    # Build query
    query = select(Document).where(
        and_(
            Document.case_id == case_id,
            Document.is_deleted == False,
        )
    )

    # Apply sorting
    if sort.startswith("-"):
        query = query.order_by(getattr(Document, sort[1:]).desc())
    else:
        query = query.order_by(getattr(Document, sort))

    # Apply pagination
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    documents = result.scalars().all()

    data = [
        {
            "id": doc.id,
            "file_name": doc.file_name,
            "file_type": doc.mime_type,
            "file_size": doc.file_size,
            "s3_key": doc.s3_key,
            "uploaded_by": str(doc.created_by_document) if doc.created_by_document else None,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
        }
        for doc in documents
    ]

    pages = (total + limit - 1) // limit
    return paginated_response(
        data=data,
        total=total,
        page=page,
        pages=pages,
        limit=limit,
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.post(
    "/cases/{case_id}/documents/upload",
    response_model=dict,
    summary="Get presigned upload URL",
    description="Generate presigned S3 URL for document upload",
    status_code=status.HTTP_201_CREATED,
)
async def get_upload_url(
    case_id: str,
    file_name: str = Query(...),
    file_size: int = Query(...),
    file_type: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate presigned upload URL for S3.
    Client will use this URL to upload file directly to S3.
    """
    case = await db.get(Case, case_id)

    if not case or case.is_deleted or case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    # Check access
    await check_case_team_access(db, case_id, current_user)

    # Validate file
    try:
        validate_document_file(file_name, file_size, file_type)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Create document record (initially without S3 key)
    document = Document(
        case_id=case_id,
        law_firm_id=current_user.law_firm_id,
        title=file_name,
        file_name=file_name,
        mime_type=file_type,
        document_type="other",
        file_size=file_size,
        file_path="",
        s3_bucket="",
        s3_key="",
        uploaded_date=datetime.utcnow(),
        created_by_document=current_user.id,
        is_deleted=False,
    )

    db.add(document)
    await db.flush()

    # Generate presigned URL
    try:
        presigned_url, s3_key = await generate_presigned_upload_url(
            document_id=document.id,
            file_name=file_name,
            file_type=file_type,
            law_firm_id=current_user.law_firm_id,
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate upload URL",
        )

    # Update document with S3 key
    document.s3_key = s3_key
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="UPLOAD",
        entity_type="Document",
        entity_id=document.id,
        description=f"Document upload initiated: {file_name}",
    )

    return success_response(
        data={
            "document_id": document.id,
            "presigned_url": presigned_url,
            "s3_key": s3_key,
            "expires_in": 3600,  # 1 hour
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.get(
    "/documents/{doc_id}",
    response_model=dict,
    summary="Get document details",
    description="Retrieve metadata for a document",
)
async def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get document details.
    """
    document = await db.get(Document, doc_id)

    if not document or document.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Verify access to case
    case = await db.get(Case, document.case_id)
    if case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    await check_case_team_access(db, document.case_id, current_user)

    uploader = await db.get(User, document.created_by_document)

    return success_response(
        data={
            "id": document.id,
            "case_id": document.case_id,
            "file_name": document.file_name,
            "file_type": document.mime_type,
            "file_size": document.file_size,
            "s3_key": document.s3_key,
            "uploaded_by": {
                "id": str(uploader.id),
                "name": f"{uploader.first_name} {uploader.last_name}".strip(),
            } if uploader else None,
            "created_at": document.created_at.isoformat() if document.created_at else None,
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.get(
    "/documents/{doc_id}/download",
    response_model=dict,
    summary="Get presigned download URL",
    description="Generate presigned URL to download document from S3",
)
async def get_download_url(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get presigned download URL for document.
    """
    document = await db.get(Document, doc_id)

    if not document or document.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Verify access to case
    case = await db.get(Case, document.case_id)
    if case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    await check_case_team_access(db, document.case_id, current_user)

    try:
        presigned_url = await generate_presigned_download_url(
            s3_key=document.s3_key,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL",
        )

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="DOWNLOAD",
        entity_type="Document",
        entity_id=document.id,
        description=f"Document downloaded: {document.file_name}",
    )

    return success_response(
        data={
            "presigned_url": presigned_url,
            "expires_in": 3600,  # 1 hour
            "file_name": document.file_name,
        },
        meta={"timestamp": datetime.utcnow().isoformat()},
    )


@router.delete(
    "/documents/{doc_id}",
    response_model=dict,
    summary="Delete document",
    description="Soft delete a document",
)
async def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Soft delete a document.
    """
    document = await db.get(Document, doc_id)

    if not document or document.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Verify access to case
    case = await db.get(Case, document.case_id)
    if case.law_firm_id != current_user.law_firm_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    await check_case_team_access(db, document.case_id, current_user)

    document.is_deleted = True
    await db.commit()

    await audit_log(
        db=db,
        law_firm_id=current_user.law_firm_id,
        user_id=current_user.id,
        action="DELETE",
        entity_type="Document",
        entity_id=document.id,
        description=f"Document deleted: {document.file_name}",
    )

    return success_response(
        data={"message": "Document deleted successfully"},
        meta={"timestamp": datetime.utcnow().isoformat()},
    )
