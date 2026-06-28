"""
Email management endpoints.
- GET  /emails/logs        — historial de emails enviados
- POST /emails/send        — envío manual a usuarios del bufete
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.utils.responses import success_response, paginated_response
from app.utils.auth import get_current_user
from app.models import User, EmailLog
from app.services.email_service import send_manual_email

router = APIRouter(prefix="/emails", tags=["emails"])

ALLOWED_ROLES = ["admin_firma", "super_admin"]


@router.get("/logs")
async def get_email_logs(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Sin permiso")

    result = await db.execute(
        select(EmailLog)
        .where(
            EmailLog.law_firm_id == current_user.law_firm_id,
            EmailLog.is_deleted == False,
        )
        .order_by(desc(EmailLog.sent_at))
        .limit(limit)
        .offset(offset)
    )
    logs = result.scalars().all()

    return success_response(data=[{
        "id": str(l.id),
        "eventType": l.event_type,
        "toEmail": l.to_email,
        "toName": l.to_name,
        "subject": l.subject,
        "sentAt": l.sent_at.isoformat(),
        "success": l.success,
    } for l in logs])


@router.post("/send")
async def send_manual(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Sin permiso")

    body = await request.json()
    user_ids = body.get("userIds", [])
    subject = body.get("subject", "").strip()
    message = body.get("message", "").strip()

    if not subject:
        raise HTTPException(status_code=400, detail="El asunto es requerido")
    if not message:
        raise HTTPException(status_code=400, detail="El mensaje es requerido")
    if not user_ids:
        raise HTTPException(status_code=400, detail="Selecciona al menos un destinatario")

    # Fetch target users from same firm
    result = await db.execute(
        select(User).where(
            User.id.in_(user_ids),
            User.law_firm_id == current_user.law_firm_id,
            User.is_deleted == False,
        )
    )
    users = result.scalars().all()
    if not users:
        raise HTTPException(status_code=400, detail="No se encontraron usuarios válidos")

    recipients = [
        {"email": u.email, "name": f"{u.first_name} {u.last_name}".strip()}
        for u in users
    ]

    html_body = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0"
                 style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <tr><td style="background:#1e293b;padding:24px 32px;">
              <p style="margin:0;color:#94a3b8;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Legal ERP</p>
              <h1 style="margin:4px 0 0;color:#fff;font-size:20px;font-weight:600;">{subject}</h1>
            </td></tr>
            <tr><td style="padding:32px;">
              <div style="color:#374151;font-size:15px;line-height:1.7;white-space:pre-line;">{message}</div>
            </td></tr>
            <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                Mensaje enviado por {current_user.first_name} {current_user.last_name} · Legal ERP
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """

    result_send = await send_manual_email(recipients, subject, html_body)

    # Log each send
    now = datetime.now(timezone.utc)
    for u in users:
        log = EmailLog(
            law_firm_id=current_user.law_firm_id,
            event_type="manual",
            to_email=u.email,
            to_name=f"{u.first_name} {u.last_name}".strip(),
            subject=subject,
            sent_at=now,
            success=result_send["failed"] == 0,
            sent_by_id=current_user.id,
        )
        db.add(log)
    await db.commit()

    return success_response(data=result_send)
