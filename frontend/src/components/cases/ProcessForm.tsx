import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Proceso } from '@/types'
import api from '@/lib/axios'

interface Props {
  caseId: string
  proceso?: Proceso
  onSuccess: (p: Proceso) => void
  onCancel: () => void
}

const ESTADO_OPTIONS = [
  { value: 'pendiente',   label: 'Pendiente' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'completado',  label: 'Completado' },
  { value: 'cancelado',   label: 'Cancelado' },
]

const inputCls = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1'

export function ProcessForm({ caseId, proceso, onSuccess, onCancel }: Props) {
  const isEdit = !!proceso

  const [titulo,      setTitulo]      = useState(proceso?.titulo      ?? '')
  const [descripcion, setDescripcion] = useState(proceso?.descripcion ?? '')
  const [estado,      setEstado]      = useState(proceso?.estado      ?? 'pendiente')

  // Billing
  const [tipoTarifa, setTipoTarifa] = useState<string>(proceso?.tipoTarifa ?? '')
  const [tarifa,     setTarifa]     = useState(proceso?.tarifa != null ? String(proceso.tarifa) : '')
  const [moneda,     setMoneda]     = useState<'PEN' | 'USD'>(proceso?.moneda ?? 'PEN')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) { setError('El título es requerido'); return }

    const payload: Record<string, any> = {
      titulo:      titulo.trim(),
      descripcion: descripcion.trim() || null,
      estado,
      tipoTarifa:  tipoTarifa || null,
      tarifa:      tarifa !== '' ? parseFloat(tarifa) : null,
      moneda,
    }

    setSaving(true)
    setError('')
    try {
      const res = isEdit
        ? await api.patch(`/processes/${proceso!.id}`, payload)
        : await api.post(`/cases/${caseId}/processes`, payload)
      onSuccess(res.data.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error al guardar el proceso')
    } finally {
      setSaving(false)
    }
  }

  const simbolo = moneda === 'USD' ? '$' : 'S/'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Título */}
      <div>
        <label className={labelCls}>
          Nombre del proceso <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: Presentación de demanda, Audiencia preliminar…"
          className={inputCls}
          autoFocus
        />
      </div>

      {/* Descripción */}
      <div>
        <label className={labelCls}>
          Descripción <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          placeholder="Breve descripción del proceso…"
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Estado — solo en edición */}
      {isEdit && (
        <div>
          <label className={labelCls}>Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as Proceso['estado'])}
            className={inputCls}
          >
            {ESTADO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Facturación ── */}
      <div className="border-t border-slate-100 pt-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Facturación <span className="font-normal normal-case text-slate-400">(opcional)</span>
        </p>

        {/* Tipo de tarifa + Moneda */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Tipo de tarifa</label>
            <select
              value={tipoTarifa}
              onChange={(e) => setTipoTarifa(e.target.value)}
              className={inputCls}
            >
              <option value="">— Sin tarifa —</option>
              <option value="por_horas">Por horas</option>
              <option value="plana">Tarifa plana</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Moneda</label>
            <select
              value={moneda}
              onChange={(e) => setMoneda(e.target.value as 'PEN' | 'USD')}
              className={inputCls}
            >
              <option value="PEN">S/ Soles (PEN)</option>
              <option value="USD">$ Dólares (USD)</option>
            </select>
          </div>
        </div>

        {/* Importe — solo si hay tipo de tarifa */}
        {tipoTarifa && (
          <div>
            <label className={labelCls}>
              {tipoTarifa === 'por_horas' ? `Tarifa por hora (${simbolo})` : `Monto fijo (${simbolo})`}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 select-none">
                {simbolo}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                value={tarifa}
                onChange={(e) => setTarifa(e.target.value)}
                placeholder="0.00"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
        )}
      </div>

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
