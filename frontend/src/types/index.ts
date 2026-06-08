// Two roles: admin_firma (Administrador) | abogado_junior (Usuario)
export type UserRole = 'admin_firma' | 'abogado_junior'

export interface User {
  id: string
  nombre: string
  email: string
  telefono: string
  phone?: string
  rol: UserRole
  role: UserRole
  bufeteId: string
  createdAt: string
  updatedAt: string
}

export interface Bufete {
  id: string
  nombre: string
  direccion: string
  telefono: string
  email: string
  ruc: string
  ciudad: string
  estado: 'activo' | 'inactivo'
  logo?: string
  createdAt: string
  updatedAt: string
}

export interface Cliente {
  id: string
  nombre: string
  email: string
  telefono: string
  ruc: string
  direccion: string
  ciudad: string
  estado: 'activo' | 'inactivo'
  contactoPrincipal: string
  bufeteId: string
  createdAt: string
  updatedAt: string
}

export interface Caso {
  id: string
  titulo: string
  descripcion: string
  estado: 'activo' | 'en_progreso' | 'pendiente' | 'en_pausa' | 'cerrado' | 'archivado'
  tipoSolicitud: string
  clienteId: string
  cliente?: Cliente
  bufeteId: string
  abogadoPrincipal?: User
  abogadoPrincipalId?: string
  fechaApertura: string
  fechaCierre?: string
  tipoFacturacion?: 'flat' | 'por_horas' | null
  monedaFacturacion?: 'PEN' | 'USD'
  precioFacturacion?: number | null
  totalFacturado?: number
  abogados: User[]
  asistentes: User[]
  createdAt: string
  updatedAt: string
}

export interface SubCaso {
  id: string
  casoId: string
  titulo: string
  descripcion: string
  estado: 'activo' | 'cerrado'
  createdAt: string
  updatedAt: string
}

export interface Documento {
  id: string
  casoId: string
  nombre: string
  tipo: string
  url: string
  fechaCarga: string
  usuarioId: string
  usuario?: User
  tamaño: number
  descripcion?: string
  createdAt: string
  updatedAt: string
}

export interface Proceso {
  id: string
  casoId: string
  titulo: string
  descripcion?: string
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'cancelado'
  orden: number
  fechaInicio?: string
  fechaFin?: string
  totalTareas: number
  tareasCompletadas: number
  totalHoras: number
  totalMonto: number
  tipoTarifa?: 'plana' | 'por_horas' | null
  tarifa?: number | null
  moneda?: 'PEN' | 'USD'
  createdAt: string
  updatedAt: string
}

export interface Tarea {
  id: string
  casoId: string
  casoTitulo?: string
  procesoId?: string
  procesoTitulo?: string
  clienteNombre?: string
  titulo: string
  descripcion: string
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'rechazado'
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  asignadoA: User
  asignadoAId: string
  fechaPresentacion: string       // fecha planificada de presentación (construye la línea de tiempo)
  fechaVencimiento: string        // plazo legal interno (para alertas)
  completadoEn?: string
  createdAt: string
  updatedAt: string
}

export interface Evento {
  id: string
  casoId: string
  titulo: string
  descripcion: string
  tipo: 'audiencia' | 'reunion' | 'documento' | 'notificacion' | 'otro'
  fecha: string
  createdBy: User
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface Horas {
  id: string
  casoId: string
  usuarioId: string
  usuario?: User
  fechaRegistro: string
  horasTrabajas: number
  descripcion: string
  tipo: 'consulta' | 'redaccion' | 'investigacion' | 'audiencia' | 'otro'
  createdAt: string
  updatedAt: string
}

export interface Alerta {
  id: string
  casoId: string
  bufeteId: string
  tipo: string                        // alert_type del backend
  severidad: 'info' | 'warning' | 'critical'
  titulo: string
  mensaje: string
  fechaAlerta: string
  fechaVencimiento?: string
  estado: 'pendiente' | 'reconocida' | 'leida' | 'resuelta'
  isRead: boolean
  isAcknowledged: boolean
  acknowledgedAt?: string
  isResolved: boolean
  resolvedAt?: string
  resolutionNotes?: string
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface RegisterRequest {
  nombreBuffete: string
  direccionBuffete: string
  telefonoBuffete: string
  emailBuffete: string
  rucBuffete: string
  nombreAdmin: string
  emailAdmin: string
  passwordAdmin: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
