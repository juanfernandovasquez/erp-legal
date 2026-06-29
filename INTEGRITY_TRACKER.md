# ERP Legal — Tracker de Integridad de Código

Archivo de seguimiento de inconsistencias detectadas en el análisis de junio 2026.
**No modificar manualmente el estado de los issues — actualizarlo junto al commit que lo resuelve.**

---

## Forma de trabajo

### Ciclo de revisión
1. **Antes de empezar una sesión de trabajo**: revisar este archivo, elegir un issue por severidad.
2. **Al resolver un issue**: actualizar `Estado` a `✅ Resuelto` y anotar el commit hash.
3. **Revisión periódica (cada 2–4 semanas)**: correr el checklist de abajo y agregar nuevos issues que aparezcan.
4. **Antes de cada deploy a staging**: verificar que no haya issues en estado `🔴 Bloqueante` abiertos.

### Checklist de revisión de código nuevo
Antes de hacer commit de cualquier cambio nuevo, verificar:
- [ ] ¿Los mensajes de error nuevos están en español? (idioma elegido para este proyecto)
- [ ] ¿Las variables y funciones nuevas siguen el patrón del archivo donde se agregan?
- [ ] ¿Los valores de moneda, roles y estados usan las constantes compartidas (cuando existan)?
- [ ] ¿Los formularios nuevos usan `react-hook-form` + Zod?
- [ ] ¿Los diálogos de confirmación usan `ConfirmDialog` y no `window.confirm()`?
- [ ] ¿El soft-delete establece `is_deleted`, `deleted_at` y `deleted_by`?
- [ ] ¿No hay `print()` ni `console.log()` de debug que queden en el código?
- [ ] ¿Los nuevos endpoints usan Pydantic schemas y no `request: dict`?

### Prioridad de resolución recomendada
```
🔴 Bloqueante → 🟠 Bug → 🟡 Alto → 🟢 Medio → ⚪ Bajo
```
Dentro de cada nivel, priorizar los que tienen **Viabilidad: Fácil** primero (mayor retorno por esfuerzo).

### Agentes disponibles para gestionar issues

| Acción | Agente | Cómo invocar |
|--------|--------|-------------|
| Detectar problemas UX/UI | `revisar-ux` | `/revisar-ux` — navega la app y escribe entradas UX-XXX |
| Arreglar un issue | `arreglar-issue` | `/arreglar-issue BUG-001` o `/arreglar-issue UX-003 LANG-008` |
| Ver qué tests correr | `seleccionar-tests` | `/seleccionar-tests` — analiza git diff, devuelve comando exacto |
| **Ejecutar tests y obtener veredicto** | `ejecutar-tests` | `/ejecutar-tests` — corre los tests, PASS o FALLO sin excusas |
| Actualizar tests (solo si el comportamiento mejoró) | `actualizar-tests` | `/actualizar-tests` — evalúa críticamente si los tests deben cambiar |

### Flujo de calidad

```
cambio de código
      │
      ▼
/seleccionar-tests          → qué tests son relevantes
      │
      ▼
/ejecutar-tests             → PASS ✅ o FALLO ❌  (veredicto sin interpretación)
      │
   ┌──┴──┐
FALLO    PASS
  │        │
  ▼        ▼
/arreglar-issue    commit / deploy
      │
      ▼
/ejecutar-tests    (volver a correr hasta PASS)
```

`/actualizar-tests` se invoca **solo** cuando un PASS legítimo hace que un test previo quede obsoleto (ej. se corrigió BUG-003 y el test que documentaba el bug debe actualizarse para verificar el comportamiento correcto). Nunca para "arreglar" tests que fallan.

### Convenciones decididas para el proyecto
A medida que se resuelvan issues de idioma/convención, registrar aquí la decisión tomada:

| Área | Convención elegida | Fecha |
|------|--------------------|-------|
| Idioma de mensajes de error (API) | Español | 2026-06-28 |
| Idioma de columnas de BD | Inglés | 2026-06-28 |
| Idioma de variables/funciones en frontend | Inglés | 2026-06-28 |
| Idioma de texto visible al usuario | Español | 2026-06-28 |
| Tipo de facturación "flat" | "Tarifa plana" | pendiente confirmar |
| Símbolo sol peruano | `S/` (sin punto) | pendiente confirmar |

---

## Índice de issues

| ID | Categoría | Descripción breve | Severidad | Viabilidad | Impacto | Estado |
|----|-----------|-------------------|-----------|------------|---------|--------|
| — | **UX/UI** | *Issues detectados por /revisar-ux — se agregan automáticamente* | — | — | — | — |
| [BUG-001](#bug-001) | Bug frontend | Símbolo `$` para moneda PEN en HoursPage | 🔴 Bloqueante | Fácil | Alto | 🔲 Abierto |
| [BUG-002](#bug-002) | Bug frontend | Tab "Alertas" sin contenido — siempre vacío | 🟠 Bug | Fácil | Alto | 🔲 Abierto |
| [BUG-003](#bug-003) | Bug backend | `billing.py` muestra `"USD"` como símbolo en lugar de `"$"` | 🟠 Bug | Fácil | Medio | 🔲 Abierto |
| [BUG-004](#bug-004) | Bug backend | `print(DEBUG...)` en producción en `hours.py` | 🟠 Bug | Fácil | Alto | 🔲 Abierto |
| [BUG-005](#bug-005) | Bug backend | `dashboard.py` — mismatch `entity_type` vs `resource_type` | 🟠 Bug | Media | Alto | 🔲 Abierto |
| [BUG-006](#bug-006) | Bug backend | `tasks.py` — import duplicado de `CaseClient` | 🟠 Bug | Fácil | Bajo | 🔲 Abierto |
| [LANG-001](#lang-001) | Idioma BD | `case_processes` — columnas en español (único modelo así) | 🟡 Alto | Difícil | Alto | 🔲 Abierto |
| [LANG-002](#lang-002) | Idioma BD | `billing_adjustments` — columnas en español | 🟡 Alto | Difícil | Medio | 🔲 Abierto |
| [LANG-003](#lang-003) | Idioma API | Respuestas JSON con claves duplicadas (`rol`+`role`, `nombre`+`name`) | 🟡 Alto | Media | Alto | 🔲 Abierto |
| [LANG-004](#lang-004) | Idioma frontend | Interfaz `UserData` con `rol` y `role` como campos distintos | 🟡 Alto | Fácil | Medio | 🔲 Abierto |
| [LANG-005](#lang-005) | Idioma API | Mensajes de error mezclados (español/inglés) por router | 🟢 Medio | Media | Medio | 🔲 Abierto |
| [LANG-006](#lang-006) | Idioma frontend | Variables de estado mezcladas (`abogadoFilter` vs `statusFilter`) | 🟢 Medio | Media | Bajo | 🔲 Abierto |
| [LANG-007](#lang-007) | Idioma UI | "caso" / "proceso" / "proceso legal" — misma entidad, 3 nombres | 🟢 Medio | Media | Medio | 🔲 Abierto |
| [LANG-008](#lang-008) | Idioma UI | `"Flat"` vs `"Tarifa plana"` vs `"Tarifa flat"` — mismo concepto | 🟢 Medio | Fácil | Medio | 🔲 Abierto |
| [LANG-009](#lang-009) | Idioma UI | `"Crear Nuevo Acto"` en TaskForm — debería ser "Crear Nueva Tarea" | 🟢 Medio | Fácil | Bajo | 🔲 Abierto |
| [LANG-010](#lang-010) | Idioma UI | `S/.` vs `S/` — símbolo de sol inconsistente | ⚪ Bajo | Fácil | Bajo | 🔲 Abierto |
| [LANG-011](#lang-011) | Idioma UI | `"RUC / Tax ID"` — label mixto en ClientsListPage | ⚪ Bajo | Fácil | Bajo | 🔲 Abierto |
| [HARD-001](#hard-001) | Hardcode | `'PEN'` como literal en 8+ archivos frontend | 🟡 Alto | Fácil | Medio | 🔲 Abierto |
| [HARD-002](#hard-002) | Hardcode | `ADMIN_ROLES` duplicado en 3 archivos frontend | 🟡 Alto | Fácil | Medio | 🔲 Abierto |
| [HARD-003](#hard-003) | Hardcode | `ACTIVE_STATUSES`/`CLOSED_STATUSES` duplicados en 3 routers backend | 🟡 Alto | Fácil | Medio | 🔲 Abierto |
| [HARD-004](#hard-004) | Hardcode | URL `localhost:8000` como fallback en `axios.ts` | 🟡 Alto | Fácil | Alto | 🔲 Abierto |
| [HARD-005](#hard-005) | Hardcode | `formatCurrency` en `utils.ts` existe pero nadie la usa | 🟢 Medio | Media | Medio | 🔲 Abierto |
| [HARD-006](#hard-006) | Hardcode | Símbolo moneda calculado inline en 8+ archivos | 🟢 Medio | Media | Medio | 🔲 Abierto |
| [HARD-007](#hard-007) | Hardcode | `config.py` — smtp, S3, Redis, GPT hardcodeados como defaults | 🟢 Medio | Fácil | Medio | 🔲 Abierto |
| [HARD-008](#hard-008) | Hardcode | `main.py:165` — `port=8000` hardcodeado | ⚪ Bajo | Fácil | Bajo | 🔲 Abierto |
| [HARD-009](#hard-009) | Hardcode | `864e5`, `1440` como números mágicos sin nombre | ⚪ Bajo | Fácil | Bajo | 🔲 Abierto |
| [HARD-010](#hard-010) | Hardcode | Monedas válidas `("PEN","USD")` hardcodeadas dos veces en `processes.py` | 🟢 Medio | Fácil | Bajo | 🔲 Abierto |
| [CONV-001](#conv-001) | Convención | Enums `CaseStatus`/`TaskStatus` — código muerto con valores distintos a los reales | 🟡 Alto | Media | Alto | 🔲 Abierto |
| [CONV-002](#conv-002) | Convención | 3 patrones de input en routers: Pydantic / dict / Request.json() | 🟢 Medio | Difícil | Medio | 🔲 Abierto |
| [CONV-003](#conv-003) | Convención | Soft-delete incompleto — falta `deleted_at`/`deleted_by` en la mayoría | 🟢 Medio | Media | Medio | 🔲 Abierto |
| [CONV-004](#conv-004) | Convención | `fetchCasos` vs `fetchCases` — naming sin regla en frontend | 🟢 Medio | Media | Bajo | 🔲 Abierto |
| [CONV-005](#conv-005) | Convención | Solo 2 formularios usan Zod; 10+ usan useState manual | 🟢 Medio | Difícil | Bajo | 🔲 Abierto |
| [CONV-006](#conv-006) | Convención | `window.confirm()` en 3 archivos en lugar de `ConfirmDialog` | 🟢 Medio | Fácil | Medio | 🔲 Abierto |
| [CONV-007](#conv-007) | Convención | `EmailsPage.tsx` usa `export default` — único en el proyecto | ⚪ Bajo | Fácil | Bajo | 🔲 Abierto |
| [CONV-008](#conv-008) | Convención | `datetime.utcnow()` (deprecated) mezclado con `datetime.now(timezone.utc)` | ⚪ Bajo | Fácil | Bajo | 🔲 Abierto |
| [CONV-009](#conv-009) | Convención | `tasks.py` — `logger.warning()` para logs informativos, no advertencias | ⚪ Bajo | Fácil | Bajo | 🔲 Abierto |
| [CONV-010](#conv-010) | Convención | `UsersPage.tsx` — comentario de sección duplicado exactamente | ⚪ Bajo | Fácil | Bajo | 🔲 Abierto |
| [CONV-011](#conv-011) | Convención | `asignadoA` declarado no-nullable en tipos pero usado con `?.` | 🟢 Medio | Fácil | Bajo | 🔲 Abierto |

---

## Detalle de cada issue

---

### BUG-001
**Símbolo `$` para moneda PEN en HoursPage**
- **Archivos**: `frontend/src/pages/hours/HoursPage.tsx:1455` y `:1705`
- **Descripción**: Ternario con ambas ramas iguales: `moneda === 'USD' ? '$' : '$'`. Cualquier caso en soles peruanos muestra `$` en lugar de `S/`.
- **Viabilidad**: Fácil — cambiar dos líneas.
- **Impacto**: Alto — dato incorrecto visible al usuario final en las secciones "Horas por proceso" y "Horas por abogado".
- **Riesgo**: Ninguno — cambio puramente visual.
- **Tests**:
  - [ ] Abrir HoursPage con un caso cuya moneda sea PEN → debe mostrar `S/`.
  - [ ] Abrir HoursPage con un caso cuya moneda sea USD → debe mostrar `$`.
  - [ ] Verificar que el total del monto también usa el símbolo correcto.

---

### BUG-002
**Tab "Alertas" sin contenido — siempre vacío**
- **Archivos**: `frontend/src/pages/cases/CaseDetailPage.tsx:507`
- **Descripción**: Existe `<TabsTrigger value="alertas">` pero ningún `<TabsContent value="alertas">` en el archivo. El tab "Alertas" del detalle de caso muestra un área vacía. La lógica (`useAlerts`, `AlertCard`, `AlertForm`) está importada y el estado definido (líneas 103-112) pero nunca se renderiza.
- **Viabilidad**: Fácil — agregar el `TabsContent` con el contenido ya preparado.
- **Impacto**: Alto — funcionalidad completamente inaccesible para el usuario.
- **Riesgo**: Bajo — solo agregar JSX, sin cambios de backend.
- **Tests**:
  - [ ] Abrir detalle de un caso → hacer clic en tab "Alertas" → debe mostrar la lista de alertas.
  - [ ] Crear una alerta desde ese tab → debe aparecer en la lista.
  - [ ] Marcar alerta como resuelta → debe reflejarse en la UI.

---

### BUG-003
**`billing.py` muestra `"USD"` como símbolo en lugar de `"$"`**
- **Archivos**: `backend/app/routers/billing.py:292`
- **Descripción**: `simbolo = "S/" if moneda == "PEN" else "USD"`. Cuando la moneda es USD, el símbolo debería ser `"$"`, no `"USD"`.
- **Viabilidad**: Fácil — cambiar una línea.
- **Impacto**: Medio — afecta a PDFs o respuestas de API que incluyan el símbolo.
- **Riesgo**: Ninguno.
- **Tests**:
  - [ ] Crear un ajuste de facturación en un caso USD → el símbolo en la respuesta debe ser `$`.
  - [ ] Crear un ajuste en un caso PEN → el símbolo debe ser `S/`.

---

### BUG-004
**`print(DEBUG...)` en producción en `hours.py`**
- **Archivos**: `backend/app/routers/hours.py:289`
- **Descripción**: `print(f"DEBUG register_hours — request body: {dict(request)}", flush=True)`. Expone el contenido completo del request (incluyendo datos de horas y usuarios) en los logs del servidor en producción.
- **Viabilidad**: Fácil — eliminar la línea.
- **Impacto**: Alto — problema de seguridad/privacidad y ruido en logs de producción.
- **Riesgo**: Ninguno.
- **Tests**:
  - [ ] Registrar horas en staging → verificar que los logs del servidor NO muestren el contenido del request.

---

### BUG-005
**`dashboard.py` — mismatch `entity_type` vs `resource_type`**
- **Archivos**: `backend/app/routers/dashboard.py:282` (filtro) y `:330-331` (formato respuesta)
- **Descripción**: El filtro usa `AuditLog.entity_type` pero el formateo de la respuesta usa `log.resource_type`. Si el modelo usa un nombre, el otro fallará silenciosamente (retorna `None`) o lanza excepción. Requiere verificar el campo real en `AuditLog`.
- **Viabilidad**: Media — hay que revisar el modelo `AuditLog`, identificar el nombre correcto y unificar.
- **Impacto**: Alto — posible crash o datos incorrectos en el log de actividad del dashboard.
- **Riesgo**: Bajo — cambio en un solo router.
- **Tests**:
  - [ ] Abrir dashboard → sección de actividad reciente debe mostrar registros, no crash.
  - [ ] Verificar que `entity_type` y `entity_id` tengan valores (no `null`).

---

### BUG-006
**`tasks.py` — import duplicado de `CaseClient`**
- **Archivos**: `backend/app/routers/tasks.py:20-21`
- **Descripción**: `from app.models.case import CaseClient` aparece exactamente dos veces seguidas.
- **Viabilidad**: Fácil — eliminar la línea duplicada.
- **Impacto**: Bajo — Python lo ignora silenciosamente, pero es ruido y puede confundir.
- **Riesgo**: Ninguno.
- **Tests**:
  - [ ] El servidor levanta sin errores de importación.
  - [ ] Los endpoints de tareas responden correctamente.

---

### LANG-001
**`case_processes` — columnas en español (único modelo con este patrón)**
- **Archivos**: `backend/app/models/process.py:35-55`
- **Descripción**: Columnas `titulo`, `descripcion`, `estado`, `orden`, `fecha_inicio`, `fecha_fin`, `tipo_tarifa`, `tarifa`, `moneda`. Todos los demás modelos usan inglés (`title`, `description`, `status`, `order`, `start_date`).
- **Viabilidad**: Difícil — requiere migración de Alembic para renombrar columnas en producción. El router `processes.py` también usa estos nombres directamente.
- **Impacto**: Alto en mantenibilidad — cualquier dev que llegue al proyecto asume inglés y se confunde con este modelo.
- **Riesgo**: Alto — migración de BD en producción. Riesgo de datos si falla. Requiere actualizar el router simultáneamente.
- **Decisión previa a ejecutar**: confirmar nombres finales en inglés (`title`→`title`, `tipo_tarifa`→`rate_type`, `tarifa`→`rate`, `moneda`→`currency`).
- **Tests**:
  - [ ] Migración corre sin error en staging.
  - [ ] Crear proceso → datos se guardan y retornan correctamente.
  - [ ] Editar proceso → cambios persisten.
  - [ ] Eliminar proceso → cascade a tareas funciona.
  - [ ] Horas asociadas al proceso siguen mostrando totales correctos.

---

### LANG-002
**`billing_adjustments` — columnas en español**
- **Archivos**: `backend/app/models/billing.py:34-36`
- **Descripción**: Campos `nombre`, `descripcion`, `monto` en español. El resto del modelo (`case_id`, `law_firm_id`, `is_deleted`) está en inglés.
- **Viabilidad**: Difícil — requiere migración de BD, aunque la tabla es más nueva y probablemente con menos datos que `case_processes`.
- **Impacto**: Medio — mismo problema de consistencia pero en una tabla más pequeña.
- **Riesgo**: Medio — migración en producción, pero tabla más aislada.
- **Tests**:
  - [ ] Crear ajuste de facturación → se guarda con campos correctos.
  - [ ] Listar ajustes → nombres y montos aparecen correctamente.

---

### LANG-003
**Respuestas JSON con claves duplicadas (`rol`+`role`, `nombre`+`name`)**
- **Archivos**: `backend/app/routers/users.py:23-39`, `backend/app/routers/clients.py:25-45`, `backend/app/routers/cases.py:466-473`
- **Descripción**: Las respuestas incluyen simultáneamente la clave en español y en inglés con el mismo valor. Esto sugiere que el frontend consume ambas y no es claro cuál es la "oficial".
- **Viabilidad**: Media — hay que auditar qué clave consume el frontend antes de eliminar cualquiera.
- **Impacto**: Alto — duplicación innecesaria de datos en cada respuesta; al eliminar una clave puede romper partes del frontend.
- **Riesgo**: Medio — requiere cambio coordinado backend + frontend.
- **Pasos sugeridos**: 1) Auditar frontend para saber qué clave usa. 2) Migrar frontend a la clave en inglés. 3) Eliminar la clave en español del backend.
- **Tests**:
  - [ ] Perfil de usuario muestra nombre y rol correctamente.
  - [ ] Lista de clientes muestra nombre correctamente.
  - [ ] Equipo del caso muestra nombre y rol correctamente.

---

### LANG-004
**Interfaz `UserData` con `rol` y `role` como campos distintos del mismo objeto**
- **Archivos**: `frontend/src/pages/users/UsersPage.tsx:19-29`
- **Descripción**: La interfaz declara tanto `rol` como `role`, ambos recibiendo el mismo valor del backend. Cuando se resuelva LANG-003, este tipo quedará desactualizado.
- **Viabilidad**: Fácil — eliminar el campo duplicado de la interfaz.
- **Impacto**: Medio — confusión en tipado, posibles errores TypeScript silenciosos.
- **Dependencia**: Resolver después de LANG-003.
- **Tests**:
  - [ ] El componente de usuarios compila sin errores TypeScript.
  - [ ] Los roles de usuario se muestran correctamente en la lista y el modal de edición.

---

### LANG-005
**Mensajes de error mezclados (español/inglés) por router**
- **Archivos**: Todos los routers en `backend/app/routers/`
- **Descripción**: `hours.py` usa inglés puro, `billing.py` usa español puro, `auth.py`/`users.py`/`tasks.py`/`processes.py` mezclan ambos. La convención elegida para el proyecto es español.
- **Viabilidad**: Media — son muchos archivos pero cambios simples de texto.
- **Impacto**: Medio — el usuario final ve mensajes de error en idiomas distintos según la acción que haga.
- **Riesgo**: Bajo — solo texto, sin cambios de lógica.
- **Tests**:
  - [ ] Provocar errores conocidos (campo requerido vacío, recurso no encontrado, sin permisos) en cada sección y verificar que el mensaje sea en español.

---

### LANG-006
**Variables de estado mezcladas en el mismo componente**
- **Archivos**: `frontend/src/pages/cases/CasesListPage.tsx:34-40`, `frontend/src/pages/hours/HoursPage.tsx:622-645`, `frontend/src/pages/cases/CaseDetailPage.tsx:77-96`
- **Descripción**: En el mismo bloque de `useState`, algunas variables en inglés (`statusFilter`, `loading`) y otras en español (`abogadoFilter`, `vencFilter`, `tareas`).
- **Viabilidad**: Media — son muchos archivos y hay que actualizar referencias.
- **Impacto**: Bajo — no afecta al usuario, solo a la experiencia del desarrollador.
- **Riesgo**: Bajo — cambios internos de naming, sin cambios de API.
- **Tests**:
  - [ ] Compilar TypeScript sin errores.
  - [ ] Verificar que los filtros y estados funcionen igual que antes.

---

### LANG-007
**"caso" / "proceso" / "proceso legal" — misma entidad, 3 nombres en UI**
- **Archivos**: Múltiples — Sidebar, `DashboardPage.tsx`, `CaseDetailPage.tsx`, `CasesListPage.tsx`
- **Descripción**: La misma entidad (el modelo `Case`) se llama "Proceso" en el sidebar, "Procesos Activos" en el dashboard, "Casos" en el detalle. Esto confunde al usuario.
- **Viabilidad**: Media — hay que decidir el término oficial y buscarlo/reemplazarlo en todos los archivos.
- **Impacto**: Medio — confusión real para el usuario al navegar el sistema.
- **Riesgo**: Bajo — solo texto visible.
- **Decisión previa**: confirmar si la entidad se llama "Caso" o "Proceso" en el dominio legal del cliente.
- **Tests**:
  - [ ] Navegar por todas las secciones de la app y verificar que el término sea consistente.

---

### LANG-008
**"Flat" / "Tarifa plana" / "Tarifa flat" — mismo concepto, 3 nombres**
- **Archivos**: `frontend/src/components/cases/ProcessForm.tsx:132`, `frontend/src/components/cases/CaseForm.tsx:168`, `frontend/src/pages/cases/CasesListPage.tsx:211`, `CaseDetailPage.tsx:482`, `HoursPage.tsx`
- **Descripción**: El tipo de facturación fija se llama "Flat" (inglés puro), "Tarifa plana", y "Tarifa flat" en distintos lugares de la UI.
- **Viabilidad**: Fácil — decidir el término y reemplazarlo.
- **Impacto**: Medio — confusión de terminología visible al usuario.
- **Riesgo**: Ninguno — solo texto.
- **Tests**:
  - [ ] En el formulario de caso, el tipo de facturación dice el término elegido.
  - [ ] En el formulario de proceso, el tipo de tarifa dice el mismo término.
  - [ ] En la lista de casos, el badge muestra el mismo término.

---

### LANG-009
**`"Crear Nuevo Acto"` en TaskForm**
- **Archivos**: `frontend/src/components/tasks/TaskForm.tsx:189`
- **Descripción**: El título del formulario dice "Crear Nuevo Acto" cuando el modo es creación. El formulario crea *tareas*, no *actos*.
- **Viabilidad**: Fácil — cambiar el string.
- **Impacto**: Bajo — confusión puntual en un formulario.
- **Tests**:
  - [ ] Abrir formulario de creación de tarea → el título dice "Crear Nueva Tarea".
  - [ ] Abrir formulario de edición → el título dice "Editar Tarea".

---

### LANG-010
**`S/.` vs `S/` — símbolo de sol inconsistente**
- **Archivos**: `frontend/src/components/cases/CaseCard.tsx:44` (usa `S/.`), resto del proyecto usa `S/`
- **Descripción**: La mayoría de componentes usan `S/` pero `CaseCard` usa `S/.` (con punto).
- **Viabilidad**: Fácil — cambiar una línea.
- **Impacto**: Bajo — inconsistencia visual menor.
- **Tests**:
  - [ ] La tarjeta de caso en la lista muestra `S/` sin punto.

---

### LANG-011
**`"RUC / Tax ID"` — label mixto en ClientsListPage**
- **Archivos**: `frontend/src/pages/clients/ClientsListPage.tsx:318`, `ClientDetailPage.tsx:315,391`
- **Descripción**: Label visible al usuario mezcla idiomas. Si el sistema es para Perú, debería ser solo `"RUC"`.
- **Viabilidad**: Fácil — cambiar el texto.
- **Impacto**: Bajo — inconsistencia visual.
- **Tests**:
  - [ ] El campo RUC en clientes muestra el label correcto.

---

### HARD-001
**`'PEN'` como literal en 8+ archivos frontend**
- **Archivos**: `HoursForm.tsx:28`, `HoursTable.tsx:46`, `ProcessForm.tsx:33`, `CaseForm.tsx:59`, `CaseDetailPage.tsx:681,743`, `HoursPage.tsx:664,1844`
- **Descripción**: La moneda por defecto `'PEN'` está repetida como literal en 8+ lugares. Si cambia la lógica de moneda por defecto, hay que editar todos.
- **Viabilidad**: Fácil — crear `frontend/src/lib/constants.ts` con `DEFAULT_CURRENCY = 'PEN'` y reemplazar todos los usos.
- **Impacto**: Medio — mantenibilidad; el valor por sí mismo no da bugs actualmente.
- **Riesgo**: Bajo — refactor interno, sin cambios de API.
- **Tests**:
  - [ ] Compilar sin errores TypeScript.
  - [ ] Formularios de caso, proceso y horas tienen `PEN` como valor inicial.

---

### HARD-002
**`ADMIN_ROLES` duplicado en 3 archivos frontend**
- **Archivos**: `frontend/src/components/hours/HoursForm.tsx:8`, `frontend/src/components/notifications/NotificationRules.tsx:18`, `frontend/src/pages/users/UsersPage.tsx:33`
- **Descripción**: `['admin_firma', 'super_admin']` definido tres veces de forma independiente.
- **Viabilidad**: Fácil — exportar desde `constants.ts` e importar en los tres archivos.
- **Impacto**: Medio — si se agrega un nuevo rol admin, hay que actualizar 3 archivos.
- **Tests**:
  - [ ] Los formularios que muestran opciones solo para admin siguen funcionando correctamente para un usuario admin.
  - [ ] Para un usuario no-admin, las opciones restringidas no aparecen.

---

### HARD-003
**`ACTIVE_STATUSES`/`CLOSED_STATUSES` duplicados en 3 routers backend**
- **Archivos**: `backend/app/routers/dashboard.py:48-49`, `backend/app/routers/clients.py:182`, `backend/app/routers/tasks.py:48`
- **Descripción**: La misma lista de estados activos/cerrados se redefine localmente en cada router.
- **Viabilidad**: Fácil — crear `backend/app/constants.py` y centralizar.
- **Impacto**: Medio — si se agrega un nuevo estado válido, hay que actualizar múltiples archivos.
- **Tests**:
  - [ ] El dashboard muestra conteos de casos activos correctamente.
  - [ ] Los filtros de clientes por estado funcionan.
  - [ ] Los filtros de tareas por estado funcionan.

---

### HARD-004
**URL `localhost:8000` como fallback en `axios.ts`**
- **Archivos**: `frontend/src/lib/axios.ts:4`
- **Descripción**: `baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"`. Si el build de producción se genera sin la variable de entorno definida, todas las llamadas a la API van a `localhost`, causando fallos silenciosos.
- **Viabilidad**: Fácil — lanzar un error en tiempo de build si `VITE_API_URL` no está definida, en lugar de usar un fallback silencioso.
- **Impacto**: Alto — potencial fallo total de la app en producción si la variable falta.
- **Riesgo**: Bajo — cambio en una línea, solo afecta el build.
- **Tests**:
  - [ ] Build de producción sin `VITE_API_URL` debe fallar con mensaje claro, no silenciosamente.
  - [ ] Build con la variable definida funciona normalmente.

---

### HARD-005
**`formatCurrency` en `utils.ts` existe pero nadie la usa**
- **Archivos**: `frontend/src/lib/utils.ts:27`, todos los componentes que calculan moneda inline
- **Descripción**: La función utilitaria existe y hace lo correcto con `Intl.NumberFormat`, pero los componentes duplican la lógica inline. También resuelve HARD-006.
- **Viabilidad**: Media — hay que migrar 8+ archivos a usar la función centralizada.
- **Impacto**: Medio — mantenibilidad; también resuelve el BUG-001 si la función ya maneja el símbolo correcto.
- **Tests**:
  - [ ] Todos los montos en la app se muestran con el formato correcto (símbolo, separadores de miles).
  - [ ] PEN muestra `S/` y USD muestra `$` consistentemente.

---

### HARD-006
**Símbolo moneda calculado inline en 8+ archivos**
- **Archivos**: `HoursPage.tsx`, `HoursTable.tsx`, `CaseDetailPage.tsx`, `BillingAdjustments.tsx` y más
- **Descripción**: El patrón `moneda === 'USD' ? '$' : 'S/'` se repite en al menos 8 archivos distintos. Esto es el origen directo del BUG-001 (donde se copió mal el ternario).
- **Viabilidad**: Media — migrar todos a `formatCurrency` de `utils.ts`.
- **Dependencia**: Resolver junto a HARD-005.
- **Tests**: (mismos que HARD-005)

---

### HARD-007
**`config.py` — smtp, S3, Redis, GPT hardcodeados como defaults**
- **Archivos**: `backend/app/config.py:53,57,66,67,68,87,91`
- **Descripción**: Valores como `"noreply@legainerp.com"`, `"erp-legal-documents"`, `"gpt-4-turbo"` hardcodeados como valores por defecto en la configuración.
- **Viabilidad**: Fácil — estos ya están en `config.py` como campos de Pydantic Settings; solo hay que asegurarse de que el `.env.staging` los defina y eliminar los defaults que no correspondan.
- **Impacto**: Medio — si se cambia de proveedor de email o bucket S3, el servidor puede seguir usando el valor hardcodeado si el env var no está definido.
- **Tests**:
  - [ ] El servidor usa el `smtp_from` del `.env.staging`, no `noreply@legainerp.com`.

---

### HARD-008
**`main.py:165` — `port=8000` hardcodeado**
- **Archivos**: `backend/app/main.py:165`
- **Descripción**: `uvicorn.run(..., port=8000)`. Si se necesita cambiar el puerto, hay que editar el código.
- **Viabilidad**: Fácil — leer de `settings.port` o de variable de entorno `PORT`.
- **Impacto**: Bajo — en staging el puerto está fijado por Docker Compose de todas formas.
- **Tests**:
  - [ ] El servidor levanta en el puerto configurado.

---

### HARD-009
**`864e5`, `1440` como números mágicos**
- **Archivos**: `frontend/src/pages/cases/CasesListPage.tsx:73`, `HoursForm.tsx:216`, `HoursTable.tsx:284`
- **Descripción**: `864e5` = milisegundos en un día; `1440` = minutos en un día. No tienen nombre que explique su significado.
- **Viabilidad**: Fácil — definir constantes con nombre descriptivo.
- **Impacto**: Bajo — solo legibilidad.
- **Tests**:
  - [ ] La detección de casos vencidos sigue funcionando correctamente.
  - [ ] El límite de horas en el formulario sigue siendo 24h.

---

### HARD-010
**Monedas válidas `("PEN","USD")` hardcodeadas dos veces en `processes.py`**
- **Archivos**: `backend/app/routers/processes.py:216,322`
- **Descripción**: La lista de monedas válidas y el valor por defecto `"PEN"` aparecen duplicados en `create_case_process` y `update_case_process`.
- **Viabilidad**: Fácil — extraer a constante local o a `constants.py`.
- **Dependencia**: Resolver junto a HARD-003.
- **Tests**:
  - [ ] Crear proceso con moneda PEN → se guarda correctamente.
  - [ ] Crear proceso con moneda USD → se guarda correctamente.
  - [ ] Crear proceso con moneda inválida → se rechaza con error.

---

### CONV-001
**Enums `CaseStatus`/`TaskStatus` — código muerto con valores distintos a los reales**
- **Archivos**: `backend/app/models/case.py:13-19`, `backend/app/models/task.py:13-21`
- **Descripción**: `CaseStatus` define `"draft"`, `"active"`, etc. pero los routers almacenan `"activo"`, `"inactivo"`. `TaskStatus` define `"todo"`, `"in_progress"` pero los filtros usan `"pendiente"`, `"en_progreso"`, `"done"`, `"completado"` de forma mezclada. Los enums nunca se usan en los routers — son código muerto que da una imagen falsa del esquema.
- **Viabilidad**: Media — hay dos opciones: (a) eliminar los enums y documentar los strings reales, o (b) migrar los valores en BD a los del enum y usar el enum en los routers. La opción (b) requiere migración de BD.
- **Impacto**: Alto — cualquier dev nuevo asume que los estados en BD son los del enum y filtra incorrectamente.
- **Decisión previa**: elegir entre opción (a) o (b) antes de ejecutar.
- **Tests**:
  - [ ] Filtros de casos por estado (activo/inactivo) siguen funcionando.
  - [ ] Filtros de tareas por estado siguen funcionando.
  - [ ] Dashboard muestra conteos correctos.

---

### CONV-002
**3 patrones de input en routers: Pydantic / dict / Request.json()**
- **Archivos**: Ver tabla en la sección de Backend del análisis
- **Descripción**: Coexisten tres formas completamente distintas de recibir datos en los endpoints, sin regla clara sobre cuándo usar cada una.
- **Viabilidad**: Difícil — migrar a Pydantic schemas requiere crear schemas para los routers que no los tienen, y los schemas existentes en `schemas/` están desactualizados.
- **Impacto**: Medio — afecta mantenibilidad y consistencia del código.
- **Riesgo**: Medio — al agregar validación Pydantic pueden aparecer errores 422 en campos que antes se ignoraban silenciosamente.
- **Tests**:
  - [ ] Cada endpoint que se migre: verificar que acepta los mismos campos que antes.
  - [ ] Verificar que campos inválidos retornan error 422 en lugar de ignorarse.

---

### CONV-003
**Soft-delete incompleto — falta `deleted_at`/`deleted_by` en la mayoría de routers**
- **Archivos**: `users.py:280-281`, `notification_rules.py:145`, `clients.py:381-382`, `cases.py:350-351`
- **Descripción**: Solo `billing.py` establece los tres campos del soft-delete (`is_deleted`, `deleted_at`, `deleted_by`). Los demás omiten uno o dos.
- **Viabilidad**: Media — hay que actualizar 4+ routers, pero el cambio es simple en cada uno.
- **Impacto**: Medio — los registros eliminados no tienen auditoría completa de cuándo y quién los eliminó.
- **Tests**:
  - [ ] Eliminar un usuario → verificar en BD que `is_deleted=True`, `deleted_at` tiene timestamp, `deleted_by` tiene el ID del usuario que lo eliminó.
  - [ ] Repetir para cliente, caso y regla de notificación.

---

### CONV-004
**`fetchCasos` vs `fetchCases` — naming sin regla en frontend**
- **Archivos**: `HoursForm.tsx`, `TaskForm.tsx`, `CaseDetailPage.tsx` (español) vs `TasksPage.tsx`, `UsersPage.tsx`, `ClientsListPage.tsx` (inglés)
- **Descripción**: Las funciones de fetch usan español en unos archivos e inglés en otros, sin regla consistente.
- **Viabilidad**: Media — hay que actualizar muchos archivos, pero el cambio es de naming interno.
- **Impacto**: Bajo — solo afecta al desarrollador.
- **Decisión**: La convención elegida es inglés para código. Migrar todos a `fetchCases`, `fetchClients`, etc.
- **Tests**:
  - [ ] Compilar TypeScript sin errores.
  - [ ] Las pantallas cargan sus datos correctamente.

---

### CONV-005
**Solo 2 formularios usan Zod; 10+ usan useState manual**
- **Archivos**: `CaseForm.tsx`, `TaskForm.tsx` (usan Zod) vs el resto
- **Descripción**: Hay dos patrones de validación de formularios completamente distintos coexistiendo. Los formularios con useState manual no tienen validación declarativa consistente.
- **Viabilidad**: Difícil — migrar cada formulario es un refactor significativo que puede introducir regresiones.
- **Impacto**: Bajo — los formularios funcionan; es un problema de mantenibilidad a largo plazo.
- **Recomendación**: Migrar solo formularios nuevos a Zod; los existentes solo cuando se toquen por otra razón.
- **Tests**:
  - [ ] Por cada formulario migrado: probar campos requeridos vacíos, valores inválidos, y submit exitoso.

---

### CONV-006
**`window.confirm()` en 3 archivos en lugar de `ConfirmDialog`**
- **Archivos**: `frontend/src/components/billing/BillingAdjustments.tsx:108`, `frontend/src/components/notifications/NotificationRules.tsx:77`, `frontend/src/pages/clients/ClientDetailPage.tsx:164`
- **Descripción**: El proyecto tiene un componente `ConfirmDialog` para confirmaciones de eliminación, pero 3 archivos usan `window.confirm()` nativo (sin estilos, bloquea el hilo, no personalizable).
- **Viabilidad**: Fácil — reemplazar por `ConfirmDialog` siguiendo el patrón de `HoursTable.tsx`.
- **Impacto**: Medio — experiencia de usuario inconsistente en diálogos de confirmación.
- **Tests**:
  - [ ] Eliminar un ajuste de facturación → aparece `ConfirmDialog` estilizado, no el confirm nativo del navegador.
  - [ ] Cancelar → no se elimina.
  - [ ] Confirmar → se elimina.
  - [ ] Repetir para reglas de notificación y cliente.

---

### CONV-007
**`EmailsPage.tsx` usa `export default` — único en el proyecto**
- **Archivos**: `frontend/src/pages/emails/EmailsPage.tsx:21`
- **Descripción**: Todos los demás componentes usan exportación nombrada. `EmailsPage` usa `export default`, lo que significa que su importación en `App.tsx` es diferente al patrón del resto.
- **Viabilidad**: Fácil — cambiar a exportación nombrada y actualizar la importación en `App.tsx`.
- **Impacto**: Bajo — solo consistencia de código.
- **Tests**:
  - [ ] La página de emails carga correctamente en la ruta correspondiente.

---

### CONV-008
**`datetime.utcnow()` (deprecated) mezclado con `datetime.now(timezone.utc)`**
- **Archivos**: Mayoría de routers usan `utcnow()` — `emails.py:125` y `check_deadlines.py` usan `now(timezone.utc)`
- **Descripción**: `datetime.utcnow()` está deprecado desde Python 3.12 (retorna datetime naive sin timezone). La forma correcta es `datetime.now(timezone.utc)`.
- **Viabilidad**: Fácil — reemplazar todas las ocurrencias.
- **Impacto**: Bajo ahora, pero será un error en versiones futuras de Python.
- **Tests**:
  - [ ] El servidor levanta sin warnings de deprecación.
  - [ ] Los timestamps de `created_at`, `updated_at`, `deleted_at` tienen timezone info.

---

### CONV-009
**`tasks.py` — `logger.warning()` para logs informativos**
- **Archivos**: `backend/app/routers/tasks.py:244-250`
- **Descripción**: Se usa `logger.warning()` para logs de tipo `[my-tasks] user_id=... total=...` que son información operacional, no advertencias reales. Contamina los alertas de `WARNING` en los logs de producción.
- **Viabilidad**: Fácil — cambiar a `logger.info()` o `logger.debug()`.
- **Impacto**: Bajo — solo ruido en logs.
- **Tests**:
  - [ ] Los logs de producción no muestran WARNINGs espurios por operaciones normales de tareas.

---

### CONV-010
**`UsersPage.tsx` — comentario de sección duplicado exactamente**
- **Archivos**: `frontend/src/pages/users/UsersPage.tsx:543-544`
- **Descripción**: El comentario `{/* ── Modal: Cambiar contraseña... */}` aparece dos veces seguidas.
- **Viabilidad**: Fácil — eliminar la línea duplicada.
- **Impacto**: Bajo — solo ruido en el código.
- **Tests**:
  - [ ] El modal de cambio de contraseña sigue funcionando.

---

### CONV-011
**`asignadoA` declarado no-nullable en tipos pero usado con `?.`**
- **Archivos**: `frontend/src/types/index.ts:125`, `TaskDetailModal.tsx:200`, `TaskCard.tsx:45`, `CaseDetailPage.tsx:279`
- **Descripción**: El tipo declara `asignadoA: User` (no-nullable) pero los componentes usan `task.asignadoA?.nombre` (optional chaining). El tipo no refleja la realidad: el campo puede ser null cuando una tarea no tiene asignado.
- **Viabilidad**: Fácil — cambiar el tipo a `asignadoA?: User | null`.
- **Impacto**: Bajo — TypeScript puede dar falsos negativos de tipado actualmente.
- **Tests**:
  - [ ] Una tarea sin asignado se muestra sin errores (sin crash por acceso a `null.nombre`).
  - [ ] Una tarea con asignado muestra el nombre correctamente.

---

---

## Issues UX/UI

*Esta sección es gestionada por el agente `/revisar-ux`. Cada entry sigue el mismo formato que las secciones anteriores más el campo "Flujo del usuario afectado".*

*Para agregar issues manualmente, usar el formato:*

```
### UX-XXX
**[Título del problema]**
- **Página/ruta**: `/ruta` — [nombre de sección]
- **Archivos**: `ruta/archivo.tsx:línea`
- **Flujo del usuario afectado**: [qué quería hacer el usuario]
- **Descripción**: [qué está mal y por qué confunde]
- **Viabilidad**: Fácil/Media/Difícil
- **Impacto**: Alto/Medio/Bajo
- **Riesgo**: Ninguno/Bajo/Medio
- **Tests**:
  - [ ] [test de corrección]
```

---

*Última actualización: 2026-06-28 — Análisis inicial completo. 37 issues de código + sección UX lista para auditorías periódicas.*
