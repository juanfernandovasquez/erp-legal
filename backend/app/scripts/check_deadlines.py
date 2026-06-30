"""
Daily cron script — check task deadlines, send notification emails, and create alert records.

Usage (run from backend container):
    python -m app.scripts.check_deadlines

Cron entry (8am Lima time = 1pm UTC):
    0 13 * * * docker exec erp-legal-backend python -m app.scripts.check_deadlines >> /var/log/check_deadlines.log 2>&1
"""

import asyncio
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

import app.database as _db
from app.models import Task, NotificationRule, User, Case
from app.models.alert import CaseAlert
from app.models.case import CaseTeam
from app.services.email_service import notify_deadline_approaching
from app.models.email_log import EmailLog


async def run():
    await _db.init_db()
    lima_tz = ZoneInfo("America/Lima")
    today = datetime.now(lima_tz).date()
    print(f"[check_deadlines] Running for date: {today} (Lima time)", flush=True)

    async with _db.async_session_factory() as db:
        # Load all active notification rules
        rules_result = await db.execute(
            select(NotificationRule).where(
                NotificationRule.is_active == True,
                NotificationRule.is_deleted == False,
            )
        )
        rules = rules_result.scalars().all()

        if not rules:
            print("[check_deadlines] No active rules found.", flush=True)
            return

        # Group rules by case_id
        rules_by_case: dict[str, list[NotificationRule]] = {}
        for rule in rules:
            key = str(rule.case_id)
            rules_by_case.setdefault(key, []).append(rule)

        sent_count = 0
        alert_count = 0

        for case_id_str, case_rules in rules_by_case.items():
            # Load tasks for this case that are not done/cancelled and have a due date
            tasks_result = await db.execute(
                select(Task).where(
                    Task.case_id == case_rules[0].case_id,
                    Task.is_deleted == False,
                    Task.due_date.isnot(None),
                    Task.status.not_in(["done", "cancelled", "completado", "cancelado", "rechazado"]),
                ).options(
                    selectinload(Task.assignee),
                    selectinload(Task.case),
                )
            )
            tasks = tasks_result.scalars().all()

            if not tasks:
                continue

            for rule in case_rules:
                target_date = today + timedelta(days=rule.days_before)

                matching_tasks = [
                    t for t in tasks
                    if t.due_date and t.due_date.date() == target_date
                ]

                if not matching_tasks:
                    continue

                # Load supervisors if needed
                supervisors = []
                if rule.notify_supervisors:
                    team_result = await db.execute(
                        select(User)
                        .join(CaseTeam, CaseTeam.user_id == User.id)
                        .where(
                            CaseTeam.case_id == rule.case_id,
                            CaseTeam.is_deleted == False,
                            User.role.in_(["admin_firma", "super_admin"]),
                            User.is_deleted == False,
                        )
                    )
                    supervisors = team_result.scalars().all()

                for task in matching_tasks:
                    recipients = []

                    if rule.notify_assignee and task.assignee and task.assignee.email:
                        recipients.append(task.assignee)

                    if rule.notify_supervisors:
                        for sup in supervisors:
                            if sup not in recipients:
                                recipients.append(sup)

                    case_title = task.case.title if task.case else ""
                    due_str = target_date.isoformat()

                    # --- Create alert record (deduplicated by task + alert_date) ---
                    existing = await db.execute(
                        select(CaseAlert).where(
                            CaseAlert.task_id == task.id,
                            CaseAlert.is_deleted == False,
                            CaseAlert.source == "auto",
                            # Same calendar day
                            CaseAlert.alert_date >= datetime.combine(today, datetime.min.time()).replace(tzinfo=lima_tz),
                        )
                    )
                    if not existing.scalars().first():
                        severity = "critical" if rule.days_before <= 1 else ("warning" if rule.days_before <= 3 else "info")
                        days_label = f"{rule.days_before} día{'s' if rule.days_before != 1 else ''}"
                        alert_obj = CaseAlert(
                            case_id=task.case_id,
                            law_firm_id=rule.law_firm_id,
                            task_id=task.id,
                            source="auto",
                            alert_type="deadline_approaching",
                            severity=severity,
                            title=f"Vencimiento en {days_label}: {task.title}",
                            message=(
                                f"La tarea «{task.title}» del caso «{case_title}» "
                                f"vence el {due_str} ({days_label} restante{'s' if rule.days_before != 1 else ''})."
                            ),
                            alert_date=datetime.now(timezone.utc),
                            due_date=task.due_date,
                            is_read=False,
                            is_acknowledged=False,
                            is_resolved=False,
                            is_deleted=False,
                        )
                        db.add(alert_obj)
                        alert_count += 1
                        print(f"[check_deadlines] Alert created — task: {task.title} ({rule.days_before}d before)", flush=True)

                    # --- Send emails ---
                    for recipient in recipients:
                        ok = await notify_deadline_approaching(
                            to_email=recipient.email,
                            to_name=f"{recipient.first_name} {recipient.last_name}".strip(),
                            task_title=task.title,
                            case_title=case_title,
                            due_date=due_str,
                            days_before=rule.days_before,
                        )
                        log = EmailLog(
                            law_firm_id=rule.law_firm_id,
                            event_type="deadline_reminder",
                            to_email=recipient.email,
                            to_name=f"{recipient.first_name} {recipient.last_name}".strip(),
                            subject=f"Recordatorio: {task.title}",
                            sent_at=datetime.now(timezone.utc),
                            success=ok,
                        )
                        db.add(log)
                        if ok:
                            sent_count += 1
                            print(f"[check_deadlines] Sent to {recipient.email} — task: {task.title} ({rule.days_before}d before)", flush=True)

        await db.commit()
        print(f"[check_deadlines] Done. Emails sent: {sent_count}, Alerts created: {alert_count}", flush=True)


if __name__ == "__main__":
    asyncio.run(run())
