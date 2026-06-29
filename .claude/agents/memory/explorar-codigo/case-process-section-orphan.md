---
name: case-process-section-orphan
description: CaseProcessSection no se importa en ninguna página — es el root cause de que el tab Facturación no aparezca
---

## Hallazgo crítico

`frontend/src/components/cases/CaseProcessSection.tsx` define el componente con el tab bar "Tareas / Facturación",
pero NO está importado en ningún archivo del proyecto.

Búsqueda exhaustiva:
- `grep CaseProcessSection frontend/src/**` → solo devuelve el propio archivo de definición.
- `CaseDetailPage.tsx` NO importa CaseProcessSection (líneas 1-33: solo importa CaseTimeline, CaseTeamList, etc.).
- No hay página separada de procesos (`frontend/src/pages/` no tiene carpeta processes/).

## Lo que debería ocurrir

`CaseDetailPage` debería tener un tab "Procesos" que renderice `CaseProcessSection` por cada proceso del caso.
Ese tab no existe en el archivo actual (las TabsTrigger existentes son: info, timeline, tareas, documentos, equipo, horas, actualizaciones, alertas).

## Props que espera CaseProcessSection (líneas 40-49)

```ts
interface Props {
  proceso: Proceso        // objeto Proceso completo
  tareas: Tarea[]         // tareas del proceso
  onProcesoUpdated: (p: Proceso) => void
  onProcesoDeleted: (id: string) => void
  onTareaCreada: (t: Tarea) => void   // nombre real: onTareaCreated
  onTareaClick: (t: Tarea) => void
  caseId: string
  defaultOpen?: boolean
}
```

## Lógica de visibilidad del tab bar (líneas 176-201)

El tab bar (con Tareas y Facturación) está dentro de `{open && (...)}` (línea 176).
Cuando el proceso está colapsado (`open=false`) el tab bar no aparece — esto es intencional.
`defaultOpen` viene en `true` por defecto, así que no es el problema.

## BillingAdjustments (líneas 119-125)

Si el endpoint `/processes/{processId}/billing` devuelve error, el componente muestra un mensaje de error en rojo
en lugar del contenido — pero esto solo pasaría SI el componente se llegase a montar.
No hay imports rotos en BillingAdjustments.
