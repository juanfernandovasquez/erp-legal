import uuid
from datetime import datetime
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog


async def log_audit(
    session: AsyncSession,
    law_firm_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
    action: str,
    resource_type: str,
    resource_id: Optional[uuid.UUID] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    http_method: Optional[str] = None,
    endpoint: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    status_code: Optional[int] = None,
    error_message: Optional[str] = None,
) -> AuditLog:
    """
    Log an action to the audit log.

    Args:
        session: Database session
        law_firm_id: Law firm ID
        user_id: User ID who performed the action
        action: Action name (create, update, delete, login, etc.)
        resource_type: Type of resource affected (case, user, document, etc.)
        resource_id: ID of the resource affected
        old_values: Previous values (for updates)
        new_values: New values (for updates)
        http_method: HTTP method (GET, POST, PUT, DELETE, etc.)
        endpoint: API endpoint
        ip_address: User IP address
        user_agent: User agent string
        status_code: HTTP status code
        error_message: Error message if action failed

    Returns:
        AuditLog object
    """
    audit_log = AuditLog(
        law_firm_id=law_firm_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        old_values=old_values,
        new_values=new_values,
        http_method=http_method,
        endpoint=endpoint,
        ip_address=ip_address,
        user_agent=user_agent,
        status_code=status_code,
        error_message=error_message,
    )

    session.add(audit_log)
    await session.flush()

    return audit_log


async def log_create(
    session: AsyncSession,
    law_firm_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
    resource_type: str,
    resource_id: uuid.UUID,
    new_values: dict,
    **kwargs,
) -> AuditLog:
    """Log a create action."""
    return await log_audit(
        session=session,
        law_firm_id=law_firm_id,
        user_id=user_id,
        action="create",
        resource_type=resource_type,
        resource_id=resource_id,
        new_values=new_values,
        **kwargs,
    )


async def log_update(
    session: AsyncSession,
    law_firm_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
    resource_type: str,
    resource_id: uuid.UUID,
    old_values: dict,
    new_values: dict,
    **kwargs,
) -> AuditLog:
    """Log an update action."""
    return await log_audit(
        session=session,
        law_firm_id=law_firm_id,
        user_id=user_id,
        action="update",
        resource_type=resource_type,
        resource_id=resource_id,
        old_values=old_values,
        new_values=new_values,
        **kwargs,
    )


async def log_delete(
    session: AsyncSession,
    law_firm_id: uuid.UUID,
    user_id: Optional[uuid.UUID],
    resource_type: str,
    resource_id: uuid.UUID,
    old_values: dict,
    **kwargs,
) -> AuditLog:
    """Log a delete action (soft delete)."""
    return await log_audit(
        session=session,
        law_firm_id=law_firm_id,
        user_id=user_id,
        action="delete",
        resource_type=resource_type,
        resource_id=resource_id,
        old_values=old_values,
        **kwargs,
    )


async def log_login(
    session: AsyncSession,
    law_firm_id: uuid.UUID,
    user_id: uuid.UUID,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    **kwargs,
) -> AuditLog:
    """Log a user login."""
    return await log_audit(
        session=session,
        law_firm_id=law_firm_id,
        user_id=user_id,
        action="login",
        resource_type="user",
        resource_id=user_id,
        http_method="POST",
        ip_address=ip_address,
        user_agent=user_agent,
        **kwargs,
    )


async def log_logout(
    session: AsyncSession,
    law_firm_id: uuid.UUID,
    user_id: uuid.UUID,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    **kwargs,
) -> AuditLog:
    """Log a user logout."""
    return await log_audit(
        session=session,
        law_firm_id=law_firm_id,
        user_id=user_id,
        action="logout",
        resource_type="user",
        resource_id=user_id,
        http_method="POST",
        ip_address=ip_address,
        user_agent=user_agent,
        **kwargs,
    )
