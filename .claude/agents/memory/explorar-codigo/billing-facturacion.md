---
name: billing-facturacion
description: Estado completo del sistema de facturación, horas y tarifas — modelos, endpoints, schemas, frontend
---

## Modelos backend

### Case (backend/app/models/case.py)
Campos de billing en la tabla `cases`:
- `tipo_facturacion` VARCHAR(20): 'flat' | 'por_horas' | NULL
- `moneda_facturacion` VARCHAR(3): 'PEN' | 'USD', default 'PEN'
- `precio_facturacion` NUMERIC(12,2): fee plano o tarifa por hora
- Relaciones: `case_hours`, `invoice_metrics`

### CaseProcess (backend/app/models/process.py)
Tabla `case_processes`. Campos de billing:
- `tipo_tarifa` VARCHAR(20): 'plana' | 'por_horas' | NULL
- `tarifa` NUMERIC(12,2)
- `moneda` VARCHAR(3): 'PEN' | 'USD', default 'PEN'
- `estado`: 'pendiente' | 'en_progreso' | 'completado' | 'cancelado'
- `orden` INT (auto-incremental por caso)
- Relaciones: `case` (CASCADE), `tasks` (CASCADE)

### Task (backend/app/models/task.py)
Tabla `tasks`. Campos de billing:
- `hourly_rate` NUMERIC(8,2)
- `is_billable` BOOLEAN default true
- `actual_hours` NUMERIC(8,2) default 0
- `process_id` UUID FK -> case_processes(id) ON DELETE RESTRICT (nullable)

### CaseHours (backend/app/models/task.py, línea 150)
Tabla `case_hours`. Registro de tiempo trabajado:
- `case_id` FK -> cases
- `task_id` FK -> tasks (nullable)
- `user_id` FK -> users (nullable)
- `hours` NUMERIC(8,2)
- `hourly_rate` NUMERIC(8,2)
- `total_amount` NUMERIC(12,2) — recalculado automáticamente para casos flat
- `is_billable` BOOLEAN
- `invoice_id` VARCHAR(100) — referencia externa, no hay tabla Invoice propia
- `is_approved` / `approved_by` / `approved_at`
- `work_date` TIMESTAMP

### InvoiceMetrics (backend/app/models/task.py, línea 221)
Tabla `invoice_metrics`. Métricas agregadas por caso:
- `total_billable_hours`, `total_billed_amount`, `total_paid_amount`, `outstanding_amount`
- `last_invoice_date`, `next_invoice_date`, `invoice_count`
- Solo métricas; NO hay tabla de facturas reales

## Lógica de billing (backend/app/routers/hours.py)

### Flat billing a nivel caso
Función `_recalculate_flat_billing_for_case`: si `case.tipo_facturacion == 'flat'`,
redistribuye `precio_facturacion` proporcionalmente entre todos los `CaseHours` del caso.
Se llama en CREATE, UPDATE y DELETE de horas.

### Flat billing a nivel proceso
Función `_recalculate_flat_billing_for_task`: si `process.tipo_tarifa == 'plana'`,
redistribuye `process.tarifa` entre todas las horas de tareas del proceso.

## Endpoints

### Hours router (backend/app/routers/hours.py)
- GET  `/cases/{case_id}/hours` — lista horas del caso (paginado, filtros: user_id, start_date, end_date)
- POST `/cases/{case_id}/hours` — registra horas (acepta campos ES o EN)
- POST `/cases/{case_id}/hours/recalculate` — recalcula flat billing manual
- PATCH `/hours/{entry_id}` — edita entrada de horas
- DELETE `/hours/{entry_id}` — soft-delete + recalcula flat
- GET `/hours/firm-hours` — todas las horas del bufete (filtros: case_id, user_id, fechas)
- GET `/hours/my-hours` — horas del usuario actual
- GET `/cases/{case_id}/hours/summary` — resumen agrupado por user o day

### Processes router (backend/app/routers/processes.py)
- GET    `/cases/{case_id}/processes` — lista procesos del caso (con totalHoras, totalMonto)
- POST   `/cases/{case_id}/processes` — crea proceso (con tipoTarifa, tarifa, moneda)
- PATCH  `/processes/{process_id}` — edita proceso
- DELETE `/processes/{process_id}` — soft-delete proceso + tareas + horas

### Cases router (billing fields en backend/app/routers/cases.py líneas 87-89, 205-207, 314-318)
- Response incluye: tipoFacturacion, monedaFacturacion, precioFacturacion
- Create/Update aceptan esos mismos campos

## Schemas Pydantic

### backend/app/schemas/hours.py
- `HourEntryCreateRequest`: user_id, hours, task_type, description, work_date (NOTA: no incluye tarifa — el router acepta dict libre)
- `HourEntryUpdateRequest`, `HourEntryResponse`, `HourSummaryResponse`
- IMPORTANTE: el router hours.py NO usa estos schemas, acepta `request: dict` directamente

### backend/app/schemas/case.py
- `CaseCreate`: tipoFacturacion, monedaFacturacion, precioFacturacion
- `CaseUpdate`: mismos campos opcionales

## Frontend

### Tipos (frontend/src/types/index.ts)
- `Caso`: tipoFacturacion ('flat'|'por_horas'|null), monedaFacturacion, precioFacturacion, totalFacturado
- `Proceso`: tipoTarifa ('plana'|'por_horas'|null), tarifa, moneda, totalHoras, totalMonto
- `Horas`: horasTrabajas, tipo (consulta|redaccion|...) — tipo está desactualizado, el backend no lo usa

### Componentes clave
- `frontend/src/pages/hours/HoursPage.tsx` — página "Facturación": gráficos, filtros, agrupación por caso/abogado/cliente/tarifa/mes
- `frontend/src/components/hours/HoursForm.tsx` — formulario registrar horas (minutos->horas, tarifa, moneda, usuario admin)
- `frontend/src/components/hours/HoursTable.tsx` — tabla de horas agrupada por tarea, con edición y eliminación
- `frontend/src/components/cases/ProcessForm.tsx` — formulario crear/editar proceso con sección Facturación (tipoTarifa, tarifa, moneda)
- `frontend/src/components/cases/CaseProcessSection.tsx` — card de proceso con summary de horas y monto
- `frontend/src/components/cases/CaseForm.tsx` — formulario caso con sección Facturación (tipoFacturacion, monedaFacturacion, precioFacturacion)

## NO existe tabla Invoice real
Solo existe `invoice_metrics` como tabla de métricas agregadas. El campo `invoice_id` en `case_hours` es un string externo sin FK.
