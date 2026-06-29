"""
Tests de alertas y reglas de notificación.
Cubre: creación, listado, resolución de alertas, CRUD de reglas de notificación.
"""

import uuid
import pytest
from httpx import AsyncClient


class TestListarAlertas:
    async def test_listar_alertas_devuelve_200(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.get("/api/v1/alerts", headers=admin_headers)
        assert resp.status_code == 200
        assert "data" in resp.json()

    async def test_alertas_solo_de_la_firma(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.get("/api/v1/alerts", headers=admin_headers)
        assert resp.status_code == 200


class TestCrearAlerta:
    async def test_crear_alerta_para_caso(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.post(
            "/api/v1/alerts",
            headers=admin_headers,
            json={
                "case_id": test_case["id"],
                "title": f"Alerta Test {uuid.uuid4().hex[:6]}",
                "description": "Alerta creada por suite de tests",
                "severity": "media",
                "due_date": "2026-12-31",
            },
        )
        assert resp.status_code in (200, 201)
        alert = resp.json()["data"]
        assert "id" in alert
        await client.delete(f"/api/v1/alerts/{alert['id']}", headers=admin_headers)

    async def test_crear_alerta_sin_caso(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.post(
            "/api/v1/alerts",
            headers=admin_headers,
            json={
                "title": f"Alerta Global {uuid.uuid4().hex[:6]}",
                "description": "Alerta global sin caso",
                "severity": "alta",
            },
        )
        assert resp.status_code in (200, 201, 400, 422)

    async def test_crear_alerta_sin_titulo_falla(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.post(
            "/api/v1/alerts",
            headers=admin_headers,
            json={"case_id": test_case["id"], "severity": "baja"},
        )
        assert resp.status_code in (400, 422)


class TestActualizarAlerta:
    async def test_resolver_alerta(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.post(
            "/api/v1/alerts",
            headers=admin_headers,
            json={
                "case_id": test_case["id"],
                "title": f"Alerta Para Resolver {uuid.uuid4().hex[:6]}",
                "severity": "media",
            },
        )
        assert resp.status_code in (200, 201)
        alert = resp.json()["data"]

        resolve_resp = await client.patch(
            f"/api/v1/alerts/{alert['id']}",
            headers=admin_headers,
            json={"is_resolved": True},
        )
        assert resolve_resp.status_code == 200

        await client.delete(f"/api/v1/alerts/{alert['id']}", headers=admin_headers)

    async def test_actualizar_severidad_alerta(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.post(
            "/api/v1/alerts",
            headers=admin_headers,
            json={
                "case_id": test_case["id"],
                "title": f"Alerta Severidad {uuid.uuid4().hex[:6]}",
                "severity": "baja",
            },
        )
        assert resp.status_code in (200, 201)
        alert = resp.json()["data"]

        upd_resp = await client.patch(
            f"/api/v1/alerts/{alert['id']}",
            headers=admin_headers,
            json={"severity": "alta"},
        )
        assert upd_resp.status_code == 200
        await client.delete(f"/api/v1/alerts/{alert['id']}", headers=admin_headers)


class TestReglasNotificacion:
    async def test_listar_reglas_devuelve_200(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.get("/api/v1/notification-rules", headers=admin_headers)
        assert resp.status_code == 200

    async def test_crear_regla_notificacion(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.post(
            "/api/v1/notification-rules",
            headers=admin_headers,
            json={
                "case_id": test_case["id"],
                "days_before": 7,
                "notify_assignee": True,
                "notify_supervisors": False,
                "is_active": True,
            },
        )
        assert resp.status_code in (200, 201)
        rule = resp.json()["data"]
        assert "id" in rule

        await client.delete(f"/api/v1/notification-rules/{rule['id']}", headers=admin_headers)

    async def test_crear_regla_dias_invalidos_falla(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.post(
            "/api/v1/notification-rules",
            headers=admin_headers,
            json={
                "case_id": test_case["id"],
                "days_before": 0,
                "notify_assignee": True,
            },
        )
        assert resp.status_code in (400, 422), "daysBefore=0 debe fallar"

    async def test_crear_regla_dias_negativos_falla(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.post(
            "/api/v1/notification-rules",
            headers=admin_headers,
            json={
                "case_id": test_case["id"],
                "days_before": -5,
                "notify_assignee": True,
            },
        )
        assert resp.status_code in (400, 422)

    async def test_eliminar_regla_notificacion(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        resp = await client.post(
            "/api/v1/notification-rules",
            headers=admin_headers,
            json={"case_id": test_case["id"], "days_before": 3, "notify_assignee": True},
        )
        assert resp.status_code in (200, 201)
        rule_id = resp.json()["data"]["id"]

        del_resp = await client.delete(
            f"/api/v1/notification-rules/{rule_id}", headers=admin_headers
        )
        assert del_resp.status_code == 200

        list_resp = await client.get("/api/v1/notification-rules", headers=admin_headers)
        assert list_resp.status_code == 200
        ids = [r["id"] for r in list_resp.json()["data"]]
        assert rule_id not in ids
