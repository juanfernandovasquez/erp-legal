"""
Audit logging service.
Centralized audit trail for all significant operations.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.models import AuditLog


async def audit_log(
    db: AsyncSession,
    law_firm_id: str,
    user_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    description: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """
    Create an audit log entry.

    Args:
        db: Database session
        law_firm_id: Law firm ID (for multi-tenancy filtering)
        user_id: User performing the action
        action: Action type (CREATE, UPDATE, DELETE, etc.)
        entity_type: Entity being acted upon (Case, User, Document, etc.) - maps to resource_type
        entity_id: ID of the entity - maps to resource_id
        description: Human-readable description (optional)
        old_values: Dict of old values for UPDATE operations
        new_values: Dict of new values for UPDATE operations

    Returns:
        Created AuditLog record
    """
    import uuid as uuid_module

    # Convert string IDs to UUID if needed
    law_firm_id_uuid = uuid_module.UUID(law_firm_id) if isinstance(law_firm_id, str) else law_firm_id
    user_id_uuid = uuid_module.UUID(user_id) if isinstance(user_id, str) and user_id else None
    entity_id_uuid = uuid_module.UUID(entity_id) if isinstance(entity_id, str) and entity_id else None

    log_entry = AuditLog(
        law_firm_id=law_firm_id_uuid,
        user_id=user_id_uuid,
        action=action,
        resource_type=entity_type,
        resource_id=entity_id_uuid,
        old_values=old_values,
        new_values=new_values,
    )

    db.add(log_entry)
    await db.flush()

    return log_entry


async def get_audit_trail(
    db: AsyncSession,
    law_firm_id: str,
    entity_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = 100,
) -> list:
    """
    Get audit trail for an entity.
    Useful for tracking history of changes.
    """
    from sqlalchemy import select, and_, or_
    import uuid as uuid_module

    law_firm_id_uuid = uuid_module.UUID(law_firm_id) if isinstance(law_firm_id, str) else law_firm_id

    query = select(AuditLog).where(AuditLog.law_firm_id == law_firm_id_uuid)

    if entity_id:
        entity_id_uuid = uuid_module.UUID(entity_id) if isinstance(entity_id, str) else entity_id
        query = query.where(AuditLog.resource_id == entity_id_uuid)

    if entity_type:
        query = query.where(AuditLog.resource_type == entity_type)

    query = query.order_by(AuditLog.created_at.desc()).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()
