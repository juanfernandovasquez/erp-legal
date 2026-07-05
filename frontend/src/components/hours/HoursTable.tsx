import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DateInput } from '@/components/ui/DateInput'
import { formatDate } from '@/lib/utils'
import { Loader, Trash2, Clock, DollarSign, TrendingUp, Pencil, Check, X, ChevronDown } from 'lucide-react'
import api from '@/lib/axios'

interface HoursEntry {
  id: string
  tareaId?: string
  horas?: number
  horasTrabajas?: number
  descripcion: string
  fechaRegistro: string
  tarifaHora?: number
  montoTotal?: number
  usuario?: { nombre: string }
}

interface EditForm {
  minutos: string
  descripcion: string
  fecha: string
}

const getHoras  = (h: HoursEntry): number => h.horas ?? h.horasTrabajas ?? 0
const getMonto  = (h: HoursEntry): number => h.montoTotal ?? 0
const getTarifa = (h: HoursEntry): number => h.tarifaHora ?? 0

interface HoursTableProps {
  caseId?: string
  tareas?: { id: string; titulo: string; fechaPresentacion?: string | null }[]
  moneda?: 'PEN' | 'USD'
  tipoFacturacion?: 'flat' | 'por_horas' | null
  onUpdate?: () => void
}

function formatDuration(horas: number): string {
  const totalMin = Math.round(horas * 60)
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function HoursTable({ caseId, tareas = [], moneda = 'PEN', tipoFacturacion, onUpdate }: HoursTableProps) {
  const simbolo = moneda === 'USD' ? '$' : 'S/'
  const [horas, setHoras]             = useState<HoursEntry[]>([])
  const [isLoading, setIsLoading]     = useState(false)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Edit state
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editForm, setEditForm]     = useState<EditForm>({ minutos: '', descripcion: '', fecha: '' })
  const [saving, setSaving]         = useState(false)
  const [editError, setEditError]   = useState('')

  // Collapsible groups — empty = all collapsed by default
  const [expanded, setExpanded]     = useState<Set<string>>(new Set())

  useEffect(() => { fetchHoras() }, [caseId])

  const fetchHoras = async () => {
    setIsLoading(true)
    try {
      // For flat-rate cases, trigger recalculation before fetching so
      // historical records (created before auto-recalc) show correct amounts.
      if (caseId && tipoFacturacion === 'flat') {
        await api.post(`/cases/${caseId}/hours/recalculate`).catch(() => {})
      }
      const endpoint = caseId ? `/cases/${caseId}/hours` : '/hours/my-hours'
      const res = await api.get(endpoint)
      setHoras(res.data.data || [])
    } catch (e) {
      console.error('Error fetching horas:', e)
    } finally {
      setIsLoading(false)
    }
  }

  /* ── Delete ── */
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(deleteTarget)
    setDeleteTarget(null)
    try {
      await api.delete(`/hours/${deleteTarget}`)
      setHoras((prev) => prev.filter((h) => h.id !== deleteTarget))
      onUpdate?.()
    } catch (e) {
      console.error('Error deleting horas:', e)
    } finally {
      setDeleting(null)
    }
  }

  /* ── Edit ── */
  const startEdit = (h: HoursEntry) => {
    setEditError('')
    setEditingId(h.id)
    setEditForm({
      minutos: String(Math.round(getHoras(h) * 60)),
      descripcion: h.descripcion,
      fecha: h.fechaRegistro ? h.fechaRegistro.split('T')[0] : new Date().toISOString().split('T')[0],
    })
  }

  const cancelEdit = () => { setEditingId(null); setEditError('') }

  const saveEdit = async () => {
    const min = parseInt(editForm.minutos)
    if (!min || min <= 0) { setEditError('Ingresa minutos válidos'); return }
    setSaving(true)
    setEditError('')
    try {
      const horasDecimal = min / 60
      const res = await api.patch(`/hours/${editingId}`, {
        horas:         horasDecimal,
        descripcion:   editForm.descripcion.trim(),
        fechaRegistro: editForm.fecha,
      })
      const updated = res.data.data
      setHoras((prev) => prev.map((h) => (h.id === editingId ? { ...h, ...updated } : h)))
      setEditingId(null)
      onUpdate?.()
    } catch (e: any) {
      setEditError(e?.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  /* ── Collapse ── */
  const toggleGroup = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const getTareaTitulo = (tareaId?: string) =>
    !tareaId ? 'Sin tarea asignada' : (tareas.find((t) => t.id === tareaId)?.titulo ?? `Tarea ${tareaId.slice(0, 8)}`)

  // Totals
  const totalHoras = horas.reduce((acc, h) => acc + getHoras(h), 0)
  const totalMonto = horas.reduce((acc, h) => acc + getMonto(h), 0)
  const totalMin   = Math.round(totalHoras * 60)

  // Group by tareaId
  const grouped = horas.reduce<Record<string, HoursEntry[]>>((acc, h) => {
    const key = h.tareaId || '__sin_tarea__'
    if (!acc[key]) acc[key] = []
    acc[key].push(h)
    return acc
  }, {})

  // Sort groups by the task's fechaPresentacion (from prop — always current, no refetch needed).
  // Tasks without date go after dated ones; __sin_tarea__ always last.
  const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
    if (a === '__sin_tarea__') return 1
    if (b === '__sin_tarea__') return -1
    const fechaA = tareas.find((t) => t.id === a)?.fechaPresentacion ?? null
    const fechaB = tareas.find((t) => t.id === b)?.fechaPresentacion ?? null
    if (!fechaA && !fechaB) return 0
    if (!fechaA) return 1
    if (!fechaB) return -1
    return fechaA.localeCompare(fechaB)
  })

  return (
    <>
      <div className="space-y-4">

        {/* Summary cards */}
        {horas.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg flex-shrink-0"><Clock size={16} className="text-blue-600" /></div>
              <div className="min-w-0">
                <p className="text-sm sm:text-xl font-bold text-slate-900 truncate">{formatDuration(totalHoras)}</p>
                <p className="text-xs text-slate-500 hidden sm:block">{totalMin} min en total</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-50 rounded-lg flex-shrink-0"><DollarSign size={16} className="text-green-600" /></div>
              <div className="min-w-0">
                <p className="text-sm sm:text-xl font-bold text-slate-900 truncate">{simbolo} {totalMonto.toFixed(0)}</p>
                <p className="text-xs text-slate-500 hidden sm:block">monto facturable</p>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-purple-50 rounded-lg flex-shrink-0"><TrendingUp size={16} className="text-purple-600" /></div>
              <div className="min-w-0">
                <p className="text-sm sm:text-xl font-bold text-slate-900 truncate">
                  {totalHoras > 0 ? `${simbolo}${(totalMonto / totalHoras).toFixed(0)}/h` : '—'}
                </p>
                <p className="text-xs text-slate-500 hidden sm:block">tarifa promedio</p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader className="animate-spin text-primary-700" size={24} />
          </div>
        ) : horas.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-white border border-slate-200 rounded-xl">
            <Clock size={28} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm text-slate-500">No hay tiempo registrado aún.</p>
            <p className="text-xs text-slate-400 mt-1">Usa el botón de arriba para registrar.</p>
          </div>
        ) : (
          sortedGroupKeys.map((key) => {
            const entries = grouped[key]
            const subtotalH   = entries.reduce((a, e) => a + getHoras(e), 0)
            const subtotalM   = entries.reduce((a, e) => a + getMonto(e), 0)
            const titulo      = getTareaTitulo(key === '__sin_tarea__' ? undefined : key)
            const subtotalMin = Math.round(subtotalH * 60)
            const isCollapsed = !expanded.has(key)

            return (
              <Card key={key}>
                {/* ── Clickable header to toggle ── */}
                <button
                  type="button"
                  onClick={() => toggleGroup(key)}
                  className="w-full text-left"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronDown
                          size={15}
                          className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                        />
                        <p className="text-sm font-semibold text-slate-800 truncate">{titulo}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 text-sm">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Clock size={13} />
                          <span className="font-medium">{formatDuration(subtotalH)}</span>
                          <span className="text-xs text-slate-400">({subtotalMin} min)</span>
                        </span>
                        {subtotalM > 0 && (
                          <span className="font-semibold text-green-700">
                            {simbolo} {subtotalM.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {/* ── Collapsible content ── */}
                {!isCollapsed && (
                  <CardContent>
                    <div className="space-y-1">
                      {entries.map((h) => {
                        const minH = Math.round(getHoras(h) * 60)
                        const isEditing = editingId === h.id

                        if (isEditing) {
                          /* ── Edit form ── */
                          const previewMin   = parseInt(editForm.minutos) || 0
                          const previewHoras = previewMin / 60

                          return (
                            <div key={h.id} className="py-3 border-b border-slate-100 last:border-0">
                              <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                                {editError && (
                                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                                    {editError}
                                  </p>
                                )}
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Minutos *</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="1440"
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    value={editForm.minutos}
                                    onChange={(e) => setEditForm((f) => ({ ...f, minutos: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  {previewMin > 0 && (
                                    <p className="text-xs text-slate-400 mt-0.5">= {previewHoras.toFixed(2)} h</p>
                                  )}
                                </div>
                                <div>
                                  <DateInput
                                    label="Fecha"
                                    value={editForm.fecha}
                                    onChange={(e) => setEditForm((f) => ({ ...f, fecha: e.target.value }))}
                                    className="px-2 py-1.5 text-sm border-slate-300 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Descripción <span className="font-normal text-slate-400">(opcional)</span></label>
                                  <textarea
                                    rows={2}
                                    value={editForm.descripcion}
                                    onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
                                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    disabled={saving}
                                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                                  >
                                    <X size={12} /> Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={saveEdit}
                                    disabled={saving}
                                    className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors disabled:opacity-50"
                                  >
                                    <Check size={12} /> {saving ? 'Guardando…' : 'Guardar'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        }

                        /* ── Normal row ── */
                        return (
                          <div
                            key={h.id}
                            className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-700">{h.descripcion}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 flex-wrap">
                                <span>{formatDate(h.fechaRegistro)}</span>
                                {h.usuario?.nombre && <span>· {h.usuario.nombre}</span>}
                                {getTarifa(h) > 0 && <span>· {simbolo} {getTarifa(h)}/h</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 text-right">
                              <div>
                                <p className="text-sm font-medium text-slate-700">{minH} min</p>
                                <p className="text-xs text-slate-400">{getHoras(h).toFixed(2)} h</p>
                              </div>
                              {getMonto(h) > 0 && (
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-green-700">{simbolo} {getMonto(h).toFixed(2)}</p>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startEdit(h)}
                                  className="text-slate-300 hover:text-blue-500 transition-colors"
                                  title="Editar"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(h.id)}
                                  disabled={deleting === h.id}
                                  className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
                                  title="Eliminar"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Eliminar registro"
        description="¿Estás seguro de que deseas eliminar este registro de tiempo?"
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={!!deleting}
        onConfirm={confirmDelete}
      />
    </>
  )
}
