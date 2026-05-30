export interface TimelineEventCreateData {
  titulo: string
  descripcion: string
  tipo: 'audiencia' | 'reunion' | 'documento' | 'notificacion' | 'otro'
  fecha: string
}

export interface TimelineEventFilterOptions {
  casoId: string
  tipo?: string
}
