import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para tests E2E del ERP Legal.
 *
 * Variables de entorno:
 *   PLAYWRIGHT_BASE_URL  — URL del frontend (default: http://localhost:5173)
 *   PLAYWRIGHT_API_URL   — URL del backend  (default: http://localhost:8000)
 *   TEST_ADMIN_EMAIL     — Email del usuario admin de test
 *   TEST_ADMIN_PASSWORD  — Contraseña del usuario admin de test
 *
 * Setup inicial: ver tests/e2e/README.md
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './tests/e2e/.results',

  /* No paralelizar: todos los tests comparten la misma BD */
  fullyParallel: false,
  workers: 1,

  /* En CI, fallar si hay test.only accidentales */
  forbidOnly: !!process.env.CI,

  /* Reintentar 1 vez en CI para flakiness de red */
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['html', { outputFolder: 'tests/e2e/.report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    /* Tiempo máximo de espera para que un elemento aparezca */
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Timeout por test: 60s (los tests de CRUD con BD pueden tardar) */
  timeout: 60_000,
  expect: { timeout: 8_000 },
});
