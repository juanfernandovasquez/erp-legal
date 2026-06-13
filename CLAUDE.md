# ERP Legal — Documentación del Proyecto

## Descripción
Sistema ERP para estudios de abogados. Gestiona casos, procesos, clientes, tareas, horas y facturación.

## Stack
- **Backend**: FastAPI + SQLAlchemy async + PostgreSQL (asyncpg) + Alembic
- **Frontend**: React + TypeScript + Vite + TailwindCSS + react-hook-form + Zod
- **Infra staging**: DigitalOcean Droplet 1GB RAM, Docker Compose, Nginx host + SSL Let's Encrypt
- **Dominio staging**: https://erp.katarzyna.pe (IP: 137.184.54.245)

## Estructura del repositorio
```
erp-legal/
├── backend/
│   ├── app/
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── routers/        # FastAPI endpoints
│   │   ├── schemas/        # Pydantic schemas (parcialmente desactualizados)
│   │   ├── config.py       # Settings (lee de env vars)
│   │   └── main.py
│   └── alembic/versions/   # Migraciones de BD
├── frontend/
│   ├── src/
│   │   ├── pages/          # Páginas principales
│   │   ├── components/     # Componentes reutilizables
│   │   └── lib/            # axios.ts, utils.ts
│   ├── Dockerfile.staging  # Multi-stage: Node builder → Nginx static
│   └── nginx.staging.conf  # Nginx dentro de Docker (proxy /api/ → backend)
├── database/
│   ├── schema.sql          # Schema completo (fuente de verdad para BD nueva)
│   ├── indexes.sql         # Índices de performance
│   ├── rls_policies.sql    # Row Level Security
│   └── seeds.sql           # Datos de prueba
├── docker-compose.yml          # Base (desarrollo local)
├── docker-compose.staging.yml  # Override para staging
└── .githooks/pre-push          # Hook que protege la BD de staging

```

## Arquitectura de datos clave

### Jerarquía principal
```
LawFirm → Users
LawFirm → Cases → CaseProcesses → Tasks → CaseHours
LawFirm → Clients → CaseClients → Cases
```

### Modelos y tablas importantes

#### `cases` (backend/app/models/case.py)
- `tipo_facturacion`: `'flat'` | `'por_horas'` | NULL
- `moneda_facturacion`: `'PEN'` | `'USD'`
- `precio_facturacion`: fee plano o tarifa base del caso
- Relaciones: `case_hours`, `invoice_metrics`, `processes`

#### `case_processes` (backend/app/models/process.py)
- `tipo_tarifa`: `'plana'` | `'por_horas'` | NULL
- `tarifa`: monto flat o tarifa por hora del proceso
- `moneda`: `'PEN'` | `'USD'`
- Relaciones: `tasks` (CASCADE delete)
- El `totalHoras` y `totalMonto` se calculan en el router via JOIN con case_hours

#### `tasks` (backend/app/models/task.py)
- `process_id`: FK -> case_processes (nullable para tareas legacy)
- `hourly_rate`: tarifa específica de la tarea
- `is_billable`, `estimated_hours`, `actual_hours`

#### `case_hours` (backend/app/models/task.py línea 150)
- `hours`, `hourly_rate`, `total_amount` (= hours × hourly_rate)
- `task_id` FK -> tasks (SET NULL)
- `is_billable`, `is_approved`, `invoice_id` (string libre, sin FK real)
- La conexión con procesos es INDIRECTA: case_hours → task → process

#### `invoice_metrics` (backend/app/models/task.py línea 221)
- Métricas agregadas por caso, NO es una factura real
- No se actualiza automáticamente (sin triggers ni hooks activos)

### Lógica de billing (backend/app/routers/hours.py)
- **Flat billing por caso**: si `case.tipo_facturacion == 'flat'`, redistribuye `precio_facturacion` proporcionalmente entre todos los registros de horas del caso
- **Flat billing por proceso**: si `process.tipo_tarifa == 'plana'`, redistribuye `process.tarifa` entre las horas de las tareas del proceso
- El recálculo se dispara automáticamente en create/update/delete de horas

### Patrones del backend
- Los routers aceptan `request: dict` (no Pydantic schemas) en varios endpoints — los schemas en `schemas/` están desactualizados respecto a la lógica real
- Soft-delete en cascada: borrar proceso → soft-delete tareas → soft-delete horas
- Todos los modelos tienen `is_deleted`, `created_at`, `updated_at`
- Row Level Security activo en staging/producción

## Deploy en staging

### Comando de deploy seguro (NO borra BD)
```bash
git pull origin main && \
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d --force-recreate backend frontend --build && \
docker compose exec backend alembic upgrade head
```

### NUNCA usar
```bash
docker compose down -v  # Borra el volumen postgres_data → PIERDE TODA LA BD
```

### Configuración del servidor
- Docker frontend → `127.0.0.1:8080` (solo interno)
- Docker backend → `0.0.0.0:8000`
- Nginx host → puerto 80/443, proxy a `127.0.0.1:8080`
- SSL: `/etc/letsencrypt/live/erp.katarzyna.pe/`
- Env file: `/opt/erp-legal/.env.staging` (NO en git)
- Contraseña postgres: `ErpLegal2024!`

### Variables críticas en .env.staging
```
DATABASE_URL=postgresql+asyncpg://postgres:ErpLegal2024!@postgres:5432/erp_legal
DATABASE_URL_SYNC=postgresql://postgres:ErpLegal2024!@postgres:5432/erp_legal
SECRET_KEY=c41cdfc2d9b719e5c03c82912e24990adbaf510103acb1c892906387daec5c12
CORS_ORIGINS=["http://137.184.54.245","https://erp.katarzyna.pe"]
```

## Frontend — páginas y componentes clave

### Páginas
- `pages/hours/HoursPage.tsx` — Panel "Facturación" global con KPIs, gráficos y tabla de horas por caso
- `pages/cases/` — Gestión de casos

### Componentes de billing
- `components/hours/HoursForm.tsx` — Formulario de registro de horas (maneja flat y por_horas)
- `components/hours/HoursTable.tsx` — Tabla colapsable de horas agrupada por tarea
- `components/cases/CaseProcessSection.tsx` — Card de proceso con totales y tareas
- `components/cases/ProcessForm.tsx` — Crear/editar proceso (incluye campos de tarifa)
- `components/cases/CaseForm.tsx` — Crear/editar caso (incluye tipo facturación)

### Librerías frontend
- `lib/axios.ts` — instancia axios con base URL `/api/v1`
- Zod + react-hook-form para formularios
- TailwindCSS para estilos

## Migraciones Alembic
- Última migración: `005_fix_cascade_user_hours`
- Para agregar schema nuevo: `alembic revision --autogenerate -m "descripcion"` en local, luego `alembic upgrade head` en staging
- En BD nueva (sin volumen): se usa `schema.sql` directo + `alembic stamp head`

## Pendiente / En desarrollo
- **Ajustes de facturación por proceso**: tabla `billing_adjustments` pendiente de crear
- **PDF de factura por proceso**: endpoint pendiente
- `invoice_metrics` no se actualiza automáticamente (pendiente conectar)
- Schemas Pydantic desactualizados respecto a la lógica real de los routers
