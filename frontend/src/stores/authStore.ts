import { create } from 'zustand'
import { User, AuthState } from '@/types'
import api from '@/lib/axios'

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/auth/login', { email, password })
      // Backend returns { data: { access_token, refresh_token, user }, meta: {} }
      const { access_token: accessToken, refresh_token: refreshToken, user } = response.data.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Error al iniciar sesión'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  register: async (data: any) => {
    set({ isLoading: true, error: null })
    try {
      const payload = {
        firm_name: data.nombreBuffete,
        email: data.emailAdmin,
        password: data.passwordAdmin,
        full_name: data.nombreAdmin,
        registration_number: data.rucBuffete || undefined,
      }
      const response = await api.post('/auth/register', payload)
      // Backend returns { data: { access_token, refresh_token, user }, meta: {} }
      const { access_token: accessToken, refresh_token: refreshToken, user } = response.data.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Error al registrar'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      set({ isAuthenticated: false })
      return
    }

    try {
      const response = await api.get('/auth/me')
      // Backend returns { data: { user, law_firm, permissions }, meta: {} }
      const { user } = response.data.data
      set({ user, isAuthenticated: true })
    } catch (error) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      set({
        user: null,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
      })
    }
  },

  setUser: (user: User | null) => {
    set({ user })
  },
}))
