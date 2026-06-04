import { useState } from 'react'
import { Alerta } from '@/types'
import api from '@/lib/axios'

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alerta[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState({ total: 0, pending: 0, resolved: 0, overdue: 0 })

  const fetchAlerts = async (filters: Record<string, any> = {}) => {
    setIsLoading(true)
    setError(null)
    try {
      const params: any = { limit: filters.limit ?? 100 }
      if (filters.status) params.status = filters.status
      if (filters.page)   params.page   = filters.page
      const response = await api.get('/alerts', { params })
      setAlerts(response.data.data || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar alertas')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCaseAlerts = async (caseId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get(`/cases/${caseId}/alerts`)
      setAlerts(response.data.data || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar alertas del caso')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const response = await api.get('/alerts/summary')
      setSummary(response.data.data ?? { total: 0, pending: 0, resolved: 0, overdue: 0 })
    } catch {}
  }

  const createAlert = async (caseId: string, data: {
    alert_type: string
    severity: string
    title: string
    message: string
    due_date?: string
  }) => {
    const response = await api.post(`/cases/${caseId}/alerts`, data)
    const newAlert = response.data.data
    setAlerts((prev) => [newAlert, ...prev])
    return newAlert
  }

  const resolveAlert = async (alertId: string, resolutionNotes?: string) => {
    const response = await api.patch(`/alerts/${alertId}`, {
      is_resolved: true,
      resolution_notes: resolutionNotes || null,
    })
    const updated = response.data.data
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)))
    return updated
  }

  const acknowledgeAlert = async (alertId: string) => {
    const response = await api.patch(`/alerts/${alertId}`, { is_acknowledged: true })
    const updated = response.data.data
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)))
    return updated
  }

  const deleteAlert = async (alertId: string) => {
    await api.delete(`/alerts/${alertId}`)
    setAlerts((prev) => prev.filter((a) => a.id !== alertId))
  }

  return {
    alerts,
    isLoading,
    error,
    summary,
    fetchAlerts,
    fetchCaseAlerts,
    fetchSummary,
    createAlert,
    resolveAlert,
    acknowledgeAlert,
    deleteAlert,
  }
}
