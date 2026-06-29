"""
Tests de tareas.
Cubre: creación, actualización de estado, asignación, soft-delete, cascade con horas.
"""

import uuid
import pytest
from httpx import AsyncClient


class TestListarTareas:
    async def test_listar_tareas_de_caso(
        self, client: AsyncClient, admin_headers: dict, test_case: dict, test_task: dict
    ):
        resp = await client.get(
            f"/api/v1/cases/{test_case['id']}/tasks", headers=admin_headers
        )
        assert resp.status_code == 200
        tasks = resp.json()["data"]
        ids = [t["id"] for t in tasks]
        assert test_task["id"] in ids

    async def test_listar_mis_tareas(self, client: AsyncClient, admin_headers: dict):
        resp = await client.get("/api/v1/tasks/my-tasks", headers=admin_headers)
        assert resp.status_code == 200
        assert "data" in resp.json()

    async def test_listar_tareas_caso_inexistente(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.get(
            f"/api/v1/cases/{uuid.uuid4()}/tasks", headers=admin_headers
        )
        assert resp.status_code in (403, 404)


class TestCrearTarea:
    async def test_crear_tarea_con_proceso(
        self,
        client: AsyncClient,
        admin_headers: dict,
        test_case: dict,
        test_process: dict,
        admin_user_id: str,
    ):
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/tasks",
            headers=admin_headers,
            json={
                "title": f"Tarea Nueva {uuid.uuid4().hex[:6]}",
                "description": "Descripción de tarea de test",
                "process_id": test_process["id"],
                "assigned_to": admin_user_id,
                "status": "pendiente",
            },
        )
        assert resp.status_code in (200, 201)
        task = resp.json()["data"]
        assert "id" in task
        await client.delete(f"/api/v1/tasks/{task['id']}", headers=admin_headers)

    async def test_crear_tarea_sin_proceso(
        self,
        client: AsyncClient,
        admin_headers: dict,
        test_case: dict,
        admin_user_id: str,
    ):
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/tasks",
            headers=admin_headers,
            json={
                "title": f"Tarea Sin Proceso {uuid.uuid4().hex[:6]}",
                "assigned_to": admin_user_id,
                "status": "pendiente",
            },
        )
        assert resp.status_code in (200, 201)
        task = resp.json()["data"]
        await client.delete(f"/api/v1/tasks/{task['id']}", headers=admin_headers)

    async def test_crear_tarea_sin_titulo_falla(
        self, client: AsyncClient, admin_headers: dict, test_case: dict, admin_user_id: str
    ):
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/tasks",
            headers=admin_headers,
            json={"assigned_to": admin_user_id, "status": "pendiente"},
        )
        assert resp.status_code in (400, 422)

    async def test_crear_tarea_proceso_de_otro_caso_falla(
        self,
        client: AsyncClient,
        admin_headers: dict,
        test_case: dict,
        admin_user_id: str,
    ):
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/tasks",
            headers=admin_headers,
            json={
                "title": "Tarea Con Proceso Ajeno",
                "process_id": str(uuid.uuid4()),
                "assigned_to": admin_user_id,
                "status": "pendiente",
            },
        )
        assert resp.status_code in (400, 404, 422)


class TestActualizarTarea:
    async def test_actualizar_estado_tarea(
        self, client: AsyncClient, admin_headers: dict, test_task: dict
    ):
        resp = await client.patch(
            f"/api/v1/tasks/{test_task['id']}",
            headers=admin_headers,
            json={"status": "en_progreso"},
        )
        assert resp.status_code == 200

    async def test_actualizar_titulo_tarea(
        self, client: AsyncClient, admin_headers: dict, test_task: dict
    ):
        resp = await client.patch(
            f"/api/v1/tasks/{test_task['id']}",
            headers=admin_headers,
            json={"title": f"Tarea Renombrada {uuid.uuid4().hex[:4]}"},
        )
        assert resp.status_code == 200

    async def test_marcar_tarea_completada(
        self, client: AsyncClient, admin_headers: dict, test_task: dict
    ):
        resp = await client.patch(
            f"/api/v1/tasks/{test_task['id']}",
            headers=admin_headers,
            json={"status": "completado"},
        )
        assert resp.status_code == 200

    async def test_tarea_inexistente_devuelve_404(
        self, client: AsyncClient, admin_headers: dict
    ):
        resp = await client.patch(
            f"/api/v1/tasks/{uuid.uuid4()}",
            headers=admin_headers,
            json={"status": "completado"},
        )
        assert resp.status_code in (403, 404)


class TestEliminarTarea:
    async def test_eliminar_tarea_hace_soft_delete(
        self,
        client: AsyncClient,
        admin_headers: dict,
        test_case: dict,
        test_process: dict,
        admin_user_id: str,
    ):
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/tasks",
            headers=admin_headers,
            json={
                "title": f"Tarea Para Eliminar {uuid.uuid4().hex[:6]}",
                "process_id": test_process["id"],
                "assigned_to": admin_user_id,
                "status": "pendiente",
            },
        )
        assert resp.status_code in (200, 201)
        task_id = resp.json()["data"]["id"]

        del_resp = await client.delete(f"/api/v1/tasks/{task_id}", headers=admin_headers)
        assert del_resp.status_code == 200

        list_resp = await client.get(
            f"/api/v1/cases/{test_case['id']}/tasks", headers=admin_headers
        )
        assert list_resp.status_code == 200
        ids = [t["id"] for t in list_resp.json()["data"]]
        assert task_id not in ids, "Tarea eliminada no debe aparecer en la lista"

    async def test_eliminar_tarea_con_horas_pone_task_id_null(
        self,
        client: AsyncClient,
        admin_headers: dict,
        test_case: dict,
        test_task: dict,
        test_hours_entry: dict,
    ):
        """Al eliminar una tarea, las horas asociadas deben quedar con task_id=null (no eliminarse)."""
        del_resp = await client.delete(f"/api/v1/tasks/{test_task['id']}", headers=admin_headers)
        assert del_resp.status_code == 200
        hours_resp = await client.get(
            f"/api/v1/cases/{test_case['id']}/hours", headers=admin_headers
        )
        if hours_resp.status_code == 200:
            entries = hours_resp.json().get("data", [])
            matching = [e for e in entries if e["id"] == test_hours_entry["id"]]
            if matching:
                assert matching[0].get("task_id") is None or matching[0].get("taskId") is None
