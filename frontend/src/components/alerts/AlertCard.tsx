import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alerta } from '@/types'
import { formatDate, getAlertSeverityColor } from '@/lib/utils'
import { AlertCircle, CheckCircle, X } from 'lucide-react'

interface AlertCardProps {
  alert: Alerta
  onDismiss?: () => void
  onResolve?: () => void
}

export function AlertCard({ alert, onDismiss, onResolve }: AlertCardProps) {
  const icons = {
    info: AlertCircle,
    advertencia: AlertCircle,
    error: AlertCircle,
  }

  const Icon = icons[alert.severidad] || AlertCircle

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Icon size={24} className="text-primary-700 flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-slate-900">{alert.titulo}</h3>
              <Badge variant={getAlertSeverityColor(alert.severidad) as any}>
                {alert.severidad}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mb-3">{alert.descripcion}</p>
            <p className="text-xs text-slate-500">{formatDate(new Date(alert.createdAt))}</p>
          </div>
          {alert.estado === 'pendiente' && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {onResolve && (
                <button
                  onClick={onResolve}
                  className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Marcar como resuelto"
                >
                  <CheckCircle size={18} />
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Descartar"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
