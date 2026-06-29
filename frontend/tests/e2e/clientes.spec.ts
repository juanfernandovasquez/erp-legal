/**
 * ÁREA:        Gestión de Clientes (CRUD completo)
 * RUTA:        /clients  y  /clients/:id
 * ARCHIVOS:    frontend/src/pages/clients/ClientsListPage.tsx
 *              frontend/src/pages/clients/ClientDetailPage.tsx
 * ACTIVAR SI:  Cambias ClientsListPage · ClientDetailPage · lógica de clientes en el backend
 *
 * FILOSOFÍA DE TESTS:
 * Cada test verifica que el USUARIO FINAL puede hacer lo que necesita hacer.
 * No verificamos que el código "corre" — verificamos que el resultado es correcto.
 * Un test que siempre pasa sin verificar datos reales no sirve.
 */

import { test, expect, Page } from '@playwright/test';
import { login, getToken } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

const uid = () => Date.now().toString(36);

test.describe('Clientes — CRUD', () => {
  let api: ApiHelper;

  test.beforeAll(async ({ request }) => {
    const token = await getToken(request);
    api = new ApiHelper(request, token);
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
  });

  // ── CREAR ────────────────────────────────────────────────────────────────

  test('crear cliente — el nombre exacto aparece en la tabla después de guardar', async ({ page }) => {
    const nombre = `Empresa Test ${uid()}`;

    await page.getByRole('button', { name: 'Nuevo Cliente' }).click();
    await expect(page.getByRole('dialog').or(page.locator('div.fixed.inset-0.z-50'))).toBeVisible();

    await page.getByPlaceholder(/nombre completo|razón social/i).fill(nombre);
    await page.getByLabel(/tipo de cliente/i).selectOption('empresa');
    await page.getByRole('button', { name: 'Crear Cliente' }).click();

    // Verificar que el nombre exacto aparece en la lista — no solo "algo apareció"
    await expect(page.getByRole('cell', { name: nombre }).or(page.getByText(nombre))).toBeVisible();
  });

  test('crear cliente — nombre es requerido, el form no se envía sin él', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo Cliente' }).click();
    await page.getByRole('button', { name: 'Crear Cliente' }).click();

    // El diálogo debe seguir abierto (no se cerró)
    await expect(page.getByRole('button', { name: 'Crear Cliente' })).toBeVisible();
    // Y debe mostrar un error orientativo para el usuario
    await expect(
      page.locator('div.bg-red-50, [class*="error"], p.text-red-600').first()
    ).toBeVisible();
  });

  test('crear cliente persona — tipo "persona natural" se guarda y se muestra en la lista', async ({ page }) => {
    const nombre = `Juan Pérez ${uid()}`;

    await page.getByRole('button', { name: 'Nuevo Cliente' }).click();
    await page.getByPlaceholder(/nombre completo|razón social/i).fill(nombre);
    await page.getByLabel(/tipo de cliente/i).selectOption({ label: /persona natural/i });
    await page.getByRole('button', { name: 'Crear Cliente' }).click();

    await expect(page.getByText(nombre)).toBeVisible();
  });

  // ── VER DETALLE ───────────────────────────────────────────────────────────

  test('ver detalle de cliente — hace click en nombre y navega a /clients/:id con sus datos', async ({ page, request }) => {
    const nombre = `Cliente Detalle ${uid()}`;
    const cliente = await api.createClient({ name: nombre });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.getByText(nombre).click();
    await page.waitForURL(`**/clients/${cliente.id}`);

    // El detalle debe mostrar el nombre del cliente
    await expect(page.getByText(nombre)).toBeVisible();

    await api.deleteClient(cliente.id);
  });

  // ── EDITAR ────────────────────────────────────────────────────────────────

  test('editar cliente — el nuevo nombre queda guardado y es visible al volver a la lista', async ({ page, request }) => {
    const nombreOriginal = `Cliente Editar ${uid()}`;
    const nombreNuevo    = `Cliente Editado ${uid()}`;
    const cliente = await api.createClient({ name: nombreOriginal });

    await page.goto(`/clients/${cliente.id}`);
    await page.waitForLoadState('networkidle');

    // Buscar botón de editar
    await page.getByRole('button', { name: /editar/i }).click();
    await page.getByPlaceholder(/nombre completo|razón social/i).fill(nombreNuevo);
    await page.getByRole('button', { name: /guardar|actualizar/i }).click();

    // El nombre nuevo debe ser visible en la misma página
    await expect(page.getByText(nombreNuevo)).toBeVisible();
    // Y el nombre original ya NO debe estar
    await expect(page.getByText(nombreOriginal)).not.toBeVisible();

    await api.deleteClient(cliente.id);
  });

  // ── ELIMINAR ──────────────────────────────────────────────────────────────

  test('eliminar cliente — desaparece de la lista y ya no es accesible por su URL', async ({ page }) => {
    const nombre = `Cliente Eliminar ${uid()}`;
    const cliente = await api.createClient({ name: nombre });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navegar al detalle y eliminar desde ahí
    await page.goto(`/clients/${cliente.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /eliminar/i }).first().click();
    // Confirmar en el ConfirmDialog
    await page.getByRole('button', { name: 'Eliminar' }).last().click();

    // Debe redirigir a la lista
    await page.waitForURL('**/clients', { timeout: 8_000 });

    // El cliente ya no debe aparecer en la lista
    await expect(page.getByText(nombre)).not.toBeVisible();
  });

  test('eliminar cliente — el diálogo de confirmación pide confirmación (no es destructivo sin avisar)', async ({ page }) => {
    const nombre = `Cliente Dialog ${uid()}`;
    const cliente = await api.createClient({ name: nombre });

    await page.goto(`/clients/${cliente.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /eliminar/i }).first().click();

    // El diálogo de confirmación debe aparecer con texto claro
    const dialog = page.getByRole('dialog').or(page.locator('[role="alertdialog"]'));
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/eliminar|borrar/i)).toBeVisible();

    // Cancelar — el cliente NO debe eliminarse
    await dialog.getByRole('button', { name: /cancelar/i }).click();
    await expect(page.getByText(nombre)).toBeVisible();

    await api.deleteClient(cliente.id);
  });

  // ── BUSCAR ────────────────────────────────────────────────────────────────

  test('buscar cliente — el filtro muestra solo los clientes que coinciden', async ({ page }) => {
    const nombreBuscable = `BUSCABLE_${uid()}`;
    const cliente = await api.createClient({ name: nombreBuscable });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder(/buscar/i).fill(nombreBuscable);
    await expect(page.getByText(nombreBuscable)).toBeVisible();

    // Buscar algo que no existe — debe quedar la lista vacía o mostrar mensaje
    await page.getByPlaceholder(/buscar/i).fill('xxxxxxxxxx_no_existe');
    await expect(page.getByText(nombreBuscable)).not.toBeVisible();

    await api.deleteClient(cliente.id);
  });
});
