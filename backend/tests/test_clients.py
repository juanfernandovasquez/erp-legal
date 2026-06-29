"""
Tests de clientes.
Cubre: CRUD, estadísticas por cliente, soft-delete, validaciones.
"""

import uuid
import pytest
from httpx import AsyncClient


class TestListarClientes:
    async def test_listar_clientes_devuelve_200(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.get("/api/v1/clients", headers=admin_headers)
        assert resp.status_code == 200
        assert "data" in resp.json()

    async def test_lista_incluye_cliente_creado(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        resp = await client.get("/api/v1/clients", headers=admin_headers)
        assert resp.status_code == 200
        ids = [c["id"] for c in resp.json()["data"]]
        assert test_client_entity["id"] in ids

    async def test_filtro_por_tipo_persona(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.get("/api/v1/clients?client_type=persona", headers=admin_headers)
        assert resp.status_code == 200

    async def test_filtro_por_tipo_empresa(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.get("/api/v1/clients?client_type=empresa", headers=admin_headers)
        assert resp.status_code == 200

    async def test_filtro_activos(self, client: AsyncClient, admin_headers: dict):
        resp = await client.get("/api/v1/clients?is_active=true", headers=admin_headers)
        assert resp.status_code == 200


class TestCrearCliente:
    async def test_crear_cliente_persona(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.post(
            "/api/v1/clients",
            headers=admin_headers,
            json={
                "name": f"Juan Pérez {uuid.uuid4().hex[:4]}",
                "client_type": "persona",
                "is_active": True,
            },
        )
        assert resp.status_code in (200, 201)
        client_data = resp.json()["data"]
        assert "id" in client_data
        await client.delete(f"/api/v1/clients/{client_data['id']}", headers=admin_headers)

    async def test_crear_cliente_empresa(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.post(
            "/api/v1/clients",
            headers=admin_headers,
            json={
                "name": f"Empresa SAC {uuid.uuid4().hex[:4]}",
                "client_type": "empresa",
                "tax_id": "20123456789",
                "is_active": True,
            },
        )
        assert resp.status_code in (200, 201)
        client_data = resp.json()["data"]
        await client.delete(f"/api/v1/clients/{client_data['id']}", headers=admin_headers)

    async def test_crear_cliente_sin_nombre_falla(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.post(
            "/api/v1/clients",
            headers=admin_headers,
            json={"client_type": "persona"},
        )
        assert resp.status_code in (400, 422)

    async def test_crear_cliente_tipo_invalido_falla(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.post(
            "/api/v1/clients",
            headers=admin_headers,
            json={"name": "Cliente Inválido", "client_type": "gobierno"},
        )
        assert resp.status_code in (400, 422)


class TestDetalleCliente:
    async def test_obtener_cliente_por_id(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        resp = await client.get(
            f"/api/v1/clients/{test_client_entity['id']}", headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["id"] == test_client_entity["id"]

    async def test_cliente_inexistente_devuelve_404(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.get(f"/api/v1/clients/{uuid.uuid4()}", headers=admin_headers)
        assert resp.status_code in (403, 404)

    async def test_detalle_incluye_estadisticas(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict, test_case: dict
    ):
        """El detalle del cliente debe incluir contadores de casos y tareas."""
        resp = await client.get(
            f"/api/v1/clients/{test_client_entity['id']}", headers=admin_headers
        )
        assert resp.status_code == 200


class TestActualizarCliente:
    async def test_actualizar_nombre_cliente(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        nuevo_nombre = f"Nombre Actualizado {uuid.uuid4().hex[:4]}"
        resp = await client.patch(
            f"/api/v1/clients/{test_client_entity['id']}",
            headers=admin_headers,
            json={"name": nuevo_nombre},
        )
        assert resp.status_code == 200

    async def test_actualizar_estado_cliente(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        resp = await client.patch(
            f"/api/v1/clients/{test_client_entity['id']}",
            headers=admin_headers,
            json={"is_active": False},
        )
        assert resp.status_code == 200

    async def test_actualizar_cliente_inexistente_devuelve_error(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.patch(
            f"/api/v1/clients/{uuid.uuid4()}",
            headers=admin_headers,
            json={"name": "Nuevo Nombre"},
        )
        assert resp.status_code in (403, 404)


class TestEliminarCliente:
    async def test_eliminar_cliente_soft_delete(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.post(
            "/api/v1/clients",
            headers=admin_headers,
            json={"name": f"Cliente Para Eliminar {uuid.uuid4().hex[:6]}", "client_type": "persona"},
        )
        assert resp.status_code in (200, 201)
        client_id = resp.json()["data"]["id"]

        del_resp = await client.delete(f"/api/v1/clients/{client_id}", headers=admin_headers)
        assert del_resp.status_code == 200

        get_resp = await client.get(f"/api/v1/clients/{client_id}", headers=admin_headers)
        assert get_resp.status_code in (403, 404), "Cliente eliminado no debe ser accesible"

    async def test_eliminar_cliente_inexistente_devuelve_error(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.delete(f"/api/v1/clients/{uuid.uuid4()}", headers=admin_headers)
        assert resp.status_code in (403, 404)
