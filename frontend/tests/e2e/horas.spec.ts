/**
 * ÁREA:        Registro de horas y facturación (HoursPage)
 * RUTA:        /hours  y  /cases/:id (tab Facturación)
 * ARCHIVOS:    frontend/src/pages/hours/HoursPage.tsx
 *              frontend/src/components/hours/HoursForm.tsx
 *              frontend/src/components/hours/HoursTable.tsx
 * ACTIVAR SI:  Cambias HoursPage · HoursForm · HoursTable · lógica de billing ·
 *              símbolo de moneda · cálculo de totales
 *
 * CRÍTICO — BUGS CONOCIDOS QUE ESTOS TESTS DETECTAN:
 *   BUG-001: HoursPage.tsx:1455,1705 — símbolo '$' siempre, incluso para casos PEN.
 *            El test 'simbolo de moneda PEN' fallará hasta que BUG-001 sea corregido.
 *   BUG-004: hours.py:289 — print(DEBUG...) en producción.
 *            No verificable en frontend, pero monitorear logs del backend.
 *
 * FILOSOFÍA: El usuario necesita ver los montos correctos en la moneda correcta.
 * Un error de símbolo de moneda es un error de datos — no cosmético.
 */

import { test, expect } from '@playwright/test';
import { login, getToken } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

const uid = () => Date.now().toString(36);

test.describe('Página de Horas (/hours)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/hours');
    await page.waitForLoadState('networkidle');
  });

  test('la página carga sin errores y muestra la sección principal', async ({ page }) => {
    await expect(page).toHaveURL(/hours/);
    await expect(
      page.getByRole('heading', { name: /facturación|horas/i }).or(page.getByText(/horas/i).first())
    ).toBeVisible();
  });

  test('los KPIs muestran números, no "NaN" ni "undefined"', async ({ page }) => {
    const contenido = await page.textContent('body');
    expect(contenido).not.toContain('NaN');
    expect(contenido).not.toContain('undefined');
    expect(contenido).not.toContain('[object Object]');
  });
});

test.describe('Registro de horas en detalle de caso', () => {
  let api: ApiHelper;
  let caseIdPEN: string;
  let caseIdUSD: string;
  let clientId: string;

  test.beforeAll(async ({ request }) => {
    const token = await getToken(request);
    api = new ApiHelper(request, token);
    const cliente = await api.createClient({ name: `Cliente Horas ${uid()}` });
    clientId = cliente.id;

    const casoPEN = await api.createCase({
      title: `Caso PEN Horas ${uid()}`,
      client_id: clientId,
      tipo_facturacion: 'por_horas',
    });
    caseIdPEN = casoPEN.id;

    const casoUSD = await api.createCase({
      title: `Caso USD Horas ${uid()}`,
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

  test('registrar horas — las horas aparecen en la tabla de facturación del caso', async ({ page }) => {
    await page.goto(`/cases/${caseIdPEN}`);
    await page.waitForLoadState('networkidle');

    // Ir al tab de facturación/horas
    const tabFacturacion = page.getByRole('tab', { name: /facturación|horas/i });
    if (await tabFacturacion.isVisible()) await tabFacturacion.click();

    // Abrir form de registro de horas
    await page.getByRole('button', { name: /registrar horas|nueva hora|agregar horas/i }).click();

    await page.getByLabel(/horas/i).fill('3');
    await page.getByLabel(/tarifa|precio/i).fill('100');
    await page.getByLabel(/descripción|descripcion/i).fill(`Revisión contrato ${uid()}`);
    await page.getByRole('button', { name: /guardar|registrar/i }).click();

    // Las 3 horas deben aparecer en la tabla
    await expect(page.getByText('3')).toBeVisible({ timeout: 8_000 });
  });

  // @invariant — regla de negocio: el símbolo de moneda debe corresponder a la moneda del caso
  test('símbolo de moneda — caso PEN muestra S/ no $  (BUG-001)', async ({ page }) => {
    await page.goto(`/cases/${caseIdPEN}`);
    await page.waitForLoadState('networkidle');

    const tabFacturacion = page.getByRole('tab', { name: /facturación|horas/i });
    if (await tabFacturacion.isVisible()) await tabFacturacion.click();

    const pageText = await page.textContent('body') ?? '';

    // Verificar que aparece el símbolo correcto para soles
    // Este test FALLARÁ si BUG-001 está presente (muestra $ en lugar de S/)
    expect(pageText).toContain('S/');
    expect(pageText).not.toMatch(/\$\s*\d.*S\/|\$.*moneda.*PEN/);
  });

  // @invariant — regla de negocio: no se pueden registrar más de 24 horas en un día
  test('registrar más de 24 horas — el formulario rechaza el valor con mensaje de error', async ({ page }) => {
    await page.goto(`/cases/${caseIdPEN}`);
    await page.waitForLoadState('networkidle');

    const tabFacturacion = page.getByRole('tab', { name: /facturación|horas/i });
    if (await tabFacturacion.isVisible()) await tabFacturacion.click();

    await page.getByRole('button', { name: /registrar horas|nueva hora|agregar horas/i }).click();
    await page.getByLabel(/horas/i).fill('25');
    await page.getByRole('button', { name: /guardar|registrar/i }).click();

    // El form no debe cerrarse y debe mostrar error
    await expect(
      page.locator('div.bg-red-50, [class*="error"], p.text-red-600').first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // @invariant — regla matemática: total = horas × tarifa. No negociable.
  test('total facturado — es el resultado de horas × tarifa, no un número arbitrario', async ({ page, request }) => {
    // Crear horas via API con valores conocidos: 2h × S/150 = S/300
    const casoTest = await api.createCase({ title: `Caso Total ${uid()}`, client_id: clientId });
    const token = await getToken(request);
    await request.post(
      `${process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000'}/api/v1/cases/${casoTest.id}/hours`,
      {
        data: { hours: 2.0, hourly_rate: 150.0, is_billable: true, date: '2026-01-15' },
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    await page.goto(`/cases/${casoTest.id}`);
    await page.waitForLoadState('networkidle');

    const tabFacturacion = page.getByRole('tab', { name: /facturación|horas/i });
    if (await tabFacturacion.isVisible()) await tabFacturacion.click();

    // S/300 debe aparecer en algún lugar de la sección de facturación
    await expect(page.getByText('300')).toBeVisible({ timeout: 8_000 });

    await api.deleteCase(casoTest.id);
  });
});

test.describe('HoursPage — vista global /hours', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/hours');
    await page.waitForLoadState('networkidle');
  });

  test('los filtros de año y mes funcionan sin romper la página', async ({ page }) => {
    const filtroYear = page.getByRole('combobox', { name: /año/i }).or(page.locator('select').first());
    if (await filtroYear.isVisible()) {
      await filtroYear.selectOption('2026');
      await page.waitForTimeout(500);
      const contenido = await page.textContent('body') ?? '';
      expect(contenido).not.toContain('Error');
      expect(contenido).not.toContain('undefined');
    }
  });

  test('los gráficos no muestran NaN en los tooltips ni en los ejes', async ({ page }) => {
    await page.waitForTimeout(1_000); // dejar que carguen los gráficos
    const contenido = await page.textContent('body') ?? '';
    expect(contenido).not.toContain('NaN');
  });
});
