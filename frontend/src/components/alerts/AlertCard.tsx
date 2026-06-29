import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Alerta } from '@/types'
import {
  formatDate,
  getAlertSeverityColor, getAlertSeverityLabel,
  getAlertStatusColor, getAlertStatusLabel,
  getAlertTypeLabel,
} from '@/lib/utils'
import { AlertTriangle, Info, AlertCircle, Calendar, CheckCircle, Eye, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface AlertCardProps {
  alert: Alerta
  onResolve?: (alertId: string, notes?: string) => Promise<void>
  onAcknowledge?: (alertId: string) => Promise<void>
  onDelete?: (alertId: string) => void
}

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  critical: <AlertCircle size={16} className="text-red-600" />,
  warning:  <AlertTriangle size={16} className="text-yellow-600" />,
  info:     <Info size={16} className="text-blue-600" />,
}

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-l-4 border-l-red-500',
  warning:  'border-l-4 border-l-yellow-500',
  info:     'border-l-4 border-l-blue-400',
}

export function AlertCard({ alert, onResolve, onAcknowledge, onDelete }: AlertCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [resolutionNote, setResolutionNote] = useState('')
  const [showResolveForm, setShowResolveForm] = useState(false)
  const [isActing, setIsActing] = useState(false)

  const isOverdue = alert.fechaVencimiento && !alert.isResolved
    && new Date(alert.fechaVencimiento) < new Date()

  const handleResolve = async () => {
    if (!onResolve) return
    setIsActing(true)
    try {
      await onResolve(alert.id, resolutionNote || undefined)
      setShowResolveForm(false)
      setResolutionNote('')
    } finally {
      setIsActing(false)
    }
  }

  const handleAcknowledge = async () => {
    if (!onAcknowledge) return
    setIsActing(true)
    try { await onAcknowledge(alert.id) }
    finally { setIsActing(false) }
  }

  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden ${SEVERITY_BORDER[alert.severidad] ?? ''} ${alert.isResolved ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="mt-0.5 flex-shrink-0">
          {SEVERITY_ICONS[alert.severidad] ?? SEVERITY_ICONS.info}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm text-slate-900 truncate">{alert.titulo}</span>
            {alert.source === 'auto' && (
              <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5 font-medium">
                Automática
              </span>
            )}
            <Badge variant={getAlertSeverityColor(alert.severidad) as any}>
              {getAlertSeverityLabel(alert.severidad)}
            </Badge>
            <Badge variant={getAlertStatusColor(alert.estado) as any}>
              {getAlertStatusLabel(alert.estado)}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{getAlertTypeLabel(alert.tipo)}</span>
            {alert.fechaVencimiento && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Calendar size={11} />
                {isOverdue ? 'Venció: ' : 'Vence: '}
                {formatDate(alert.fechaVencimiento)}
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-slate-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          <p className="text-sm text-slate-600">{alert.mensaje}</p>

          {alert.isResolved && alert.resolutionNotes && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
              <span className="font-medium">Resolución: </span>{alert.resolutionNotes}
            </div>
          )}

          {/* Resolve form */}
          {showResolveForm && !alert.isResolved && (
            <div className="space-y-2">
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Nota de resolución (opcional)..."
                rows={2}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleResolve}
                  disabled={isActing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle size={13} />
                  {isActing ? 'Guardando…' : 'Confirmar resolución'}
                </button>
                <button
                  onClick={() => setShowResolveForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!alert.isResolved && (
            <div className="flex items-center gap-2 pt-1">
              {!alert.isAcknowledged && onAcknowledge && (
                <button
                  onClick={handleAcknowledge}
                  disabled={isActing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <Eye size={13} />
                  Reconocer
                </button>
              )}
              {onResolve && !showResolveForm && (
                <button
                  onClick={() => setShowResolveForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-700 border border-green-200 rounded-md hover:bg-green-50 transition-colors"
                >
                  <CheckCircle size={13} />
                  Resolver
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(alert.id)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-100 rounded-md hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                  Eliminar
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-slate-400">Creada: {formatDate(alert.createdAt)}</p>
        </div>
      )}
    </div>
  )
}
