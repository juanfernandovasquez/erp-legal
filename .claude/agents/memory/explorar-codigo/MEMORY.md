# Memoria — explorar-codigo

Índice de memoria del agente de exploración de código. Cada entrada apunta a un fichero de detalle.

<!-- Formato: - [Título](fichero.md) — descripción en una línea -->

- [Billing y Facturación](billing-facturacion.md) — modelos CaseHours/InvoiceMetrics/CaseProcess, endpoints hours+processes, tipos frontend, lógica flat billing
- [CaseProcessSection huérfano](case-process-section-orphan.md) — CaseProcessSection (con tab Facturación) no está importado en ninguna página; ese es el root cause del bug
- [Bug edición de tareas](task-update-bug.md) — update_task en tasks.py no tiene db.commit() ni return; los cambios se descartan silenciosamente
