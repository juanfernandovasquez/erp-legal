---
name: billing-adjustments
description: Feature de ajustes de facturación implementada en 006
---

## Feature: Ajustes de Facturación (implementada 2026-06-13)

### Archivos creados/modificados
- `database/schema.sql` — tabla `billing_adjustments` añadida antes de `invoice_metrics`
- `backend/alembic/versions/006_add_billing_adjustments.py` — migración completa con todos los campos BaseModel
- `backend/app/models/billing.py` — modelo `BillingAdjustment` (hereda BaseModel, NO redeclara created_by)
- `backend/app/models/__init__.py` — exporta `BillingAdjustment`
- `backend/app/routers/billing.py` — 5 endpoints bajo `/api/v1/processes/{process_id}/billing/...`
- `backend/app/main.py` — registra `billing_router` con prefix `/api/v1`
- `backend/requirements.txt` — añadido `reportlab`
- `frontend/src/components/billing/BillingAdjustments.tsx` — componente React nuevo
- `frontend/src/components/cases/CaseProcessSection.tsx` — añadido tab Tareas/Facturación

### Última migración Alembic
**006_add_billing_adjustments** (down_revision = 005_fix_cascade_user_hours)

### Decisiones técnicas

**BaseModel ya tiene created_by**: AuditMixin (parte de BaseModel) declara `created_by` con FK a users SET NULL. El modelo `BillingAdjustment` NO redeclara ese campo — se hereda automáticamente. La migración SÍ incluye explícitamente todos los campos de BaseModel porque op.create_table no hereda.

**Subtotal horas para tipo_tarifa='plana'**: Se retorna `process.tarifa` directamente (no suma horas). Para `por_horas` o NULL se hace JOIN tasks → case_hours con SUM(total_amount).

**PDF usa reportlab SimpleDocTemplate con A4**: Import dentro del endpoint para no cargar en startup si no se usa.

**Frontend PDF**: `window.open(apiBaseURL + '/processes/{id}/billing/pdf', '_blank')` — el browser maneja descarga.

**Tab state en CaseProcessSection**: `activeTab: 'tareas' | 'facturacion'` con default `'tareas'`. El `editingProcess` y `deleteError` son visibles en ambas tabs.

**Por qué:** La tabla billing_adjustments no está en el schema original del proyecto, se añade como extensión limpia con soft-delete consistente con el resto del proyecto.
