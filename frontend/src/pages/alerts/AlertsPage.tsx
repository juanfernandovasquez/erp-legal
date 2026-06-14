import React, { useEffect, useState } from 'react'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { AlertCard } from '@/components/alerts/AlertCard'
import { AlertForm } from '@/components/alerts/AlertForm'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { AlertCircle, Plus, X, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useAlerts } from '@/hooks/useAlerts'

export function AlertsPage() {
  const {
    alerts, isLoading, error, summary,
    fetchAlerts, fetchSummary,
    createAlert, resolveAlert, acknowledgeAlert, deleteAlert,
  } = useAlerts()

  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  useEscapeKey(() => { setShowCreateModal(false); setDeleteTarget(null) }, showCreateModal || !!deleteTarget)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchSummary()
  }, [])

  useEffect(() => {
    fetchAlerts({ status: statusFilter || undefined })
  }, [statusFilter])

  const handleResolve = async (alertId: string, notes?: string) => {
    await resolveAlert(alertId, notes)
    fetchSummary()
  }

  const handleAcknowledge = async (alertId: string) => {
    await acknowledgeAlert(alertId)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteAlert(deleteTarget)
      fetchSummary()
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Alertas</h1>
            <p className="text-slate-600 text-sm">Seguimiento de plazos y eventos críticos</p>
          </div>
          <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Nueva alerta
          </Button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <AlertCircle size={18} className="text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock size={18} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.pending}</p>
              <p className="text-xs text-slate-500">Pendientes</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.overdue}</p>
              <p className="text-xs text-slate-500">Vencidas</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.resolved}</p>
              <p className="text-xs text-slate-500">Resueltas</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <Select
            placeholder="Todos los estados"
            options={[
              { value: '',          label: 'Todos los estados' },
              { value: 'pendiente', label: 'Pendientes' },
              { value: 'resuelta',  label: 'Resueltas' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
            {error}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="Sin alertas"
            description={statusFilter ? 'No hay alertas con ese estado' : '¡Todo en orden! No hay alertas pendientes.'}
            action={!statusFilter ? { label: 'Crear primera alerta', onClick: () => setShowCreateModal(true) } : undefined}
          />
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onResolve={handleResolve}
                onAcknowledge={handleAcknowledge}
                onDelete={(id) => setDeleteTarget(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Nueva alerta</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <AlertForm
                onSuccess={() => {
                  setShowCreateModal(false)
                  fetchAlerts({ status: statusFilter || undefined })
                  fetchSummary()
                }}
                onCancel={() => setShowCreateModal(false)}
                onCreate={createAlert}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Eliminar alerta"
        description="¿Estás seguro de que deseas eliminar esta alerta? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </AppLayout>
  )
}
