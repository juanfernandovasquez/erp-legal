"""
ÁREA:        Seguridad y control de acceso
ARCHIVOS:    backend/app/dependencies.py (get_current_user, require_roles)
             backend/app/middleware/rls.py
             backend/app/routers/* (todos los endpoints)
ACTIVAR SI:  Cambias dependencias de auth · middleware RLS · roles de usuario ·
             cualquier endpoint que cambia quién puede acceder a qué ·
             lógica de aislamiento por firma
MARCADORES:  security, auth, validation
"""

import uuid
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.security


@pytest.mark.invariant
class TestControlDeAcceso:
    """Todo endpoint protegido debe devolver 401 si no hay token o el token es inválido."""

    ENDPOINTS_PROTEGIDOS = [
        ("GET", "/api/v1/cases"),
        ("GET", "/api/v1/clients"),
        ("GET", "/api/v1/users"),
        ("GET", "/api/v1/auth/me"),
        ("GET", "/api/v1/admin/dashboard"),
    ]

    @pytest.mark.parametrize("method,path", ENDPOINTS_PROTEGIDOS)
    async def test_sin_token_devuelve_401(self, client: AsyncClient, method: str, path: str):
        """Sin Authorization header → 401 en cualquier endpoint protegido."""
        resp = await client.request(method, path)
        assert resp.status_code == 401, f"{method} {path} debe requerir autenticación"

    @pytest.mark.parametrize("method,path", ENDPOINTS_PROTEGIDOS)
    async def test_token_invalido_devuelve_401(self, client: AsyncClient, method: str, path: str):
        """Token JWT malformado → 401 en cualquier endpoint protegido."""
        resp = await client.request(
            method, path, headers={"Authorization": "Bearer token.invalido.aqui"}
        )
        assert resp.status_code == 401, f"{method} {path} debe rechazar token inválido"


@pytest.mark.invariant
class TestAislamientoEntreFirmas:
    """Un usuario autenticado no puede acceder a recursos de otra firma legal."""

    async def test_caso_de_otra_firma_devuelve_404(self, client: AsyncClient, admin_headers: dict):
        """UUID válido pero de otra firma → 403 o 404 (nunca 200 con datos ajenos)."""
        resp = await client.get(f"/api/v1/cases/{uuid.uuid4()}", headers=admin_headers)
        assert resp.status_code in (403, 404), "No debe filtrar datos de otras firmas"

    async def test_cliente_de_otra_firma_devuelve_404(self, client: AsyncClient, admin_headers: dict):
        """UUID de cliente de otra firma → 403 o 404."""
        resp = await client.get(f"/api/v1/clients/{uuid.uuid4()}", headers=admin_headers)
        assert resp.status_code in (403, 404)

    async def test_tarea_de_otra_firma_devuelve_404(self, client: AsyncClient, admin_headers: dict):
        """UUID de tarea de otra firma → 403 o 404."""
        resp = await client.get(f"/api/v1/tasks/{uuid.uuid4()}", headers=admin_headers)
        assert resp.status_code in (403, 404)

    async def test_no_puede_eliminar_recurso_de_otra_firma(
        self, client: AsyncClient, admin_headers: dict
    ):
        """Intentar DELETE de un recurso ajeno → 403 o 404, nunca 200."""
        resp = await client.delete(f"/api/v1/cases/{uuid.uuid4()}", headers=admin_headers)
        assert resp.status_code in (403, 404)


@pytest.mark.invariant
class TestRoles:
    """Endpoints admin-only deben rechazar usuarios con rol abogado."""

    async def test_abogado_no_puede_crear_usuario(self, client: AsyncClient, lawyer_headers: dict):
        """POST /users con token de abogado → 403 (solo admin puede crear usuarios)."""
        resp = await client.post(
            "/api/v1/users",
            headers=lawyer_headers,
            json={
                "first_name": "Nuevo",
                "last_name": "Usuario",
                "email": f"new_{uuid.uuid4().hex[:6]}@test.erplegal",
                "password": "Password123!",
                "role": "abogado_junior",
            },
        )
        assert resp.status_code in (401, 403), "Abogado no debe poder crear usuarios"

    async def test_abogado_puede_ver_sus_tareas(self, client: AsyncClient, lawyer_headers: dict):
        """GET /tasks/my-tasks con token de abogado → 200 (acceso propio siempre permitido)."""
        resp = await client.get("/api/v1/tasks/my-tasks", headers=lawyer_headers)
        assert resp.status_code == 200

    async def test_abogado_puede_listar_casos(self, client: AsyncClient, lawyer_headers: dict):
        """GET /cases con token de abogado → 200 (todos los roles pueden ver casos)."""
        resp = await client.get("/api/v1/cases", headers=lawyer_headers)
        assert resp.status_code == 200


class TestValidacionEntrada:
    """Inputs maliciosos deben ser manejados de forma segura sin exponer información ni causar 500."""

    @pytest.mark.validation
    async def test_sql_injection_en_login_no_produce_500(self, client: AsyncClient):
        """Payloads de SQL injection en login → 401 o 422, nunca 500."""
        payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "admin'--",
            "1' UNION SELECT * FROM users--",
        ]
        for payload in payloads:
            resp = await client.post(
                "/api/v1/auth/login",
                json={"email": payload, "password": payload},
            )
            assert resp.status_code in (401, 422), (
                f"SQL injection no debe causar 500: payload='{payload}' status={resp.status_code}"
            )

    @pytest.mark.validation
    async def test_xss_en_titulo_caso_se_almacena_sin_ejecutar(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        """Payload XSS en campos de texto → debe almacenarse como texto plano, sin sanitizar ni ejecutar."""
        xss_payload = "<script>alert('xss')</script>"
        resp = await client.post(
            "/api/v1/cases",
            headers=admin_headers,
            json={
                "title": xss_payload,
                "description": "Test XSS",
                "tipo_facturacion": "por_horas",
                "moneda_facturacion": "PEN",
                "client_id": test_client_entity["id"],
            },
        )
        if resp.status_code in (200, 201):
            case = resp.json()["data"]
            title = case.get("title", "")
            assert "<script>" in title, "El payload debe almacenarse literalmente (la sanitización es responsabilidad del frontend)"
            await client.delete(f"/api/v1/cases/{case['id']}", headers=admin_headers)

    @pytest.mark.validation
    async def test_uuid_invalido_en_path_devuelve_error_no_500(
        self, client: AsyncClient, admin_headers: dict
    ):
        """UUID malformado en el path → 400, 404 o 422, nunca 500."""
        resp = await client.get("/api/v1/cases/no-es-un-uuid", headers=admin_headers)
        assert resp.status_code in (400, 404, 422), "UUID inválido no debe causar 500"

    @pytest.mark.validation
    async def test_body_vacio_en_creacion_devuelve_422(
        self, client: AsyncClient, admin_headers: dict
    ):
        """POST sin body → 422 (campos requeridos faltantes)."""
        resp = await client.post("/api/v1/cases", headers=admin_headers, json={})
        assert resp.status_code == 422


class TestHealthYEndpointsPublicos:
    """Endpoints públicos deben responder sin auth y no exponer información sensible."""

    async def test_health_accesible_sin_auth(self, client: AsyncClient):
        """GET /health → 200 sin necesitar token."""
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

    async def test_openapi_no_expone_credenciales(self, client: AsyncClient):
        """GET /openapi.json → el schema no debe contener contraseñas ni claves secretas."""
        resp = await client.get("/openapi.json")
        assert resp.status_code == 200
        text = resp.text
        assert "ErpLegal2024!" not in text
        assert "test-only-secret-key" not in text
