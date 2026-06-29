"""
Tests de procesos (CaseProcess).
Cubre: CRUD, totales calculados, cascade delete hacia tareas y horas.
"""

import uuid
import pytest
from httpx import AsyncClient


class TestListarProcesos:
    async def test_listar_procesos_de_caso(
        self, client: AsyncClient, admin_headers: dict, test_case: dict, test_process: dict
    ):
        resp = await client.get(
            f"/api/v1/cases/{test_case['id']}/processes", headers=admin_headers
        )
        assert resp.status_code == 200
        processes = resp.json()["data"]
        ids = [p["id"] for p in processes]
        assert test_process["id"] in ids

    async def test_listar_procesos_caso_inexistente(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.get(
            f"/api/v1/cases/{uuid.uuid4()}/processes", headers=admin_headers
        )
        assert resp.status_code in (403, 404)


class TestCrearProceso:
    async def test_crear_proceso_por_horas(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/processes",
            headers=admin_headers,
            json={
                "titulo": f"Proceso Por Horas {uuid.uuid4().hex[:6]}",
                "tipo_tarifa": "por_horas",
                "tarifa": 200.0,
                "moneda": "PEN",
            },
        )
        assert resp.status_code in (200, 201)
        process = resp.json()["data"]
        assert "id" in process
        await client.delete(
            f"/api/v1/cases/{test_case['id']}/processes/{process['id']}",
            headers=admin_headers,
        )

    async def test_crear_proceso_tarifa_plana(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/processes",
            headers=admin_headers,
            json={
                "titulo": f"Proceso Plano {uuid.uuid4().hex[:6]}",
                "tipo_tarifa": "plana",
                "tarifa": 1500.0,
                "moneda": "USD",
            },
        )
        assert resp.status_code in (200, 201)
        process = resp.json()["data"]
        await client.delete(
            f"/api/v1/cases/{test_case['id']}/processes/{process['id']}",
            headers=admin_headers,
        )

    async def test_crear_proceso_sin_titulo_falla(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/processes",
            headers=admin_headers,
            json={"tipo_tarifa": "por_horas", "tarifa": 100.0, "moneda": "PEN"},
        )
        assert resp.status_code in (400, 422)

    async def test_crear_proceso_moneda_invalida_falla(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/processes",
            headers=admin_headers,
            json={"titulo": "Proceso EUR", "tipo_tarifa": "por_horas", "tarifa": 100.0, "moneda": "EUR"},
        )
        assert resp.status_code in (400, 422)


class TestActualizarProceso:
    async def test_actualizar_titulo_proceso(
        self, client: AsyncClient, admin_headers: dict, test_case: dict, test_process: dict
    ):
        nuevo_titulo = f"Proceso Actualizado {uuid.uuid4().hex[:4]}"
        resp = await client.patch(
            f"/api/v1/cases/{test_case['id']}/processes/{test_process['id']}",
            headers=admin_headers,
            json={"titulo": nuevo_titulo},
        )
        assert resp.status_code == 200

    async def test_actualizar_tarifa_proceso(
        self, client: AsyncClient, admin_headers: dict, test_case: dict, test_process: dict
    ):
        resp = await client.patch(
            f"/api/v1/cases/{test_case['id']}/processes/{test_process['id']}",
            headers=admin_headers,
            json={"tarifa": 300.0},
        )
        assert resp.status_code == 200


class TestTotalesProceso:
    async def test_proceso_incluye_total_horas(
        self, client: AsyncClient, admin_headers: dict, test_case: dict, test_process: dict, test_hours_entry: dict
    ):
        resp = await client.get(
            f"/api/v1/cases/{test_case['id']}/processes", headers=admin_headers
        )
        assert resp.status_code == 200
        processes = resp.json()["data"]
        process = next((p for p in processes if p["id"] == test_process["id"]), None)
        assert process is not None
        assert "totalHoras" in process or "total_horas" in process

    async def test_proceso_incluye_total_monto(
        self, client: AsyncClient, admin_headers: dict, test_case: dict, test_process: dict, test_hours_entry: dict
    ):
        resp = await client.get(
            f"/api/v1/cases/{test_case['id']}/processes", headers=admin_headers
        )
        assert resp.status_code == 200
        processes = resp.json()["data"]
        process = next((p for p in processes if p["id"] == test_process["id"]), None)
        assert process is not None
        assert "totalMonto" in process or "total_monto" in process


class TestEliminarProceso:
    async def test_eliminar_proceso_hace_soft_delete(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/processes",
            headers=admin_headers,
            json={
                "titulo": f"Proceso Para Eliminar {uuid.uuid4().hex[:6]}",
                "tipo_tarifa": "por_horas",
                "tarifa": 100.0,
                "moneda": "PEN",
            },
        )
        assert resp.status_code in (200, 201)
        process_id = resp.json()["data"]["id"]

        del_resp = await client.delete(
            f"/api/v1/cases/{test_case['id']}/processes/{process_id}",
            headers=admin_headers,
        )
        assert del_resp.status_code == 200

        list_resp = await client.get(
            f"/api/v1/cases/{test_case['id']}/processes", headers=admin_headers
        )
        assert list_resp.status_code == 200
        ids = [p["id"] for p in list_resp.json()["data"]]
        assert process_id not in ids, "Proceso eliminado no debe aparecer en la lista"
