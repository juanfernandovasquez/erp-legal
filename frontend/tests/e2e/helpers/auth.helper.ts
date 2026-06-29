/**
 * Helpers de autenticación para tests E2E.
 * Centraliza login/logout para que cada spec no repita la lógica.
 */
import { Page, APIRequestContext } from '@playwright/test';

export const TEST_EMAIL    = process.env.TEST_ADMIN_EMAIL    ?? 'admin@test.erplegal';
export const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'TestPassword123!';
export const API_URL       = process.env.PLAYWRIGHT_API_URL  ?? 'http://localhost:8000';

/** Hace login en la UI y espera a que el dashboard cargue. */
export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder('tu@email.com').fill(TEST_EMAIL);
  await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

/** Obtiene un JWT token via API (para helpers que necesitan acceso a la API). */
export async function getToken(request: APIRequestContext): Promise<string> {
  const resp = await request.post(`${API_URL}/api/v1/auth/login`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  if (!resp.ok()) {
    throw new Error(`Login API falló: ${resp.status()} — ¿está corriendo el backend? ¿existen las credenciales de test?`);
  }
  const body = await resp.json();
  return body.data.access_token;
}

/** Headers de autorización para llamadas directas a la API. */
export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}
