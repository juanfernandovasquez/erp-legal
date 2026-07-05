import React, { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import api from '@/lib/axios'
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Trash2, RefreshCw } from 'lucide-react'

interface ErrorLog {
  id: string
  createdAt: string
  method: string
  path: string
  statusCode: number
  errorType: string
  errorMessage: string
  traceback: string | null
  userId: string | null
  userEmail: string | null
  requestBody: string | null
  isResolved: boolean
  resolvedAt: string | null
}

interface ApiResponse {
  items: ErrorLog[]
  total: number
  unresolved: number
  limit: number
  offset: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ErrorRow({ log, onResolve, onDelete }: {
  log: ErrorLog
  onResolve: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleResolve = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setResolving(true)
    try {
      await api.patch(`/admin/errors/${log.id}/resolve`)
      onResolve(log.id)
    } finally {
      setResolving(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleting(true)
    try {
      await api.delete(`/admin/errors/${log.id}`)
      onDelete(log.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${log.isResolved ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-white'}`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-0.5 ${log.isResolved ? 'bg-green-400' : 'bg-red-500'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
              {log.method}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate">{log.path}</span>
            <span className="text-xs text-red-600 font-semibold">{log.errorType}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">{log.errorMessage}</div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span>{formatDate(log.createdAt)}</span>
            {log.userEmail && <span>· {log.userEmail}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!log.isResolved && (
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              {resolving ? '...' : 'Resolver'}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
          {log.traceback && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Traceback</p>
              <pre className="text-xs bg-gray-900 text-green-300 p-3 rounded overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto font-mono">
                {log.traceback}
              </pre>
            </div>
          )}
          {log.requestBody && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Request Body</p>
              <pre className="text-xs bg-gray-900 text-blue-300 p-3 rounded overflow-x-auto whitespace-pre-wrap break-all max-h-32 overflow-y-auto font-mono">
                {(() => {
                  try { return JSON.stringify(JSON.parse(log.requestBody), null, 2) }
                  catch { return log.requestBody }
                })()}
              </pre>
            </div>
          )}
          {log.isResolved && log.resolvedAt && (
            <p className="text-xs text-green-600">Resuelto el {formatDate(log.resolvedAt)}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function ErrorLogsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [total, setTotal] = useState(0)
  const [unresolved, setUnresolved] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved')
  const [offset, setOffset] = useState(0)
  const limit = 50

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { limit, offset }
      if (filter === 'unresolved') params.resolved = false
      if (filter === 'resolved') params.resolved = true

      const res = await api.get<{ data: ApiResponse }>('/admin/errors', { params })
      const data = res.data.data
      setLogs(data.items)
      setTotal(data.total)
      setUnresolved(data.unresolved)
    } finally {
      setLoading(false)
    }
  }, [filter, offset])

  useEffect(() => { load() }, [load])

  const handleResolve = (id: string) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, isResolved: true, resolvedAt: new Date().toISOString() } : l))
    setUnresolved(prev => Math.max(0, prev - 1))
  }

  const handleDelete = (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id))
    setTotal(prev => Math.max(0, prev - 1))
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Monitor de Errores</h1>
            <p className="text-sm text-gray-500 mt-0.5">Últimos 30 días — solo administradores</p>
          </div>
          <div className="flex items-center gap-3">
            {unresolved > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                <AlertCircle size={16} />
                {unresolved} sin resolver
              </div>
            )}
            {unresolved === 0 && !loading && (
              <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircle size={16} />
                Todo resuelto
              </div>
            )}
            <button
              onClick={() => { setOffset(0); load() }}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Actualizar"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {(['unresolved', 'all', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setOffset(0) }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'unresolved' ? 'Sin resolver' : f === 'all' ? 'Todos' : 'Resueltos'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" />
            Cargando...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
            <p className="font-medium">No hay errores</p>
            <p className="text-sm mt-1">
              {filter === 'unresolved' ? 'No hay errores pendientes de resolver' : 'No hay registros en este filtro'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {logs.map(log => (
                <ErrorRow key={log.id} log={log} onResolve={handleResolve} onDelete={handleDelete} />
              ))}
            </div>

            {total > limit && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Mostrando {offset + 1}–{Math.min(offset + logs.length, total)} de {total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOffset(o => Math.max(0, o - limit))}
                    disabled={offset === 0}
                    className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setOffset(o => o + limit)}
                    disabled={offset + limit >= total}
                    className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
