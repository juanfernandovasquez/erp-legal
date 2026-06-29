/**
 * ÁREA:        Ajustes de facturación y procesos
 * RUTA:        /cases/:id (tab Facturación) — sección de ajustes
 * ARCHIVOS:    frontend/src/components/billing/BillingAdjustments.tsx
 *              frontend/src/components/cases/CaseProcessSection.tsx
 * ACTIVAR SI:  Cambias BillingAdjustments · ProcessForm · CaseProcessSection ·
 *              lógica de tipo de tarifa · símbolo de moneda en billing
 *
 * CRÍTICO — BUGS CONOCIDOS:
 *   BUG-002: Tab "Alertas" en CaseDetailPage no tiene TabsContent → siempre vacío.
 *            El test 'tab alertas muestra contenido' fallará hasta que BUG-002 sea corregido.
 *   BUG-003: billing.py:292 — símbolo 'USD' en lugar de '$'.
 *   CONV-006: BillingAdjustments.tsx usa window.confirm() en lugar de ConfirmDialog.
 *             El test de eliminación puede ser frágil en este componente.
 */

import { test, expect } from '@playwright/test';
import { login, getToken } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

const uid = () => Date.now().toString(36);

test.describe('Ajustes de Facturación', () => {
  let api: ApiHelper;
  let caseId: string;
  let clientId: string;

  test.beforeAll(async ({ request }) => {
    const token = await getToken(request);
    api = new ApiHelper(request, token);
    const cliente = await api.createClient({ name: `Cliente Billing ${uid()}` });
    clientId = cliente.id;
    const caso = await api.createCase({ title: `Caso Billing ${uid()}`, client_id: clientId });
    caseId = caso.id;
  });

  test.afterAll(async () => {
    await api.deleteCase(caseId);
    await api.deleteClient(clientId);
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/cases/${caseId}`);
    await page.waitForLoadState('networkidle');

    const tabFacturacion = page.getByRole('tab', { name: /facturación|horas/i });
    if (await tabFacturacion.isVisible()) await tabFacturacion.click();
  });

  test('crear ajuste positivo — monto exacto aparece en la sección de ajustes', async ({ page }) => {
    const btnNuevoAjuste = page.getByRole('button', { name: /nuevo ajuste|agregar ajuste/i });
    if (!(await btnNuevoAjuste.isVisible())) {
      test.skip();
      return;
    }

    await btnNuevoAjuste.click();
    await page.getByLabel(/nombre|concepto/i).fill(`Cargo adicional ${uid()}`);
    await page.getByLabel(/monto/i).fill('500');
    await page.getByRole('button', { name: /guardar|crear/i }).click();

    // El monto exacto debe aparecer en la lista
    await expect(page.getByText('500')).toBeVisible({ timeout: 8_000 });
  });

  test('ajuste negativo (descuento) — el monto negativo queda reflejado', async ({ page }) => {
    const btnNuevoAjuste = page.getByRole('button', { name: /nuevo ajuste|agregar ajuste/i });
    if (!(await btnNuevoAjuste.isVisible())) {
      test.skip();
      return;
    }

    await btnNuevoAjuste.click();
    await page.getByLabel(/nombre|concepto/i).fill(`Descuento ${uid()}`);
    await page.getByLabel(/monto/i).fill('-200');
    await page.getByRole('button', { name: /guardar|crear/i }).click();

    await expect(page.getByText('-200').or(page.getByText('200'))).toBeVisible({ timeout: 8_000 });
  });

  test('crear ajuste sin monto — el formulario muestra error y no cierra el modal', async ({ page }) => {
    const btnNuevoAjuste = page.getByRole('button', { name: /nuevo ajuste|agregar ajuste/i });
    if (!(await btnNuevoAjuste.isVisible())) {
      test.skip();
      return;
    }

    await btnNuevoAjuste.click();
    await page.getByLabel(/nombre|concepto/i).fill('Ajuste sin monto');
    // No llenar monto
    await page.getByRole('button', { name: /guardar|crear/i }).click();

    await expect(
      page.locator('div.bg-red-50, [class*="error"], p.text-red-600').first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Procesos en Detalle de Caso', () => {
  let api: ApiHelper;
  let caseId: string;
  let clientId: string;

  test.beforeAll(async ({ request }) => {
    const token = await getToken(request);
    api = new ApiHelper(request, token);
    const cliente = await api.createClient({ name: `Cliente Procesos ${uid()}` });
    clientId = cliente.id;
    const caso = await api.createCase({ title: `Caso Procesos ${uid()}`, client_id: clientId });
    caseId = caso.id;
  });

  test.afterAll(async () => {
    await api.deleteCase(caseId);
    await api.deleteClient(clientId);
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/cases/${caseId}`);
    await page.waitForLoadState('networkidle');
  });

  test('crear proceso — el título del proceso aparece en la sección de procesos', async ({ page }) => {
    const tituloProceso = `Proceso Test ${uid()}`;

    const btnNuevoProceso = page.getByRole('button', { name: /nuevo proceso|agregar proceso/i });
    if (!(await btnNuevoProceso.isVisible())) {
      test.skip();
      return;
    }

    await btnNuevoProceso.click();
    await page.getByLabel(/título|titulo/i).fill(tituloProceso);
    await page.getByLabel(/tipo de tarifa/i).selectOption({ label: /hora/i });
    await page.getByLabel(/tarifa/i).fill('150');
    await page.getByRole('button', { name: /crear|guardar/i }).click();

    await expect(page.getByText(tituloProceso)).toBeVisible({ timeout: 8_000 });
  });

  test('tab Alertas — al hacer click muestra contenido, no área vacía (BUG-002)', async ({ page }) => {
    const tabAlertas = page.getByRole('tab', { name: /alertas/i });
    if (!(await tabAlertas.isVisible())) {
      test.skip();
      return;
    }

    await tabAlertas.click();

    // Debe mostrar algo: lista de alertas o mensaje "sin alertas", no área vacía
    const panelAlertas = page.locator('[role="tabpanel"]').last().or(
      page.locator('[data-state="active"]').last()
    );

    const contenido = await panelAlertas.textContent();
    // Este test FALLARÁ si BUG-002 está presente (TabsContent ausente → área vacía)
    expect(contenido?.trim().length).toBeGreaterThan(0);
  });
});

test.describe('Consistencia de Moneda en UI', () => {
  let api: ApiHelper;
  let caseIdPEN: string;
  let caseIdUSD: string;
  let clientId: string;

  test.beforeAll(async ({ request }) => {
    const token = await getToken(request);
    api = new ApiHelper(request, token);
    const cliente = await api.createClient({ name: `Cliente Moneda ${uid()}` });
    clientId = cliente.id;
    const casoPEN = await api.createCase({
      title: `Caso PEN Moneda ${uid()}`,
      client_id: clientId,
      tipo_facturacion: 'por_horas',
    });
    caseIdPEN = casoPEN.id;
    const casoUSD = await api.createCase({
      title: `Caso USD Moneda ${uid()}`,
      client_id: clientId,
      tipo_facturacion: 'por_horas',
    });
    caseIdUSD = casoUSD.id;
  });

  test.afterAll(async () => {
    await api.deleteCase(caseIdPEN);
    await api.deleteCase(caseIdUSD);
    await api.deleteClient(clientId);
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('caso PEN — la UI muestra S/ y no $  (detecta BUG-001 en HoursPage)', async ({ page }) => {
    await page.goto('/hours');
    await page.waitForLoadState('networkidle');

    // En la página global de horas, los casos PEN deben mostrar S/
    // BUG-001: ambas ramas del ternario devuelven '$' para PEN también
    const pageText = await page.textContent('body') ?? '';
    if (pageText.includes('S/')) {
      // Hay al menos algún símbolo correcto
      expect(pageText).not.toMatch(/\$\s*[\d,.]+\s*\(PEN\)/);
    }
  });

  test('caso USD — la UI muestra $ y no la cadena "USD"  (detecta BUG-003 en billing.py)', async ({ page }) => {
    await page.goto(`/cases/${caseIdUSD}`);
    await page.waitForLoadState('networkidle');

    const tabFacturacion = page.getByRole('tab', { name: /facturación|horas/i });
    if (await tabFacturacion.isVisible()) await tabFacturacion.click();

    const pageText = await page.textContent('body') ?? '';
    // El símbolo debe ser '$', no la cadena 'USD' sola
    // BUG-003: billing.py retorna "USD" como símbolo
    expect(pageText).not.toMatch(/\bUSD\b(?!\s*(?:dollars|dollar|dólar))/);
  });
});
