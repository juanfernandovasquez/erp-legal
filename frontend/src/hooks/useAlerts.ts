import { useState } from 'react'
import { Alerta, PaginatedResponse } from '@/types'
import api from '@/lib/axios'

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alerta[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  })

  const fetchAlerts = async (filters = {}) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<PaginatedResponse<Alerta>>('/alerts', { params: filters })
      const data = response.data.data || []
      const meta = response.data.meta || {}
      setAlerts(data)
      setPagination({ page: meta.page || 1, pageSize: meta.limit || 10, total: meta.total || 0, totalPages: meta.pages || 0 })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar alertas')
    } finally {
      setIsLoading(false)
    }
  }

  const createAlert = async (data: any) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.post('/alerts', data)
      setAlerts((prev) => [response.data.data, ...prev])
      return response.data.data
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear alerta')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const updateAlertStatus = async (alertId: string, estado: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.patch(`/alerts/${alertId}`, { status: estado })
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? response.data.data : a)))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar alerta')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    alerts,
    isLoading,
    error,
    pagination,
    fetchAlerts,
    createAlert,
    updateAlertStatus,
  }
}
