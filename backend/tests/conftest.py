"""
Fixtures compartidos para toda la suite de tests del ERP Legal.

SETUP REQUERIDO ANTES DE CORRER TESTS:
1. Tener PostgreSQL corriendo (Docker local o directo).
2. Crear la base de datos de test:
       docker exec -it <postgres-container> createdb erp_legal_test
   o directamente: createdb erp_legal_test
3. Correr migraciones sobre la BD de test:
       DATABASE_URL=postgresql+asyncpg://postgres:ErpLegal2024!@localhost:5432/erp_legal_test \
       alembic upgrade head
4. Copiar .env.test.example a .env.test y ajustar si es necesario.
5. Correr los tests:
       pytest  (desde el directorio backend/)

Variables de entorno configurables:
  TEST_DB_URL    URL de la BD de test (por defecto: postgres local)
  TEST_DB_PORT   Puerto de PostgreSQL (por defecto: 5432)
"""

import asyncio
import os
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# ── Env vars ANTES de importar cualquier módulo de la app ──────────────────
os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get(
        "TEST_DB_URL",
        f"postgresql+asyncpg://postgres:ErpLegal2024!@localhost:{os.environ.get('TEST_DB_PORT','5432')}/erp_legal_test",
    ),
)
os.environ.setdefault("SECRET_KEY", "test-only-secret-key-do-not-use-in-production-abc123xyz")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("DATABASE_ECHO", "false")
os.environ.setdefault("CORS_ORIGINS", '["http://localhost:3000"]')
os.environ.setdefault("ENABLE_AUDIT_LOGGING", "false")

from app.main import app  # noqa: E402  (debe ir después de os.environ.setdefault)

# ── ID único por corrida para evitar conflictos entre ejecuciones paralelas ─
RUN_ID = uuid.uuid4().hex[:8]

ADMIN_EMAIL = f"admin_{RUN_ID}@test.erplegal"
ADMIN_PASSWORD = "TestPassword123!"
ADMIN_NAME = f"Admin Test {RUN_ID}"
FIRM_NAME = f"Firma Test {RUN_ID}"

LAWYER_EMAIL = f"abogado_{RUN_ID}@test.erplegal"
LAWYER_PASSWORD = "TestPassword123!"
LAWYER_NAME = f"Abogado Test {RUN_ID}"


# ── Event loop compartido por toda la sesión ────────────────────────────────
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ── Cliente HTTP (sesión completa) ──────────────────────────────────────────
@pytest_asyncio.fixture(scope="session")
async def client():
    """AsyncClient conectado directamente a la app FastAPI (sin servidor externo)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ── Registro de firma y obtención de tokens ─────────────────────────────────
@pytest_asyncio.fixture(scope="session")
async def admin_token(client: AsyncClient) -> str:
    """Registra una firma de test y devuelve el token del admin."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "firm_name": FIRM_NAME,
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "full_name": ADMIN_NAME,
        },
    )
    assert resp.status_code == 201, f"Registro falló: {resp.text}"
    return resp.json()["data"]["access_token"]


@pytest_asyncio.fixture(scope="session")
async def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest_asyncio.fixture(scope="session")
async def law_firm_id(client: AsyncClient, admin_headers: dict) -> str:
    resp = await client.get("/api/v1/auth/me", headers=admin_headers)
    assert resp.status_code == 200, f"GET /me falló: {resp.text}"
    data = resp.json().get("data") or resp.json()
    return str(data.get("law_firm_id") or data.get("bufeteId"))


@pytest_asyncio.fixture(scope="session")
async def admin_user_id(client: AsyncClient, admin_headers: dict) -> str:
    resp = await client.get("/api/v1/auth/me", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json().get("data") or resp.json()
    return str(data.get("id"))


# ── Usuario abogado (rol no-admin) ──────────────────────────────────────────
@pytest_asyncio.fixture(scope="session")
async def lawyer_token(client: AsyncClient, admin_headers: dict, law_firm_id: str) -> str:
    """Crea un abogado dentro de la firma de test y devuelve su token."""
    resp = await client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "first_name": "Abogado",
            "last_name": f"Test {RUN_ID}",
            "email": LAWYER_EMAIL,
            "password": LAWYER_PASSWORD,
            "role": "abogado_junior",
        },
    )
    assert resp.status_code in (200, 201), f"Creación de abogado falló: {resp.text}"

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": LAWYER_EMAIL, "password": LAWYER_PASSWORD},
    )
    assert login.status_code == 200, f"Login de abogado falló: {login.text}"
    return login.json()["data"]["access_token"]


@pytest_asyncio.fixture(scope="session")
async def lawyer_headers(lawyer_token: str) -> dict:
    return {"Authorization": f"Bearer {lawyer_token}"}


# ── Fixtures de entidades reutilizables (function-scoped = se crean y limpian por test) ──

@pytest_asyncio.fixture
async def test_client_entity(client: AsyncClient, admin_headers: dict):
    """Crea un cliente de prueba y lo elimina al finalizar el test."""
    name = f"Cliente Test {uuid.uuid4().hex[:6]}"
    resp = await client.post(
        "/api/v1/clients",
        headers=admin_headers,
        json={"name": name, "client_type": "persona", "is_active": True},
    )
    assert resp.status_code in (200, 201), f"No se pudo crear cliente de test: {resp.text}"
    entity = resp.json()["data"]
    yield entity
    await client.delete(f"/api/v1/clients/{entity['id']}", headers=admin_headers)


@pytest_asyncio.fixture
async def test_case(client: AsyncClient, admin_headers: dict, test_client_entity: dict):
    """Crea un caso de prueba y lo elimina al finalizar el test."""
    resp = await client.post(
        "/api/v1/cases",
        headers=admin_headers,
        json={
            "title": f"Caso Test {uuid.uuid4().hex[:6]}",
            "description": "Caso creado por la suite de tests",
            "tipo_facturacion": "por_horas",
            "moneda_facturacion": "PEN",
            "client_id": test_client_entity["id"],
        },
    )
    assert resp.status_code in (200, 201), f"No se pudo crear caso de test: {resp.text}"
    case = resp.json()["data"]
    yield case
    await client.delete(f"/api/v1/cases/{case['id']}", headers=admin_headers)


@pytest_asyncio.fixture
async def test_process(client: AsyncClient, admin_headers: dict, test_case: dict):
    """Crea un proceso de prueba dentro del caso de test."""
    resp = await client.post(
        f"/api/v1/cases/{test_case['id']}/processes",
        headers=admin_headers,
        json={
            "titulo": f"Proceso Test {uuid.uuid4().hex[:6]}",
            "tipo_tarifa": "por_horas",
            "tarifa": 150.0,
            "moneda": "PEN",
        },
    )
    assert resp.status_code in (200, 201), f"No se pudo crear proceso de test: {resp.text}"
    process = resp.json()["data"]
    yield process
    await client.delete(
        f"/api/v1/cases/{test_case['id']}/processes/{process['id']}",
        headers=admin_headers,
    )


@pytest_asyncio.fixture
async def test_task(client: AsyncClient, admin_headers: dict, test_case: dict, test_process: dict, admin_user_id: str):
    """Crea una tarea de prueba dentro del proceso de test."""
    resp = await client.post(
        f"/api/v1/cases/{test_case['id']}/tasks",
        headers=admin_headers,
        json={
            "title": f"Tarea Test {uuid.uuid4().hex[:6]}",
            "description": "Tarea creada por la suite de tests",
            "process_id": test_process["id"],
            "assigned_to": admin_user_id,
            "status": "pendiente",
        },
    )
    assert resp.status_code in (200, 201), f"No se pudo crear tarea de test: {resp.text}"
    task = resp.json()["data"]
    yield task
    await client.delete(f"/api/v1/tasks/{task['id']}", headers=admin_headers)


@pytest_asyncio.fixture
async def test_hours_entry(client: AsyncClient, admin_headers: dict, test_case: dict, test_task: dict):
    """Registra horas de prueba y las elimina al finalizar."""
    resp = await client.post(
        f"/api/v1/cases/{test_case['id']}/hours",
        headers=admin_headers,
        json={
            "task_id": test_task["id"],
            "hours": 2.0,
            "hourly_rate": 100.0,
            "description": "Horas de test",
            "is_billable": True,
            "date": "2026-01-15",
        },
    )
    assert resp.status_code in (200, 201), f"No se pudo registrar horas de test: {resp.text}"
    entry = resp.json()["data"]
    yield entry
    await client.delete(f"/api/v1/hours/{entry['id']}", headers=admin_headers)
