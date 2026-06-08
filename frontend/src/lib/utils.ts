import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  let d: Date;
  if (typeof date === "string") {
    // Always extract the date portion (first 10 chars = YYYY-MM-DD) and parse as
    // LOCAL midnight to avoid UTC→local shifts that move the date one day back.
    // Works for both "2026-06-01" and "2026-06-01T00:00:00+00:00".
    const dateOnly = date.substring(0, 10);
    d = new Date(dateOnly + "T00:00:00");
  } else {
    d = date;
  }
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatCurrency(amount: number | null | undefined, currency = "PEN"): string {
  if (amount == null) return "—";
  const locale = currency === "PEN" ? "es-PE" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ── Prioridades ───────────────────────────────────────────────────────────────

export function getPriorityColor(priority: string | null | undefined): string {
  switch (priority?.toLowerCase()) {
    case "urgente":                        return "danger";
    case "alta":   case "high":            return "orange";
    case "media":  case "medium":          return "warning";
    case "baja":   case "low":             return "info";
    default:                               return "secondary";
  }
}

export function getPriorityLabel(priority: string | null | undefined): string {
  switch (priority?.toLowerCase()) {
    case "urgente":                        return "Urgente";
    case "alta":   case "high":            return "Alta";
    case "media":  case "medium":          return "Media";
    case "baja":   case "low":             return "Baja";
    default:                               return priority ?? "—";
  }
}

// ── Estado de tareas (4 estados) ──────────────────────────────────────────────
// pendiente | en_progreso | completado | cancelado

export function getTaskStatusColor(status: string | null | undefined): string {
  switch (status?.toLowerCase()) {
    case "completado": case "done":        return "success";
    case "en_progreso": case "in_progress": return "info";
    case "pendiente":  case "todo":        return "secondary";
    case "cancelado":  case "cancelled":
    case "rechazado":
    // estados legacy — mapear al más cercano
    case "bloqueado":  case "blocked":     return "danger";
    case "en_revision": case "in_review":  return "info";
    default:                               return "secondary";
  }
}

export function getTaskStatusLabel(status: string | null | undefined): string {
  switch (status?.toLowerCase()) {
    case "completado": case "done":         return "Completado";
    case "en_progreso": case "in_progress":
    case "en_revision": case "in_review":   return "En progreso";
    case "pendiente":  case "todo":         return "Pendiente";
    case "cancelado":  case "cancelled":
    case "rechazado":
    case "bloqueado":  case "blocked":      return "Cancelado";
    default:                                return "Pendiente";
  }
}

// Los 4 estados válidos para seleccionar en formularios
export const TASK_STATUS_OPTIONS = [
  { value: "pendiente",   label: "Pendiente" },
  { value: "en_progreso", label: "En progreso" },
  { value: "completado",  label: "Completado" },
  { value: "cancelado",   label: "Cancelado" },
];

// ── Estado de casos (4 estados) ───────────────────────────────────────────────
// activo | pendiente | cerrado | archivado

export function getCaseStatusColor(status: string | null | undefined): string {
  switch (status?.toLowerCase()) {
    case "activo":   case "active":        return "success";
    case "pendiente":                      return "warning";
    case "cerrado":                        return "secondary";
    case "archivado": case "inactivo":
    case "en_pausa": case "en_progreso":   return "default";
    default:                               return "secondary";
  }
}

export function getCaseStatusLabel(status: string | null | undefined): string {
  switch (status?.toLowerCase()) {
    case "activo":   case "active":        return "Activo";
    case "pendiente":                      return "Pendiente";
    case "cerrado":                        return "Culminado";
    case "archivado": case "inactivo":
    case "en_pausa": case "en_progreso":   return "Archivado";
    default:                               return status ?? "—";
  }
}

export const CASE_STATUS_OPTIONS = [
  { value: "activo",     label: "Activo" },
  { value: "pendiente",  label: "Pendiente" },
  { value: "cerrado",    label: "Culminado" },
  { value: "archivado",  label: "Archivado" },
];

// ── Severidad de alertas ──────────────────────────────────────────────────────

export function getAlertSeverityColor(severity: string | null | undefined): string {
  switch (severity?.toLowerCase()) {
    case "critical": case "critico":       return "danger";
    case "warning":  case "advertencia":   return "warning";
    case "info":
    default:                               return "info";
  }
}

export function getAlertSeverityLabel(severity: string | null | undefined): string {
  switch (severity?.toLowerCase()) {
    case "critical": case "critico":       return "Crítico";
    case "warning":  case "advertencia":   return "Advertencia";
    case "info":
    default:                               return "Info";
  }
}

export const ALERT_SEVERITY_OPTIONS = [
  { value: "info",     label: "Info" },
  { value: "warning",  label: "Advertencia" },
  { value: "critical", label: "Crítico" },
]

export const ALERT_TYPE_OPTIONS = [
  { value: "deadline_approaching", label: "Plazo próximo" },
  { value: "document_due",         label: "Documento requerido" },
  { value: "hearing_scheduled",    label: "Audiencia programada" },
  { value: "payment_due",          label: "Pago pendiente" },
  { value: "task_overdue",         label: "Tarea vencida" },
  { value: "status_change",        label: "Cambio de estado" },
  { value: "custom",               label: "Personalizada" },
]

export function getAlertTypeLabel(type: string | null | undefined): string {
  return ALERT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? (type ?? "—")
}

export function getAlertStatusColor(estado: string | null | undefined): string {
  switch (estado) {
    case "resuelta":    return "success";
    case "reconocida":
    case "leida":       return "info";
    case "pendiente":
    default:            return "warning";
  }
}

export function getAlertStatusLabel(estado: string | null | undefined): string {
  switch (estado) {
    case "resuelta":    return "Resuelta";
    case "reconocida":  return "Reconocida";
    case "leida":       return "Leída";
    case "pendiente":
    default:            return "Pendiente";
  }
}
