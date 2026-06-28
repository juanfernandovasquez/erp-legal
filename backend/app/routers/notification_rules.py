"""
Notification rules endpoints — per-case deadline alert configuration.
GET    /cases/{case_id}/notification-rules
POST   /cases/{case_id}/notification-rules
PATCH  /cases/{case_id}/notification-rules/{rule_id}
DELETE /cases/{case_id}/notification-rules/{rule_id}
"""

import uuid as uuid_module
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.utils.responses import success_response
from app.utils.auth import get_current_user
from app.models import User, Case, NotificationRule

router = APIRouter(tags=["notification-rules"])

ADMIN_ROLES = ["admin_firma", "super_admin"]


def _fmt(r: NotificationRule) -> dict:
    return {
        "id": str(r.id),
        "caseId": str(r.case_id),
        "daysBefore": r.days_before,
        "notifyAssignee": r.notify_assignee,
        "notifySupervisors": r.notify_supervisors,
        "isActive": r.is_active,
        "createdAt": r.created_at.isoformat() if r.created_at else None,
    }


async def _get_case(db, case_id_str, law_firm_id):
    try:
        case_uuid = uuid_module.UUID(case_id_str)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    case = await db.get(Case, case_uuid)
    if not case or case.is_deleted or case.law_firm_id != law_firm_id:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return case


@router.get("/cases/{case_id}/notification-rules")
async def list_rules(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_case(db, case_id, current_user.law_firm_id)
    result = await db.execute(
        select(NotificationRule).where(
            NotificationRule.case_id == uuid_module.UUID(case_id),
            NotificationRule.is_deleted == False,
        ).order_by(NotificationRule.days_before)
    )
    rules = result.scalars().all()
    return success_response(data=[_fmt(r) for r in rules])


@router.post("/cases/{case_id}/notification-rules")
async def create_rule(
    case_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Sin permiso")
    await _get_case(db, case_id, current_user.law_firm_id)

    body = await request.json()
    days_before = body.get("daysBefore") or body.get("days_before")
    if not days_before or int(days_before) < 1:
        raise HTTPException(status_code=400, detail="daysBefore debe ser mayor a 0")

    rule = NotificationRule(
        law_firm_id=current_user.law_firm_id,
        case_id=uuid_module.UUID(case_id),
        days_before=int(days_before),
        notify_assignee=bool(body.get("notifyAssignee", True)),
        notify_supervisors=bool(body.get("notifySupervisors", False)),
        is_active=True,
        is_deleted=False,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return success_response(data=_fmt(rule))


@router.patch("/cases/{case_id}/notification-rules/{rule_id}")
async def update_rule(
    case_id: str,
    rule_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Sin permiso")

    try:
        rule = await db.get(NotificationRule, uuid_module.UUID(rule_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Regla no encontrada")
    if not rule or rule.is_deleted or rule.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=404, detail="Regla no encontrada")

    body = await request.json()
    if "daysBefore" in body:
        rule.days_before = int(body["daysBefore"])
    if "notifyAssignee" in body:
        rule.notify_assignee = bool(body["notifyAssignee"])
    if "notifySupervisors" in body:
        rule.notify_supervisors = bool(body["notifySupervisors"])
    if "isActive" in body:
        rule.is_active = bool(body["isActive"])

    await db.commit()
    await db.refresh(rule)
    return success_response(data=_fmt(rule))


@router.delete("/cases/{case_id}/notification-rules/{rule_id}")
async def delete_rule(
    case_id: str,
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Sin permiso")

    try:
        rule = await db.get(NotificationRule, uuid_module.UUID(rule_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Regla no encontrada")
    if not rule or rule.is_deleted or rule.law_firm_id != current_user.law_firm_id:
        raise HTTPException(status_code=404, detail="Regla no encontrada")

    rule.is_deleted = True
    await db.commit()
    return success_response(data={"deleted": True})
