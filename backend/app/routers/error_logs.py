"""
Error log endpoints — admin only.
Lists, details, and resolves backend 500 errors captured by the exception handler.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc

from app.database import get_db
from app.utils.auth import get_current_user
from app.utils.responses import success_response
from app.models import User
from app.models.error_log import ErrorLog

router = APIRouter(tags=["Error Logs"])

ADMIN_ROLES = {"admin_firma", "super_admin"}


def _require_admin(current_user: User) -> User:
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Solo administradores pueden acceder a los logs de error")
    return current_user


def _serialize(e: ErrorLog) -> dict:
    return {
        "id": str(e.id),
        "createdAt": e.created_at.isoformat() if e.created_at else None,
        "method": e.method,
        "path": e.path,
        "statusCode": e.status_code,
        "errorType": e.error_type,
        "errorMessage": e.error_message,
        "traceback": e.traceback,
        "userId": str(e.user_id) if e.user_id else None,
        "userEmail": e.user_email,
        "requestBody": e.request_body,
        "isResolved": e.is_resolved,
        "resolvedAt": e.resolved_at.isoformat() if e.resolved_at else None,
    }


@router.get("/admin/errors")
async def list_errors(
    resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)

    # Only show errors from the last 30 days
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None)
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=30)

    conditions = [ErrorLog.created_at >= cutoff]
    if resolved is not None:
        conditions.append(ErrorLog.is_resolved == resolved)

    q = select(ErrorLog).where(and_(*conditions)).order_by(desc(ErrorLog.created_at))
    total_q = select(func.count()).select_from(ErrorLog).where(and_(*conditions))

    total = (await db.execute(total_q)).scalar_one()
    rows = (await db.execute(q.limit(limit).offset(offset))).scalars().all()

    # Count unresolved for the badge
    unresolved_q = select(func.count()).select_from(ErrorLog).where(
        and_(ErrorLog.is_resolved == False, ErrorLog.created_at >= cutoff)
    )
    unresolved = (await db.execute(unresolved_q)).scalar_one()

    return success_response(data={
        "items": [_serialize(e) for e in rows],
        "total": total,
        "unresolved": unresolved,
        "limit": limit,
        "offset": offset,
    })


@router.patch("/admin/errors/{error_id}/resolve")
async def resolve_error(
    error_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)

    result = await db.execute(select(ErrorLog).where(ErrorLog.id == error_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Error no encontrado")

    entry.is_resolved = True
    entry.resolved_by_id = current_user.id
    entry.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(entry)

    return success_response(data=_serialize(entry))


@router.delete("/admin/errors/{error_id}")
async def delete_error(
    error_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(current_user)

    result = await db.execute(select(ErrorLog).where(ErrorLog.id == error_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Error no encontrado")

    await db.delete(entry)
    await db.commit()

    return success_response(data={"deleted": True})
