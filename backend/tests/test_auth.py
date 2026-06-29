"""
ÁREA:        Autenticación y gestión de sesión
ARCHIVOS:    backend/app/routers/auth.py
             backend/app/schemas/auth.py
             backend/app/utils/auth.py (create_access_token, verify_password)
             backend/app/dependencies.py (get_current_user)
ACTIVAR SI:  Cambias auth.py · schemas/auth.py · lógica de JWT · middleware de auth
MARCADORES:  auth, security, validation
"""

import uuid
import pytest
from httpx import AsyncClient

from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD

pytestmark = pytest.mark.auth


class TestLogin:
    """Verifica que el login devuelve token válido con credenciales correctas y rechaza incorrectas."""

    async def test_login_exitoso(self, client: AsyncClient):
        """Login con credenciales válidas → 200 + access_token + refresh_token + datos de usuario."""
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == ADMIN_EMAIL

    @pytest.mark.invariant
    async def test_login_password_incorrecta(self, client: AsyncClient):
        """Contraseña incorrecta → 401. Nunca debe revelar si el email existe."""
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": ADMIN_EMAIL, "password": "contraseña_incorrecta"},
        )
        assert resp.status_code == 401

    @pytest.mark.invariant
    async def test_login_email_inexistente(self, client: AsyncClient):
        """Email no registrado → 401. Mismo código que contraseña incorrecta (no enumerar usuarios)."""
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "noexiste@test.erplegal", "password": ADMIN_PASSWORD},
        )
        assert resp.status_code == 401

    @pytest.mark.validation
    async def test_login_email_malformado(self, client: AsyncClient):
        """Email sin formato válido → 422 (Pydantic rechaza antes del handler)."""
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "no-es-un-email", "password": ADMIN_PASSWORD},
        )
        assert resp.status_code == 422

    @pytest.mark.validation
    async def test_login_campos_vacios(self, client: AsyncClient):
        """Campos vacíos → 422."""
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "", "password": ""},
        )
        assert resp.status_code == 422

    @pytest.mark.validation
    async def test_login_body_faltante(self, client: AsyncClient):
        """Body vacío → 422."""
        resp = await client.post("/api/v1/auth/login", json={})
        assert resp.status_code == 422


@pytest.mark.invariant
class TestTokenYAcceso:
    """Verifica que endpoints protegidos rechazan requests sin token válido."""

    async def test_acceso_sin_token_rechazado(self, client: AsyncClient):
        """Sin Authorization header → 401."""
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    async def test_acceso_token_invalido_rechazado(self, client: AsyncClient):
        """Token JWT completamente inventado → 401."""
        resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer token_completamente_invalido"},
        )
        assert resp.status_code == 401

    async def test_acceso_token_malformado_rechazado(self, client: AsyncClient):
        """Scheme incorrecto (no Bearer) → 401."""
        resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "NotBearer algo"},
        )
        assert resp.status_code == 401

    async def test_acceso_con_token_valido(self, client: AsyncClient, admin_headers: dict):
        """Token válido → 200."""
        resp = await client.get("/api/v1/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json().get("data") or resp.json()
        assert "email" in data or "id" in data


class TestPerfilUsuario:
    """Verifica que GET /auth/me devuelve los datos correctos del usuario autenticado."""

    async def test_me_devuelve_email_correcto(self, client: AsyncClient, admin_headers: dict):
        """GET /me → email coincide con el usuario logueado."""
        resp = await client.get("/api/v1/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json().get("data") or resp.json()
        assert data.get("email") == ADMIN_EMAIL

    async def test_me_incluye_law_firm_id(self, client: AsyncClient, admin_headers: dict):
        """GET /me → incluye law_firm_id (necesario para aislamiento de datos)."""
        resp = await client.get("/api/v1/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json().get("data") or resp.json()
        assert data.get("law_firm_id") or data.get("bufeteId"), "Debe incluir la firma del usuario"

    async def test_me_incluye_rol(self, client: AsyncClient, admin_headers: dict):
        """GET /me → incluye el rol del usuario."""
        resp = await client.get("/api/v1/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json().get("data") or resp.json()
        role = data.get("role") or data.get("rol")
        assert role in ("admin_firma", "super_admin", "abogado_junior", "abogado_senior")


class TestRegistro:
    """Verifica las reglas de unicidad en el registro de nuevas firmas."""

    async def test_registro_firma_duplicada_rechazada(self, client: AsyncClient):
        """Nombre de firma ya existente → 409 Conflict."""
        from tests.conftest import FIRM_NAME
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "firm_name": FIRM_NAME,
                "email": f"otro_{uuid.uuid4().hex[:6]}@test.erplegal",
                "password": ADMIN_PASSWORD,
                "full_name": "Otro Admin",
            },
        )
        assert resp.status_code == 409

    async def test_registro_email_duplicado_rechazado(self, client: AsyncClient):
        """Email ya registrado → 409 Conflict."""
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "firm_name": f"Firma Nueva {uuid.uuid4().hex[:8]}",
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "full_name": "Otro Admin",
            },
        )
        assert resp.status_code == 409

    @pytest.mark.validation
    async def test_registro_password_corta_rechazada(self, client: AsyncClient):
        """Contraseña menor a 8 caracteres → 422 (validación Pydantic)."""
        uid = uuid.uuid4().hex[:6]
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "firm_name": f"Firma Nueva {uid}",
                "email": f"nueva_{uid}@test.erplegal",
                "password": "corta",
                "full_name": "Nuevo Admin",
            },
        )
        assert resp.status_code == 422
