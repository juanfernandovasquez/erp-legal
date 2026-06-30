"""
CaseAlert management service.
Handles alert processing, escalation, and reminders.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models import CaseAlert, User

_LIMA_TZ = ZoneInfo("America/Lima")


def _lima_now() -> datetime:
    """Current datetime in Lima timezone, stripped of tzinfo for naive DB columns."""
    return datetime.now(_LIMA_TZ).replace(tzinfo=None)


async def process_pending_alerts(db: AsyncSession) -> dict:
    """
    Process pending alerts.
    Check for overdue alerts and apply escalation logic.
    This would typically be called by a scheduler/cron job.

    Returns dict with processing results.
    """
    today = _lima_now()

    # Get all unresolved alerts that are now overdue
    result = await db.execute(
        select(CaseAlert).where(
            and_(
                CaseAlert.is_resolved == False,
                CaseAlert.due_date < today,
                CaseAlert.is_deleted == False,
            )
        )
    )
    overdue_alerts = result.scalars().all()

    overdue_count = len(overdue_alerts)

    # No status/priority fields on CaseAlert — just acknowledge if not yet done
    for alert in overdue_alerts:
        if not alert.is_acknowledged:
            # Could send notifications here in future
            pass

    return {
        "overdue_alerts_processed": overdue_count,
    }


async def send_alert_reminder(db: AsyncSession, alert_id: str) -> bool:
    """
    Send reminder notification for an alert.
    Would integrate with email/push notification service.
    """
    alert = await db.get(CaseAlert, alert_id)

    if not alert or alert.is_deleted:
        return False

    # CaseAlert has no assigned_to_user_id field; alerts are firm-wide
    # Notification would be sent to all team members via a different mechanism
    # In real implementation, would send email/notification here

    return True


async def check_upcoming_deadlines(
    db: AsyncSession,
    law_firm_id: str,
    days_ahead: int = 7,
) -> list:
    """
    Get alerts due in the next N days.
    Useful for dashboard notifications.
    """
    today = _lima_now()
    future_date = today + timedelta(days=days_ahead)

    result = await db.execute(
        select(CaseAlert).where(
            and_(
                CaseAlert.law_firm_id == law_firm_id,
                CaseAlert.due_date >= today,
                CaseAlert.due_date <= future_date,
                CaseAlert.is_resolved == False,
                CaseAlert.is_deleted == False,
            )
        ).order_by(CaseAlert.due_date.asc())
    )

    return result.scalars().all()
