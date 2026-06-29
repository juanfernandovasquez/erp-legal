import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, Loader2, Check } from 'lucide-react'
import api from '@/lib/axios'

interface TimelineEvent {
  id: string
  titulo: string
  descripcion: string | null
  fecha: string
  completado: boolean
}

interface FormState {
  titulo: string
  descripcion: string
  fecha: string
}

const EMPTY_FORM: FormState = { titulo: '', descripcion: '', fecha: '' }

const inputCls =
  'w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500'

function formatFecha(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00')
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`
}

// Module-level form component — must NOT be defined inside CaseTimeline to prevent focus loss
interface EventFormProps {
  f: FormState
  setF: (v: FormState) => void
  err: string
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
  submitting: boolean
}

function EventForm({ f, setF, err, onSubmit, onCancel, submitLabel, submitting }: EventFormProps) {
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-4 space-y-3 mb-4">
      {err && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-1.5">
          {err}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Título <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={f.titulo}
          onChange={e => setF({ ...f, titulo: e.target.value })}
          placeholder="Ej. Presentación de demanda"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Subtítulo{' '}
          <span className="text-slate-400 font-normal text-xs">(opcional)</span>
        </label>
        <input
          type="text"
          value={f.descripcion}
          onChange={e => setF({ ...f, descripcion: e.target.value })}
          placeholder="Descripción breve del hito..."
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Fecha <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          value={f.fecha}
          onChange={e => setF({ ...f, fecha: e.target.value })}
          className={inputCls}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onSubmit} disabled={submitting} isLoading={submitting}>
          {!submitting && <Check size={14} className="mr-1.5" />}
          {submitLabel}
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface CaseTimelineProps {
  caseId: string
}

export function CaseTimeline({ caseId }: CaseTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>({ ...EMPTY_FORM })
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/${caseId}/timeline`)
      const items: TimelineEvent[] = res.data.data || []
      items.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      setEvents(items)
    } catch {}
    finally { setLoading(false) }
  }, [caseId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    setFormError('')
    if (!form.titulo.trim()) { setFormError('El título es obligatorio'); return }
    if (!form.fecha) { setFormError('La fecha es obligatoria'); return }
    setSaving(true)
    try {
      await api.post(`/${caseId}/events`, {
        event_type: 'otro',
        title: form.titulo.trim(),
        description: form.descripcion.trim() || null,
        event_date: `${form.fecha}T12:00:00`,
      })
      setShowForm(false)
      setForm({ ...EMPTY_FORM })
      await load()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const startEdit = (ev: TimelineEvent) => {
    setEditingId(ev.id)
    setEditForm({
      titulo: ev.titulo,
      descripcion: ev.descripcion || '',
      fecha: ev.fecha.substring(0, 10),
    })
    setEditError('')
    setShowForm(false)
  }

  const handleEdit = async () => {
    setEditError('')
    if (!editForm.titulo.trim()) { setEditError('El título es obligatorio'); return }
    if (!editForm.fecha) { setEditError('La fecha es obligatoria'); return }
    setSavingEdit(true)
    try {
      await api.patch(`/${caseId}/events/${editingId}`, {
        title: editForm.titulo.trim(),
        description: editForm.descripcion.trim() || null,
        event_date: `${editForm.fecha}T12:00:00`,
      })
      setEditingId(null)
      await load()
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || 'Error al guardar')
    } finally { setSavingEdit(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este hito de la línea de tiempo?')) return
    setDeleting(id)
    try {
      await api.delete(`/${caseId}/events/${id}`)
      setEvents(prev => prev.filter(e => e.id !== id))
    } finally { setDeleting(null) }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">Línea de tiempo</CardTitle>
        {!showForm && !editingId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setShowForm(true); setFormError('') }}
          >
            <Plus size={14} className="mr-1.5" />
            Agregar hito
          </Button>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Create form */}
        {showForm && (
          <EventForm
            f={form}
            setF={setForm}
            err={formError}
            onSubmit={handleCreate}
            onCancel={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); setFormError('') }}
            submitLabel="Agregar"
            submitting={saving}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-slate-400" />
          </div>
        ) : events.length === 0 && !showForm ? (
          <p className="text-slate-400 text-sm text-center py-8 italic">
            Sin hitos — agrega el primero para iniciar la línea de tiempo.
          </p>
        ) : (
          <div className="space-y-0">
            {events.map((ev, index) => {
              const d = new Date(ev.fecha.includes('T') ? ev.fecha : ev.fecha + 'T12:00:00')
              d.setHours(0, 0, 0, 0)
              const isPast = d < today
              const isToday = d.getTime() === today.getTime()
              const isLast = index === events.length - 1

              if (editingId === ev.id) {
                return (
                  <div key={ev.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5 bg-primary-400 ring-2 ring-primary-100" />
                      {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-1 min-h-[20px]" />}
                    </div>
                    <div className="flex-1 pb-5">
                      <EventForm
                        f={editForm}
                        setF={setEditForm}
                        err={editError}
                        onSubmit={handleEdit}
                        onCancel={() => { setEditingId(null); setEditError('') }}
                        submitLabel="Guardar"
                        submitting={savingEdit}
                      />
                    </div>
                  </div>
                )
              }

              return (
                <div key={ev.id} className="flex gap-4">
                  {/* Dot + connector line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${
                        isToday
                          ? 'bg-yellow-400 ring-2 ring-yellow-200'
                          : isPast
                          ? 'bg-slate-300'
                          : 'bg-primary-500 ring-2 ring-primary-100'
                      }`}
                    />
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-slate-200 my-1 min-h-[20px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-5 flex-1 ${isPast && !isToday ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 pt-0.5">
                        <p
                          className={`text-sm font-semibold leading-tight ${
                            isToday ? 'text-yellow-700' : 'text-slate-900'
                          }`}
                        >
                          {ev.titulo}
                        </p>
                        {ev.descripcion && (
                          <p className="text-xs text-slate-500 mt-0.5">{ev.descripcion}</p>
                        )}
                        <p
                          className={`text-xs mt-1 ${
                            isToday ? 'text-yellow-600 font-medium' : 'text-slate-400'
                          }`}
                        >
                          {isToday ? 'Hoy · ' : ''}
                          {formatFecha(ev.fecha)}
                        </p>
                      </div>

                      <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(ev)}
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(ev.id)}
                          disabled={deleting === ev.id}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                          title="Eliminar"
                        >
                          {deleting === ev.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
