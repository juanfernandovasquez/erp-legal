# ERP Legal — Contexto para IA

Sistema ERP para estudios de abogados. Gestiona casos, procesos, clientes, tareas, horas, facturación y un portal cliente. Desarrollado para Katarzyna (estudio legal en Lima, Perú).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI + SQLAlchemy 2.0 async + PostgreSQL (asyncpg) + Alembic |
| Frontend | React 18 + TypeScript + Vite + TailwindCSS + Zustand + react-hook-form + Zod |
| Email | Brevo (ex-Sendinblue) — API transaccional, sender `noreply@katarzyna.pe` |
| IA | Anthropic API (chat contextual por caso) |
| Infra | DigitalOcean Droplet 1GB RAM · Docker Compose · Nginx host + SSL Let's Encrypt |
| Dominio | https://erp.katarzyna.pe (IP: 137.184.54.245) |

---

## Estructura del repositorio

```
erp-legal/
├── backend/
│   ├── app/
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── routers/        # FastAPI endpoints (21 archivos)
│   │   ├── schemas/        # Pydantic schemas (parcialmente desactualizados)
│   │   ├── services/       # email_service, audit_service, case_service, alert_service, document_service
│   │   ├── scripts/        # check_deadlines.py, check_client_alerts.py (crons diarios)
│   │   ├── middleware/     # rls.py (Row Level Security), audit.py (audit logging)
│   │   ├── utils/          # auth.py, security.py, responses.py, encryption.py, audit.py
│   │   ├── config.py       # Settings (Pydantic BaseSettings, lee de .env)
│   │   ├── database.py     # SQLAlchemy async engine + session factory
│   │   ├── dependencies.py # get_db, get_current_user
│   │   └── main.py         # FastAPI app, middlewares, todos los routers incluidos
│   ├── tests/              # pytest: conftest, test_auth, _cases, _tasks, _hours, _billing, _clients, _processes, _alerts, _security
│   └── alembic/versions/   # 21 migraciones (001–021)
├── frontend/
│   ├── src/
│   │   ├── pages/          # Páginas por módulo (ver sección Frontend)
│   │   ├── components/     # Componentes reutilizables por módulo
│   │   ├── hooks/          # useAuth, useAlerts, useCases, useDocuments, useEscapeKey
│   │   ├── stores/         # Zustand: authStore, caseStore, clientPortalStore, uiStore
│   │   ├── types/          # index.ts, case.ts, task.ts, alert.ts, auth.ts, document.ts, timeline.ts
│   │   └── lib/            # axios.ts (JWT), portalApi.ts, utils.ts
│   ├── Dockerfile.staging  # Multi-stage: Node builder → Nginx static
│   └── nginx.staging.conf  # Nginx dentro de Docker (proxy /api/ → backend)
├── database/
│   ├── schema.sql          # Schema completo (fuente de verdad para BD nueva)
│   ├── indexes.sql         # Índices de performance
│   ├── rls_policies.sql    # Row Level Security policies
│   └── seeds.sql           # Datos de prueba
├── docker-compose.yml          # Base (desarrollo local)
├── docker-compose.staging.yml  # Override para staging
└── .githooks/pre-push          # Hook: protege la BD de staging ante pushes peligrosos
```

---

## Arquitectura de datos

### Jerarquía principal
```
LawFirm → Users
LawFirm → Clients → CaseClients → Cases
LawFirm → Clients → ClientCredentials   ← credenciales institucionales (SUNAT SOL, SUNARP, etc.)
LawFirm → Clients → ClientAlertRules
LawFirm → Cases → CaseProcesses → Tasks → CaseHours
LawFirm → Cases → CaseAlerts
LawFirm → Cases → CaseUpdates          ← timeline de actualizaciones
LawFirm → Cases → CaseEvents           ← hitos/audiencias
LawFirm → Cases → BillingAdjustments
LawFirm → Cases → NotificationRules
LawFirm → Cases → Documents
```

### Convención base: BaseModel

Todos los modelos heredan de `BaseModel` (`models/base.py`), que añade:
- `id` — UUID primary key, auto-generado
- `created_at`, `updated_at` — timestamps con timezone
- `created_by`, `updated_by`, `deleted_by` — FK nullable → users
- `is_deleted` — soft-delete flag
- `deleted_at` — timestamp de borrado

---

## Modelos y tablas (backend/app/models/)

### `cases` — `case.py`
Columnas en inglés.
- `case_number`, `title`, `description`, `case_type`, `status`, `priority`
- `opened_date`, `closed_date`, `due_date`
- `court_name`, `court_location`, `judge_name`, `plaintiff`, `defendant`
- `budget_amount`, `budget_currency` (default `"PEN"`), `spent_amount`
- `parent_case_id` — FK a sí mismo (sub-casos, máx 2 niveles)
- `process_type_id` — FK → process_types
- **Billing**: `tipo_facturacion` (`'flat'`|`'por_horas'`), `moneda_facturacion` (`'PEN'`|`'USD'`), `precio_facturacion`
- **ATENCIÓN**: Los enums `CaseStatus`, `CaseType`, `CasePriority` en el modelo tienen valores distintos a los strings reales en BD. Los routers usan `"activo"`, `"inactivo"` mientras el enum define `"active"`, `"draft"`. Son código muerto (ver CONV-001).

### `case_processes` — `process.py`
Columnas en **español** (único modelo así — issue LANG-001).
- `titulo`, `descripcion`, `estado` (`"pendiente"`|`"en_progreso"`|`"completado"`|`"cancelado"`), `orden`
- `fecha_inicio`, `fecha_fin`
- **Billing**: `tipo_tarifa` (`'plana'`|`'por_horas'`), `tarifa`, `moneda` (`'PEN'`|`'USD'`)
- Relación con `tasks` (cascade delete-orphan)

### `tasks` — `task.py`
- `case_id`, `law_firm_id`, `process_id` (nullable — tasks sin proceso = legacy)
- `title`, `description`, `status`, `priority`
- `assignee_id` FK → users
- `due_date`, `presentation_date`, `start_date`, `completed_date`
- `estimated_hours`, `actual_hours`, `hourly_rate`, `is_billable`
- `progress_percentage`, `tags` (JSON), `notes`
- `parent_task_id` (subtareas)

### `case_hours` — `task.py` (línea ~150)
- `case_id`, `task_id` (SET NULL on delete), `user_id` (SET NULL), `law_firm_id`
- `hours`, `description`, `work_date`
- `hourly_rate`, `total_amount` (= horas × tarifa, o redistribuido si flat)
- `is_billable`, `is_approved`, `approved_by`, `approved_at`
- `invoice_id` (string libre, sin FK real)
- Conexión con proceso: **indirecta** vía `case_hours → task → process`

### `billing_adjustments` — `billing.py`
Columnas mixtas (issue LANG-002): `case_id`, `law_firm_id` en inglés; `nombre`, `descripcion`, `monto`, `fecha_aplicacion` en español.
Ajustes manuales (positivos o negativos) al total de facturación de un caso.

### `invoice_metrics` — `task.py` (línea ~221)
Métricas agregadas por caso. **No se actualiza automáticamente** — sin triggers activos.

### `users` — `user.py`
- `first_name`, `last_name`, `email`, `phone`
- `password_hash`, `google_id`, `google_email`
- `role`: `"admin_firma"` (acceso total) | `"abogado_junior"` (usuario regular)
- `is_verified`, `mfa_enabled`, `mfa_secret`
- `email_verification_token`, `email_verification_expires`
- `password_reset_token`, `password_reset_expires`

### `clients` — `client.py`
- `name`, `client_type` (`individual`|`business`|`government`|`non_profit`|`other`)
- `email`, `phone`, `tax_id` (RUC), `organization_name`
- `street_address`, `city`, `state`, `postal_code`, `country`
- `primary_contact_name`, `primary_contact_email`, `primary_contact_phone`
- `industry`, `website`, `notes`, `tags` (JSON)
- `usuario_sol`, `clave_sol` — campos legacy SUNAT SOL (aún en BD, pero reemplazados funcionalmente por `client_credentials`)
- `portal_password_hash`, `portal_password_plain`, `portal_access_enabled` — acceso al portal cliente
- `is_active`, `is_preferred`
- Login del portal: por `tax_id` (RUC) + contraseña

### `client_credentials` — `client_credential.py` ← **NUEVO (migración 020)**
Múltiples credenciales institucionales por cliente (SUNAT SOL, SUNARP, SBS, etc.).
- `client_id` FK → clients (CASCADE)
- `law_firm_id` FK → law_firms (CASCADE)
- `titulo` — nombre de la institución (obligatorio, ej. "SUNAT SOL")
- `usuario` — nullable
- `clave` — nullable, texto plano (consistente con patrón del proyecto)
- Los datos de `usuario_sol`/`clave_sol` existentes fueron migrados a esta tabla con `titulo='SUNAT SOL'` (migración 021).

### `case_alerts` — `alert.py`
- `alert_type`: `deadline_approaching`|`document_due`|`hearing_scheduled`|`payment_due`|`task_overdue`|`team_member_change`|`status_change`|`custom`
- `severity`: `info`|`warning`|`critical`
- `is_read`, `is_acknowledged`, `is_resolved`
- `source`: `"manual"` | `"auto"` (generado por el script `check_deadlines`)
- `task_id` — link opcional a tarea relacionada

### `notification_rules` — `notification_rule.py`
- `case_id`, `days_before` — N días antes del vencimiento de las tareas del caso
- `notify_assignee`, `notify_supervisors`, `is_active`
- El script `check_deadlines.py` las evalúa cada día a las 8am Lima (1pm UTC)

### `client_alert_rules` — `client_alert.py`
- `client_id`, `titulo`, `descripcion`, `fecha`
- `es_anual` (se repite cada año), `dias_anticipacion`
- `destinatarios` (JSON array de user_ids)
- El script `check_client_alerts.py` las evalúa diariamente junto a `check_deadlines`

### `case_updates` — `timeline.py`
- `title`, `content`, `update_type`
- `is_internal`, `is_client_visible`
- Al crear: genera alerta in-app + envía email a todos los miembros del equipo del caso

### `case_events` — `timeline.py`
- `event_type`, `title`, `description`, `event_date`
- `is_reminder_set`, `reminder_days_before`, `is_completed`

### Otros modelos
| Modelo | Tabla | Propósito |
|--------|-------|-----------|
| `LawFirm` | `law_firms` | Root del multi-tenancy |
| `ProcessType` | `process_types` | Catálogo de tipos de proceso por firma |
| `Document` | `documents` | Archivos adjuntos (metadata, SHA256) |
| `LegalRegistry` | `legal_registries` | Registros legales y cumplimiento |
| `ExternalReviewer` | `external_reviewers` | Acceso externo read-only a casos |
| `CaseTeam` / `CaseTeamHistory` | `case_teams` / `case_team_history` | Equipo del caso con historial |
| `EmailLog` | `email_logs` | Log de todos los emails enviados |
| `ErrorLog` | `error_logs` | Errores 500 con traceback completo |
| `AuditLog` | `audit_logs` | Log de auditoría completo |

---

## Lógica de billing (backend/app/routers/hours.py)

### Dos modos de facturación por caso:
1. **`por_horas`**: `total_amount = hours × hourly_rate` para cada registro
2. **`flat`**: `precio_facturacion` del caso se redistribuye proporcionalmente entre TODOS los registros de horas (por peso de horas)

### Dos modos a nivel de proceso:
1. **`por_horas`**: igual que arriba
2. **`plana`**: `process.tarifa` se redistribuye entre las horas de las tareas de ese proceso

### Recálculo automático:
- Se dispara en create / update / delete de cualquier `CaseHours`
- `_recalculate_flat_billing_for_case(db, case_id)` — para casos flat
- `_recalculate_flat_billing_for_task(db, task_id)` — para procesos con tarifa plana

### Export Excel:
- Jerarquía cliente → caso → horas con celdas TC por mes (tipo de cambio) como inputs editables
- Fórmulas vivas en columnas de conversión de moneda
- `GET /api/v1/billing/export-excel`

---

## Crons diarios (backend/app/scripts/)

| Script | Cron | Propósito |
|--------|------|-----------|
| `check_deadlines.py` | `0 13 * * *` (8am Lima) | Lee `notification_rules`, crea `case_alerts` y envía emails cuando una tarea vence en N días |
| `check_client_alerts.py` | `0 13 * * *` (8am Lima) | Evalúa `client_alert_rules`, envía emails a `destinatarios` cuando se acerca la fecha |

Ejecutar manualmente: `docker exec erp-legal-backend python -m app.scripts.check_deadlines`

---

## Routers y endpoints (backend/app/routers/)

### Prefijos registrados en main.py

| Router | Prefix en main.py | Endpoints clave |
|--------|-------------------|-----------------|
| `auth.py` | `/api/v1/auth` | POST login, logout, refresh · POST register · GET me · GET verify-email · POST forgot/reset-password |
| `law_firms.py` | `/api/v1/law-firms` | CRUD del estudio |
| `users.py` | `/api/v1/users` | GET list · POST create · GET me · PATCH change-password · GET/PATCH/DELETE {id} |
| `cases.py` | `/api/v1/cases` | GET/POST list+create · GET/PATCH/DELETE {id} · sub-cases · team · hours |
| `processes.py` | `/api/v1` | GET/POST/PATCH/DELETE `/cases/{id}/processes[/{pid}]` |
| `tasks.py` | `/api/v1` | GET `/tasks` · GET `/tasks/my-tasks` · GET/POST `/cases/{id}/tasks` · GET/PATCH/DELETE `/tasks/{tid}` |
| `hours.py` | `/api/v1` | POST recalculate · GET/POST case hours · PATCH/DELETE hour entry · GET firm hours · GET my-hours · GET summary |
| `billing.py` | `/api/v1` | GET summary · POST/PATCH/DELETE adjustments · GET pdf (placeholder) · GET export-excel |
| `alerts.py` | `/api/v1` | GET firm alerts · GET/POST/PATCH/DELETE case alerts · GET summary |
| `timeline.py` | `/api/v1` | GET combined · GET/POST/PATCH/DELETE events · GET/POST/PATCH/DELETE updates |
| `clients.py` | `/api/v1/clients` | CRUD clientes · GET stats · GET cases · POST/DELETE portal-password · GET/POST/PATCH/DELETE credentials |
| `client_alerts.py` | `/api/v1` | GET/POST/PATCH/DELETE `/clients/{id}/alert-rules[/{rid}]` |
| `client_portal.py` | `/api/v1/client` | POST login · GET profile · GET cases · GET case detail · GET case timeline |
| `notification_rules.py` | `/api/v1` | GET/POST/PATCH/DELETE `/cases/{id}/notification-rules[/{rid}]` |
| `process_types.py` | `/api/v1/process-types` | CRUD tipos de proceso |
| `documents.py` | `/api/v1/documents` | GET list · POST presigned-upload · GET detail · GET presigned-download · DELETE |
| `emails.py` | `/api/v1` | GET `/logs` · POST `/send` |
| `error_logs.py` | `/api/v1` | GET/PATCH/DELETE `/admin/errors[/{id}]` (solo admin) |
| `dashboard.py` | `/api/v1/admin` | GET metrics · GET audit logs |
| `ai_chat.py` | `/api/v1` | POST `/cases/{id}/ai/chat` |

### Respuesta estándar
Todos los endpoints devuelven `{"success": true, "data": ...}` vía `success_response()` o `paginated_response()` de `utils/responses.py`.

---

## Servicios (backend/app/services/)

### `email_service.py`
Brevo API (no SMTP). Funciones principales:
- `send_task_assignment_email` — nueva asignación de tarea
- `send_task_status_update_email` — cambio de estado/prioridad
- `send_case_update_notification` — nueva actualización de caso (va a todo el equipo)
- `send_deadline_alert` — alerta de vencimiento (llamado por check_deadlines)
- `notify_client_alert` — recordatorio de client_alert_rules (llamado por check_client_alerts)
- `send_verification_email` — verificación de email al registrarse
- `send_password_reset_email` — reset de contraseña
- `send_manual_email` — envío manual desde la UI

### `alert_service.py`
- `check_upcoming_deadlines(db, today)` — lógica de evaluación de plazos (llamada por check_deadlines.py)
- `send_alert_reminder(db, alert_id)` — envía recordatorio para una alerta específica

### `case_service.py`
- `check_case_team_access(db, case_id, user)` — verifica que el usuario sea miembro del equipo del caso

### `audit_service.py`
- `audit_log(db, action, entity, entity_id, user_id, details)` — registra en `audit_logs`

### `document_service.py`
- Manejo de archivos: presigned URLs para S3 (o almacenamiento local en dev)

---

## Patrones del backend

### Input en routers
Tres patrones coexisten (inconsistencia conocida — CONV-002):
1. Pydantic schema — usado en `auth.py`
2. `request: Request` + `await request.json()` — la mayoría de routers
3. `body: dict = Body(...)` — algunos routers

Los schemas en `schemas/` están **parcialmente desactualizados** respecto a la lógica real.

### Soft-delete
Todos los modelos: `is_deleted=True` en borrado. `deleted_at` / `deleted_by` son opcionales — varios routers los omiten.

### Multi-tenancy
`law_firm_id` en todas las tablas. RLS activo en staging filtra automáticamente por `current_setting('app.current_law_firm_id')`.

### Roles de usuario
```python
ADMIN_ROLES = ["admin_firma"]
USER_ROLES = ["abogado_junior", "admin_firma"]
```
`ADMIN_ROLES` está definido en 3 archivos frontend (duplicado — HARD-002).

### `datetime.utcnow()`
Usado en la mayoría de routers. Deprecado en Python 3.12. Issue CONV-008 abierto.

---

## Patrones del frontend

### Formularios
Mezcla de `react-hook-form + Zod` (CaseForm, TaskForm) y `useState` manual (la mayoría). Ver CONV-005.

### Confirmaciones de eliminación
Usar `components/common/ConfirmDialog.tsx`, no `window.confirm()`. Algunos archivos aún usan `window.confirm` — ver CONV-006.

### Exportación de módulos
Todos usan `export const` (exportación nombrada), excepto `EmailsPage` (default export) — CONV-007.

### Símbolo de moneda
Patrón correcto: `moneda === 'USD' ? '$' : 'S/'`
Bug conocido: en `HoursPage` ambas ramas retornan `'$'` — BUG-001.

### Axios
- `lib/axios.ts` — instancia principal. `baseURL: VITE_API_URL || "http://localhost:8000/api/v1"`. Interceptor JWT (adjunta Bearer token, redirige a `/login` en 401).
- `lib/portalApi.ts` — instancia separada para el portal cliente, sin interceptor de redirección igual.

---

## Frontend — páginas y componentes

### Rutas del ERP (`/`)
| Ruta | Página | Descripción |
|------|--------|-------------|
| `/dashboard` | `DashboardPage` | KPIs, actividad reciente |
| `/cases` | `CasesListPage` | Lista de casos con filtros |
| `/cases/new` | `NewCasePage` | Formulario nuevo caso |
| `/cases/:id` | `CaseDetailPage` | Tabs: Procesos, Timeline, Docs, Tareas, Alertas, IA |
| `/tasks` | `TasksPage` | Vista global de tareas |
| `/hours` | `HoursPage` | Panel de facturación: KPIs, gráficos, horas por caso |
| `/alerts` | `AlertsPage` | Alertas globales |
| `/clients` | `ClientsListPage` | Lista de clientes con búsqueda |
| `/clients/:id` | `ClientDetailPage` | Detalle cliente + credenciales + alertas + portal |
| `/users` | `UsersPage` | Gestión de usuarios (solo admin) |
| `/emails` | `EmailsPage` | Log de emails enviados |
| `/settings` | `SettingsPage` | Mi empresa · Perfil · Seguridad |
| `/admin/errors` | `ErrorLogsPage` | Log de errores 500 (solo admin) |

### Portal cliente (`/portal/`) — auth separada por RUC
| Ruta | Página |
|------|--------|
| `/portal/login` | Login por RUC + contraseña |
| `/portal/inicio` | Home del portal |
| `/portal/procesos` | Lista de procesos/casos del cliente |
| `/portal/procesos/:id` | Detalle del proceso |
| `/portal/perfil` | Perfil del cliente |

### Componentes clave
| Componente | Propósito |
|-----------|-----------|
| `cases/CaseProcessSection.tsx` | Card de proceso: tareas expandibles, totales, billing |
| `cases/CaseTimeline.tsx` | Timeline de actualizaciones y eventos |
| `cases/CaseUpdates.tsx` | Formulario de nueva actualización |
| `cases/AIChatTab.tsx` | Chat IA contextual por caso |
| `billing/BillingAdjustments.tsx` | CRUD de ajustes de facturación |
| `billing/ExportBillingModal.tsx` | Modal configuración + descarga Excel |
| `hours/HoursForm.tsx` | Registro de horas (maneja flat y por_horas) |
| `hours/HoursTable.tsx` | Tabla colapsable agrupada por tarea |
| `notifications/NotificationRules.tsx` | Reglas de alerta por caso |
| `portal/PortalLayout.tsx` | Layout del portal cliente |
| `common/ConfirmDialog.tsx` | Dialog de confirmación — usar SIEMPRE en vez de window.confirm |

### Stores Zustand
| Store | Contenido |
|-------|-----------|
| `authStore.ts` | Usuario autenticado, token JWT, permisos |
| `caseStore.ts` | Casos cargados, caso activo |
| `clientPortalStore.ts` | Sesión del portal cliente |
| `uiStore.ts` | Estado global UI: modales, toasts |

---

## Migraciones Alembic

**Última migración**: `021_migrate_sol_credentials`

**Convención de naming**: los `revision` IDs usan el nombre completo del archivo, no solo el número. Ejemplo: `revision = '021_migrate_sol_credentials'`, `down_revision = '020_client_credentials'`.

```
001 — normalize_case_statuses
002 — process_billing_fields
003 — case_billing_fields
004 — simplify_users
005 — fix_cascade_user_hours
006 — add_billing_adjustments
007 — billing_adjustments_case_level
008 — email_logs
009 — notification_rules
010 — fix_audit_cols
011 — alert_task_link
012 — adjustment_fecha_aplicacion
013 — client_sol_credentials
014 — client_alert_rules
015 — client_email_nullable
016 — user_email_verification_tokens
017 — add_error_logs
018 — client_portal_credentials
019 — client_portal_password_plain
020 — client_credentials          ← nueva tabla multi-credencial
021 — migrate_sol_credentials     ← data migration: usuario_sol/clave_sol → client_credentials
```

**Nueva migración**:
```bash
alembic revision --autogenerate -m "descripcion"
# Editar el archivo generado para asegurar que revision y down_revision usen nombre completo
alembic upgrade head
```

**En BD nueva (sin volumen)**: `database/schema.sql` + `alembic stamp head`.

---

## Deploy en staging

### Comando seguro (NO borra BD)
```bash
git pull origin main && \
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d --force-recreate backend frontend --build && \
docker compose exec backend alembic upgrade head
```

### NUNCA usar
```bash
docker compose down -v        # Borra postgres_data → PIERDE TODA LA BD
docker volume rm ...
docker system prune --volumes
```

### Limitación RAM del droplet (1GB)
`vite build` necesita ~1.5GB. Verificar swap antes de deployar frontend:
```bash
free -h   # Swap debe mostrar > 0 (configurado: 2GB en /swapfile)
```

### Deploy largo vía tmux (recomendado)
```bash
tmux new-session -d -s deploy 'cd /opt/erp-legal && git pull origin main && \
  docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d --force-recreate backend frontend --build \
  2>&1 | tee /tmp/deploy.log && \
  docker compose exec backend alembic upgrade head >> /tmp/deploy.log 2>&1 && \
  echo "=== DEPLOY COMPLETO ===" >> /tmp/deploy.log' && tmux attach -t deploy
```

Si se corta SSH: `tmux attach -t deploy` o `tail /tmp/deploy.log`.

### Configuración del servidor
- Docker frontend → `127.0.0.1:8080` (solo interno)
- Docker backend → `0.0.0.0:8000`
- Nginx host → 80/443, proxy a `127.0.0.1:8080`
- SSL: `/etc/letsencrypt/live/erp.katarzyna.pe/`
- Env: `/opt/erp-legal/.env.staging` (NO en git)

### Variables críticas en .env.staging
```
DATABASE_URL=postgresql+asyncpg://postgres:ErpLegal2024!@postgres:5432/erp_legal
DATABASE_URL_SYNC=postgresql://postgres:ErpLegal2024!@postgres:5432/erp_legal
SECRET_KEY=<ver archivo en servidor>
CORS_ORIGINS=["http://137.184.54.245","https://erp.katarzyna.pe"]
BREVO_API_KEY=<clave Brevo>
ANTHROPIC_API_KEY=<clave Anthropic>
FRONTEND_URL=https://erp.katarzyna.pe
```

---

## Issues conocidos (resumen)

Ver `INTEGRITY_TRACKER.md` para el detalle completo con todos los issues abiertos.

| ID | Severidad | Descripción |
|----|-----------|-------------|
| BUG-001 | 🔴 Crítico | Símbolo `$` incorrecto para PEN en HoursPage (ambas ramas del ternario retornan `$`) |
| BUG-004 | 🟠 Alto | `print(DEBUG...)` en `hours.py:289` expone datos en logs de producción |
| CONV-001 | 🟡 Medio | Enums `CaseStatus`/`TaskStatus` con valores distintos a los reales en BD (código muerto) |
| LANG-001 | 🟡 Medio | `case_processes` tiene columnas en español (único modelo así) |
| HARD-002 | 🟡 Medio | `ADMIN_ROLES` duplicado en 3 archivos frontend |
| CONV-008 | 🟡 Medio | `datetime.utcnow()` deprecated en Python 3.12, usado en muchos routers |

---

## Estado de funcionalidades

### En producción
- Gestión completa de casos (CRUD, sub-casos, equipo, documentos)
- Procesos y tareas por caso con historial
- Registro de horas con lógica flat/por_horas en dos niveles (caso y proceso)
- Facturación: ajustes manuales, export Excel con fórmulas vivas y TC por mes
- Sistema de alertas: manuales + automáticas por cron diario
- Actualizaciones de caso (timeline) con notificaciones email al equipo
- Portal cliente: login por RUC, vista de procesos y timeline
- Credenciales institucionales múltiples por cliente (SUNAT SOL, SUNARP, etc.)
- Chat IA por caso (Anthropic API)
- Email transaccional via Brevo
- Log de errores 500 con traceback, log de auditoría, log de emails

### Pendiente / incompleto
- `invoice_metrics` no se actualiza automáticamente (sin triggers)
- PDF de factura por proceso (endpoint GET /billing/{id}/pdf retorna placeholder)
- Schemas Pydantic desactualizados respecto a la lógica real de los routers
- 37+ issues de consistencia en INTEGRITY_TRACKER.md
