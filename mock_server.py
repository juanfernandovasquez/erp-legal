"""
Mock server para desarrollo local del ERP Legal.
Ejecutar: python mock_server.py
Corre en: http://localhost:8000
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="ERP Legal Mock API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── helpers ───────────────────────────────────────────────────────────────────

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def new_id():
    return str(uuid.uuid4())

def ok(data, meta=None):
    return {"data": data, "meta": meta or {"timestamp": now_iso(), "version": "1.0"}}

def paginated(data: list, total: Optional[int] = None):
    t = total if total is not None else len(data)
    return {"data": data, "meta": {"total": t, "page": 1, "pages": 1, "limit": 100, "timestamp": now_iso(), "version": "1.0"}}

# ── seed data ─────────────────────────────────────────────────────────────────

LAW_FIRM_ID = "lf-001"
ADMIN_ID = "u-001"
ABOGADO_ID = "u-002"

USERS: dict[str, dict] = {
    ADMIN_ID: {
        "id": ADMIN_ID,
        "nombre": "Admin Mock",
        "name": "Admin",
        "lastName": "Mock",
        "email": "admin@erplegal.com",
        "telefono": "+51 999 000 001",
        "phone": "+51 999 000 001",
        "rol": "admin_firma",
        "role": "admin_firma",
        "bufeteId": LAW_FIRM_ID,
        "lawFirmId": LAW_FIRM_ID,
        "isActive": True,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
    },
    ABOGADO_ID: {
        "id": ABOGADO_ID,
        "nombre": "Luciana Gómez",
        "name": "Luciana",
        "lastName": "Gómez",
        "email": "luciana@erplegal.com",
        "telefono": "+51 999 000 002",
        "phone": "+51 999 000 002",
        "rol": "abogado_junior",
        "role": "abogado_junior",
        "bufeteId": LAW_FIRM_ID,
        "lawFirmId": LAW_FIRM_ID,
        "isActive": True,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
    },
}

CLIENT_ID = "cl-001"
CLIENTS: dict[str, dict] = {
    CLIENT_ID: {
        "id": CLIENT_ID,
        "nombre": "Cliente Ejemplo",
        "name": "Cliente Ejemplo",
        "email": "cliente@ejemplo.com",
        "telefono": "+51 999 111 222",
        "phone": "+51 999 111 222",
        "ruc": "20123456789",
        "taxId": "20123456789",
        "direccion": "Av. Principal 123",
        "streetAddress": "Av. Principal 123",
        "ciudad": "Lima",
        "city": "Lima",
        "state": None,
        "postalCode": None,
        "country": "PE",
        "clientType": "individual",
        "organizationName": None,
        "isActive": True,
        "isPreferred": False,
        "usuarioSol": "20123456789EJEMPLO",
        "claveSol": "ClaveSOL2024",
        "estado": "activo",
        "contactoPrincipal": "Cliente Ejemplo",
        "bufeteId": LAW_FIRM_ID,
        "lawFirmId": LAW_FIRM_ID,
        "createdAt": "2024-01-15T00:00:00Z",
        "updatedAt": "2024-01-15T00:00:00Z",
    }
}

CASE_ID = "case-001"
CASES: dict[str, dict] = {
    CASE_ID: {
        "id": CASE_ID,
        "titulo": "Demanda laboral - Cliente Ejemplo",
        "descripcion": "Caso laboral por despido arbitrario",
        "estado": "activo",
        "status": "activo",
        "tipoSolicitud": "laboral",
        "clienteId": CLIENT_ID,
        "bufeteId": LAW_FIRM_ID,
        "lawFirmId": LAW_FIRM_ID,
        "abogadoPrincipalId": ABOGADO_ID,
        "abogados": [USERS[ABOGADO_ID]],
        "asistentes": [],
        "tipoFacturacion": "por_horas",
        "monedaFacturacion": "PEN",
        "precioFacturacion": None,
        "totalFacturado": 0,
        "fechaApertura": "2024-02-01T00:00:00Z",
        "fechaCierre": None,
        "createdAt": "2024-02-01T00:00:00Z",
        "updatedAt": "2024-02-01T00:00:00Z",
    }
}

PROCESSES: dict[str, dict] = {}
TASKS: dict[str, dict] = {
    "task-001": {
        "id": "task-001",
        "titulo": "Recopilar documentos",
        "descripcion": "Solicitar al cliente todos los documentos del caso",
        "estado": "pendiente",
        "status": "pendiente",
        "prioridad": "alta",
        "priority": "alta",
        "casoId": CASE_ID,
        "procesoId": None,
        "asignadoAId": ABOGADO_ID,
        "asignadoA": USERS[ABOGADO_ID],
        "casoTitulo": "Demanda laboral - Cliente Ejemplo",
        "clienteNombre": "Cliente Ejemplo",
        "fechaVencimiento": None,
        "fechaPresentacion": None,
        "actualHours": None,
        "estimatedHours": None,
        "isBillable": False,
        "createdAt": "2024-02-01T00:00:00Z",
        "updatedAt": "2024-02-01T00:00:00Z",
    }
}
HOURS: dict[str, dict] = {
    "h-001": {
        "id": "h-001", "casoId": CASE_ID, "tareaId": "task-001",
        "usuarioId": ABOGADO_ID, "usuario": {"id": ABOGADO_ID, "nombre": "Luciana Gómez"},
        "horas": 3.0, "tarifaHora": 150.0, "montoTotal": 450.0,
        "descripcion": "Revisión de documentos iniciales",
        "fechaRegistro": "2026-01-10", "esBonificable": True, "aprobado": True,
        "createdAt": "2026-01-10T09:00:00Z", "updatedAt": "2026-01-10T09:00:00Z",
    },
    "h-002": {
        "id": "h-002", "casoId": CASE_ID, "tareaId": "task-001",
        "usuarioId": ADMIN_ID, "usuario": {"id": ADMIN_ID, "nombre": "Admin Mock"},
        "horas": 1.5, "tarifaHora": 200.0, "montoTotal": 300.0,
        "descripcion": "Consulta legal estrategia",
        "fechaRegistro": "2026-01-20", "esBonificable": True, "aprobado": True,
        "createdAt": "2026-01-20T10:00:00Z", "updatedAt": "2026-01-20T10:00:00Z",
    },
    "h-003": {
        "id": "h-003", "casoId": CASE_ID, "tareaId": None,
        "usuarioId": ABOGADO_ID, "usuario": {"id": ABOGADO_ID, "nombre": "Luciana Gómez"},
        "horas": 4.0, "tarifaHora": 150.0, "montoTotal": 600.0,
        "descripcion": "Redacción de escrito de demanda",
        "fechaRegistro": "2026-02-05", "esBonificable": True, "aprobado": False,
        "createdAt": "2026-02-05T08:00:00Z", "updatedAt": "2026-02-05T08:00:00Z",
    },
    "h-004": {
        "id": "h-004", "casoId": CASE_ID, "tareaId": None,
        "usuarioId": ADMIN_ID, "usuario": {"id": ADMIN_ID, "nombre": "Admin Mock"},
        "horas": 2.0, "tarifaHora": 200.0, "montoTotal": 400.0,
        "descripcion": "Reunión con cliente",
        "fechaRegistro": "2026-02-18", "esBonificable": True, "aprobado": True,
        "createdAt": "2026-02-18T15:00:00Z", "updatedAt": "2026-02-18T15:00:00Z",
    },
    "h-005": {
        "id": "h-005", "casoId": CASE_ID, "tareaId": None,
        "usuarioId": ABOGADO_ID, "usuario": {"id": ABOGADO_ID, "nombre": "Luciana Gómez"},
        "horas": 5.0, "tarifaHora": 150.0, "montoTotal": 750.0,
        "descripcion": "Audiencia preparatoria",
        "fechaRegistro": "2026-03-12", "esBonificable": True, "aprobado": True,
        "createdAt": "2026-03-12T09:00:00Z", "updatedAt": "2026-03-12T09:00:00Z",
    },
    "h-006": {
        "id": "h-006", "casoId": CASE_ID, "tareaId": "task-001",
        "usuarioId": ADMIN_ID, "usuario": {"id": ADMIN_ID, "nombre": "Admin Mock"},
        "horas": 2.5, "tarifaHora": 200.0, "montoTotal": 500.0,
        "descripcion": "Revisión de jurisprudencia",
        "fechaRegistro": "2026-04-08", "esBonificable": True, "aprobado": False,
        "createdAt": "2026-04-08T11:00:00Z", "updatedAt": "2026-04-08T11:00:00Z",
    },
    "h-007": {
        "id": "h-007", "casoId": CASE_ID, "tareaId": None,
        "usuarioId": ABOGADO_ID, "usuario": {"id": ABOGADO_ID, "nombre": "Luciana Gómez"},
        "horas": 6.0, "tarifaHora": 150.0, "montoTotal": 900.0,
        "descripcion": "Audiencia principal",
        "fechaRegistro": "2026-05-22", "esBonificable": True, "aprobado": True,
        "createdAt": "2026-05-22T09:00:00Z", "updatedAt": "2026-05-22T09:00:00Z",
    },
    "h-008": {
        "id": "h-008", "casoId": CASE_ID, "tareaId": None,
        "usuarioId": ADMIN_ID, "usuario": {"id": ADMIN_ID, "nombre": "Admin Mock"},
        "horas": 3.5, "tarifaHora": 200.0, "montoTotal": 700.0,
        "descripcion": "Preparación alegatos",
        "fechaRegistro": "2026-06-10", "esBonificable": True, "aprobado": True,
        "createdAt": "2026-06-10T14:00:00Z", "updatedAt": "2026-06-10T14:00:00Z",
    },
}
ADJUSTMENTS: dict[str, dict] = {
    "adj-001": {
        "id": "adj-001", "casoId": CASE_ID, "casoTitulo": "Caso Demo Tarifa Plana",
        "moneda": "PEN", "descripcion": "Descuento por pronto pago",
        "monto": -500.0, "fechaAplicacion": "2026-01-01",
        "createdAt": "2026-01-15T10:00:00Z", "updatedAt": "2026-01-15T10:00:00Z",
    },
    "adj-002": {
        "id": "adj-002", "casoId": CASE_ID, "casoTitulo": "Caso Demo Tarifa Plana",
        "moneda": "PEN", "descripcion": "Recargo por diligencias adicionales",
        "monto": 800.0, "fechaAplicacion": "2026-03-01",
        "createdAt": "2026-03-20T10:00:00Z", "updatedAt": "2026-03-20T10:00:00Z",
    },
    "adj-003": {
        "id": "adj-003", "casoId": CASE_ID, "casoTitulo": "Caso Demo Tarifa Plana",
        "moneda": "PEN", "descripcion": "Bono por cierre anticipado",
        "monto": 1200.0, "fechaAplicacion": "2026-05-01",
        "createdAt": "2026-05-10T10:00:00Z", "updatedAt": "2026-05-10T10:00:00Z",
    },
}
ALERTS: dict[str, dict] = {
    "alert-001": {
        "id": "alert-001", "casoId": "case-001", "bufeteId": "firm-001",
        "tipo": "deadline", "severidad": "critical", "titulo": "Audiencia próxima",
        "mensaje": "La audiencia de conciliación está programada para el 15 de julio. Preparar documentos.",
        "fechaAlerta": "2026-06-01T08:00:00Z", "fechaVencimiento": "2026-07-15T09:00:00Z",
        "estado": "pendiente", "isRead": False, "isAcknowledged": False,
        "acknowledgedAt": None, "isResolved": False, "resolvedAt": None,
        "resolutionNotes": None, "source": "manual", "tareaId": None,
        "createdAt": "2026-06-01T08:00:00Z", "updatedAt": "2026-06-01T08:00:00Z",
    },
    "alert-002": {
        "id": "alert-002", "casoId": "case-001", "bufeteId": "firm-001",
        "tipo": "document", "severidad": "warning", "titulo": "Documentos pendientes",
        "mensaje": "Faltan 3 documentos por presentar ante el juzgado antes del viernes.",
        "fechaAlerta": "2026-06-10T08:00:00Z", "fechaVencimiento": "2026-06-27T17:00:00Z",
        "estado": "reconocida", "isRead": True, "isAcknowledged": True,
        "acknowledgedAt": "2026-06-11T09:00:00Z", "isResolved": False, "resolvedAt": None,
        "resolutionNotes": None, "source": "manual", "tareaId": None,
        "createdAt": "2026-06-10T08:00:00Z", "updatedAt": "2026-06-11T09:00:00Z",
    },
    "alert-003": {
        "id": "alert-003", "casoId": "case-001", "bufeteId": "firm-001",
        "tipo": "custom", "severidad": "info", "titulo": "Reunión con cliente",
        "mensaje": "Coordinar reunión de seguimiento con el cliente para revisar el avance del caso.",
        "fechaAlerta": "2026-05-20T08:00:00Z", "fechaVencimiento": "2026-05-25T12:00:00Z",
        "estado": "resuelta", "isRead": True, "isAcknowledged": True,
        "acknowledgedAt": "2026-05-20T10:00:00Z", "isResolved": True, "resolvedAt": "2026-05-25T11:00:00Z",
        "resolutionNotes": "Reunión realizada con éxito. Cliente conforme con el avance.",
        "source": "manual", "tareaId": None,
        "createdAt": "2026-05-20T08:00:00Z", "updatedAt": "2026-05-25T11:00:00Z",
    },
}
CLIENT_ALERT_RULES: dict[str, dict] = {}
NOTIFICATION_RULES: dict[str, dict] = {
    "nr-001": {
        "id": "nr-001", "caseId": "case-001",
        "daysBefore": 7, "notifyAssignee": True, "notifySupervisors": False,
        "isActive": True, "createdAt": "2026-06-01T08:00:00Z", "updatedAt": "2026-06-01T08:00:00Z",
    }
}
UPDATES: dict[str, dict] = {}
CASE_EVENTS: dict[str, dict] = {}

# ── auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/v1/auth/login")
async def login(request: Request):
    body = await request.json()
    email = body.get("email", "")
    # Accept any credentials for mock
    user = USERS.get(ADMIN_ID)
    if "luciana" in email.lower():
        user = USERS.get(ABOGADO_ID)
    return ok({
        "access_token": "mock-access-token-" + new_id(),
        "refresh_token": "mock-refresh-token-" + new_id(),
        "user": user,
        "token_type": "bearer",
    })

@app.post("/api/v1/auth/refresh")
async def refresh(request: Request):
    return ok({
        "access_token": "mock-access-token-" + new_id(),
        "refresh_token": "mock-refresh-token-" + new_id(),
    })

@app.get("/api/v1/auth/me")
async def me():
    return ok({"user": USERS[ADMIN_ID]})

# ── users ─────────────────────────────────────────────────────────────────────

@app.get("/api/v1/users")
async def list_users():
    return paginated(list(USERS.values()))

@app.post("/api/v1/users")
async def create_user(request: Request):
    body = await request.json()
    uid = new_id()
    user = {
        "id": uid,
        "nombre": body.get("nombre") or f"{body.get('first_name','')} {body.get('last_name','')}".strip(),
        "name": body.get("first_name", ""),
        "lastName": body.get("last_name", ""),
        "email": body.get("email", ""),
        "telefono": body.get("phone", ""),
        "phone": body.get("phone", ""),
        "rol": body.get("rol", "abogado_junior"),
        "role": body.get("rol", "abogado_junior"),
        "bufeteId": LAW_FIRM_ID,
        "lawFirmId": LAW_FIRM_ID,
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    USERS[uid] = user
    return ok(user)

@app.patch("/api/v1/users/{user_id}")
async def update_user(user_id: str, request: Request):
    if user_id not in USERS:
        raise HTTPException(404, "User not found")
    body = await request.json()
    USERS[user_id].update({k: v for k, v in body.items() if v is not None})
    USERS[user_id]["updatedAt"] = now_iso()
    return ok(USERS[user_id])

@app.delete("/api/v1/users/{user_id}")
async def delete_user(user_id: str):
    if user_id not in USERS:
        raise HTTPException(404, "User not found")
    del USERS[user_id]
    return ok({"deleted": True})

# ── clients ───────────────────────────────────────────────────────────────────

@app.get("/api/v1/clients/summary")
async def clients_summary():
    summary = {}
    for cid in CLIENTS:
        active_cases = sum(1 for c in CASES.values() if c.get("clienteId") == cid and c.get("estado") == "activo")
        client_tasks = [t for t in TASKS.values() if CASES.get(t.get("casoId", ""), {}).get("clienteId") == cid]
        summary[cid] = {
            "active_cases": active_cases,
            "pending_tasks": sum(1 for t in client_tasks if t.get("estado") == "pendiente"),
            "in_progress_tasks": sum(1 for t in client_tasks if t.get("estado") == "en_progreso"),
            "overdue_tasks": 0,
            "completed_tasks": sum(1 for t in client_tasks if t.get("estado") in ("completado", "done")),
        }
    return ok(summary)

@app.get("/api/v1/clients")
async def list_clients(search: str = ""):
    clients = list(CLIENTS.values())
    if search:
        search = search.lower()
        clients = [c for c in clients if search in c.get("nombre","").lower() or search in c.get("email","").lower()]
    return paginated(clients)

@app.post("/api/v1/clients")
async def create_client(request: Request):
    body = await request.json()
    cid = new_id()
    name = body.get("name", "")
    client = {
        "id": cid,
        "nombre": name,
        "name": name,
        "email": body.get("email", ""),
        "telefono": body.get("phone", ""),
        "phone": body.get("phone", ""),
        "ruc": body.get("tax_id", ""),
        "taxId": body.get("tax_id", ""),
        "direccion": body.get("street_address", ""),
        "streetAddress": body.get("street_address", ""),
        "ciudad": body.get("city", ""),
        "city": body.get("city", ""),
        "state": body.get("state"),
        "postalCode": body.get("postal_code"),
        "country": body.get("country"),
        "clientType": body.get("client_type", "individual"),
        "organizationName": body.get("organization_name"),
        "isActive": True,
        "isPreferred": body.get("is_preferred", False),
        "usuarioSol": body.get("usuario_sol"),
        "claveSol": body.get("clave_sol"),
        "estado": "activo",
        "contactoPrincipal": name,
        "bufeteId": LAW_FIRM_ID,
        "lawFirmId": LAW_FIRM_ID,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    CLIENTS[cid] = client
    return JSONResponse(ok(client), status_code=201)

@app.get("/api/v1/clients/{client_id}/cases")
async def client_cases(client_id: str):
    if client_id not in CLIENTS:
        raise HTTPException(404, "Client not found")
    cases = [c for c in CASES.values() if c.get("clienteId") == client_id]
    return paginated(cases)

@app.get("/api/v1/clients/{client_id}")
async def get_client(client_id: str):
    if client_id not in CLIENTS:
        raise HTTPException(404, "Client not found")
    return ok(CLIENTS[client_id])

@app.patch("/api/v1/clients/{client_id}")
async def update_client(client_id: str, request: Request):
    if client_id not in CLIENTS:
        raise HTTPException(404, "Client not found")
    body = await request.json()
    _snake_to_camel = {"usuario_sol": "usuarioSol", "clave_sol": "claveSol",
                       "street_address": "streetAddress", "tax_id": "taxId",
                       "client_type": "clientType", "is_active": "isActive",
                       "is_preferred": "isPreferred"}
    for k, v in body.items():
        if v is not None:
            CLIENTS[client_id][_snake_to_camel.get(k, k)] = v
    CLIENTS[client_id]["updatedAt"] = now_iso()
    return ok(CLIENTS[client_id])

@app.delete("/api/v1/clients/{client_id}")
async def delete_client(client_id: str):
    if client_id not in CLIENTS:
        raise HTTPException(404, "Client not found")
    del CLIENTS[client_id]
    return ok({"deleted": True})

# ── client alert rules ────────────────────────────────────────────────────────

def _fmt_alert_rule(r: dict) -> dict:
    dest_ids = r.get("destinatarios", [])
    dest_info = []
    for uid in dest_ids:
        u = USERS.get(uid)
        if u:
            dest_info.append({"id": u["id"], "nombre": u.get("nombre", ""), "email": u.get("email", "")})
    return {**r, "destinatariosInfo": dest_info}

@app.get("/api/v1/clients/{client_id}/alert-rules")
async def list_client_alert_rules(client_id: str):
    rules = [r for r in CLIENT_ALERT_RULES.values() if r.get("clientId") == client_id]
    rules.sort(key=lambda r: r.get("fecha", ""))
    return paginated(list(map(_fmt_alert_rule, rules)))

@app.post("/api/v1/clients/{client_id}/alert-rules")
async def create_client_alert_rule(client_id: str, request: Request):
    body = await request.json()
    rid = new_id()
    rule = {
        "id": rid,
        "clientId": client_id,
        "titulo": body.get("titulo", ""),
        "descripcion": body.get("descripcion"),
        "fecha": body.get("fecha", ""),
        "esAnual": body.get("esAnual", False),
        "diasAnticipacion": body.get("diasAnticipacion", 1),
        "destinatarios": body.get("destinatarios", []),
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    CLIENT_ALERT_RULES[rid] = rule
    return JSONResponse(ok(_fmt_alert_rule(rule)), status_code=201)

@app.patch("/api/v1/clients/{client_id}/alert-rules/{rule_id}")
async def update_client_alert_rule(client_id: str, rule_id: str, request: Request):
    if rule_id not in CLIENT_ALERT_RULES:
        raise HTTPException(404, "Rule not found")
    body = await request.json()
    for k, v in body.items():
        CLIENT_ALERT_RULES[rule_id][k] = v
    CLIENT_ALERT_RULES[rule_id]["updatedAt"] = now_iso()
    return ok(_fmt_alert_rule(CLIENT_ALERT_RULES[rule_id]))

@app.delete("/api/v1/clients/{client_id}/alert-rules/{rule_id}")
async def delete_client_alert_rule(client_id: str, rule_id: str):
    CLIENT_ALERT_RULES.pop(rule_id, None)
    return ok({"deleted": True})

# ── cases ─────────────────────────────────────────────────────────────────────

def _enrich_case(case: dict) -> dict:
    """Add nested cliente, abogadoPrincipal, and compute totalFacturado from HOURS."""
    out = dict(case)
    client_id = out.get("clienteId")
    if client_id and client_id in CLIENTS:
        c = CLIENTS[client_id]
        out["cliente"] = {"id": c["id"], "nombre": c.get("nombre") or c.get("name", ""), "email": c.get("email", "")}
    abogado_id = out.get("abogadoPrincipalId")
    if abogado_id and abogado_id in USERS:
        u = USERS[abogado_id]
        out["abogadoPrincipal"] = {"id": u["id"], "nombre": u.get("nombre", "")}
    # Compute totalFacturado live from HOURS + ADJUSTMENTS
    case_id = out["id"]
    total = sum(h.get("montoTotal", 0) for h in HOURS.values() if h.get("casoId") == case_id)
    total += sum(a.get("monto", 0) for a in ADJUSTMENTS.values() if a.get("casoId") == case_id)
    out["totalFacturado"] = round(total, 2)
    return out

@app.get("/api/v1/cases")
async def list_cases(status: str = "", page: int = 1, limit: int = 20, search: str = ""):
    cases = list(CASES.values())
    if status:
        cases = [c for c in cases if c.get("estado") == status]
    if search:
        sl = search.lower()
        cases = [c for c in cases if sl in c.get("titulo", "").lower() or sl in c.get("descripcion", "").lower()]
    total = len(cases)
    start = (page - 1) * limit
    cases = [_enrich_case(c) for c in cases[start:start+limit]]
    return {"data": cases, "meta": {"total": total, "page": page, "pages": max(1, (total+limit-1)//limit), "limit": limit, "timestamp": now_iso(), "version": "1.0"}}

@app.post("/api/v1/cases")
async def create_case(request: Request):
    body = await request.json()
    cid = new_id()
    tipo_fact = body.get("tipoFacturacion") or None
    if tipo_fact == "":
        tipo_fact = None
    case = {
        "id": cid,
        "titulo": body.get("titulo", "Nuevo proceso"),
        "descripcion": body.get("descripcion", ""),
        "estado": body.get("estado", "activo"),
        "status": body.get("estado", "activo"),
        "tipoSolicitud": body.get("tipoSolicitud", "otro"),
        "clienteId": body.get("clienteId") or "",
        "bufeteId": LAW_FIRM_ID,
        "lawFirmId": LAW_FIRM_ID,
        "abogadoPrincipalId": body.get("abogadoPrincipalId"),
        "abogados": [],
        "asistentes": [],
        "tipoFacturacion": tipo_fact,
        "monedaFacturacion": body.get("monedaFacturacion", "PEN"),
        "precioFacturacion": body.get("precioFacturacion"),
        "totalFacturado": 0,
        "fechaApertura": now_iso(),
        "fechaCierre": None,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    CASES[cid] = case
    return JSONResponse(ok(_enrich_case(case)), status_code=201)

@app.get("/api/v1/cases/{case_id}/team")
async def case_team(case_id: str):
    if case_id not in CASES:
        raise HTTPException(404, "Case not found")
    case = CASES[case_id]
    team = list(case.get("abogados", []))
    for a in case.get("asistentes", []):
        if a not in team:
            team.append(a)
    return paginated(team)

@app.post("/api/v1/cases/{case_id}/team")
async def add_team_member(case_id: str, request: Request):
    if case_id not in CASES:
        raise HTTPException(404, "Case not found")
    body = await request.json()
    user_id = body.get("user_id")
    if user_id and user_id in USERS:
        team = CASES[case_id].get("abogados", [])
        if not any(u["id"] == user_id for u in team):
            team.append(USERS[user_id])
        CASES[case_id]["abogados"] = team
    return ok(CASES[case_id])

@app.delete("/api/v1/cases/{case_id}/team/{user_id}")
async def remove_team_member(case_id: str, user_id: str):
    if case_id not in CASES:
        raise HTTPException(404, "Case not found")
    CASES[case_id]["abogados"] = [u for u in CASES[case_id].get("abogados", []) if u["id"] != user_id]
    return ok({"deleted": True})

@app.get("/api/v1/cases/{case_id}/processes")
async def list_case_processes(case_id: str):
    if case_id not in CASES:
        raise HTTPException(404, "Case not found")
    procs = [p for p in PROCESSES.values() if p.get("casoId") == case_id]
    return paginated(procs)

@app.post("/api/v1/cases/{case_id}/processes")
async def create_case_process(case_id: str, request: Request):
    if case_id not in CASES:
        raise HTTPException(404, "Case not found")
    body = await request.json()
    pid = new_id()
    orden = len([p for p in PROCESSES.values() if p.get("casoId") == case_id]) + 1
    proc = {
        "id": pid,
        "casoId": case_id,
        "titulo": body.get("titulo", ""),
        "descripcion": body.get("descripcion"),
        "estado": body.get("estado", "pendiente"),
        "orden": orden,
        "fechaInicio": None,
        "fechaFin": None,
        "totalTareas": 0,
        "tareasCompletadas": 0,
        "totalHoras": 0,
        "totalMonto": 0,
        "tipoTarifa": body.get("tipoTarifa"),
        "tarifa": body.get("tarifa"),
        "moneda": body.get("moneda", "PEN"),
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    PROCESSES[pid] = proc
    return JSONResponse(ok(proc), status_code=201)

@app.get("/api/v1/cases/{case_id}/tasks")
async def case_tasks(case_id: str):
    tasks = [t for t in TASKS.values() if t.get("casoId") == case_id]
    return paginated(tasks)

@app.post("/api/v1/cases/{case_id}/tasks")
async def create_case_task(case_id: str, request: Request):
    if case_id not in CASES:
        raise HTTPException(404, "Case not found")
    body = await request.json()
    tid = new_id()
    case = CASES[case_id]
    asignadoAId = body.get("asignadoAId")
    task = {
        "id": tid,
        "titulo": body.get("titulo", ""),
        "descripcion": body.get("descripcion"),
        "estado": body.get("estado", "pendiente"),
        "status": body.get("estado", "pendiente"),
        "prioridad": body.get("prioridad", "media"),
        "priority": body.get("prioridad", "media"),
        "casoId": case_id,
        "procesoId": body.get("procesoId"),
        "asignadoAId": asignadoAId,
        "asignadoA": USERS.get(asignadoAId) if asignadoAId else None,
        "casoTitulo": case.get("titulo", ""),
        "clienteNombre": CLIENTS.get(case.get("clienteId", ""), {}).get("nombre", ""),
        "fechaVencimiento": body.get("fechaVencimiento"),
        "fechaPresentacion": body.get("fechaPresentacion"),
        "actualHours": body.get("actualHours"),
        "estimatedHours": body.get("estimatedHours"),
        "isBillable": body.get("isBillable", False),
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    TASKS[tid] = task
    return JSONResponse(ok(task), status_code=201)

@app.get("/api/v1/cases/{case_id}")
async def get_case(case_id: str):
    if case_id not in CASES:
        raise HTTPException(404, "Case not found")
    return ok(_enrich_case(CASES[case_id]))

@app.patch("/api/v1/cases/{case_id}")
async def update_case(case_id: str, request: Request):
    if case_id not in CASES:
        raise HTTPException(404, "Case not found")
    body = await request.json()
    # Allow clearing fields with explicit None/null
    for k, v in body.items():
        if k not in ("id", "createdAt"):
            CASES[case_id][k] = v
    CASES[case_id]["updatedAt"] = now_iso()
    return ok(_enrich_case(CASES[case_id]))

@app.delete("/api/v1/cases/{case_id}")
async def delete_case(case_id: str):
    if case_id not in CASES:
        raise HTTPException(404, "Case not found")
    del CASES[case_id]
    return ok({"deleted": True})

# ── processes ─────────────────────────────────────────────────────────────────

@app.patch("/api/v1/processes/{process_id}")
async def update_process(process_id: str, request: Request):
    if process_id not in PROCESSES:
        raise HTTPException(404, "Process not found")
    body = await request.json()
    PROCESSES[process_id].update({k: v for k, v in body.items() if v is not None})
    PROCESSES[process_id]["updatedAt"] = now_iso()
    return ok(PROCESSES[process_id])

@app.delete("/api/v1/processes/{process_id}")
async def delete_process(process_id: str):
    if process_id not in PROCESSES:
        raise HTTPException(404, "Process not found")
    del PROCESSES[process_id]
    return ok({"deleted": True})

# ── tasks ─────────────────────────────────────────────────────────────────────

@app.get("/api/v1/tasks")
async def list_tasks(limit: int = 100, page: int = 1):
    tasks = list(TASKS.values())
    return paginated(tasks)

@app.get("/api/v1/tasks/{task_id}")
async def get_task(task_id: str):
    if task_id not in TASKS:
        raise HTTPException(404, "Task not found")
    return ok(TASKS[task_id])

@app.patch("/api/v1/tasks/{task_id}")
async def update_task(task_id: str, request: Request):
    if task_id not in TASKS:
        raise HTTPException(404, "Task not found")
    body = await request.json()
    asignadoAId = body.get("asignadoAId")
    TASKS[task_id].update({k: v for k, v in body.items()})
    if asignadoAId and asignadoAId in USERS:
        TASKS[task_id]["asignadoA"] = USERS[asignadoAId]
    elif asignadoAId is None:
        TASKS[task_id]["asignadoA"] = None
    TASKS[task_id]["updatedAt"] = now_iso()
    return ok(TASKS[task_id])

@app.delete("/api/v1/tasks/{task_id}")
async def delete_task(task_id: str):
    if task_id not in TASKS:
        raise HTTPException(404, "Task not found")
    del TASKS[task_id]
    return ok({"deleted": True})

# ── hours (helpers) ───────────────────────────────────────────────────────────

def _make_hour(body: dict, case_id: str = "") -> dict:
    """Build an hour entry using the same field names the real backend returns."""
    hid = new_id()
    horas_val = float(body.get("horas") or body.get("hours") or 0)
    tarifa    = float(body.get("tarifaHora") or body.get("hourly_rate") or body.get("hourlyRate") or 0)
    monto     = horas_val * tarifa
    usuario_id = body.get("usuarioId") or body.get("userId") or body.get("user_id") or ADMIN_ID
    usuario = USERS.get(usuario_id, USERS[ADMIN_ID])
    return {
        "id":           hid,
        "casoId":       case_id or body.get("caseId") or body.get("casoId", ""),
        "tareaId":      body.get("tareaId") or body.get("taskId") or body.get("task_id"),
        "usuarioId":    usuario_id,
        "usuario":      {"id": usuario_id, "nombre": usuario.get("nombre", "")},
        "horas":        horas_val,
        "tarifaHora":   tarifa,
        "montoTotal":   monto,
        "descripcion":  body.get("descripcion") or body.get("description") or "",
        "fechaRegistro": body.get("fechaRegistro") or body.get("work_date") or now_iso()[:10],
        "esBonificable": body.get("esBonificable", body.get("isBillable", True)),
        "aprobado":     False,
        "moneda":       body.get("moneda", "PEN"),
        "createdAt":    now_iso(),
        "updatedAt":    now_iso(),
    }

# ── hours endpoints ────────────────────────────────────────────────────────────

@app.get("/api/v1/hours/firm-hours")
async def firm_hours(limit: int = 1000, case_id: str = ""):
    """Todas las horas del bufete — usado por la página global de Facturación."""
    hours = list(HOURS.values())
    if case_id:
        hours = [h for h in hours if h.get("casoId") == case_id]
    return paginated(hours[:limit])

@app.get("/api/v1/hours/billing-summary")
async def hours_billing_summary():
    total_horas = sum(h.get("horas", 0) for h in HOURS.values())
    total_monto = sum(h.get("montoTotal", 0) for h in HOURS.values())
    return ok({"totalHours": total_horas, "totalAmount": total_monto, "cases": []})

@app.get("/api/v1/hours")
async def list_hours(case_id: str = "", limit: int = 100):
    hours = list(HOURS.values())
    if case_id:
        hours = [h for h in hours if h.get("casoId") == case_id]
    return paginated(hours)

@app.post("/api/v1/hours")
async def create_hours(request: Request):
    body  = await request.json()
    hour  = _make_hour(body)
    HOURS[hour["id"]] = hour
    return JSONResponse(ok(hour), status_code=201)

@app.patch("/api/v1/hours/{hour_id}")
async def update_hours(hour_id: str, request: Request):
    if hour_id not in HOURS:
        raise HTTPException(404, "Hours not found")
    body = await request.json()
    h    = HOURS[hour_id]
    # Update fields with correct names
    if "horas" in body or "hours" in body:
        h["horas"] = float(body.get("horas") or body.get("hours") or h["horas"])
    if "tarifaHora" in body or "hourly_rate" in body:
        h["tarifaHora"] = float(body.get("tarifaHora") or body.get("hourly_rate") or h["tarifaHora"])
    if "descripcion" in body or "description" in body:
        h["descripcion"] = body.get("descripcion") or body.get("description") or h["descripcion"]
    if "fechaRegistro" in body or "work_date" in body:
        h["fechaRegistro"] = body.get("fechaRegistro") or body.get("work_date") or h["fechaRegistro"]
    h["montoTotal"] = h["horas"] * h["tarifaHora"]
    h["updatedAt"]  = now_iso()
    return ok(h)

@app.delete("/api/v1/hours/{hour_id}")
async def delete_hours(hour_id: str):
    if hour_id not in HOURS:
        raise HTTPException(404, "Hours not found")
    del HOURS[hour_id]
    return ok({"deleted": True})

# ── case-scoped hours ─────────────────────────────────────────────────────────

@app.get("/api/v1/cases/{case_id}/hours")
async def list_case_hours(case_id: str):
    hours = [h for h in HOURS.values() if h.get("casoId") == case_id]
    return paginated(hours)

@app.post("/api/v1/cases/{case_id}/hours")
async def create_case_hours(case_id: str, request: Request):
    body = await request.json()
    hour = _make_hour(body, case_id)
    HOURS[hour["id"]] = hour
    return JSONResponse(ok(hour), status_code=201)

@app.post("/api/v1/cases/{case_id}/hours/recalculate")
async def recalculate_hours(case_id: str):
    return ok({"recalculated": True})

# ── case-scoped billing ────────────────────────────────────────────────────────

@app.get("/api/v1/cases/{case_id}/billing")
async def case_billing(case_id: str):
    case = CASES.get(case_id, {})
    adjs = [a for a in ADJUSTMENTS.values() if a.get("casoId") == case_id]
    hours = [h for h in HOURS.values() if h.get("casoId") == case_id]
    subtotal = sum(h.get("montoTotal", 0) for h in hours)
    total_adjs = sum(a.get("monto", 0) for a in adjs)
    return ok({
        "casoId": case_id,
        "subtotalHoras": subtotal,
        "ajustes": adjs,
        "totalAjustes": total_adjs,
        "totalFinal": subtotal + total_adjs,
        "moneda": case.get("monedaFacturacion", "PEN"),
        "tipoFacturacion": case.get("tipoFacturacion"),
    })

@app.post("/api/v1/cases/{case_id}/billing/adjustments")
async def create_case_adjustment(case_id: str, request: Request):
    body = await request.json()
    aid = new_id()
    case = CASES.get(case_id, {})
    adj = {
        "id": aid,
        "casoId": case_id,
        "casoTitulo": case.get("titulo"),
        "moneda": case.get("monedaFacturacion", "PEN"),
        "descripcion": body.get("descripcion", ""),
        "monto": float(body.get("monto", 0)),
        "nombre": body.get("nombre"),
        "fechaAplicacion": body.get("fechaAplicacion"),
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    ADJUSTMENTS[aid] = adj
    return JSONResponse(ok(adj), status_code=201)

@app.patch("/api/v1/cases/{case_id}/billing/adjustments/{adj_id}")
async def update_case_adjustment(case_id: str, adj_id: str, request: Request):
    body = await request.json()
    if adj_id in ADJUSTMENTS:
        for k, v in body.items():
            ADJUSTMENTS[adj_id][k] = v  # allow None to clear fechaAplicacion
        ADJUSTMENTS[adj_id]["updatedAt"] = now_iso()
        return ok(ADJUSTMENTS[adj_id])
    return ok({"id": adj_id, **body, "updatedAt": now_iso()})

@app.delete("/api/v1/cases/{case_id}/billing/adjustments/{adj_id}")
async def delete_case_adjustment(case_id: str, adj_id: str):
    ADJUSTMENTS.pop(adj_id, None)
    return ok({"deleted": True})

@app.get("/api/v1/hours/firm-adjustments")
async def firm_adjustments(limit: int = 1000):
    """Todos los ajustes de facturación del bufete — para el panel global de Facturación."""
    adjs = list(ADJUSTMENTS.values())
    return paginated(adjs[:limit])

@app.get("/api/v1/cases/{case_id}/billing/pdf")
async def case_billing_pdf(case_id: str):
    from fastapi.responses import Response
    pdf_bytes = b"%PDF-1.4 mock pdf"
    return Response(content=pdf_bytes, media_type="application/pdf")

# ── billing ───────────────────────────────────────────────────────────────────

@app.get("/api/v1/billing/adjustments")
async def list_adjustments(process_id: str = ""):
    return paginated([])

@app.post("/api/v1/billing/adjustments")
async def create_adjustment(request: Request):
    body = await request.json()
    adj = {"id": new_id(), **body, "createdAt": now_iso(), "updatedAt": now_iso()}
    return JSONResponse(ok(adj), status_code=201)

@app.patch("/api/v1/billing/adjustments/{adj_id}")
async def update_adjustment(adj_id: str, request: Request):
    body = await request.json()
    return ok({"id": adj_id, **body, "updatedAt": now_iso()})

@app.delete("/api/v1/billing/adjustments/{adj_id}")
async def delete_adjustment(adj_id: str):
    return ok({"deleted": True})

# ── alerts ────────────────────────────────────────────────────────────────────

@app.get("/api/v1/alerts/summary")
async def alerts_summary():
    all_a = list(ALERTS.values())
    total = len(all_a)
    pending = sum(1 for a in all_a if not a.get("isResolved") and a.get("estado") != "resuelta")
    resolved = sum(1 for a in all_a if a.get("isResolved") or a.get("estado") == "resuelta")
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    overdue = sum(
        1 for a in all_a
        if not a.get("isResolved") and a.get("fechaVencimiento")
        and datetime.fromisoformat(a["fechaVencimiento"].replace("Z", "+00:00")) < now
    )
    return ok({"total": total, "pending": pending, "resolved": resolved, "overdue": overdue})

@app.get("/api/v1/alerts")
async def list_alerts(status: str = "", case_id: str = "", limit: int = 100):
    items = list(ALERTS.values())
    if status:
        items = [a for a in items if a.get("estado") == status]
    if case_id:
        items = [a for a in items if a.get("casoId") == case_id]
    items.sort(key=lambda a: a.get("createdAt", ""), reverse=True)
    return paginated(items[:limit])

@app.get("/api/v1/cases/{case_id}/alerts")
async def list_case_alerts(case_id: str):
    items = [a for a in ALERTS.values() if a.get("casoId") == case_id]
    items.sort(key=lambda a: a.get("createdAt", ""), reverse=True)
    return paginated(items)

@app.post("/api/v1/cases/{case_id}/alerts")
async def create_case_alert(case_id: str, request: Request):
    body = await request.json()
    aid = new_id()
    ts = now_iso()
    alert = {
        "id": aid, "casoId": case_id, "bufeteId": "firm-001",
        "tipo": body.get("alert_type", "custom"),
        "severidad": body.get("severity", "warning"),
        "titulo": body.get("title", ""),
        "mensaje": body.get("message", ""),
        "fechaAlerta": ts,
        "fechaVencimiento": body.get("due_date") or None,
        "estado": "pendiente", "isRead": False, "isAcknowledged": False,
        "acknowledgedAt": None, "isResolved": False, "resolvedAt": None,
        "resolutionNotes": None, "source": "manual", "tareaId": None,
        "createdAt": ts, "updatedAt": ts,
    }
    ALERTS[aid] = alert
    return JSONResponse(ok(alert), status_code=201)

@app.patch("/api/v1/alerts/{alert_id}")
async def update_alert(alert_id: str, request: Request):
    body = await request.json()
    if alert_id not in ALERTS:
        raise HTTPException(404, "Alert not found")
    a = ALERTS[alert_id]
    ts = now_iso()
    if body.get("is_resolved"):
        a["isResolved"] = True
        a["resolvedAt"] = ts
        a["estado"] = "resuelta"
        if body.get("resolution_notes"):
            a["resolutionNotes"] = body["resolution_notes"]
    if body.get("is_acknowledged"):
        a["isAcknowledged"] = True
        a["acknowledgedAt"] = ts
        a["estado"] = "reconocida"
    a["updatedAt"] = ts
    return ok(a)

@app.delete("/api/v1/alerts/{alert_id}")
async def delete_alert(alert_id: str):
    ALERTS.pop(alert_id, None)
    return ok({"deleted": True})

# ── notification rules ────────────────────────────────────────────────────────

@app.get("/api/v1/cases/{case_id}/notification-rules")
async def list_notification_rules(case_id: str):
    rules = [r for r in NOTIFICATION_RULES.values() if r.get("caseId") == case_id]
    return paginated(rules)

@app.post("/api/v1/cases/{case_id}/notification-rules")
async def create_notification_rule(case_id: str, request: Request):
    body = await request.json()
    rid = new_id()
    rule = {
        "id": rid,
        "caseId": case_id,
        "daysBefore": body.get("daysBefore", 1),
        "notifyAssignee": body.get("notifyAssignee", True),
        "notifySupervisors": body.get("notifySupervisors", False),
        "isActive": True,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    NOTIFICATION_RULES[rid] = rule
    return JSONResponse(ok(rule), status_code=201)

@app.patch("/api/v1/cases/{case_id}/notification-rules/{rule_id}")
async def update_notification_rule(case_id: str, rule_id: str, request: Request):
    body = await request.json()
    if rule_id in NOTIFICATION_RULES:
        for k, v in body.items():
            NOTIFICATION_RULES[rule_id][k] = v
        NOTIFICATION_RULES[rule_id]["updatedAt"] = now_iso()
        return ok(NOTIFICATION_RULES[rule_id])
    raise HTTPException(404, "Rule not found")

@app.delete("/api/v1/cases/{case_id}/notification-rules/{rule_id}")
async def delete_notification_rule(case_id: str, rule_id: str):
    NOTIFICATION_RULES.pop(rule_id, None)
    return ok({"deleted": True})

# ── timeline events ───────────────────────────────────────────────────────────

@app.get("/api/v1/{case_id}/timeline")
async def case_timeline(case_id: str):
    items = [e for e in CASE_EVENTS.values() if e.get("casoId") == case_id]
    items.sort(key=lambda e: e.get("fecha", ""))
    return paginated(items)

@app.post("/api/v1/{case_id}/events")
async def create_case_event(case_id: str, request: Request):
    body = await request.json()
    uid = new_id()
    ts = now_iso()
    fecha_raw = body.get("event_date", body.get("fecha", ts))
    fecha = fecha_raw[:10] if fecha_raw else ts[:10]
    event = {
        "id": uid,
        "casoId": case_id,
        "titulo": body.get("title", body.get("titulo", "")),
        "descripcion": body.get("description", body.get("descripcion", None)),
        "fecha": fecha,
        "completado": False,
        "createdAt": ts,
        "updatedAt": ts,
    }
    CASE_EVENTS[uid] = event
    return JSONResponse(ok(event), status_code=201)

@app.patch("/api/v1/{case_id}/events/{event_id}")
async def update_case_event(case_id: str, event_id: str, request: Request):
    body = await request.json()
    ev = CASE_EVENTS.get(event_id)
    if ev:
        if "title" in body or "titulo" in body:
            ev["titulo"] = body.get("title", body.get("titulo", ev["titulo"]))
        if "description" in body or "descripcion" in body:
            ev["descripcion"] = body.get("description", body.get("descripcion", ev["descripcion"]))
        fecha_raw = body.get("event_date", body.get("fecha"))
        if fecha_raw:
            ev["fecha"] = fecha_raw[:10]
        ev["updatedAt"] = now_iso()
        return ok(ev)
    return JSONResponse({"detail": "Event not found"}, status_code=404)

@app.delete("/api/v1/{case_id}/events/{event_id}")
async def delete_case_event(case_id: str, event_id: str):
    CASE_EVENTS.pop(event_id, None)
    return ok({"deleted": True})

@app.get("/api/v1/cases/{case_id}/updates")
async def case_updates(case_id: str):
    items = [u for u in UPDATES.values() if u.get("casoId") == case_id]
    items.sort(key=lambda u: u.get("createdAt", ""), reverse=True)
    return paginated(items)

@app.post("/api/v1/cases/{case_id}/updates")
async def create_case_update(case_id: str, request: Request):
    body = await request.json()
    uid = new_id()
    ts = now_iso()
    user = USERS.get(ADMIN_ID)
    update = {
        "id": uid,
        "casoId": case_id,
        "titulo": body.get("titulo", ""),
        "contenido": body.get("contenido", body.get("content", "")),
        "tipoActualizacion": body.get("tipoActualizacion", "nota"),
        "creadoPorId": ADMIN_ID,
        "creadoPor": user.get("nombre", "Admin Mock") if user else "Admin Mock",
        "createdAt": ts,
        "updatedAt": ts,
    }
    UPDATES[uid] = update
    return JSONResponse(ok(update), status_code=201)

@app.patch("/api/v1/cases/{case_id}/updates/{update_id}")
async def update_case_update(case_id: str, update_id: str, request: Request):
    body = await request.json()
    if update_id in UPDATES:
        UPDATES[update_id].update({k: v for k, v in body.items() if k not in ("id", "createdAt")})
        UPDATES[update_id]["updatedAt"] = now_iso()
        return ok(UPDATES[update_id])
    ts = now_iso()
    return ok({"id": update_id, "casoId": case_id, **body, "updatedAt": ts})

@app.delete("/api/v1/cases/{case_id}/updates/{update_id}")
async def delete_case_update(case_id: str, update_id: str):
    UPDATES.pop(update_id, None)
    return ok({"deleted": True})

# ── documents ─────────────────────────────────────────────────────────────────

@app.get("/api/v1/documents")
async def list_documents(case_id: str = ""):
    return paginated([])

@app.post("/api/v1/documents")
async def upload_document(request: Request):
    return JSONResponse(ok({"id": new_id(), "nombre": "documento.pdf", "url": "#", "createdAt": now_iso()}), status_code=201)

@app.delete("/api/v1/documents/{doc_id}")
async def delete_document(doc_id: str):
    return ok({"deleted": True})

# ── sub-cases ─────────────────────────────────────────────────────────────────

@app.get("/api/v1/cases/{case_id}/sub-cases")
async def list_sub_cases(case_id: str):
    return paginated([])

@app.delete("/api/v1/cases/{case_id}/sub-cases/{sub_id}")
async def delete_sub_case(case_id: str, sub_id: str):
    return ok({"deleted": True})

# ── dashboard ─────────────────────────────────────────────────────────────────

@app.get("/api/v1/law-firms")
async def get_law_firm():
    return ok({
        "id": LAW_FIRM_ID,
        "name": "Katarzyna & Asociados",
        "registration_number": "20612345678",
        "email": "contacto@katarzyna.pe",
        "phone": "+51 998 765 432",
        "street_address": "Av. Javier Prado Este 1234, Of. 502",
        "city": "Lima",
        "state": "Lima",
        "country": "Perú",
        "website": "www.katarzyna.pe",
        "is_active": True,
    })

@app.get("/api/v1/admin/dashboard")
async def dashboard():
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    active_cases = sum(1 for c in CASES.values() if c.get("estado") == "activo")
    total_cases = len(CASES)
    pending_tasks = sum(1 for t in TASKS.values() if t.get("estado") in ("pendiente", "pending"))
    overdue_alerts = sum(
        1 for a in ALERTS.values()
        if not a.get("isResolved") and a.get("fechaVencimiento")
        and datetime.fromisoformat(a["fechaVencimiento"].replace("Z", "+00:00")) < now
    )
    from datetime import date
    first_day = date.today().replace(day=1)
    hours_month = sum(
        h.get("hours", 0) for h in HOURS.values()
        if h.get("fecha", "") >= str(first_day)
    )
    return ok({
        "cases": {"active": active_cases, "total": total_cases, "closed": total_cases - active_cases},
        "tasks": {"pending": pending_tasks, "overdue": 0, "in_progress": 0},
        "alerts": {"overdue": overdue_alerts},
        "hours": {"this_month": hours_month},
        "team": {"total_users": len(USERS), "top_members": []},
    })

@app.get("/api/v1/dashboard")
async def dashboard_alt():
    return await dashboard()

@app.get("/api/v1/invoice-metrics")
async def invoice_metrics():
    return paginated([])

# ── emails ────────────────────────────────────────────────────────────────────

@app.get("/api/v1/emails")
async def list_emails():
    return paginated([])

@app.post("/api/v1/emails/send")
async def send_email(request: Request):
    return ok({"sent": True, "message": "Email enviado (mock)"})

# ── process types ─────────────────────────────────────────────────────────────

@app.get("/api/v1/process-types")
async def list_process_types():
    return paginated([
        {"id": "pt-1", "nombre": "Laboral", "descripcion": ""},
        {"id": "pt-2", "nombre": "Civil", "descripcion": ""},
        {"id": "pt-3", "nombre": "Penal", "descripcion": ""},
    ])

# ── health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "healthy", "environment": "mock", "version": "1.0.0"}

@app.get("/")
async def root():
    return {"message": "ERP Legal Mock API", "docs": "/docs"}

# ── catch-all for missing routes ──────────────────────────────────────────────

@app.api_route("/{path:path}", methods=["GET", "POST", "PATCH", "PUT", "DELETE"])
async def catch_all(path: str, request: Request):
    if request.method == "GET":
        return ok([])
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass
    return JSONResponse(ok({"id": new_id(), **body, "createdAt": now_iso()}), status_code=200)


if __name__ == "__main__":
    import uvicorn
    print("Iniciando Mock API Server en http://localhost:8000")
    print("Documentación: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
