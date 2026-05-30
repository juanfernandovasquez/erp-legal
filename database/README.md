# Legal ERP Database Schema Documentation

## Overview

The Legal ERP database is a comprehensive PostgreSQL schema designed for managing law firm operations. It contains 27 tables organized into 8 logical domains, with complete support for multi-tenancy via Row-Level Security (RLS), soft deletes, and comprehensive audit trails.

**Database Version**: PostgreSQL 14+

## Architecture Principles

### 1. Multi-Tenancy via Row-Level Security (RLS)

Every law firm's data is completely isolated at the database level:
- All tenant-aware tables include `law_firm_id` foreign key
- RLS policies ensure users only see their firm's data
- Set `app.current_law_firm_id` context variable on connection

### 2. Soft Deletes

All tables (except `audit_logs`) include soft delete fields:
- `is_deleted BOOLEAN DEFAULT false` - Mark as deleted without removing
- `deleted_at TIMESTAMP` - When deletion occurred
- `deleted_by UUID REFERENCES users(id)` - Who deleted it

All queries should filter: `WHERE is_deleted = false`

### 3. Complete Audit Trail

Every table tracks:
- `created_at`, `updated_at` - Timestamps
- `created_by`, `updated_by` - User references
- `id` - UUID primary key

### 4. Immutable Events

`case_events` table is append-only for compliance with legal requirements.

## Domain Structure

### Domain 1: Client & User Management (5 tables)

#### law_firms
Parent table for multi-tenancy. Each row represents a legal firm.

**Key Fields:**
- `id UUID` - Primary key
- `nombre VARCHAR(255)` - Firm name
- `ruc VARCHAR(11) UNIQUE` - Peru tax ID
- `plan` - Subscription tier (basico, profesional, enterprise, trial)
- `max_usuarios INT` - User limit for tier
- `max_casos_activos INT` - Active case limit
- `fecha_inicio_contrato`, `fecha_fin_contrato` - Contract dates
- `estado` - Firm status (activo, suspendido, cancelado, trial)

**RLS:** Self-filtering (only own firm)

#### users
Lawyers and staff members within a firm.

**Key Fields:**
- `id UUID` - Primary key
- `law_firm_id UUID` - Firm reference (MANDATORY for RLS)
- `email VARCHAR(255) UNIQUE` - Login credential
- `password_hash VARCHAR(255)` - Bcrypt hash (12 rounds)
- `tipo_usuario` - Role (super_admin, admin_firma, abogado_senior, abogado_junior, administrativo, revisor_externo)
- `especialidades TEXT[]` - Array of specializations
- `estado` - Account status (activo, inactivo, suspendido, bloqueado)
- `intentos_fallidos INT` - Failed login counter
- `bloqueado_hasta TIMESTAMP` - Account lockout timer
- `ultimo_login TIMESTAMP` - Last login date

**RLS:** Filtered by law_firm_id

#### case_team
Junction table linking users to cases (N:N relationship).

**Key Fields:**
- `case_id UUID` - Case reference
- `user_id UUID` - User reference
- `rol_en_caso VARCHAR(50)` - Role on case (miembro, lider, revisor, etc.)
- `fecha_asignacion TIMESTAMP` - When assigned
- `asignado_por UUID` - Who assigned them

**Unique Constraint:** `UNIQUE(case_id, user_id)` where `is_deleted=false`

**RLS:** Via case_id to cases table

#### case_team_history
Immutable audit trail of team changes.

**Key Fields:**
- `case_id UUID` - Case reference
- `user_id UUID` - User reference
- `accion` - Action (asignado, removido)
- `motivo TEXT` - Reason for change
- `ejecutado_por UUID` - Who performed the action
- `fecha_accion TIMESTAMP` - Action timestamp

**Note:** No soft delete on this table; completely immutable.

#### external_reviewers
Read-only access for external counsel/reviewers.

**Key Fields:**
- `user_id UUID` - External user reference
- `case_id UUID` - Case they can review
- `fecha_inicio`, `fecha_fin` - Access period
- `motivo TEXT` - Why they have access
- `estado` - Status (activo, expirado, revocado)

### Domain 2: Cases & Structure (3 tables)

#### cases
Central table for legal cases with parent-child hierarchy (max 2 levels).

**Key Fields:**
- `id UUID` - Primary key
- `law_firm_id UUID` - Firm that owns the case
- `parent_case_id UUID` - Parent case (NULL for parent cases)
- `caso_numero VARCHAR(50)` - Case number (unique per firm)
- `titulo VARCHAR(255)` - Case title
- `tipo_caso VARCHAR(100)` - Case type (Incumplimiento, Demanda, etc.)
- `instancia VARCHAR(100)` - Court level (Primera Instancia, Apelación, etc.)
- `estado` - Status (abierto, en_progreso, en_apelacion, suspendido, cerrado, archivado)
- `prioridad` - Priority (baja, media, alta, urgente)
- `fecha_inicio`, `fecha_vencimiento`, `fecha_cierre` - Key dates
- `monto_controversia DECIMAL(15,2)` - Amount in controversy
- `moneda VARCHAR(3)` - Currency (PEN, USD, etc.)
- `resultado` - Case outcome (favorable, desfavorable, parcial, desistimiento, conciliacion)
- `visible_cliente BOOLEAN` - Whether client can see in portal

**Constraints:**
- `UNIQUE(law_firm_id, caso_numero)` - Case number unique per firm
- `CHECK` - parent_case_id cannot reference a sub-case (max 2 levels)

**RLS:** Filtered by law_firm_id

#### case_hierarchy
Explicit parent-child relationships.

**Key Fields:**
- `parent_case_id UUID` - Parent case
- `child_case_id UUID UNIQUE` - Child case (one parent per child)
- `orden INT` - Sort order

#### case_clients
Links clients to cases (N:N relationship).

**Key Fields:**
- `case_id UUID` - Case reference
- `client_id UUID` - Client reference
- `rol VARCHAR(50)` - Role on case (principal, demandante, demandado, etc.)

**Unique Constraint:** `UNIQUE(case_id, client_id)` where `is_deleted=false`

### Domain 3: Documents (2 tables)

#### documents
File storage metadata (always linked to parent case).

**Key Fields:**
- `case_id UUID` - Parent case (MANDATORY)
- `nombre_original VARCHAR(255)` - Original filename
- `nombre_sistema VARCHAR(255)` - System filename (hash-based)
- `tipo_documento` - Document type (demanda, contestacion, sentencia, etc.)
- `mime_type VARCHAR(100)` - MIME type
- `tamano_bytes BIGINT` - File size
- `storage_path VARCHAR(500)` - S3 or local path
- `hash_sha256 VARCHAR(64)` - SHA256 checksum for deduplication
- `es_confidencial BOOLEAN` - Confidential flag
- `visible_cliente BOOLEAN` - Visible to client in portal
- `metadata JSONB` - Flexible metadata

**RLS:** Via case_id to cases table

#### document_metadata
Extended metadata (1:1 with document).

**Key Fields:**
- `document_id UUID UNIQUE` - Document reference
- `numero_paginas INT` - Page count
- `idioma VARCHAR(10)` - Language (es, en, etc.)
- `ocr_aplicado BOOLEAN` - Whether OCR was run
- `texto_extraido TEXT` - Full text from OCR
- `fecha_documento DATE` - Document date
- `metadata_extra JSONB` - Additional metadata

### Domain 4: Timeline & Tracking (3 tables + 1 view)

#### case_events
Formal milestones (immutable, append-only).

**Key Fields:**
- `case_id UUID` - Case reference
- `tipo_evento` - Event type (demanda_presentada, contestacion, audiencia, sentencia, etc.)
- `titulo VARCHAR(255)` - Event title
- `descripcion TEXT` - Full description
- `fecha_evento TIMESTAMP` - When the event occurred
- `fecha_registro TIMESTAMP DEFAULT NOW()` - When logged in system
- `prioridad` - Priority
- `documento_adjunto_id UUID` - Related document
- `visible_cliente BOOLEAN` - Visible to client
- `autor_id UUID` - Who logged the event

**Note:** Append-only; no updates allowed. Immutable for legal compliance.

#### case_updates
Comments and updates (editable with versioning).

**Key Fields:**
- `case_id UUID` - Case reference
- `autor_id UUID` - Author
- `contenido TEXT` - Update text
- `tipo_actualizacion` - Type (comentario, nota_interna, actualizacion_estado, resumen)
- `version INT DEFAULT 1` - Version number
- `contenido_anterior TEXT` - Previous version
- `visible_cliente BOOLEAN` - Visible to client
- `menciones UUID[]` - Array of mentioned users
- `estado_resultante VARCHAR(50)` - Resulting case state

#### case_timeline_view
SQL View combining events and updates chronologically.

**Query:**
```sql
SELECT * FROM case_timeline_view
WHERE case_id = 'xxxx-xxxx-xxxx-xxxx'
ORDER BY fecha DESC
```

Returns union of case_events and case_updates sorted by date.

### Domain 5: Tasks, Hours & Organization (4 tables)

#### tasks
Pending actions per case.

**Key Fields:**
- `case_id UUID` - Case reference
- `titulo VARCHAR(255)` - Task title
- `descripcion TEXT` - Task details
- `asignado_a UUID` - Assigned user
- `fecha_vencimiento DATE` - Due date
- `estado` - Status (pendiente, en_progreso, completada, cancelada)
- `prioridad` - Priority
- `resultado TEXT` - Completion result
- `fecha_completada TIMESTAMP` - When completed
- `completada_por UUID` - Who completed it

#### case_hours
Granular time tracking (billable hours).

**Key Fields:**
- `case_id UUID` - Main case
- `sub_caso_id UUID` - Sub-case (optional)
- `user_id UUID` - User who did the work
- `fecha_trabajo DATE` - Work date
- `horas DECIMAL(5,2)` - Hours worked (CHECK: > 0 AND <= 24)
- `tipo_tarea` - Task type (investigacion, redaccion, revision, audiencia, consulta, gestion, otro)
- `descripcion TEXT` - Work description
- `es_facturable BOOLEAN DEFAULT true` - Billable flag
- `tarifa_hora DECIMAL(10,2)` - Hourly rate
- `aprobado_por UUID` - Approver
- `fecha_aprobacion TIMESTAMP` - Approval date

**Index:** `(user_id, fecha_trabajo)` on billable hours for invoicing

#### invoice_metrics
Billing calculations derived from case_hours.

**Key Fields:**
- `case_id UUID` - Case reference
- `client_id UUID` - Client reference
- `periodo_inicio`, `periodo_fin` - Billing period
- `total_horas DECIMAL(8,2)` - Total hours
- `total_horas_facturables DECIMAL(8,2)` - Billable hours
- `monto_total DECIMAL(15,2)` - Total amount
- `moneda VARCHAR(3)` - Currency
- `estado` - Status (borrador, emitido, pagado, anulado)

#### task_schedule
Weekly recurring task organization.

**Key Fields:**
- `law_firm_id UUID` - Firm reference
- `dia_semana` - Day (lunes-domingo)
- `tipo_tarea` - Task type (revision_diaria, filtros_web, escuelita, etc.)
- `titulo VARCHAR(255)` - Task title
- `responsables UUID[]` - Array of responsible users
- `prioridad` - Priority
- `duracion_estimada_horas DECIMAL(4,2)` - Estimated duration
- `hora_inicio_sugerida TIME` - Suggested start time
- `es_recurrente BOOLEAN DEFAULT true` - Recurring flag

### Domain 6: Processes, Alerts & Registries (4 tables)

#### process_types
Catalog of legal process types per firm.

**Key Fields:**
- `law_firm_id UUID` - Firm reference
- `nombre VARCHAR(255)` - Process name
- `descripcion TEXT` - Description
- `instancia VARCHAR(100)` - Court level
- `plazo_tipico_dias INT` - Typical timeline
- `regulacion_aplicable VARCHAR(255)` - Applicable regulation
- `pasos_tipicos JSONB` - Typical steps
- `documentos_requeridos TEXT[]` - Required documents
- `tasa_exito_historica DECIMAL(5,2)` - Historical success rate
- `casos_usando_tipo INT` - Case count using this type

#### case_alerts
Alerts and deadlines with automatic daily checks.

**Key Fields:**
- `case_id UUID` - Case reference
- `tipo_alerta` - Alert type (vencimiento_plazo, fecha_audiencia, entrega_documento, etc.)
- `titulo VARCHAR(255)` - Alert title
- `fecha_alerta TIMESTAMP` - When to alert
- `fecha_vencimiento TIMESTAMP` - Deadline
- `responsable_id UUID` - Responsible user
- `estado` - Status (pendiente, en_progreso, completada, vencida, escalada)
- `notificado BOOLEAN DEFAULT false` - Notified flag
- `fecha_notificacion TIMESTAMP` - When notified
- `canal_notificacion` - Channel (email, whatsapp, ambos, push)
- `dias_recordatorio INT[] DEFAULT '{30,7,3,1}'` - Reminder days
- `escalado_a UUID` - Escalated to (optional)
- `fecha_escalamiento TIMESTAMP` - When escalated

**Daily CRON:** System should check this table daily and notify via configured channels

**Index:** `(responsable_id, estado)` for user dashboards

#### legal_registries
Property/trademark registries and registrations.

**Key Fields:**
- `law_firm_id UUID` - Firm reference
- `client_id UUID` - Client reference
- `tipo_registro` - Type (propiedad_inmueble, personas_juridicas, vehicular, marca, otro)
- `partida_registral VARCHAR(50)` - Registry number
- `descripcion TEXT` - Description
- `localidad VARCHAR(100)` - Location
- `entidad_responsable VARCHAR(100)` - Responsible entity
- `vigencia_desde`, `vigencia_hasta` - Validity period
- `estado` - Status (vigente, vencido, modificado, archivado)
- `ultima_revision DATE` - Last review date
- `proxima_revision DATE` - Next review date
- `documentos_relacionados UUID[]` - Related documents

#### external_credentials
Encrypted credentials for external platforms.

**Key Fields:**
- `law_firm_id UUID` - Firm reference
- `plataforma VARCHAR(100)` - Platform name
- `username_encrypted BYTEA` - Encrypted username
- `password_encrypted BYTEA` - Encrypted password
- `url_acceso VARCHAR(500)` - Access URL
- `estado` - Status (activo, inactivo, expirado)
- `responsable_id UUID` - Responsible user
- `ultima_rotacion TIMESTAMP` - Last rotation date
- `proxima_rotacion DATE` - Next rotation date

**Security:** Passwords encrypted at rest; decrypt in application layer only

### Domain 7: IA & Analysis (4 tables - Phase 2)

#### ia_analysis_results
Results of AI analysis on cases/documents.

**Key Fields:**
- `case_id UUID` - Case reference (optional, global analyses)
- `tipo_analisis` - Analysis type (extraccion_hechos, prediccion_resultado, etc.)
- `modelo_usado VARCHAR(50)` - Model (gpt-4-turbo, claude-3, etc.)
- `prompt_version VARCHAR(20)` - Prompt version
- `resultado JSONB` - Full result
- `resultado_anonimizado JSONB` - Anonymized result
- `confianza_score DECIMAL(5,2)` - Confidence (0-100)
- `claims_validados INT` - Validated claims
- `claims_no_validados INT` - Unvalidated claims
- `alucinaciones_detectadas INT` - Hallucinations detected
- `bias_flags JSONB` - Detected biases
- `tokens_input INT` - Input tokens
- `tokens_output INT` - Output tokens
- `costo_estimado DECIMAL(8,4)` - Estimated cost
- `latencia_ms INT` - Response time
- `estado` - Status (procesando, completado, fallido, validado, rechazado)
- `validado_por UUID` - Validated by (user)
- `fecha_validacion TIMESTAMP` - Validation date
- `notas_validacion TEXT` - Validation notes

#### ia_audit_log
Complete AI activity log for compliance.

**Key Fields:**
- `case_id UUID` - Case reference
- `analysis_id UUID` - Analysis reference
- `modelo VARCHAR(50)` - Model used
- `accion VARCHAR(100)` - Action
- `datos_enviados_hash VARCHAR(64)` - Hash of input (privacy)
- `tokens_consumidos INT` - Tokens used
- `costo DECIMAL(8,4)` - Cost
- `exitoso BOOLEAN DEFAULT true` - Success flag
- `error_detalle TEXT` - Error details
- `timestamp TIMESTAMP DEFAULT NOW()` - Timestamp

#### ia_feedback
Lawyer feedback on AI analysis.

**Key Fields:**
- `analysis_id UUID` - Analysis reference
- `user_id UUID` - User providing feedback
- `validacion` - Feedback (validado, rechazado, parcial)
- `comentarios TEXT` - Comments
- `elementos_corregidos JSONB` - Corrections made
- `fecha_validacion TIMESTAMP` - Feedback timestamp

#### anonimizacion_rules
Rules for document anonymization.

**Key Fields:**
- `law_firm_id UUID` - Firm-specific rules (optional)
- `patron TEXT` - Regex pattern
- `tipo_dato` - Data type (nombre, cedula, direccion, telefono, fecha_nacimiento, cuenta_bancaria, monto, email)
- `reemplazo VARCHAR(100)` - Replacement text (e.g., "[NOMBRE]")
- `es_automatico BOOLEAN DEFAULT true` - Auto-apply flag
- `aprobado_por UUID` - Approved by

### Domain 8: Audit & Security (2 tables)

#### audit_logs
Complete system action log (7-year retention required in Peru).

**Key Fields:**
- `id UUID` - Primary key
- `user_id UUID` - User who performed action
- `law_firm_id UUID` - Firm (for cross-cutting actions)
- `accion VARCHAR(100)` - Action (CREATE, UPDATE, DELETE, LOGIN, etc.)
- `recurso_tipo VARCHAR(50)` - Resource type (cases, documents, users, etc.)
- `recurso_id UUID` - Resource ID
- `datos_antes JSONB` - Previous values (UPDATE/DELETE)
- `datos_despues JSONB` - New values (CREATE/UPDATE)
- `ip_address INET` - Source IP
- `user_agent TEXT` - Browser/client info
- `timestamp TIMESTAMP DEFAULT NOW()` - Timestamp
- `duracion_ms INT` - Operation duration
- `exitoso BOOLEAN DEFAULT true` - Success flag
- `error_mensaje TEXT` - Error if failed

**Important:** NO soft delete on this table; completely immutable
**Retention:** Must be kept for 7 years per Peruvian law

**RLS:** Filtered by law_firm_id

#### clients
Clients of the law firms (can have portal access).

**Key Fields:**
- `law_firm_id UUID` - Firm reference
- `nombre VARCHAR(255)` - Client name
- `tipo_documento` - ID type (dni, ruc, ce, pasaporte)
- `numero_documento VARCHAR(20)` - ID number
- `email VARCHAR(255)` - Email
- `telefono VARCHAR(20)` - Phone
- `direccion TEXT` - Address
- `tipo_cliente` - Type (persona_natural, persona_juridica)
- `representante_legal VARCHAR(255)` - Legal representative
- `estado` - Status (activo, inactivo)
- `portal_password_hash VARCHAR(255)` - Portal login hash
- `portal_ultimo_login TIMESTAMP` - Last portal access

**Unique Constraint:** `UNIQUE(law_firm_id, tipo_documento, numero_documento)`

## Standard Fields (All Tables)

Every table includes these audit fields (except audit_logs):

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at TIMESTAMP NOT NULL DEFAULT NOW()
updated_at TIMESTAMP NOT NULL DEFAULT NOW()
created_by UUID REFERENCES users(id)
updated_by UUID REFERENCES users(id)
is_deleted BOOLEAN NOT NULL DEFAULT false
deleted_at TIMESTAMP
deleted_by UUID REFERENCES users(id)
```

## Row-Level Security Setup

All tenant-aware tables have RLS policies:

```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY table_name_rls ON table_name
    USING (law_firm_id = current_setting('app.current_law_firm_id')::UUID)
    WITH CHECK (law_firm_id = current_setting('app.current_law_firm_id')::UUID);
```

**Setting Context in Code:**
```python
# FastAPI/SQLAlchemy
await session.execute(text(f"SET app.current_law_firm_id = '{law_firm_id}'"))
```

## Indexes

Strategic indexes created for performance:

**Primary Lookup Indexes:**
- `idx_users_law_firm_id` - User lookups by firm
- `idx_cases_law_firm_id` - Case lookups by firm
- `idx_cases_numero_unique` - Case number uniqueness
- `idx_cases_estado` - Case status filtering
- `idx_documents_case_id` - Document lookups

**Time-Based Indexes:**
- `idx_cases_fecha_vencimiento` - Deadline queries
- `idx_case_alerts_fecha_vencimiento` - Alert due dates
- `idx_case_hours_fecha_trabajo` - Hour entry queries
- `idx_audit_logs_timestamp` - Audit trail queries

**Composite Indexes:**
- `idx_cases_firm_status(law_firm_id, estado)` - Common case queries
- `idx_case_hours_user_period(user_id, fecha_trabajo)` - Invoice generation

**Full-Text Search Indexes:**
- `idx_documents_metadata_ft` - Document search
- `idx_case_updates_ft` - Update search
- `idx_cases_ft` - Case search

## Initialization

Execute in this order:

1. `schema.sql` - Creates all tables and enums
2. `rls_policies.sql` - Enables RLS and creates policies
3. `indexes.sql` - Creates all performance indexes
4. `seeds.sql` - Loads sample data

Or simply:
```bash
psql erp_legal < database/init.sql
```

## Backup & Recovery

7-year retention for legal compliance:

```bash
# Full backup
pg_dump erp_legal > backup_$(date +%Y%m%d).sql

# Restore
psql erp_legal < backup_20240101.sql

# Backup audit_logs only (must be kept)
pg_dump -t audit_logs erp_legal > audit_logs_backup.sql
```

## Performance Tuning

Key vacuum and analyze settings:

```sql
-- For busy databases
ALTER TABLE cases SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE case_hours SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE audit_logs SET (autovacuum_vacuum_scale_factor = 0.001);

-- Check index bloat
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## Common Queries

### Get all cases for a firm (respecting RLS)
```sql
SET app.current_law_firm_id = '11111111-1111-1111-1111-111111111111';
SELECT * FROM cases WHERE estado = 'abierto' ORDER BY prioridad DESC;
```

### Get user's workload (hours) for billing
```sql
SELECT user_id, fecha_trabajo, SUM(horas) as total_horas
FROM case_hours
WHERE user_id = $1 AND es_facturable = true
  AND fecha_trabajo BETWEEN $2 AND $3
GROUP BY user_id, fecha_trabajo;
```

### Get alerts due in next 7 days
```sql
SELECT * FROM case_alerts
WHERE estado != 'completada'
  AND fecha_vencimiento BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY fecha_vencimiento ASC;
```

### Get complete case timeline
```sql
SELECT * FROM case_timeline_view
WHERE case_id = $1
ORDER BY fecha DESC;
```

## Migration Strategy

For schema changes use Alembic:

```bash
# Create migration
alembic revision --autogenerate -m "Add new field to cases"

# Apply
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Data Privacy

- Encrypt sensitive credentials in `external_credentials` at rest
- Anonymize PII in IA results via `anonimizacion_rules`
- Enable client portal access via `case_clients` and `clients.portal_password_hash`
- Audit all access via `audit_logs`

## Disaster Recovery

1. **Point-in-time recovery**: Keep WAL archives for 7 years
2. **Read replicas**: Set up for backup and reporting
3. **Test restores**: Quarterly restore tests
4. **Encrypted backups**: Use pgBackRest with encryption
5. **Off-site storage**: Store backups in S3/cloud storage

---

For more information, see the main project README.md or contact the development team.
