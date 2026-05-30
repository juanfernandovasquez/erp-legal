export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  nombreBuffete: string
  direccionBuffete: string
  telefonoBuffete: string
  emailBuffete: string
  rucBuffete: string
  nombreAdmin: string
  emailAdmin: string
  passwordAdmin: string
  confirmarPassword?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    nombre: string
    email: string
    rol: string
  }
}
