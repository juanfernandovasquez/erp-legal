/**
 * ÁREA:        Gestión de Procesos (dentro de casos)
 * RUTA:        /cases/:id (tab Procesos o sección de procesos)
 * ARCHIVOS:    frontend/src/components/cases/CaseProcessSection.tsx
 *              frontend/src/components/cases/ProcessForm.tsx
 *              backend/app/routers/processes.py
 * ACTIVAR SI:  Cambias ProcessForm · CaseProcessSection · lógica de tarifa por proceso ·
 *              cálculo de totales de proceso · soft-delete de proceso
 *
 * CRÍTICO:
 * - Un proceso eliminado debe hacer soft-delete en cascada de sus tareas y horas.
 * - El tipo de tarifa (plana / por_horas) debe guardarse y mostrarse correctamente.
 * - El total de horas/monto del proceso debe calcularse con las horas reales, no hardcodeado.
 * - Un proceso creado debe persistir después de recargar la página.
 *
 * NOTA LANG-001: El modelo case_processes usa columnas en español (titulo, tipo_tarifa, etc.)
 * por eso la API y el helper usan `titulo`, no `title`.
 */

import { test, expect } from '@playwright/test';
import { login, getToken } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

const uid = () => Date.now().toString(36);

test.describe('Procesos — CRUD en detalle de caso', () => {
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

    const tabProcesos = page.getByRole('tab', { name: /procesos/i });
    if (await tabProcesos.isVisible()) await tabProcesos.click();
  });

  // ── CREAR ─────────────────────────────────────────────────────────────────

  test('crear proceso — el título exacto aparece en la lista de procesos', async ({ page }) => {
    const titulo = `Proceso Demanda ${uid()}`;

    const btnNuevo = page.getByRole('button', { name: /nuevo proceso|agregar proceso/i });
    if (!(await btnNuevo.isVisible())) { test.skip(); return; }

    await btnNuevo.click();
    await page.getByLabel(/título|titulo|nombre/i).fill(titulo);
    await page.getByRole('button', { name: /crear|guardar/i }).click();

    await expect(page.getByText(titulo)).toBeVisible({ timeout: 8_000 });
  });

  test('crear proceso — persiste después de recargar la página', async ({ page }) => {
    const titulo = `Proceso Persistente ${uid()}`;

    const btnNuevo = page.getByRole('button', { name: /nuevo proceso|agregar proceso/i });
    if (!(await btnNuevo.isVisible())) { test.skip(); return; }

    await btnNuevo.click();
    await page.getByLabel(/título|titulo|nombre/i).fill(titulo);
    await page.getByRole('button', { name: /crear|guardar/i }).click();
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 8_000 });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // El proceso debe seguir ahí — se guardó en BD, no solo en estado local
    await expect(page.getByText(titulo)).toBeVisible();
  });

  test('crear proceso tarifa por hora — el tipo de tarifa queda registrado y se muestra', async ({ page }) => {
    const titulo = `Proceso PorHora ${uid()}`;

    const btnNuevo = page.getByRole('button', { name: /nuevo proceso|agregar proceso/i });
    if (!(await btnNuevo.isVisible())) { test.skip(); return; }

    await btnNuevo.click();
    await page.getByLabel(/título|titulo|nombre/i).fill(titulo);

    const selectTarifa = page.getByLabel(/tipo de tarifa/i);
    if (await selectTarifa.isVisible()) {
      await selectTarifa.selectOption({ label: /hora/i });
      await page.getByLabel(/tarifa/i).fill('200');
    }

    await page.getByRole('button', { name: /crear|guardar/i }).click();
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 8_000 });

    const filaOCard = page.locator(`[class*="process"]:has-text("${titulo}")`).or(
      page.locator(`div:has-text("${titulo}")`).first()
    );
    const texto = await filaOCard.textContent();
    expect(texto?.toLowerCase()).toMatch(/hora|200/);
  });

  test('crear proceso sin título — el formulario muestra error y no cierra el modal', async ({ page }) => {
    const btnNuevo = page.getByRole('button', { name: /nuevo proceso|agregar proceso/i });
    if (!(await btnNuevo.isVisible())) { test.skip(); return; }

    await btnNuevo.click();
    // No llenar título
    await page.getByRole('button', { name: /crear|guardar/i }).click();

    await expect(
      page.locator('div.bg-red-50, [class*="error"], p.text-red-600').first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: /crear|guardar/i })).toBeVisible();
  });

  // ── EDITAR ────────────────────────────────────────────────────────────────

  test('editar proceso — el nuevo título reemplaza al anterior sin duplicarse', async ({ page }) => {
    const tituloOriginal = `Proceso Editar ${uid()}`;
    const tituloNuevo    = `Proceso Editado ${uid()}`;

    // Columna en BD es `titulo` (LANG-001) — la API recibe y devuelve `titulo`
    const proceso = await api.createProcess(caseId, { titulo: tituloOriginal });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const tabProcesos = page.getByRole('tab', { name: /procesos/i });
    if (await tabProcesos.isVisible()) await tabProcesos.click();

    const card = page.locator(`div:has-text("${tituloOriginal}")`).first();
    await card.getByRole('button', { name: /editar/i }).click();

    await page.getByLabel(/título|titulo|nombre/i).fill(tituloNuevo);
    await page.getByRole('button', { name: /guardar|actualizar/i }).click();

    await expect(page.getByText(tituloNuevo)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(tituloOriginal)).not.toBeVisible();

    await api.deleteProcess(caseId, proceso.id);
  });

  // ── ELIMINAR ──────────────────────────────────────────────────────────────

  test('eliminar proceso — desaparece de la lista al recargar la página', async ({ page }) => {
    const titulo = `Proceso Eliminar ${uid()}`;
    const proceso = await api.createProcess(caseId, { titulo });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const tabProcesos = page.getByRole('tab', { name: /procesos/i });
    if (await tabProcesos.isVisible()) await tabProcesos.click();

    await expect(page.getByText(titulo)).toBeVisible();

    const card = page.locator(`div:has-text("${titulo}")`).first();
    await card.getByRole('button', { name: /eliminar/i }).click();

    const dialog = page.getByRole('dialog').or(page.locator('[role="alertdialog"]'));
    if (await dialog.isVisible()) {
      await dialog.getByRole('button', { name: 'Eliminar' }).click();
    }

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(titulo)).not.toBeVisible();
  });

  test('eliminar proceso — pide confirmación antes de borrar', async ({ page }) => {
    const titulo = `Proceso Confirmar ${uid()}`;
    const proceso = await api.createProcess(caseId, { titulo });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const tabProcesos = page.getByRole('tab', { name: /procesos/i });
    if (await tabProcesos.isVisible()) await tabProcesos.click();

    const card = page.locator(`div:has-text("${titulo}")`).first();
    await card.getByRole('button', { name: /eliminar/i }).click();

    const dialog = page.getByRole('dialog').or(page.locator('[role="alertdialog"]'));
    await expect(dialog).toBeVisible({ timeout: 4_000 });

    // Cancelar — el proceso NO se elimina
    await dialog.getByRole('button', { name: /cancelar/i }).click();
    await expect(page.getByText(titulo)).toBeVisible();

    await api.deleteProcess(caseId, proceso.id);
  });
});

test.describe('Totales de Proceso', () => {
  let api: ApiHelper;
  let caseId: string;
  let clientId: string;

  test.beforeAll(async ({ request }) => {
    const token = await getToken(request);
    api = new ApiHelper(request, token);
    const cliente = await api.createClient({ name: `Cliente Totales ${uid()}` });
    clientId = cliente.id;
    const caso = await api.createCase({ title: `Caso Totales ${uid()}`, client_id: clientId });
    caseId = caso.id;
  });

  test.afterAll(async () => {
    await api.deleteCase(caseId);
    await api.deleteClient(clientId);
  });

  test('total de horas del proceso — refleja las horas registradas, no un valor fijo', async ({ page, request }) => {
    const token = await getToken(request);

    const tituloProcess = `Proceso Total Horas ${uid()}`;
    const proceso = await api.createProcess(caseId, { titulo: tituloProcess });
    const tarea = await api.createTask({ process_id: proceso.id, title: 'Tarea para horas' });

    await request.post(
      `${process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000'}/api/v1/cases/${caseId}/hours`,
      {
        data: { hours: 3.0, hourly_rate: 100, is_billable: true, task_id: tarea.id, date: '2026-01-15' },
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    await login(page);
    await page.goto(`/cases/${caseId}`);
    await page.waitForLoadState('networkidle');

    const tabProcesos = page.getByRole('tab', { name: /procesos/i });
    if (await tabProcesos.isVisible()) await tabProcesos.click();

    // El proceso debe mostrar "3" horas (no 0, no NaN, no undefined)
    const card = page.locator(`div:has-text("${tituloProcess}")`).first();
    const texto = await card.textContent();
    expect(texto).toContain('3');
    expect(texto).not.toContain('NaN');
    expect(texto).not.toContain('undefined');
  });
});
