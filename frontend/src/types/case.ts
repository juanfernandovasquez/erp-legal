export interface CaseFilterOptions {
  estado?: string
  clienteId?: string
  abogadoPrincipalId?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface CaseCreateData {
  titulo: string
  descripcion: string
  tipoSolicitud: string
  clienteId: string
  abogadoPrincipalId: string
  montoAsegurado?: number
}

export interface CaseUpdateData {
  titulo?: string
  descripcion?: string
  estado?: string
  tipoSolicitud?: string
  clienteId?: string
  abogadoPrincipalId?: string
  montoAsegurado?: number
}

export interface SubCaseCreateData {
  titulo: string
  descripcion: string
}
