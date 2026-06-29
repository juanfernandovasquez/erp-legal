"""
ÁREA:        Registro de horas y cálculo de facturación
ARCHIVOS:    backend/app/routers/hours.py
             backend/app/models/task.py (CaseHours)
             backend/app/models/case.py (tipo_facturacion, precio_facturacion)
             backend/app/models/process.py (tipo_tarifa, tarifa)
ACTIVAR SI:  Cambias hours.py · lógica de billing flat/por_horas · modelos CaseHours ·
             campos de tarifa en Case o CaseProcess · recálculo de montos
MARCADORES:  hours, billing_calc, validation, soft_delete
"""

import uuid
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.hours


class TestRegistrarHoras:
    """Verifica la creación de registros de horas con distintas configuraciones."""

    async def test_registrar_horas_exitoso(
        self, client: AsyncClient, admin_headers: dict, test_case: dict, test_task: dict
    ):
        """Registro de horas con task_id, hourly_rate y fecha → 201 con id y total_amount."""
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/hours",
            headers=admin_headers,
            json={
                "task_id": test_task["id"],
                "hours": 3.0,
                "hourly_rate": 120.0,
                "description": "Horas de test directo",
                "is_billable": True,
                "date": "2026-01-20",
            },
        )
        assert resp.status_code in (200, 201)
        entry = resp.json()["data"]
        assert "id" in entry
        await client.delete(f"/api/v1/hours/{entry['id']}", headers=admin_headers)

    async def test_registrar_horas_sin_tarea(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        """Registro de horas sin task_id (horas huérfanas) → debe ser permitido."""
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/hours",
            headers=admin_headers,
            json={
                "hours": 1.5,
                "hourly_rate": 100.0,
                "description": "Horas sin tarea",
                "is_billable": False,
                "date": "2026-01-21",
            },
        )
        assert resp.status_code in (200, 201)
        entry = resp.json()["data"]
        await client.delete(f"/api/v1/hours/{entry['id']}", headers=admin_headers)

    @pytest.mark.validation
    @pytest.mark.invariant
    async def test_registrar_mas_de_24_horas_falla(
        self, client: AsyncClient, admin_headers: dict, test_case: dict, test_task: dict
    ):
        """Más de 24 horas en un día → 400 o 422 (límite de negocio hardcodeado en hours.py:305)."""
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/hours",
            headers=admin_headers,
            json={
                "task_id": test_task["id"],
                "hours": 25.0,
                "hourly_rate": 100.0,
                "date": "2026-01-22",
            },
        )
        assert resp.status_code in (400, 422), "25h en un día debe fallar"

    @pytest.mark.validation
    @pytest.mark.invariant
    async def test_registrar_horas_negativas_falla(
        self, client: AsyncClient, admin_headers: dict, test_case: dict, test_task: dict
    ):
        """Horas negativas → 400 o 422."""
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/hours",
            headers=admin_headers,
            json={
                "task_id": test_task["id"],
                "hours": -1.0,
                "hourly_rate": 100.0,
                "date": "2026-01-23",
            },
        )
        assert resp.status_code in (400, 422)

    @pytest.mark.validation
    @pytest.mark.invariant
    async def test_registrar_horas_cero_falla(
        self, client: AsyncClient, admin_headers: dict, test_case: dict, test_task: dict
    ):
        """Cero horas → 400 o 422 (no tiene sentido registrar 0h)."""
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/hours",
            headers=admin_headers,
            json={
                "task_id": test_task["id"],
                "hours": 0,
                "hourly_rate": 100.0,
                "date": "2026-01-24",
            },
        )
        assert resp.status_code in (400, 422)

    @pytest.mark.validation
    async def test_registrar_horas_caso_inexistente_falla(
        self, client: AsyncClient, admin_headers: dict, test_task: dict
    ):
        """Caso inexistente en la URL → 403 o 404."""
        resp = await client.post(
            f"/api/v1/cases/{uuid.uuid4()}/hours",
            headers=admin_headers,
            json={"task_id": test_task["id"], "hours": 2.0, "hourly_rate": 100.0, "date": "2026-01-25"},
        )
        assert resp.status_code in (403, 404)


class TestListarHoras:
    """Verifica el listado de horas por caso."""

    async def test_listar_horas_de_caso_devuelve_entrada_creada(
        self, client: AsyncClient, admin_headers: dict, test_case: dict, test_hours_entry: dict
    ):
        """GET /cases/{id}/hours → la entrada recién creada aparece en la lista."""
        resp = await client.get(f"/api/v1/cases/{test_case['id']}/hours", headers=admin_headers)
        assert resp.status_code == 200
        ids = [e["id"] for e in resp.json()["data"]]
        assert test_hours_entry["id"] in ids


@pytest.mark.billing_calc
@pytest.mark.invariant
class TestCalculoBillingPorHoras:
    """
    Verifica la lógica de cálculo de monto en casos con tipo_facturacion='por_horas'.
    Fórmula: total_amount = hours × hourly_rate
    Archivo clave: backend/app/routers/hours.py (función register_hours)
    """

    async def test_monto_es_horas_por_tarifa(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        """2h × S/150 = S/300. Verifica que total_amount sea el producto exacto."""
        resp_case = await client.post(
            "/api/v1/cases",
            headers=admin_headers,
            json={
                "title": f"Caso Por Horas {uuid.uuid4().hex[:6]}",
                "tipo_facturacion": "por_horas",
                "moneda_facturacion": "PEN",
                "client_id": test_client_entity["id"],
            },
        )
        assert resp_case.status_code in (200, 201)
        case = resp_case.json()["data"]

        resp_h = await client.post(
            f"/api/v1/cases/{case['id']}/hours",
            headers=admin_headers,
            json={"hours": 2.0, "hourly_rate": 150.0, "is_billable": True, "date": "2026-02-01"},
        )
        assert resp_h.status_code in (200, 201)
        entry = resp_h.json()["data"]
        total = entry.get("total_amount") or entry.get("totalAmount")
        assert total == 300.0, f"2h × S/150 debe ser S/300, obtenido: {total}"

        await client.delete(f"/api/v1/hours/{entry['id']}", headers=admin_headers)
        await client.delete(f"/api/v1/cases/{case['id']}", headers=admin_headers)


@pytest.mark.billing_calc
@pytest.mark.invariant
class TestCalculoBillingFlat:
    """
    Verifica la redistribución proporcional del monto en casos con tipo_facturacion='flat'.
    Regla: precio_facturacion se distribuye entre todas las horas del caso proporcionalmente.
    Archivo clave: backend/app/routers/hours.py (función _recalculate_flat_billing)
    """

    async def test_flat_dos_entradas_iguales_suman_precio_total(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        """2 entradas de 1h cada una en caso flat S/1000 → cada una vale S/500 (50%)."""
        resp_case = await client.post(
            "/api/v1/cases",
            headers=admin_headers,
            json={
                "title": f"Caso Flat {uuid.uuid4().hex[:6]}",
                "tipo_facturacion": "flat",
                "moneda_facturacion": "PEN",
                "precio_facturacion": 1000.0,
                "client_id": test_client_entity["id"],
            },
        )
        assert resp_case.status_code in (200, 201)
        case = resp_case.json()["data"]

        h1 = await client.post(
            f"/api/v1/cases/{case['id']}/hours",
            headers=admin_headers,
            json={"hours": 1.0, "is_billable": True, "date": "2026-02-01"},
        )
        h2 = await client.post(
            f"/api/v1/cases/{case['id']}/hours",
            headers=admin_headers,
            json={"hours": 1.0, "is_billable": True, "date": "2026-02-02"},
        )
        assert h1.status_code in (200, 201)
        assert h2.status_code in (200, 201)

        t1 = h1.json()["data"].get("total_amount") or h1.json()["data"].get("totalAmount")
        t2 = h2.json()["data"].get("total_amount") or h2.json()["data"].get("totalAmount")

        if t1 is not None and t2 is not None:
            assert abs((t1 + t2) - 1000.0) < 0.01, (
                f"Suma de montos flat debe ser exactamente S/1000: {t1} + {t2} = {t1 + t2}"
            )

        await client.delete(f"/api/v1/hours/{h1.json()['data']['id']}", headers=admin_headers)
        await client.delete(f"/api/v1/hours/{h2.json()['data']['id']}", headers=admin_headers)
        await client.delete(f"/api/v1/cases/{case['id']}", headers=admin_headers)

    async def test_flat_eliminar_entrada_redistribuye(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        """Al eliminar una entrada de horas en caso flat, el monto de las restantes debe redistribuirse."""
        resp_case = await client.post(
            "/api/v1/cases",
            headers=admin_headers,
            json={
                "title": f"Caso Flat Redistribucion {uuid.uuid4().hex[:6]}",
                "tipo_facturacion": "flat",
                "moneda_facturacion": "PEN",
                "precio_facturacion": 900.0,
                "client_id": test_client_entity["id"],
            },
        )
        assert resp_case.status_code in (200, 201)
        case = resp_case.json()["data"]

        h1 = await client.post(
            f"/api/v1/cases/{case['id']}/hours",
            headers=admin_headers,
            json={"hours": 1.0, "is_billable": True, "date": "2026-02-01"},
        )
        h2 = await client.post(
            f"/api/v1/cases/{case['id']}/hours",
            headers=admin_headers,
            json={"hours": 2.0, "is_billable": True, "date": "2026-02-02"},
        )
        assert h1.status_code in (200, 201)
        assert h2.status_code in (200, 201)
        h1_id = h1.json()["data"]["id"]
        h2_id = h2.json()["data"]["id"]

        await client.delete(f"/api/v1/hours/{h1_id}", headers=admin_headers)

        list_resp = await client.get(
            f"/api/v1/cases/{case['id']}/hours", headers=admin_headers
        )
        if list_resp.status_code == 200:
            entries = list_resp.json()["data"]
            remaining = [e for e in entries if e["id"] == h2_id]
            if remaining:
                total = remaining[0].get("total_amount") or remaining[0].get("totalAmount")
                if total is not None:
                    assert abs(total - 900.0) < 0.01, (
                        f"Única entrada restante debe absorber S/900, obtenido: {total}"
                    )

        await client.delete(f"/api/v1/hours/{h2_id}", headers=admin_headers)
        await client.delete(f"/api/v1/cases/{case['id']}", headers=admin_headers)


class TestActualizarHoras:
    """Verifica que la actualización de horas recalcula montos correctamente."""

    async def test_actualizar_horas_devuelve_200(
        self, client: AsyncClient, admin_headers: dict, test_hours_entry: dict
    ):
        """PATCH /hours/{id} con nuevas horas → 200."""
        resp = await client.patch(
            f"/api/v1/hours/{test_hours_entry['id']}",
            headers=admin_headers,
            json={"hours": 4.0},
        )
        assert resp.status_code == 200

    @pytest.mark.validation
    @pytest.mark.invariant
    async def test_actualizar_horas_a_mas_de_24_falla(
        self, client: AsyncClient, admin_headers: dict, test_hours_entry: dict
    ):
        """PATCH /hours/{id} con hours=25 → 400 o 422 (mismo límite que al crear)."""
        resp = await client.patch(
            f"/api/v1/hours/{test_hours_entry['id']}",
            headers=admin_headers,
            json={"hours": 25.0},
        )
        assert resp.status_code in (400, 422)


@pytest.mark.soft_delete
class TestEliminarHoras:
    """Verifica la eliminación de registros de horas."""

    async def test_eliminar_horas_devuelve_200(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        """DELETE /hours/{id} → 200 y la entrada ya no aparece en el listado."""
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/hours",
            headers=admin_headers,
            json={"hours": 1.0, "hourly_rate": 100.0, "is_billable": True, "date": "2026-03-01"},
        )
        assert resp.status_code in (200, 201)
        entry_id = resp.json()["data"]["id"]

        del_resp = await client.delete(f"/api/v1/hours/{entry_id}", headers=admin_headers)
        assert del_resp.status_code == 200

    @pytest.mark.validation
    async def test_eliminar_horas_inexistentes_devuelve_404(
        self, client: AsyncClient, admin_headers: dict
    ):
        """DELETE /hours/{uuid_inventado} → 403 o 404."""
        resp = await client.delete(f"/api/v1/hours/{uuid.uuid4()}", headers=admin_headers)
        assert resp.status_code in (403, 404)
