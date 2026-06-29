"""
Daily cron — check client alert rules and send reminder emails via Brevo.

Usage (run from backend container):
    python -m app.scripts.check_client_alerts

Cron entry (8am Lima = 1pm UTC — same window as check_deadlines):
    0 13 * * * docker exec erp-legal-backend python -m app.scripts.check_client_alerts >> /var/log/check_client_alerts.log 2>&1
"""

import asyncio
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import selectinload

import app.database as _db
from app.models import User
from app.models.client_alert import ClientAlertRule
from app.models.email_log import EmailLog
from app.services.email_service import notify_client_alert


async def run():
    await _db.init_db()
    today = date.today()
    print(f"[check_client_alerts] Running for date: {today}", flush=True)

    async with _db.async_session_factory() as db:
        result = await db.execute(
            select(ClientAlertRule)
            .where(
                ClientAlertRule.is_active == True,
                ClientAlertRule.is_deleted == False,
            )
            .options(selectinload(ClientAlertRule.client))
        )
        rules = result.scalars().all()

        if not rules:
            print("[check_client_alerts] No active rules found.", flush=True)
            return

        sent_count = 0

        for rule in rules:
            event_date = rule.fecha

            if rule.es_anual:
                # Adjust to current year; handle Feb 29 in non-leap years
                try:
                    event_date = event_date.replace(year=today.year)
                except ValueError:
                    event_date = event_date.replace(year=today.year, day=28)

            alert_date = event_date - timedelta(days=rule.dias_anticipacion)

            if alert_date != today:
                continue

            user_ids = rule.destinatarios or []
            if not user_ids:
                print(f"[check_client_alerts] Rule '{rule.titulo}' has no recipients — skipping.", flush=True)
                continue

            users_result = await db.execute(
                select(User).where(
                    User.id.in_(user_ids),
                    User.is_deleted == False,
                )
            )
            users = users_result.scalars().all()

            client_name = rule.client.name if rule.client else str(rule.client_id)
            event_str = event_date.strftime("%-d de %B de %Y") if hasattr(event_date, "strftime") else str(event_date)

            for user in users:
                full_name = f"{user.first_name} {user.last_name}".strip() or user.email
                ok = await notify_client_alert(
                    to_email=user.email,
                    to_name=full_name,
                    client_name=client_name,
                    titulo=rule.titulo,
                    descripcion=rule.descripcion,
                    event_date=event_str,
                    dias=rule.dias_anticipacion,
                )
                log = EmailLog(
                    law_firm_id=rule.law_firm_id,
                    event_type="client_alert",
                    to_email=user.email,
                    to_name=full_name,
                    subject=f"Recordatorio: {rule.titulo} — {client_name}",
                    sent_at=__import__("datetime").datetime.utcnow(),
                    success=ok,
                )
                db.add(log)
                if ok:
                    sent_count += 1
                    print(f"[check_client_alerts] Sent to {user.email} — rule: '{rule.titulo}' / client: {client_name}", flush=True)
                else:
                    print(f"[check_client_alerts] FAILED for {user.email} — rule: '{rule.titulo}'", flush=True)

        await db.commit()
        print(f"[check_client_alerts] Done. Emails sent: {sent_count}", flush=True)


if __name__ == "__main__":
    asyncio.run(run())
