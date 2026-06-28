import React, { useState, useEffect, useCallback } from 'react'
import { Bell, Plus, Trash2, Loader2, Check, X, ToggleLeft, ToggleRight, Pencil } from 'lucide-react'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

interface Rule {
  id: string
  daysBefore: number
  notifyAssignee: boolean
  notifySupervisors: boolean
  isActive: boolean
}

interface Props {
  caseId: string
}

const ADMIN_ROLES = ['admin_firma', 'super_admin']

export function NotificationRules({ caseId }: Props) {
  const { user } = useAuthStore()
  const isAdmin = ADMIN_ROLES.includes(user?.rol ?? '')

  const [rules, setRules]       = useState<Rule[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError]       = useState('')

  // Create form
  const [formDays, setFormDays]               = useState('')
  const [formAssignee, setFormAssignee]       = useState(true)
  const [formSupervisors, setFormSupervisors] = useState(false)
  const [formError, setFormError]             = useState('')

  // Edit state
  const [editingId, setEditingId]           = useState<string | null>(null)
  const [editDays, setEditDays]             = useState('')
  const [editAssignee, setEditAssignee]     = useState(true)
  const [editSupervisors, setEditSupervisors] = useState(false)
  const [editSaving, setEditSaving]         = useState(false)
  const [editError, setEditError]           = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/cases/${caseId}/notification-rules`)
      setRules(res.data.data)
    } catch { setError('Error al cargar reglas') }
    finally { setLoading(false) }
  }, [caseId])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const days = parseInt(formDays)
    if (!days || days < 1) { setFormError('Ingresa un número de días válido'); return }
    if (!formAssignee && !formSupervisors) { setFormError('Selecciona al menos un destinatario'); return }
    setSaving(true)
    try {
      await api.post(`/cases/${caseId}/notification-rules`, {
        daysBefore: days,
        notifyAssignee: formAssignee,
        notifySupervisors: formSupervisors,
      })
      setShowForm(false); setFormDays(''); setFormAssignee(true); setFormSupervisors(false)
      await load()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id)
    setEditDays(String(rule.daysBefore))
    setEditAssignee(rule.notifyAssignee)
    setEditSupervisors(rule.notifySupervisors)
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError('')
  }

  const handleEdit = async (rule: Rule) => {
    setEditError('')
    const days = parseInt(editDays)
    if (!days || days < 1) { setEditError('Días inválidos'); return }
    if (!editAssignee && !editSupervisors) { setEditError('Selecciona al menos un destinatario'); return }
    setEditSaving(true)
    try {
      await api.patch(`/cases/${caseId}/notification-rules/${rule.id}`, {
        daysBefore: days,
        notifyAssignee: editAssignee,
        notifySupervisors: editSupervisors,
      })
      setEditingId(null)
      await load()
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || 'Error al guardar')
    } finally { setEditSaving(false) }
  }

  const handleToggle = async (rule: Rule) => {
    setToggling(rule.id)
    try {
      await api.patch(`/cases/${caseId}/notification-rules/${rule.id}`, { isActive: !rule.isActive })
      await load()
    } finally { setToggling(null) }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta regla?')) return
    setDeleting(id)
    try { await api.delete(`/cases/${caseId}/notification-rules/${id}`); await load() }
    finally { setDeleting(null) }
  }

  const daysLabel = (d: number) =>
    d === 0 ? 'El día del vencimiento' : d === 1 ? '1 día antes' : `${d} días antes`

  const recipientsLabel = (r: Rule) => {
    const parts = []
    if (r.notifyAssignee) parts.push('Encargado')
    if (r.notifySupervisors) parts.push('Supervisores')
    return parts.join(' + ')
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-50 rounded-lg">
            <Bell size={15} className="text-amber-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800">Notificaciones de plazo</span>
          {rules.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">{rules.length}</span>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowForm(v => !v); setFormError(''); setEditingId(null) }}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Plus size={13} />
            {showForm ? 'Cancelar' : 'Nueva regla'}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="px-5 py-4 bg-slate-50 border-b border-slate-100 space-y-3">
          {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-1.5">{formError}</p>}
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Días antes del vencimiento</label>
              <input
                type="number" min="1" max="365"
                value={formDays} onChange={e => setFormDays(e.target.value)}
                placeholder="Ej: 7"
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-500">Notificar a</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={formAssignee} onChange={e => setFormAssignee(e.target.checked)} className="rounded" />
                  Encargado de tarea
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={formSupervisors} onChange={e => setFormSupervisors(e.target.checked)} className="rounded" />
                  Supervisores
                </label>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Guardar
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError('') }}
              className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 size={16} className="animate-spin mr-2" /> Cargando...
        </div>
      ) : error ? (
        <p className="px-5 py-4 text-sm text-red-600">{error}</p>
      ) : rules.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-400 text-center italic">
          Sin reglas — las tareas de este caso no enviarán alertas de plazo.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500">Cuándo</th>
              <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500">Destinatarios</th>
              <th className="px-5 py-2.5 text-center text-xs font-medium text-slate-500">Estado</th>
              {isAdmin && <th className="px-4 py-2.5 w-20" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rules.map(rule => (
              <React.Fragment key={rule.id}>
                {editingId === rule.id ? (
                  /* ── inline edit row ── */
                  <tr className="bg-blue-50/40">
                    <td colSpan={isAdmin ? 4 : 3} className="px-5 py-3">
                      {editError && <p className="text-xs text-red-600 mb-2">{editError}</p>}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="1" max="365"
                            value={editDays} onChange={e => setEditDays(e.target.value)}
                            className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                          <span className="text-xs text-slate-500">días antes</span>
                        </div>
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                          <input type="checkbox" checked={editAssignee} onChange={e => setEditAssignee(e.target.checked)} className="rounded" />
                          Encargado
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                          <input type="checkbox" checked={editSupervisors} onChange={e => setEditSupervisors(e.target.checked)} className="rounded" />
                          Supervisores
                        </label>
                        <div className="flex gap-2 ml-auto">
                          <button onClick={() => handleEdit(rule)} disabled={editSaving}
                            className="flex items-center gap-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
                            {editSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            Guardar
                          </button>
                          <button onClick={cancelEdit}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-100">
                            <X size={11} /> Cancelar
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* ── normal row ── */
                  <tr className={`hover:bg-slate-50 transition-colors ${!rule.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-800">{daysLabel(rule.daysBefore)}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">{recipientsLabel(rule)}</td>
                    <td className="px-5 py-3 text-center">
                      {isAdmin ? (
                        <button onClick={() => handleToggle(rule)} disabled={toggling === rule.id} className="disabled:opacity-50">
                          {toggling === rule.id
                            ? <Loader2 size={16} className="animate-spin text-slate-400 mx-auto" />
                            : rule.isActive
                              ? <ToggleRight size={22} className="text-emerald-500 mx-auto" />
                              : <ToggleLeft size={22} className="text-slate-300 mx-auto" />
                          }
                        </button>
                      ) : (
                        <span className={`text-xs font-medium ${rule.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {rule.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(rule)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(rule.id)} disabled={deleting === rule.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                            {deleting === rule.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
