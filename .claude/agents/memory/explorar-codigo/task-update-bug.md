---
name: task-update-bug
description: Bug crítico en update_task — falta db.commit() al final del endpoint PATCH /tasks/{task_id}
---

## Bug: PATCH /tasks/{task_id} no persiste cambios

**Archivo**: `backend/app/routers/tasks.py`, función `update_task` (línea 422)

### Root cause
El endpoint modifica los atributos del modelo Task en memoria (líneas 443-514) pero **nunca llama a `await db.commit()`** ni `await db.flush()`. La función termina sin retornar nada (línea 516 vacía), lo que hace que FastAPI devuelva una respuesta `null` con HTTP 200, y los cambios se descartan al cerrar la sesión.

Comparar con `delete_task` (línea 554) que sí llama `await db.commit()`.

### Síntomas observables
- PATCH devuelve HTTP 200 pero `res.data.data` es `undefined`/`null`
- En `TaskDetailModal.handleSave` (línea 66): `onSave(res.data.data)` pasa undefined
- Los cambios desaparecen al recargar

### Fix necesario (al final de update_task, antes del @router.delete)
```python
    await db.commit()

    # Reload with relations
    result = await db.execute(
        select(Task)
        .where(Task.id == task_uuid)
        .options(selectinload(Task.assignee), selectinload(Task.case), selectinload(Task.process))
    )
    task = result.scalars().first()

    return success_response(data=_format_task(task), meta={})
```

### Inconsistencias adicionales frontend vs backend

1. **Tipo `Tarea.estado`** en `frontend/src/types/index.ts` línea 123: valores `'pendiente' | 'en_progreso' | 'completado' | 'rechazado'`
   - El backend almacena y filtra por `'todo'`, `'done'`, `'completado'` (inconsistente)
   - `create_task` inicializa con `status="todo"` (línea 319) pero el frontend envía `"pendiente"`

2. **`TaskForm` con Zod**: `asignadoAId` y `fechaVencimiento` son **requeridos** (`nonempty`), pero `TaskDetailModal` los envía opcionales/null — si se usa `TaskForm` para editar, puede fallar la validación aunque el backend los aceptaría.

3. **`fechaVencimiento` al borrar**: el endpoint ignora el campo cuando su valor es `null` o `""` (línea 486 tiene guard `and request["fechaVencimiento"]`), así que no es posible limpiar una fecha desde el modal.
