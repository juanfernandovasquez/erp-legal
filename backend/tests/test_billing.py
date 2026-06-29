"""
ÁREA:        Ajustes de facturación
ARCHIVOS:    backend/app/routers/billing.py
             backend/app/models/billing.py (BillingAdjustment)
ACTIVAR SI:  Cambias billing.py · modelo BillingAdjustment · lógica de símbolo de moneda ·
             campos nombre/descripcion/monto · endpoints /billing/adjustments
MARCADORES:  billing, validation, soft_delete
BUGS CONOCIDOS:
  BUG-003: billing.py:292 muestra "USD" como símbolo en lugar de "$".
           El test test_ajuste_caso_usd_tiene_simbolo_correcto fallará hasta que se corrija.
"""

import uuid
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.billing


class TestListarAjustes:
    """Verifica el listado de ajustes de facturación por caso."""

    async def test_listar_ajustes_de_caso(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        """GET /cases/{id}/billing/adjustments → 200 con lista (puede estar vacía)."""
        resp = await client.get(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert "data" in resp.json()

    async def test_listar_ajustes_caso_inexistente(
        self, client: AsyncClient, admin_headers: dict
    ):
        """UUID inventado → 403 o 404."""
        resp = await client.get(
            f"/api/v1/cases/{uuid.uuid4()}/billing/adjustments",
            headers=admin_headers,
        )
        assert resp.status_code in (403, 404)


class TestCrearAjuste:
    """Verifica la creación de ajustes de facturación con distintos montos."""

    async def test_crear_ajuste_positivo(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        """Ajuste con monto positivo (cargo adicional) → 200 o 201 con id."""
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments",
            headers=admin_headers,
            json={"nombre": f"Cargo Adicional {uuid.uuid4().hex[:6]}", "descripcion": "Test", "monto": 500.0},
        )
        assert resp.status_code in (200, 201)
        adj = resp.json()["data"]
        assert "id" in adj
        await client.delete(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments/{adj['id']}",
            headers=admin_headers,
        )

    async def test_crear_ajuste_negativo_descuento(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        """Ajuste con monto negativo (descuento) → debe ser permitido."""
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments",
            headers=admin_headers,
            json={"nombre": f"Descuento {uuid.uuid4().hex[:6]}", "monto": -200.0},
        )
        assert resp.status_code in (200, 201)
        adj = resp.json()["data"]
        await client.delete(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments/{adj['id']}",
            headers=admin_headers,
        )

    @pytest.mark.validation
    async def test_crear_ajuste_sin_monto_falla(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        """Campo monto ausente → 400 o 422 (monto es requerido según billing.py)."""
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments",
            headers=admin_headers,
            json={"nombre": "Ajuste Sin Monto"},
        )
        assert resp.status_code in (400, 422)

    @pytest.mark.validation
    async def test_crear_ajuste_monto_cero_falla(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        """Monto = 0 → 400 o 422 (no tiene sentido un ajuste de cero)."""
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments",
            headers=admin_headers,
            json={"nombre": "Ajuste Cero", "monto": 0},
        )
        assert resp.status_code in (400, 422)


class TestSimbologiaMoneda:
    """
    Verifica que el símbolo de moneda en la respuesta sea correcto.
    BUG-003: billing.py:292 tiene 'else "USD"' cuando debería ser 'else "$"'.
    Estos tests documentan el comportamiento CORRECTO esperado.
    Fallarán hasta que BUG-003 sea corregido.
    """

    async def test_ajuste_caso_pen_devuelve_simbolo_sol(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        """Caso con moneda PEN → símbolo en respuesta debe ser 'S/', no 'PEN' ni '$'."""
        resp_case = await client.post(
            "/api/v1/cases",
            headers=admin_headers,
            json={
                "title": f"Caso PEN Simbolo {uuid.uuid4().hex[:6]}",
                "tipo_facturacion": "por_horas",
                "moneda_facturacion": "PEN",
                "client_id": test_client_entity["id"],
            },
        )
        assert resp_case.status_code in (200, 201)
        case = resp_case.json()["data"]

        resp_adj = await client.post(
            f"/api/v1/cases/{case['id']}/billing/adjustments",
            headers=admin_headers,
            json={"nombre": "Ajuste PEN", "monto": 100.0},
        )
        assert resp_adj.status_code in (200, 201)
        adj = resp_adj.json()["data"]

        simbolo = adj.get("simbolo") or adj.get("currency_symbol")
        if simbolo is not None:
            assert simbolo == "S/", f"Símbolo para PEN debe ser 'S/', obtenido: '{simbolo}'"

        await client.delete(
            f"/api/v1/cases/{case['id']}/billing/adjustments/{adj['id']}",
            headers=admin_headers,
        )
        await client.delete(f"/api/v1/cases/{case['id']}", headers=admin_headers)

    async def test_ajuste_caso_usd_devuelve_simbolo_dolar(
        self, client: AsyncClient, admin_headers: dict, test_client_entity: dict
    ):
        """Caso con moneda USD → símbolo en respuesta debe ser '$', no la cadena 'USD'. (BUG-003)"""
        resp_case = await client.post(
            "/api/v1/cases",
            headers=admin_headers,
            json={
                "title": f"Caso USD Simbolo {uuid.uuid4().hex[:6]}",
                "tipo_facturacion": "por_horas",
                "moneda_facturacion": "USD",
                "client_id": test_client_entity["id"],
            },
        )
        assert resp_case.status_code in (200, 201)
        case = resp_case.json()["data"]

        resp_adj = await client.post(
            f"/api/v1/cases/{case['id']}/billing/adjustments",
            headers=admin_headers,
            json={"nombre": "Ajuste USD", "monto": 50.0},
        )
        assert resp_adj.status_code in (200, 201)
        adj = resp_adj.json()["data"]

        simbolo = adj.get("simbolo") or adj.get("currency_symbol")
        if simbolo is not None:
            assert simbolo == "$", (
                f"Símbolo para USD debe ser '$', obtenido: '{simbolo}'. "
                f"Ver BUG-003 en INTEGRITY_TRACKER.md"
            )

        await client.delete(
            f"/api/v1/cases/{case['id']}/billing/adjustments/{adj['id']}",
            headers=admin_headers,
        )
        await client.delete(f"/api/v1/cases/{case['id']}", headers=admin_headers)


class TestActualizarAjuste:
    """Verifica la actualización de ajustes existentes."""

    async def test_actualizar_monto(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        """PATCH /billing/adjustments/{id} con nuevo monto → 200."""
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments",
            headers=admin_headers,
            json={"nombre": f"Ajuste Editable {uuid.uuid4().hex[:6]}", "monto": 100.0},
        )
        assert resp.status_code in (200, 201)
        adj = resp.json()["data"]

        upd = await client.patch(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments/{adj['id']}",
            headers=admin_headers,
            json={"monto": 250.0},
        )
        assert upd.status_code == 200
        await client.delete(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments/{adj['id']}",
            headers=admin_headers,
        )


@pytest.mark.soft_delete
class TestEliminarAjuste:
    """Verifica que los ajustes eliminados no aparecen en el listado posterior."""

    async def test_eliminar_ajuste_no_aparece_en_lista(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        """DELETE ajuste → ya no aparece en GET /billing/adjustments."""
        resp = await client.post(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments",
            headers=admin_headers,
            json={"nombre": f"Ajuste Para Eliminar {uuid.uuid4().hex[:6]}", "monto": 75.0},
        )
        assert resp.status_code in (200, 201)
        adj_id = resp.json()["data"]["id"]

        del_resp = await client.delete(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments/{adj_id}",
            headers=admin_headers,
        )
        assert del_resp.status_code == 200

        list_resp = await client.get(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments",
            headers=admin_headers,
        )
        assert list_resp.status_code == 200
        ids = [a["id"] for a in list_resp.json()["data"]]
        assert adj_id not in ids

    @pytest.mark.validation
    async def test_eliminar_ajuste_inexistente_devuelve_error(
        self, client: AsyncClient, admin_headers: dict, test_case: dict
    ):
        """UUID inventado → 403 o 404."""
        resp = await client.delete(
            f"/api/v1/cases/{test_case['id']}/billing/adjustments/{uuid.uuid4()}",
            headers=admin_headers,
        )
        assert resp.status_code in (403, 404)
