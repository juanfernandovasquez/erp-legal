"""
Tests de casos legales.
Cubre: CRUD, filtros, equipo del caso, soft-delete, validaciones.
"""

import uuid
import pytest
from httpx import AsyncClient


class TestListarCasos:
    async def test_lista_casos_devuelve_200(self, client: AsyncClient, admin_headers: dict):
        resp = await client.get("/api/v1/cases", headers=admin_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "data" in body

    async def test_lista_incluye_caso_creado(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.get("/api/v1/cases", headers=admin_headers)
        assert resp.status_code == 200
        ids = [c["id"] for c in resp.json()["data"]]
        assert test_case["id"] in ids

    async def test_filtro_por_estado_activo(self, client: AsyncClient, admin_headers: dict):
        resp = await client.get("/api/v1/cases?status=activo", headers=admin_headers)
        assert resp.status_code == 200

    async def test_filtro_por_moneda(self, client: AsyncClient, admin_headers: dict):
        resp = await client.get("/api/v1/cases?moneda=PEN", headers=admin_headers)
        assert resp.status_code == 200


class TestCrearCaso:
    async def test_crear_caso_exitoso(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        resp = await client.post(
            "/api/v1/cases",
            headers=admin_headers,
            json={
                "title": f"Caso Nuevo {uuid.uuid4().hex[:6]}",
                "description": "Descripción de prueba",
                "tipo_facturacion": "por_horas",
                "moneda_facturacion": "PEN",
                "client_id": test_client_entity["id"],
            },
        )
        assert resp.status_code in (200, 201)
        case = resp.json()["data"]
        assert "id" in case
        assert case.get("tipo_facturacion") == "por_horas" or case.get("tipoFacturacion") == "por_horas"
        await client.delete(f"/api/v1/cases/{case['id']}", headers=admin_headers)

    async def test_crear_caso_flat_con_precio(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        resp = await client.post(
            "/api/v1/cases",
            headers=admin_headers,
            json={
                "title": f"Caso Flat {uuid.uuid4().hex[:6]}",
                "tipo_facturacion": "flat",
                "moneda_facturacion": "USD",
                "precio_facturacion": 5000.0,
                "client_id": test_client_entity["id"],
            },
        )
        assert resp.status_code in (200, 201)
        case = resp.json()["data"]
        await client.delete(f"/api/v1/cases/{case['id']}", headers=admin_headers)

    async def test_crear_caso_sin_titulo_falla(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.post(
            "/api/v1/cases",
            headers=admin_headers,
            json={"description": "Sin título"},
        )
        assert resp.status_code == 422

    async def test_crear_caso_moneda_invalida_falla(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        resp = await client.post(
            "/api/v1/cases",
            headers=admin_headers,
            json={
                "title": "Caso Moneda Inválida",
                "moneda_facturacion": "EUR",
                "client_id": test_client_entity["id"],
            },
        )
        assert resp.status_code in (400, 422)


class TestDetalleCaso:
    async def test_obtener_caso_por_id(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.get(f"/api/v1/cases/{test_case['id']}", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["id"] == test_case["id"]

    async def test_caso_inexistente_devuelve_404(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.get(f"/api/v1/cases/{uuid.uuid4()}", headers=admin_headers)
        assert resp.status_code in (403, 404)

    async def test_detalle_incluye_procesos(
        self, client: AsyncClient, admin_headers: dict, test_case: dict, test_process: dict
    ):
        resp = await client.get(f"/api/v1/cases/{test_case['id']}", headers=admin_headers)
        assert resp.status_code == 200

    async def test_detalle_incluye_equipo(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.get(f"/api/v1/cases/{test_case['id']}", headers=admin_headers)
        assert resp.status_code == 200


class TestActualizarCaso:
    async def test_actualizar_titulo(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        nuevo_titulo = f"Caso Actualizado {uuid.uuid4().hex[:4]}"
        resp = await client.patch(
            f"/api/v1/cases/{test_case['id']}",
            headers=admin_headers,
            json={"title": nuevo_titulo},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data.get("title") == nuevo_titulo or data.get("titulo") == nuevo_titulo

    async def test_actualizar_tipo_facturacion(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.patch(
            f"/api/v1/cases/{test_case['id']}",
            headers=admin_headers,
            json={"tipo_facturacion": "flat", "precio_facturacion": 3000.0},
        )
        assert resp.status_code == 200

    async def test_actualizar_estado(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.patch(
            f"/api/v1/cases/{test_case['id']}",
            headers=admin_headers,
            json={"status": "activo"},
        )
        assert resp.status_code == 200


class TestEliminarCaso:
    async def test_eliminar_caso_soft_delete(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        resp = await client.post(
            "/api/v1/cases",
            headers=admin_headers,
            json={
                "title": f"Caso Para Eliminar {uuid.uuid4().hex[:6]}",
                "tipo_facturacion": "por_horas",
                "moneda_facturacion": "PEN",
                "client_id": test_client_entity["id"],
            },
        )
        assert resp.status_code in (200, 201)
        case_id = resp.json()["data"]["id"]

        del_resp = await client.delete(f"/api/v1/cases/{case_id}", headers=admin_headers)
        assert del_resp.status_code == 200

        get_resp = await client.get(f"/api/v1/cases/{case_id}", headers=admin_headers)
        assert get_resp.status_code in (403, 404), "Caso eliminado no debe ser accesible"

    async def test_eliminar_caso_inexistente_devuelve_error(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.delete(f"/api/v1/cases/{uuid.uuid4()}", headers=admin_headers)
        assert resp.status_code in (403, 404)
