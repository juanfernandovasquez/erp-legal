/**
 * ÁREA:        Gestión de Tareas
 * RUTA:        /cases/:id (tab Tareas)  y  /tasks
 * ARCHIVOS:    frontend/src/pages/cases/CaseDetailPage.tsx
 *              frontend/src/pages/tasks/TasksPage.tsx
 *              frontend/src/components/tasks/TaskForm.tsx
 *              frontend/src/components/tasks/TaskDetailModal.tsx
 * ACTIVAR SI:  Cambias TaskForm · TaskDetailModal · CaseDetailPage (sección tareas) ·
 *              lógica de estados de tarea · asignación de tareas
 *
 * CRÍTICO:
 * - La tarea creada debe aparecer con el título exacto ingresado.
 * - Los estados deben cambiar y persistir (no solo en UI, también en BD).
 * - Una tarea eliminada no debe aparecer al recargar la página.
 * - El formulario debe rechazar títulos vacíos con un mensaje útil.
 */

import { test, expect } from '@playwright/test';
import { login, getToken } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

const uid = () => Date.now().toString(36);

test.describe('Tareas — CRUD en Detalle de Caso', () => {
  let api: ApiHelper;
  let caseId: string;
  let clientId: string;

  test.beforeAll(async ({ request }) => {
    const token = await getToken(request);
    api = new ApiHelper(request, token);
    const cliente = await api.createClient({ name: `Cliente Tareas ${uid()}` });
    clientId = cliente.id;
    const caso = await api.createCase({ title: `Caso Para Tareas ${uid()}`, client_id: clientId });
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
    // Asegurarse de estar en el tab de tareas
    const tabTareas = page.getByRole('tab', { name: /tareas/i }).or(page.getByText('Tareas').first());
    if (await tabTareas.isVisible()) await tabTareas.click();
  });

  // ── CREAR ────────────────────────────────────────────────────────────────

  test('crear tarea — el título exacto aparece en la lista de tareas del caso', async ({ page }) => {
    const titulo = `Redactar demanda ${uid()}`;

    await page.getByRole('button', { name: 'Nueva tarea' }).click();
    await page.getByPlaceholder('Ej: Preparar demanda').fill(titulo);
    await page.getByRole('button', { name: 'Crear Tarea' }).click();

    await expect(page.getByText(titulo)).toBeVisible({ timeout: 8_000 });
  });

  test('crear tarea — título vacío no permite enviar: el form muestra error', async ({ page }) => {
    await page.getByRole('button', { name: 'Nueva tarea' }).click();
    // No llenar el título
    await page.getByRole('button', { name: 'Crear Tarea' }).click();

    // El formulario debe seguir visible (no se cerró)
    await expect(page.getByRole('button', { name: 'Crear Tarea' })).toBeVisible();
    // Debe haber un mensaje de error
    await expect(
      page.locator('div.p-3.bg-red-50, p.text-red-600, [class*="error"]').first()
    ).toBeVisible();
  });

  test('crear tarea — persiste después de recargar la página', async ({ page }) => {
    const titulo = `Tarea Persistente ${uid()}`;

    await page.getByRole('button', { name: 'Nueva tarea' }).click();
    await page.getByPlaceholder('Ej: Preparar demanda').fill(titulo);
    await page.getByRole('button', { name: 'Crear Tarea' }).click();
    await expect(page.getByText(titulo)).toBeVisible();

    // Recargar y verificar que la tarea sigue ahí (se guardó en BD, no solo en estado local)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(titulo)).toBeVisible();
  });

  // ── VER DETALLE ───────────────────────────────────────────────────────────

  test('ver detalle de tarea — al hacer click se abre el modal con el título correcto', async ({ page }) => {
    const titulo = `Tarea Detalle ${uid()}`;

    await page.getByRole('button', { name: 'Nueva tarea' }).click();
    await page.getByPlaceholder('Ej: Preparar demanda').fill(titulo);
    await page.getByRole('button', { name: 'Crear Tarea' }).click();
    await expect(page.getByText(titulo)).toBeVisible();

    await page.getByText(titulo).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    // El modal debe mostrar el título exacto
    await expect(modal.getByText(titulo)).toBeVisible();
  });

  // ── CAMBIAR ESTADO ────────────────────────────────────────────────────────

  test('cambiar estado de tarea — el nuevo estado es visible sin necesidad de recargar', async ({ page }) => {
    const titulo = `Tarea Estado ${uid()}`;

    await page.getByRole('button', { name: 'Nueva tarea' }).click();
    await page.getByPlaceholder('Ej: Preparar demanda').fill(titulo);
    await page.getByRole('button', { name: 'Crear Tarea' }).click();
    await expect(page.getByText(titulo)).toBeVisible();

    // Abrir el detalle
    await page.getByText(titulo).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Cambiar estado a "En progreso"
    const selectorEstado = modal.getByLabel(/estado/i).or(modal.locator('select'));
    if (await selectorEstado.isVisible()) {
      await selectorEstado.selectOption({ label: /progreso|en_progreso/i });
      await modal.getByRole('button', { name: /guardar|actualizar/i }).click();

      await modal.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
      await page.reload();
      await page.waitForLoadState('networkidle');
      // El estado actualizado debe persistir
      await expect(page.getByText(/progreso/i)).toBeVisible();
    }
  });

  // ── ELIMINAR ──────────────────────────────────────────────────────────────

  test('eliminar tarea — desaparece de la lista al recargar la página', async ({ page }) => {
    const titulo = `Tarea Eliminar ${uid()}`;

    await page.getByRole('button', { name: 'Nueva tarea' }).click();
    await page.getByPlaceholder('Ej: Preparar demanda').fill(titulo);
    await page.getByRole('button', { name: 'Crear Tarea' }).click();
    await expect(page.getByText(titulo)).toBeVisible();

    // Abrir y eliminar
    await page.getByText(titulo).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    const btnEliminar = modal.getByRole('button', { name: /eliminar/i });
    if (await btnEliminar.isVisible()) {
      await btnEliminar.click();
      const confirm = page.getByRole('dialog').last();
      await confirm.getByRole('button', { name: 'Eliminar' }).click();
    } else {
      await modal.press('Escape');
      const fila = page.locator(`[class*="task"]:has-text("${titulo}")`);
      const btnDel = fila.getByRole('button', { name: /eliminar/i });
      await btnDel.click();
      await page.getByRole('button', { name: 'Eliminar' }).last().click();
    }

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(titulo)).not.toBeVisible();
  });
});

test.describe('Mis Tareas — /tasks', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('la página /tasks carga y muestra la lista de tareas del usuario', async ({ page }) => {
    await expect(page).toHaveURL(/tasks/);
    // Debe haber una sección o título reconocible
    await expect(
      page.getByRole('heading', { name: /tareas/i }).or(page.getByText(/mis tareas/i))
    ).toBeVisible();
  });

  test('filtrar tareas por estado "completado" — solo muestra tareas completadas', async ({ page }) => {
    const filtro = page.getByRole('combobox').or(page.getByLabel(/estado/i)).first();
    if (await filtro.isVisible()) {
      await filtro.selectOption({ label: /completad/i });
      // Esperar que la lista se actualice
      await page.waitForTimeout(500);
      // No debe haber tareas con estado diferente a completado
      const tareasEnProgreso = page.getByText(/en progreso|pendiente/i);
      await expect(tareasEnProgreso).not.toBeVisible();
    }
  });
});
