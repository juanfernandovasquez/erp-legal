import { create } from 'zustand'
import portalApi from '@/lib/portalApi'

interface PortalClient {
  id: string
  nombre: string
  ruc: string
}

interface ClientPortalStore {
  client: PortalClient | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (ruc: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useClientPortalStore = create<ClientPortalStore>((set) => ({
  client: null,
  isAuthenticated: !!localStorage.getItem('portalToken'),
  isLoading: false,
  error: null,

  login: async (ruc: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await portalApi.post('/client/auth', { ruc, password })
      const { access_token, client } = res.data.data
      localStorage.setItem('portalToken', access_token)
      set({ client, isAuthenticated: true, isLoading: false })
    } catch (error: any) {
      const message = error.response?.data?.detail || 'RUC o contraseña incorrectos'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('portalToken')
    set({ client: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('portalToken')
    if (!token) {
      set({ isAuthenticated: false })
      return
    }
    try {
      const res = await portalApi.get('/client/me')
      const d = res.data.data
      set({
        client: { id: d.id, nombre: d.nombre, ruc: d.ruc },
        isAuthenticated: true,
      })
    } catch {
      localStorage.removeItem('portalToken')
      set({ client: null, isAuthenticated: false })
    }
  },
}))
