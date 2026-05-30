import React, { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { AlertCard } from '@/components/alerts/AlertCard'
import { EmptyState } from '@/components/common/EmptyState'
import { AlertCircle } from 'lucide-react'
import { Alerta } from '@/types'
import { useAlerts } from '@/hooks/useAlerts'

export function AlertsPage() {
  const { alerts, isLoading, fetchAlerts, updateAlertStatus } = useAlerts()
  const [statusFilter, setStatusFilter] = useState('pendiente')
  const [severityFilter, setSeverityFilter] = useState('')

  useEffect(() => {
    fetchAlerts({
      estado: statusFilter || undefined,
      severidad: severityFilter || undefined,
      limit: 100,
    })
  }, [statusFilter, severityFilter])

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Alertas</h1>
            <p className="text-slate-600">Gestiona alertas y notificaciones importantes</p>
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          <Select
            placeholder="Filtrar por estado"
            options={[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'revisado', label: 'Revisado' },
              { value: 'resuelto', label: 'Resuelto' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="max-w-xs"
          />
          <Select
            placeholder="Filtrar por severidad"
            options={[
              { value: 'info', label: 'Información' },
              { value: 'advertencia', label: 'Advertencia' },
              { value: 'error', label: 'Error' },
            ]}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {alerts.length === 0 && !isLoading ? (
          <EmptyState
            icon={AlertCircle}
            title="No hay alertas"
            description="¡Excelente! No tienes alertas pendientes por el momento"
          />
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onResolve={() => updateAlertStatus(alert.id, 'resuelto')}
                onDismiss={() => updateAlertStatus(alert.id, 'revisado')}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
