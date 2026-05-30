export interface DocumentCreateData {
  nombre: string
  tipo: string
  descripcion?: string
}

export interface DocumentFilterOptions {
  casoId: string
  tipo?: string
  search?: string
}
