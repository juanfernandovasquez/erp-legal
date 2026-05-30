import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Proceso } from '@/types'
import api from '@/lib/axios'

interface Props {
  caseId: string
  proceso?: Proceso          // si se pasa, es edición; si no, es creación
  onSuccess: (p: Proceso) => void
  onCancel: () => void
}

const ESTADO_OPTIONS = [
  { value: 'pendiente',   label: 'Pendiente' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'completado',  label: 'Completado' },
  { value: 'cancelado',   label: 'Cancelado' },
]

export function ProcessForm({ caseId, proceso, onSuccess, onCancel }: Props) {
  const isEdit = !!proceso

  const [titulo, setTitulo]         = useState(proceso?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(proceso?.descripcion ?? '')
  const [estado, setEstado]         = useState(proceso?.estado ?? 'pendiente')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) { setError('El título es requerido'); return }

    setSaving(true)
    setError('')
    try {
      let res
      if (isEdit) {
        res = await api.patch(`/processes/${proceso!.id}`, { titulo, descripcion, estado })
      } else {
        res = await api.post(`/cases/${caseId}/processes`, { titulo, descripcion, estado })
      }
      onSuccess(res.data.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error al guardar el proceso')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nombre del proceso <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: Presentación de demanda, Audiencia preliminar…"
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Descripción <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          placeholder="Breve descripción del proceso…"
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {isEdit && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as Proceso['estado'])}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ESTADO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear proceso'}
        </Button>
      </div>
    </form>
  )
}
