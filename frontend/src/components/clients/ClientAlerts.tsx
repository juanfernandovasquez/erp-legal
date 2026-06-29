import React, { useState, useEffect, useCallback } from 'react'
import { Bell, Plus, Trash2, Pencil, Check, X, Loader2, Calendar, Repeat2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/axios'

interface AlertRule {
  id: string
  clientId: string
  titulo: string
  descripcion: string | null
  fecha: string
  esAnual: boolean
  diasAnticipacion: number
  destinatarios: string[]
  destinatariosInfo: { id: string; nombre: string; email: string }[]
  isActive: boolean
}

interface UserOption {
  id: string
  nombre: string
  email: string
}

interface FormState {
  titulo: string
  descripcion: string
  fecha: string
  esAnual: boolean
  diasAnticipacion: number
  destinatarios: string[]
}

const EMPTY_FORM: FormState = {
  titulo: '',
  descripcion: '',
  fecha: '',
  esAnual: false,
  diasAnticipacion: 1,
  destinatarios: [],
}

const inputCls = 'w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500'

function formatFecha(iso: string, esAnual: boolean): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T12:00:00')
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const day = d.getDate()
  const mon = months[d.getMonth()]
  return esAnual ? `${day} ${mon} (cada año)` : `${day} ${mon} ${d.getFullYear()}`
}

// ── Module-level form component (must be outside ClientAlerts to avoid focus loss) ──

interface RuleFormProps {
  f: FormState
  setF: (v: FormState) => void
  err: string
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
  submitting: boolean
  users: UserOption[]
}

function RuleForm({ f, setF, err, onSubmit, onCancel, submitLabel, submitting, users }: RuleFormProps) {
  const toggleDest = (uid: string) => {
    const next = f.destinatarios.includes(uid)
      ? f.destinatarios.filter(x => x !== uid)
      : [...f.destinatarios, uid]
    setF({ ...f, destinatarios: next })
  }

  return (
    <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 space-y-4">
      {err && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-1.5">{err}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Título <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={f.titulo}
            onChange={e => setF({ ...f, titulo: e.target.value })}
            placeholder="Ej. Cumpleaños del cliente"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Fecha del evento <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={f.fecha}
            onChange={e => setF({ ...f, fecha: e.target.value })}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Días de anticipación</label>
          <input
            type="number"
            min={0}
            max={365}
            value={f.diasAnticipacion}
            onChange={e => setF({ ...f, diasAnticipacion: Number(e.target.value) })}
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2 flex items-center gap-2.5">
          <input
            type="checkbox"
            id="chk-esAnual"
            checked={f.esAnual}
            onChange={e => setF({ ...f, esAnual: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-primary-600"
          />
          <label htmlFor="chk-esAnual" className="text-sm text-slate-700 cursor-pointer">
            Repetir cada año{' '}
            <span className="text-xs text-slate-400 font-normal">(cumpleaños, aniversarios, etc.)</span>
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Nota <span className="text-slate-400 font-normal text-xs">(opcional)</span>
          </label>
          <input
            type="text"
            value={f.descripcion}
            onChange={e => setF({ ...f, descripcion: e.target.value })}
            placeholder="Mensaje adicional para incluir en el recordatorio..."
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Destinatarios <span className="text-red-400">*</span>
          </label>
          {users.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No hay usuarios disponibles</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {users.map(u => {
                const sel = f.destinatarios.includes(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleDest(u.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      sel
                        ? 'bg-primary-700 text-white border-primary-700'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-primary-400 hover:text-primary-700'
                    }`}
                  >
                    {sel && <Check size={12} />}
                    {u.nombre}
                  </button>
                )
              })}
            </div>
          )}
        </div>
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

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  clientId: string
}

export function ClientAlerts({ clientId }: Props) {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    setLoading(true); setError('')
    try {
      const [rulesRes, usersRes] = await Promise.allSettled([
        api.get(`/clients/${clientId}/alert-rules`),
        api.get('/users?limit=100'),
      ])
      if (rulesRes.status === 'fulfilled') setRules(rulesRes.value.data.data || [])
      if (usersRes.status === 'fulfilled') {
        const raw = usersRes.value.data.data || []
        setUsers(raw.map((u: any) => ({
          id: u.id,
          nombre: u.nombre || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          email: u.email,
        })))
      }
    } catch { setError('Error al cargar las alertas.') }
    finally { setLoading(false) }
  }, [clientId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    setFormError('')
    if (!form.titulo.trim()) { setFormError('El título es obligatorio'); return }
    if (!form.fecha) { setFormError('La fecha es obligatoria'); return }
    if (form.destinatarios.length === 0) { setFormError('Selecciona al menos un destinatario'); return }
    setSaving(true)
    try {
      await api.post(`/clients/${clientId}/alert-rules`, {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        fecha: form.fecha,
        esAnual: form.esAnual,
        diasAnticipacion: Number(form.diasAnticipacion),
        destinatarios: form.destinatarios,
      })
      setShowForm(false); setForm({ ...EMPTY_FORM }); await load()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const startEdit = (rule: AlertRule) => {
    setEditingId(rule.id)
    setEditForm({
      titulo: rule.titulo,
      descripcion: rule.descripcion || '',
      fecha: rule.fecha,
      esAnual: rule.esAnual,
      diasAnticipacion: rule.diasAnticipacion,
      destinatarios: rule.destinatarios,
    })
    setEditError('')
  }

  const handleEdit = async () => {
    setEditError('')
    if (!editForm.titulo.trim()) { setEditError('El título es obligatorio'); return }
    if (!editForm.fecha) { setEditError('La fecha es obligatoria'); return }
    setSavingEdit(true)
    try {
      await api.patch(`/clients/${clientId}/alert-rules/${editingId}`, {
        titulo: editForm.titulo.trim(),
        descripcion: editForm.descripcion.trim() || null,
        fecha: editForm.fecha,
        esAnual: editForm.esAnual,
        diasAnticipacion: Number(editForm.diasAnticipacion),
        destinatarios: editForm.destinatarios,
      })
      setEditingId(null); await load()
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || 'Error al guardar')
    } finally { setSavingEdit(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta alerta?')) return
    setDeleting(id)
    try { await api.delete(`/clients/${clientId}/alert-rules/${id}`); await load() }
    finally { setDeleting(null) }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-50 rounded-lg">
            <Bell size={15} className="text-amber-600" />
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-800">Alertas personalizadas</span>
            {rules.length > 0 && (
              <span className="ml-2 text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
                {rules.length}
              </span>
            )}
          </div>
        </div>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => { setShowForm(true); setFormError('') }}>
            <Plus size={14} className="mr-1.5" />
            Nueva alerta
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <RuleForm
          f={form}
          setF={setForm}
          err={formError}
          onSubmit={handleCreate}
          onCancel={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); setFormError('') }}
          submitLabel="Crear alerta"
          submitting={saving}
          users={users}
        />
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 size={16} className="animate-spin mr-2" /> Cargando...
        </div>
      ) : error ? (
        <p className="px-5 py-4 text-sm text-red-600">{error}</p>
      ) : rules.length === 0 && !showForm ? (
        <p className="px-5 py-8 text-sm text-slate-400 text-center italic">
          Sin alertas — crea una para recibir recordatorios por email.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rules.map(rule => (
            <li key={rule.id}>
              {editingId === rule.id ? (
                <RuleForm
                  f={editForm}
                  setF={setEditForm}
                  err={editError}
                  onSubmit={handleEdit}
                  onCancel={() => { setEditingId(null); setEditError('') }}
                  submitLabel="Guardar cambios"
                  submitting={savingEdit}
                  users={users}
                />
              ) : (
                <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${rule.isActive ? 'bg-amber-50' : 'bg-slate-100'}`}>
                    <Bell size={13} className={rule.isActive ? 'text-amber-500' : 'text-slate-400'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{rule.titulo}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar size={11} />
                        {formatFecha(rule.fecha, rule.esAnual)}
                      </span>
                      {rule.esAnual && (
                        <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                          <Repeat2 size={11} /> Anual
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {rule.diasAnticipacion === 0
                          ? 'el mismo día'
                          : rule.diasAnticipacion === 1
                          ? '1 día antes'
                          : `${rule.diasAnticipacion} días antes`}
                      </span>
                    </div>
                    {rule.descripcion && (
                      <p className="text-xs text-slate-500 mt-1 italic">"{rule.descripcion}"</p>
                    )}
                    {rule.destinatariosInfo.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Users size={11} className="text-slate-400 flex-shrink-0" />
                        <p className="text-xs text-slate-500 truncate">
                          {rule.destinatariosInfo.map(d => d.nombre).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(rule)} title="Editar">
                      <Pencil size={13} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(rule.id)}
                      disabled={deleting === rule.id}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                      title="Eliminar"
                    >
                      {deleting === rule.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
