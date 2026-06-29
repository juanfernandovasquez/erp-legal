# Tests del ERP Legal — Backend

Suite de tests de integración para verificar el correcto funcionamiento de la API.
Los tests corren directamente contra la app FastAPI (sin servidor externo) usando una base de datos de test dedicada.

---

## Setup inicial (solo la primera vez)

### 1. Instalar dependencias de test

Desde el directorio `backend/`:
```bash
pip install -r requirements-test.txt
```

### 2. Crear la base de datos de test

Si usas Docker (el caso habitual):
```bash
# Encontrar el nombre del contenedor de postgres
docker ps

# Crear la BD de test
docker exec -it <nombre-contenedor-postgres> createdb -U postgres erp_legal_test
```

Si tienes PostgreSQL instalado localmente:
```bash
createdb -U postgres erp_legal_test
```

### 3. Correr las migraciones sobre la BD de test

```bash
DATABASE_URL="postgresql+asyncpg://postgres:ErpLegal2024!@localhost:5432/erp_legal_test" \
alembic upgrade head
```

En Windows PowerShell:
```powershell
$env:DATABASE_URL="postgresql+asyncpg://postgres:ErpLegal2024!@localhost:5432/erp_legal_test"
alembic upgrade head
```

### 4. (Opcional) Crear `.env.test`

Copia y ajusta las variables si tu setup difiere:
```bash
cp tests/.env.test.example .env.test
```

---

## Correr los tests

Desde el directorio `backend/`:

```bash
# Todos los tests
pytest

# Con cobertura
pytest --cov=app --cov-report=term-missing

# Un módulo específico
pytest tests/test_auth.py
pytest tests/test_hours.py

# Un test específico
pytest tests/test_hours.py::TestCalculoBilling::test_horas_por_horas_calcula_monto_correcto

# Solo tests de una categoría (por nombre)
pytest -k "security"
pytest -k "billing"

# Ver output de prints (útil para debug)
pytest -s
```

### Contra otro servidor (staging u otro entorno)

Si quieres correr los tests contra la BD de staging:
```bash
TEST_DB_URL="postgresql+asyncpg://postgres:ErpLegal2024!@137.184.54.245:5432/erp_legal_test" pytest
```

---

## Estructura de archivos

```
tests/
  conftest.py           — Fixtures compartidos: cliente HTTP, tokens, datos base
  test_auth.py          — Login, registro, tokens, perfil
  test_security.py      — Control de acceso, aislamiento entre firmas, SQL injection
  test_cases.py         — CRUD de casos, filtros, soft-delete
  test_processes.py     — CRUD de procesos, totales calculados, cascade delete
  test_tasks.py         — CRUD de tareas, estados, soft-delete, cascade con horas
  test_hours.py         — Registro de horas, cálculo billing flat vs por_horas
  test_clients.py       — CRUD de clientes, estadísticas
  test_alerts.py        — Alertas y reglas de notificación
  test_billing.py       — Ajustes de facturación, símbolo de moneda
  README.md             — Este archivo
```

---

## Cómo funcionan los fixtures

- **`client`** (session): cliente HTTP conectado directamente a la app FastAPI via `ASGITransport`. No necesita servidor corriendo.
- **`admin_token`** (session): registra una firma nueva con un ID único por corrida, y hace login. Se reutiliza en toda la sesión.
- **`test_case`** (function): crea un caso antes del test y lo elimina (soft-delete) después. Garantiza aislamiento entre tests.
- Todos los fixtures de datos (case, process, task, hours) hacen cleanup automático vía `yield`.

---

## Qué cubre cada módulo

| Archivo | Área | Casos de test |
|---------|------|--------------|
| `test_auth.py` | Autenticación | Login válido/inválido, tokens, perfil, registro |
| `test_security.py` | Seguridad | Sin token, token inválido, roles, SQL injection, XSS |
| `test_cases.py` | Casos | CRUD, filtros, moneda inválida, soft-delete |
| `test_processes.py` | Procesos | CRUD, tarifa plana vs horas, totales, cascade |
| `test_tasks.py` | Tareas | CRUD, estados, cascade con horas, soft-delete |
| `test_hours.py` | Horas | Validaciones, billing flat, billing por horas, >24h |
| `test_clients.py` | Clientes | CRUD, tipos, estadísticas, soft-delete |
| `test_alerts.py` | Alertas | CRUD alertas, resolución, reglas de notificación |
| `test_billing.py` | Facturación | Ajustes, símbolo moneda PEN/USD, validaciones |

---

## Añadir nuevos tests

1. Agregar en el archivo correspondiente (`test_cases.py`, etc.) dentro de la clase del área.
2. Si el test necesita datos específicos, agregar un fixture en `conftest.py`.
3. Seguir el patrón: **Arrange** (fixture) → **Act** (llamada API) → **Assert** (verificar status code + datos).
4. Los tests que crean datos deben limpiarlos en un `finally` o usando fixtures con `yield`.

### Ejemplo de nuevo test

```python
async def test_mi_nuevo_caso(self, client: AsyncClient, admin_headers: dict, test_case: dict):
    # Actuar
    resp = await client.get(f"/api/v1/cases/{test_case['id']}", headers=admin_headers)
    
    # Verificar
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == test_case["id"]
```

---

## Problemas frecuentes

**`RuntimeError: Database not initialized`**
→ La BD de test no está corriendo o la `DATABASE_URL` apunta a un lugar incorrecto. Verificar que PostgreSQL esté arriba y la BD `erp_legal_test` exista.

**`AssertionError: Registro falló: 409`**
→ La firma de test ya existe (corrida anterior no limpió). En condiciones normales esto no pasa porque el `RUN_ID` es único por corrida. Si persiste, verificar el `conftest.py`.

**`Connection refused`**
→ PostgreSQL no está corriendo en el puerto configurado. Si usas Docker, verificar que el contenedor esté activo (`docker ps`).

**Tests fallan con 422 cuando esperan 400**
→ FastAPI puede devolver 422 (Unprocessable Entity) para errores de validación Pydantic y 400 para errores de negocio. Los asserts aceptan ambos donde aplica.
