"""
Email notification service using Brevo (formerly Sendinblue) API.
Sends transactional emails for task events and manual campaigns.
"""

import httpx
from typing import Optional
from app.config import settings

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
SENDER_EMAIL = "noreply@katarzyna.pe"
SENDER_NAME = "Legal ERP"

STATUS_LABELS = {
    "todo": "Pendiente",
    "in_progress": "En progreso",
    "in_review": "En revisión",
    "blocked": "Bloqueada",
    "done": "Completada",
    "cancelled": "Cancelada",
}

PRIORITY_LABELS = {
    "low": "Baja",
    "medium": "Media",
    "high": "Alta",
    "critical": "Crítica",
}


def _base_html(title: str, body: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr><td style="background:#1e293b;padding:24px 32px;">
              <p style="margin:0;color:#94a3b8;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Legal ERP</p>
              <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:600;">{title}</h1>
            </td></tr>
            <!-- Body -->
            <tr><td style="padding:32px;">
              {body}
            </td></tr>
            <!-- Footer -->
            <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                Este es un mensaje automático de Legal ERP · katarzyna.pe
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """


def _badge(text: str, color: str = "#3b82f6") -> str:
    return f'<span style="display:inline-block;background:{color};color:#fff;font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px;">{text}</span>'


def _row(label: str, value: str) -> str:
    return f"""
    <tr>
      <td style="padding:6px 0;color:#64748b;font-size:13px;width:140px;vertical-align:top;">{label}</td>
      <td style="padding:6px 0;color:#1e293b;font-size:13px;font-weight:500;">{value}</td>
    </tr>
    """


async def _send(to_email: str, to_name: str, subject: str, html: str) -> bool:
    api_key = getattr(settings, "brevo_api_key", None)
    if not api_key:
        print("EMAIL: BREVO_API_KEY not set — skipping send", flush=True)
        return False
    payload = {
        "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                BREVO_API_URL,
                json=payload,
                headers={"api-key": api_key, "Content-Type": "application/json"},
            )
            if r.status_code not in (200, 201):
                print(f"EMAIL ERROR {r.status_code}: {r.text}", flush=True)
                return False
        return True
    except Exception as e:
        print(f"EMAIL EXCEPTION: {e}", flush=True)
        return False


async def notify_task_assigned(
    to_email: str,
    to_name: str,
    task_title: str,
    case_title: str,
    priority: str,
    due_date: Optional[str],
    assigned_by: str,
) -> bool:
    priority_label = PRIORITY_LABELS.get(priority, priority)
    priority_color = {"low": "#22c55e", "medium": "#f59e0b", "high": "#ef4444", "critical": "#7c3aed"}.get(priority, "#64748b")
    due_str = due_date or "Sin fecha límite"

    body = f"""
    <p style="margin:0 0 20px;color:#374151;font-size:15px;">
      Hola <strong>{to_name}</strong>, se te ha asignado una nueva tarea.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">{task_title}</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        {_row("Proceso:", case_title)}
        {_row("Prioridad:", _badge(priority_label, priority_color))}
        {_row("Fecha límite:", due_str)}
        {_row("Asignado por:", assigned_by)}
      </table>
    </div>
    <p style="margin:0;color:#64748b;font-size:13px;">
      Ingresa al ERP para ver los detalles de la tarea.
    </p>
    """
    return await _send(to_email, to_name, f"Nueva tarea asignada: {task_title}", _base_html("Tarea asignada", body))


async def notify_task_status_changed(
    to_email: str,
    to_name: str,
    task_title: str,
    case_title: str,
    old_status: str,
    new_status: str,
    changed_by: str,
) -> bool:
    old_label = STATUS_LABELS.get(old_status, old_status)
    new_label = STATUS_LABELS.get(new_status, new_status)
    status_color = {"todo": "#64748b", "in_progress": "#3b82f6", "in_review": "#f59e0b", "blocked": "#ef4444", "done": "#22c55e", "cancelled": "#94a3b8"}.get(new_status, "#64748b")

    body = f"""
    <p style="margin:0 0 20px;color:#374151;font-size:15px;">
      Hola <strong>{to_name}</strong>, el estado de una tarea asignada a ti ha cambiado.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">{task_title}</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        {_row("Proceso:", case_title)}
        {_row("Estado anterior:", _badge(old_label, "#94a3b8"))}
        {_row("Nuevo estado:", _badge(new_label, status_color))}
        {_row("Modificado por:", changed_by)}
      </table>
    </div>
    """
    return await _send(to_email, to_name, f"Tarea actualizada: {task_title}", _base_html("Cambio de estado", body))


async def notify_hours_logged(
    to_email: str,
    to_name: str,
    task_title: str,
    case_title: str,
    hours: float,
    logged_by: str,
    work_date: str,
    description: Optional[str],
) -> bool:
    h = int(hours)
    m = round((hours - h) * 60)
    duration = f"{h}h {m}min" if h else f"{m}min"
    desc_row = _row("Descripción:", description) if description else ""

    body = f"""
    <p style="margin:0 0 20px;color:#374151;font-size:15px;">
      Hola <strong>{to_name}</strong>, se han registrado horas en una tarea asignada a ti.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">{task_title}</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        {_row("Proceso:", case_title)}
        {_row("Tiempo registrado:", _badge(duration, "#3b82f6"))}
        {_row("Fecha:", work_date)}
        {_row("Registrado por:", logged_by)}
        {desc_row}
      </table>
    </div>
    """
    return await _send(to_email, to_name, f"Horas registradas en: {task_title}", _base_html("Horas registradas", body))


async def notify_deadline_approaching(
    to_email: str,
    to_name: str,
    task_title: str,
    case_title: str,
    due_date: str,
    days_before: int,
) -> bool:
    urgency_color = "#ef4444" if days_before <= 1 else ("#f59e0b" if days_before <= 3 else "#3b82f6")
    days_label = "hoy vence" if days_before == 0 else (f"vence mañana" if days_before == 1 else f"vence en {days_before} días")

    body = f"""
    <p style="margin:0 0 20px;color:#374151;font-size:15px;">
      Hola <strong>{to_name}</strong>, una tarea asignada a ti se acerca a su fecha límite.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">{task_title}</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        {_row("Proceso:", case_title)}
        {_row("Fecha límite:", due_date)}
        {_row("Estado:", _badge(days_label.upper(), urgency_color))}
      </table>
    </div>
    <p style="margin:0;color:#64748b;font-size:13px;">
      Ingresa al ERP para revisar y actualizar el estado de la tarea.
    </p>
    """
    subject = f"⚠ Tarea por vencer: {task_title}" if days_before <= 1 else f"Recordatorio: {task_title} {days_label}"
    return await _send(to_email, to_name, subject, _base_html("Plazo próximo a vencer", body))


async def notify_case_update(
    to_email: str,
    to_name: str,
    case_title: str,
    update_title: str,
    update_content: str,
    created_by: str,
) -> bool:
    content_preview = update_content[:300] + "…" if len(update_content) > 300 else update_content
    body = f"""
    <p style="margin:0 0 20px;color:#374151;font-size:15px;">
      Hola <strong>{to_name}</strong>, hay una nueva actualización en un caso asignado a ti.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">{update_title}</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
        {_row("Caso:", case_title)}
        {_row("Publicado por:", created_by)}
      </table>
      <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;white-space:pre-wrap;">{content_preview}</p>
    </div>
    <p style="margin:0;color:#64748b;font-size:13px;">
      Ingresa al ERP para ver la actualización completa y responder si es necesario.
    </p>
    """
    return await _send(
        to_email, to_name,
        f"Nueva actualización en caso: {case_title}",
        _base_html("Nueva actualización de caso", body),
    )


async def notify_client_alert(
    to_email: str,
    to_name: str,
    client_name: str,
    titulo: str,
    descripcion: Optional[str],
    event_date: str,
    dias: int,
) -> bool:
    dias_label = "el mismo día" if dias == 0 else (f"mañana" if dias == 1 else f"en {dias} días")
    urgency_color = "#ef4444" if dias <= 1 else ("#f59e0b" if dias <= 3 else "#6366f1")
    desc_html = f'<p style="margin:12px 0 0;color:#374151;font-size:13px;">{descripcion}</p>' if descripcion else ""

    body = f"""
    <p style="margin:0 0 20px;color:#374151;font-size:15px;">
      Hola <strong>{to_name}</strong>, tienes un recordatorio para el cliente <strong>{client_name}</strong>.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e293b;">{titulo}</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        {_row("Cliente:", client_name)}
        {_row("Fecha del evento:", event_date)}
        {_row("Ocurre:", _badge(dias_label, urgency_color))}
      </table>
      {desc_html}
    </div>
    <p style="margin:0;color:#64748b;font-size:13px;">
      Ingresa al ERP para ver la ficha completa del cliente.
    </p>
    """
    subject = f"Recordatorio: {titulo} — {client_name}"
    return await _send(to_email, to_name, subject, _base_html("Recordatorio de cliente", body))


async def send_verification_email(to_email: str, to_name: str, verification_url: str) -> bool:
    body = f"""
    <p style="margin:0 0 20px;color:#374151;font-size:15px;">
      Hola <strong>{to_name}</strong>, gracias por registrarte en Legal ERP.
    </p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">
      Para activar tu cuenta, confirma tu dirección de correo haciendo clic en el botón:
    </p>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="{verification_url}"
         style="display:inline-block;background:#1e293b;color:#ffffff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
        Confirmar correo electrónico
      </a>
    </div>
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="margin:0 0 20px;word-break:break-all;color:#3b82f6;font-size:12px;">{verification_url}</p>
    <p style="margin:0;color:#94a3b8;font-size:12px;">
      Este enlace expira en 24 horas. Si no creaste esta cuenta, ignora este correo.
    </p>
    """
    return await _send(to_email, to_name, "Confirma tu correo — Legal ERP", _base_html("Confirma tu correo", body))


async def send_password_reset_email(to_email: str, to_name: str, reset_url: str) -> bool:
    body = f"""
    <p style="margin:0 0 20px;color:#374151;font-size:15px;">
      Hola <strong>{to_name}</strong>, recibimos una solicitud para restablecer tu contraseña.
    </p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">
      Haz clic en el botón para crear una nueva contraseña:
    </p>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="{reset_url}"
         style="display:inline-block;background:#dc2626;color:#ffffff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
        Restablecer contraseña
      </a>
    </div>
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="margin:0 0 20px;word-break:break-all;color:#3b82f6;font-size:12px;">{reset_url}</p>
    <p style="margin:0;color:#94a3b8;font-size:12px;">
      Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este correo — tu contraseña no cambiará.
    </p>
    """
    return await _send(to_email, to_name, "Restablece tu contraseña — Legal ERP", _base_html("Restablecer contraseña", body))


async def send_manual_email(
    recipients: list[dict],  # [{"email": ..., "name": ...}]
    subject: str,
    html_body: str,
) -> dict:
    """Send a manual email to multiple recipients. Returns {sent, failed}."""
    api_key = getattr(settings, "brevo_api_key", None)
    if not api_key:
        return {"sent": 0, "failed": len(recipients), "error": "BREVO_API_KEY not configured"}

    sent, failed = 0, 0
    for r in recipients:
        ok = await _send(r["email"], r.get("name", r["email"]), subject, html_body)
        if ok:
            sent += 1
        else:
            failed += 1
    return {"sent": sent, "failed": failed}
