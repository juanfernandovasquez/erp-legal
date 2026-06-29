/**
 * Helper para crear y limpiar datos de test directamente via API.
 * Se usa en beforeAll/afterAll para preparar estado sin pasar por la UI.
 * Los tests E2E crean datos por UI para verificar el flujo completo.
 * Este helper es para: (a) cleanup, (b) setup de datos previos en tests de edición/eliminación.
 */
import { APIRequestContext } from '@playwright/test';
import { API_URL, authHeaders } from './auth.helper';

export class ApiHelper {
  constructor(
    private readonly request: APIRequestContext,
    private readonly token: string,
  ) {}

  private headers() {
    return authHeaders(this.token);
  }

  // ── Clientes ──────────────────────────────────────────────────────────────

  async createClient(data: { name: string; client_type?: string }) {
    const resp = await this.request.post(`${API_URL}/api/v1/clients`, {
      data: { client_type: 'persona', is_active: true, ...data },
      headers: this.headers(),
    });
    if (!resp.ok()) throw new Error(`createClient falló: ${await resp.text()}`);
    return (await resp.json()).data as { id: string; name: string };
  }

  async deleteClient(id: string) {
    await this.request.delete(`${API_URL}/api/v1/clients/${id}`, {
      headers: this.headers(),
    });
  }

  // ── Casos ─────────────────────────────────────────────────────────────────

  async createCase(data: {
    title: string;
    client_id: string;
    tipo_facturacion?: string;
    moneda_facturacion?: string;
    precio_facturacion?: number;
  }) {
    const resp = await this.request.post(`${API_URL}/api/v1/cases`, {
      data: { tipo_facturacion: 'por_horas', moneda_facturacion: 'PEN', ...data },
      headers: this.headers(),
    });
    if (!resp.ok()) throw new Error(`createCase falló: ${await resp.text()}`);
    return (await resp.json()).data as { id: string; title: string };
  }

  async deleteCase(id: string) {
    await this.request.delete(`${API_URL}/api/v1/cases/${id}`, {
      headers: this.headers(),
    });
  }

  // ── Procesos ──────────────────────────────────────────────────────────────

  async createProcess(caseId: string, data: { titulo: string }) {
    const resp = await this.request.post(`${API_URL}/api/v1/cases/${caseId}/processes`, {
      data: { tipo_tarifa: 'por_horas', tarifa: 100, moneda: 'PEN', ...data },
      headers: this.headers(),
    });
    if (!resp.ok()) throw new Error(`createProcess falló: ${await resp.text()}`);
    return (await resp.json()).data as { id: string; titulo: string };
  }

  async deleteProcess(caseId: string, processId: string) {
    await this.request.delete(`${API_URL}/api/v1/cases/${caseId}/processes/${processId}`, {
      headers: this.headers(),
    });
  }

  // ── Tareas ────────────────────────────────────────────────────────────────

  async createTask(data: { title: string; process_id?: string; case_id?: string }) {
    const resp = await this.request.post(`${API_URL}/api/v1/tasks`, {
      data: { is_billable: true, ...data },
      headers: this.headers(),
    });
    if (!resp.ok()) throw new Error(`createTask falló: ${await resp.text()}`);
    return (await resp.json()).data as { id: string; title: string };
  }

  async deleteTask(taskId: string) {
    await this.request.delete(`${API_URL}/api/v1/tasks/${taskId}`, {
      headers: this.headers(),
    });
  }

  // ── Horas ─────────────────────────────────────────────────────────────────

  async deleteHours(hourId: string) {
    await this.request.delete(`${API_URL}/api/v1/hours/${hourId}`, {
      headers: this.headers(),
    });
  }

  // ── Usuarios ──────────────────────────────────────────────────────────────

  async deleteUser(userId: string) {
    await this.request.delete(`${API_URL}/api/v1/users/${userId}`, {
      headers: this.headers(),
    });
  }

  // ── Ajustes de facturación ────────────────────────────────────────────────

  async deleteAdjustment(caseId: string, adjustmentId: string) {
    await this.request.delete(
      `${API_URL}/api/v1/cases/${caseId}/billing/adjustments/${adjustmentId}`,
      { headers: this.headers() },
    );
  }
}
