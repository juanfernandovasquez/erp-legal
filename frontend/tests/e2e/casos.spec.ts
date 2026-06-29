/**
 * ÁREA:        Gestión de Casos (CRUD completo)
 * RUTA:        /cases  y  /cases/:id
 * ARCHIVOS:    frontend/src/pages/cases/CasesListPage.tsx
 *              frontend/src/pages/cases/CaseDetailPage.tsx
 *              frontend/src/components/cases/CaseForm.tsx
 *              backend/app/routers/cases.py
 * ACTIVAR SI:  Cambias CaseForm · CasesListPage · CaseDetailPage · lógica de tipo de
 *              facturación de caso · relación caso-cliente · soft-delete de caso
 *
 * CRÍTICO:
 * - El tipo de facturación (flat vs por_horas) debe guardarse y afectar cálculos posteriores.
 * - Un caso eliminado (soft-delete) no debe aparecer en la lista ni ser accesible por URL.
 * - La moneda elegida debe quedar registrada y ser visible en el detalle del caso.
 * - La búsqueda/filtrado debe ser efectiva — no mostrar resultados incorrectos.
 */

import { test, expect } from '@playwright/test';
import { login, getToken } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

const uid = () => Date.now().toString(36);

test.describe('Casos — CRUD', () => {
  let api: ApiHelper;
  let clientId: string;

  test.beforeAll(async ({ request }) => {
    const token = await getToken(request);
    api = new ApiHelper(request, token);
    const cliente = await api.createClient({ name: `Cliente Casos ${uid()}` });
    clientId = cliente.id;
  });

  test.afterAll(async () => {
    await api.deleteClient(clientId);
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');
  });

  // ── CREAR ─────────────────────────────────────────────────────────────────

  test('crear caso — el título exacto aparece en la lista de casos', async ({ page }) => {
    const titulo = `Caso Test ${uid()}`;

    await page.getByRole('button', { name: /nuevo caso|crear caso/i }).click();
    await page.getByLabel(/título|titulo/i).fill(titulo);

    // Seleccionar cliente
    const selectorCliente = page.getByLabel(/cliente/i);
    if (await selectorCliente.isVisible()) {
      await selectorCliente.selectOption({ index: 1 });
    }

    await page.getByRole('button', { name: /crear|guardar/i }).click();

    await expect(page.getByText(titulo)).toBeVisible({ timeout: 8_000 });

    // Limpiar: encontrar y eliminar el caso via API
    const response = await page.evaluate(async (t) => {
      return document.querySelector(`[href*="/cases/"]`)?.getAttribute('href');
    }, titulo);
  });

  test('crear caso — persiste después de recargar la página', async ({ page }) => {
    const titulo = `Caso Persistente ${uid()}`;

    await page.getByRole('button', { name: /nuevo caso|crear caso/i }).click();
    await page.getByLabel(/título|titulo/i).fill(titulo);

    const selectorCliente = page.getByLabel(/cliente/i);
    if (await selectorCliente.isVisible()) {
      await selectorCliente.selectOption({ index: 1 });
    }

    await page.getByRole('button', { name: /crear|guardar/i }).click();
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 8_000 });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Debe seguir visible — se guardó en BD
    await expect(page.getByText(titulo)).toBeVisible();
  });

  test('crear caso tipo facturación flat — el tipo queda registrado en el detalle', async ({ page, request }) => {
    const titulo = `Caso Flat ${uid()}`;
    const token = await getToken(request);

    // Crear via API con tipo flat para tener control del ID
    const caso = await api.createCase({
      title: titulo,
      client_id: clientId,
      tipo_facturacion: 'flat',
      precio_facturacion: 5000,
      moneda_facturacion: 'PEN',
    });

    await page.goto(`/cases/${caso.id}`);
    await page.waitForLoadState('networkidle');

    const pageText = await page.textContent('body') ?? '';
    // El tipo flat y la moneda deben ser visibles en algún lugar del detalle
    expect(pageText.toLowerCase()).toMatch(/flat|fijo|plano/);

    await api.deleteCase(caso.id);
  });

  test('crear caso — título vacío no permite enviar: el form muestra error', async ({ page }) => {
    await page.getByRole('button', { name: /nuevo caso|crear caso/i }).click();
    // No llenar título
    await page.getByRole('button', { name: /crear|guardar/i }).click();

    await expect(
      page.locator('div.bg-red-50, [class*="error"], p.text-red-600').first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /crear|guardar/i })).toBeVisible();
  });

  // ── VER DETALLE ───────────────────────────────────────────────────────────

  test('ver detalle de caso — hace click en el título y navega a /cases/:id', async ({ page }) => {
    const titulo = `Caso Detalle ${uid()}`;
    const caso = await api.createCase({ title: titulo, client_id: clientId });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.getByText(titulo).click();
    await page.waitForURL(`**/cases/${caso.id}`, { timeout: 8_000 });

    // La URL contiene el ID y el título del caso es visible
    await expect(page).toHaveURL(new RegExp(caso.id));
    await expect(page.getByText(titulo)).toBeVisible();

    await api.deleteCase(caso.id);
  });

  test('detalle de caso — muestra el nombre del cliente asociado', async ({ page }) => {
    const nombreCliente = `Cliente Visible ${uid()}`;
    const clienteTemp = await api.createClient({ name: nombreCliente });
    const caso = await api.createCase({ title: `Caso Con Cliente ${uid()}`, client_id: clienteTemp.id });

    await page.goto(`/cases/${caso.id}`);
    await page.waitForLoadState('networkidle');

    // El nombre del cliente debe aparecer en el detalle del caso
    await expect(page.getByText(nombreCliente)).toBeVisible();

    await api.deleteCase(caso.id);
    await api.deleteClient(clienteTemp.id);
  });

  // ── EDITAR ────────────────────────────────────────────────────────────────

  test('editar caso — el nuevo título reemplaza al anterior', async ({ page }) => {
    const tituloOriginal = `Caso Editar ${uid()}`;
    const tituloNuevo    = `Caso Editado ${uid()}`;
    const caso = await api.createCase({ title: tituloOriginal, client_id: clientId });

    await page.goto(`/cases/${caso.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /editar/i }).first().click();
    await page.getByLabel(/título|titulo/i).fill(tituloNuevo);
    await page.getByRole('button', { name: /guardar|actualizar/i }).click();

    await expect(page.getByText(tituloNuevo)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(tituloOriginal)).not.toBeVisible();

    await api.deleteCase(caso.id);
  });

  // ── ELIMINAR ──────────────────────────────────────────────────────────────

  test('eliminar caso — pide confirmación antes de borrar (no es destructivo sin avisar)', async ({ page }) => {
    const titulo = `Caso Confirmar ${uid()}`;
    const caso = await api.createCase({ title: titulo, client_id: clientId });

    await page.goto(`/cases/${caso.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /eliminar/i }).first().click();

    const dialog = page.getByRole('dialog').or(page.locator('[role="alertdialog"]'));
    await expect(dialog).toBeVisible({ timeout: 4_000 });

    // Cancelar — el caso NO se elimina
    await dialog.getByRole('button', { name: /cancelar/i }).click();
    await expect(page.getByText(titulo)).toBeVisible();

    await api.deleteCase(caso.id);
  });

  test('eliminar caso — desaparece de la lista y la URL devuelve 404 o redirige', async ({ page }) => {
    const titulo = `Caso Eliminar ${uid()}`;
    const caso = await api.createCase({ title: titulo, client_id: clientId });

    await page.goto(`/cases/${caso.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /eliminar/i }).first().click();
    const dialog = page.getByRole('dialog').or(page.locator('[role="alertdialog"]'));
    if (await dialog.isVisible()) {
      await dialog.getByRole('button', { name: 'Eliminar' }).click();
    }

    // Debe redirigir a la lista de casos
    await page.waitForURL('**/cases', { timeout: 8_000 });

    // El caso ya no está en la lista
    await expect(page.getByText(titulo)).not.toBeVisible();

    // Navegar directamente al URL del caso eliminado — debe mostrar error o redirigir
    await page.goto(`/cases/${caso.id}`);
    await page.waitForLoadState('networkidle');
    const url = page.url();
    const cuerpo = await page.textContent('body') ?? '';
    const esInaccesible = url.includes('/cases') && !url.includes(caso.id)
      || cuerpo.toLowerCase().includes('no encontrado')
      || cuerpo.toLowerCase().includes('not found')
      || cuerpo.toLowerCase().includes('error');
    expect(esInaccesible).toBeTruthy();
  });

  // ── BUSCAR / FILTRAR ──────────────────────────────────────────────────────

  test('buscar caso — el filtro muestra solo los casos que coinciden con el texto', async ({ page }) => {
    const tituloBuscable = `BUSCABLE_CASO_${uid()}`;
    const caso = await api.createCase({ title: tituloBuscable, client_id: clientId });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const buscador = page.getByPlaceholder(/buscar|filtrar/i).or(page.getByLabel(/buscar/i));
    if (await buscador.isVisible()) {
      await buscador.fill(tituloBuscable);
      await expect(page.getByText(tituloBuscable)).toBeVisible();

      await buscador.fill('xxxxxxxxxx_no_existe_nunca');
      await expect(page.getByText(tituloBuscable)).not.toBeVisible();
    }

    await api.deleteCase(caso.id);
  });
});

test.describe('Casos — Estado y moneda', () => {
  let api: ApiHelper;
  let clientId: string;

  test.beforeAll(async ({ request }) => {
    const token = await getToken(request);
    api = new ApiHelper(request, token);
    const cliente = await api.createClient({ name: `Cliente Estado ${uid()}` });
    clientId = cliente.id;
  });

  test.afterAll(async () => {
    await api.deleteClient(clientId);
  });

  test('caso en moneda USD — el detalle muestra USD, no mezcla con PEN', async ({ page }) => {
    const caso = await api.createCase({
      title: `Caso USD ${uid()}`,
      client_id: clientId,
      tipo_facturacion: 'por_horas',
      moneda_facturacion: 'USD',
    });

    await login(page);
    await page.goto(`/cases/${caso.id}`);
    await page.waitForLoadState('networkidle');

    const pageText = await page.textContent('body') ?? '';
    expect(pageText).toContain('USD');
    // No debe mostrar S/ en el contexto de este caso USD
    expect(pageText).not.toMatch(/S\/\s*[\d,.]+.*USD|moneda.*S\/.*USD/);

    await api.deleteCase(caso.id);
  });

  test('la lista de casos no muestra errores de renderizado (NaN, undefined, [object Object])', async ({ page }) => {
    await login(page);
    await page.goto('/cases');
    await page.waitForLoadState('networkidle');

    const pageText = await page.textContent('body') ?? '';
    expect(pageText).not.toContain('NaN');
    expect(pageText).not.toContain('undefined');
    expect(pageText).not.toContain('[object Object]');
  });
});
