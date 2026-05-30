export interface TaskCreateData {
  casoId: string
  titulo: string
  descripcion: string
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  asignadoAId: string
  fechaVencimiento: string
}

export interface TaskUpdateData {
  titulo?: string
  descripcion?: string
  estado?: 'pendiente' | 'en_progreso' | 'completado' | 'rechazado'
  prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
  asignadoAId?: string
  fechaVencimiento?: string
}

export interface TaskFilterOptions {
  estado?: string
  prioridad?: string
  asignadoA?: string
  search?: string
  page?: number
  pageSize?: number
}
