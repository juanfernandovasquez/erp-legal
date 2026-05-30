export interface AlertCreateData {
  titulo: string
  descripcion: string
  severidad: 'info' | 'advertencia' | 'error'
  casoId?: string
  tareaId?: string
}

export interface AlertFilterOptions {
  severidad?: string
  estado?: string
  page?: number
  pageSize?: number
}
