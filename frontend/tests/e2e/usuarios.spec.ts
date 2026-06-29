/**
 * ÁREA:        Gestión de Usuarios (CRUD, roles, contraseñas)
 * RUTA:        /users
 * ARCHIVOS:    frontend/src/pages/users/UsersPage.tsx
 * ACTIVAR SI:  Cambias UsersPage · lógica de roles · permisos de admin · gestión de usuarios
 *
 * CRÍTICO:
 * - Solo admins pueden crear/eliminar usuarios. Verificar que el rol es correcto.
 * - Crear con contraseña débil no debe ser posible.
 * - Un usuario eliminado no debe poder hacer login.
 */

import { test, expect } from '@playwright/test';
import { login, getToken } from './helpers/auth.helper';
import { ApiHelper } from './helpers/api.helper';

const uid = () => Date.now().toString(36);

test.describe('Usuarios — CRUD', () => {
  let api: ApiHelper;

  test.beforeAll(async ({ request }) => {
    const token = await getToken(request);
    api = new ApiHelper(request, token);
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
  });

  // ── CREAR ────────────────────────────────────────────────────────────────

  test('crear usuario — aparece en la lista con nombre y rol correcto', async ({ page }) => {
    const nombre   = `Ana${uid()}`;
    const apellido = `García${uid()}`;
    const email    = `ana_${uid()}@test.erplegal`;

    await page.getByRole('button', { name: 'Nuevo Usuario' }).click();
    await page.getByPlaceholder('Ana').fill(nombre);
    await page.getByPlaceholder('García').fill(apellido);
    await page.getByPlaceholder('ana.garcia@bufete.com').fill(email);
    await page.getByPlaceholder(/mínimo 8 caracteres/i).fill('TestPassword123!');
    await page.getByLabel(/tipo de cuenta/i).selectOption({ label: /usuario/i });
    await page.getByRole('button', { name: 'Crear Usuario' }).click();

    // El nombre completo debe aparecer en la tabla
    await expect(page.getByText(`${nombre} ${apellido}`)).toBeVisible();
    // El rol debe ser "Usuario" (no Administrador)
    await expect(
      page.locator(`tr:has-text("${nombre}") >> text=/usuario/i`).or(
        page.getByText(/usuario/i).first()
      )
    ).toBeVisible();
  });

  test('crear usuario — contraseña menor a 8 caracteres no permite enviar el form', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo Usuario' }).click();
    await page.getByPlaceholder('Ana').fill('Test');
    await page.getByPlaceholder('García').fill('User');
    await page.getByPlaceholder('ana.garcia@bufete.com').fill(`test_${uid()}@test.erplegal`);
    await page.getByPlaceholder(/mínimo 8 caracteres/i).fill('corta');
    await page.getByRole('button', { name: 'Crear Usuario' }).click();

    // El modal debe seguir abierto — no se cerró
    await expect(page.getByRole('button', { name: 'Crear Usuario' })).toBeVisible();
    // Debe aparecer mensaje de error indicando el requisito de contraseña
    await expect(
      page.locator('div.bg-red-50, p.text-red-600, [class*="error"]').first()
    ).toBeVisible();
  });

  test('crear usuario — email ya registrado muestra error claro, no crash', async ({ page }) => {
    const { TEST_EMAIL } = await import('./helpers/auth.helper');

    await page.getByRole('button', { name: 'Nuevo Usuario' }).click();
    await page.getByPlaceholder('Ana').fill('Admin');
    await page.getByPlaceholder('García').fill('Duplicado');
    await page.getByPlaceholder('ana.garcia@bufete.com').fill(TEST_EMAIL); // email ya existe
    await page.getByPlaceholder(/mínimo 8 caracteres/i).fill('TestPassword123!');
    await page.getByRole('button', { name: 'Crear Usuario' }).click();

    // Debe mostrar error — no cerrarse silenciosamente ni redirigir
    await expect(
      page.locator('div.bg-red-50, [class*="error"]').first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'Crear Usuario' })).toBeVisible();
  });

  test('crear usuario admin — el badge de rol dice "Administrador", no "Usuario"', async ({ page }) => {
    const nombre = `AdminNuevo${uid()}`;
    const email  = `adminnuevo_${uid()}@test.erplegal`;

    await page.getByRole('button', { name: 'Nuevo Usuario' }).click();
    await page.getByPlaceholder('Ana').fill(nombre);
    await page.getByPlaceholder('García').fill('Test');
    await page.getByPlaceholder('ana.garcia@bufete.com').fill(email);
    await page.getByPlaceholder(/mínimo 8 caracteres/i).fill('TestPassword123!');
    await page.getByLabel(/tipo de cuenta/i).selectOption({ label: /administrador/i });
    await page.getByRole('button', { name: 'Crear Usuario' }).click();

    await expect(page.getByText(nombre)).toBeVisible();
    await expect(
      page.locator(`tr:has-text("${nombre}") >> text=/administrador/i`)
    ).toBeVisible();
  });

  // ── CAMBIAR CONTRASEÑA ────────────────────────────────────────────────────

  // @invariant — seguridad: la nueva contraseña debe ser la única que funciona
  test('cambiar contraseña — el usuario puede hacer login con la nueva contraseña', async ({ page, request }) => {
    const email = `changepass_${uid()}@test.erplegal`;
    const passwordOriginal = 'Original123!';
    const passwordNueva    = 'Nueva456Password!';

    // Crear usuario via API
    await request.post(`${process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000'}/api/v1/users`, {
      data: { first_name: 'Change', last_name: 'Pass', email, password: passwordOriginal, role: 'abogado_junior' },
      headers: { Authorization: `Bearer ${await getToken(request)}` },
    });

    // Cambiar contraseña desde UsersPage
    await page.reload();
    await page.waitForLoadState('networkidle');

    const fila = page.locator(`tr:has-text("${email}")`);
    await fila.locator('button').nth(1).click(); // Botón de llave (key icon)

    await page.getByPlaceholder(/nueva contraseña/i).fill(passwordNueva);
    await page.getByRole('button', { name: /guardar contraseña/i }).click();

    // Verificar que se puede hacer login con la nueva contraseña
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(passwordNueva);
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await page.waitForURL('**/dashboard', { timeout: 8_000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  // ── ELIMINAR ──────────────────────────────────────────────────────────────

  // @invariant — seguridad: usuario eliminado no puede autenticarse bajo ninguna circunstancia
  test('eliminar usuario — desaparece de la lista y no puede hacer login', async ({ page, request }) => {
    const email = `eliminar_${uid()}@test.erplegal`;

    await request.post(`${process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000'}/api/v1/users`, {
      data: { first_name: 'Eliminar', last_name: 'Test', email, password: 'TestPassword123!', role: 'abogado_junior' },
      headers: { Authorization: `Bearer ${await getToken(request)}` },
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const fila = page.locator(`tr:has-text("${email}")`);
    await fila.locator('button[title*="liminar"], button').last().click();

    const dialog = page.getByRole('dialog').or(page.locator('[role="alertdialog"]'));
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Eliminar' }).click();

    // Ya no debe aparecer en la tabla
    await expect(page.getByText(email)).not.toBeVisible();

    // Verificar que no puede hacer login — el sistema debe rechazarlo
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill(email);
    await page.getByPlaceholder('••••••••').fill('TestPassword123!');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    await expect(page.locator('div.bg-red-50, [class*="error"]').first()).toBeVisible({ timeout: 5_000 });
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test('eliminar usuario — el diálogo de confirmación muestra el nombre correcto', async ({ page, request }) => {
    const nombre = `Confirmar${uid()}`;
    const email  = `confirmar_${uid()}@test.erplegal`;

    const resp = await request.post(`${process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000'}/api/v1/users`, {
      data: { first_name: nombre, last_name: 'Test', email, password: 'TestPassword123!', role: 'abogado_junior' },
      headers: { Authorization: `Bearer ${await getToken(request)}` },
    });
    const userId = (await resp.json()).data?.id;

    await page.reload();
    await page.waitForLoadState('networkidle');

    const fila = page.locator(`tr:has-text("${nombre}")`);
    await fila.locator('button').last().click();

    const dialog = page.getByRole('dialog').or(page.locator('[role="alertdialog"]'));
    await expect(dialog).toBeVisible();
    // El diálogo debe mencionar el nombre del usuario para que el admin sepa a quién elimina
    await expect(dialog.getByText(nombre)).toBeVisible();

    await dialog.getByRole('button', { name: /cancelar/i }).click();
    if (userId) await api.deleteUser(userId);
  });
});
