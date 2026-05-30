import { create } from 'zustand'
import { Caso, Cliente, PaginatedResponse } from '@/types'
import api from '@/lib/axios'

interface CaseStore {
  cases: Caso[]
  currentCase: Caso | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  fetchCases: (filters?: any) => Promise<void>
  fetchCaseById: (id: string) => Promise<void>
  createCase: (data: any) => Promise<Caso>
  updateCase: (id: string, data: any) => Promise<void>
  deleteCase: (id: string) => Promise<void>
  addCaseTeamMember: (caseId: string, userId: string, rol: string) => Promise<void>
  removeCaseTeamMember: (caseId: string, userId: string) => Promise<void>
  setCaseFilter: (filters: any) => Promise<void>
  setCurrentCase: (caso: Caso | null) => void
}

export const useCaseStore = create<CaseStore>((set, get) => ({
  cases: [],
  currentCase: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  },

  fetchCases: async (filters = {}) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/cases', { params: filters })
      // Backend returns { data: [...], meta: { total, page, pages, limit } }
      const data = response.data.data || []
      const meta = response.data.meta || {}
      set({
        cases: data,
        pagination: {
          page: meta.page || 1,
          pageSize: meta.limit || 10,
          total: meta.total || 0,
          totalPages: meta.pages || 0,
        },
        isLoading: false,
      })
    } catch (error: any) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Error al cargar casos'
      set({ error: message, isLoading: false })
    }
  },

  fetchCaseById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get(`/cases/${id}`)
      // Backend returns { data: {...caso...}, meta: {} }
      set({ currentCase: response.data.data, isLoading: false })
    } catch (error: any) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Error al cargar caso'
      set({ error: message, isLoading: false })
    }
  },

  createCase: async (data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post('/cases', data)
      const newCase = response.data.data
      set((state) => ({
        cases: [newCase, ...state.cases],
        isLoading: false,
      }))
      return newCase
    } catch (error: any) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Error al crear caso'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  updateCase: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      // Backend uses PATCH not PUT
      const response = await api.patch(`/cases/${id}`, data)
      const updatedCase = response.data.data
      set((state) => {
        const updated = state.cases.map((c) => (c.id === id ? updatedCase : c))
        return {
          cases: updated,
          currentCase: state.currentCase?.id === id ? updatedCase : state.currentCase,
          isLoading: false,
        }
      })
    } catch (error: any) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Error al actualizar caso'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  deleteCase: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/cases/${id}`)
      set((state) => ({
        cases: state.cases.filter((c) => c.id !== id),
        currentCase: state.currentCase?.id === id ? null : state.currentCase,
        isLoading: false,
      }))
    } catch (error: any) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Error al eliminar caso'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  addCaseTeamMember: async (caseId: string, userId: string, rol: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.post(`/cases/${caseId}/team`, { user_id: userId, role: rol })
      await get().fetchCaseById(caseId)
    } catch (error: any) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Error al agregar miembro'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  removeCaseTeamMember: async (caseId: string, userId: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/cases/${caseId}/team/${userId}`)
      await get().fetchCaseById(caseId)
    } catch (error: any) {
      const message = error.response?.data?.detail || error.response?.data?.message || 'Error al remover miembro'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  setCaseFilter: async (filters: any) => {
    await get().fetchCases(filters)
  },

  setCurrentCase: (caso: Caso | null) => {
    set({ currentCase: caso })
  },
}))
