import React, { useState, useEffect, useCallback } from 'react'
import { Trash2, Plus, FileText, Loader2 } from 'lucide-react'
import api from '@/lib/axios'

interface Ajuste {
  id: string
  casoId: string
  nombre: string | null
  descripcion: string
  monto: number
  createdAt: string
  updatedAt: string
}

interface BillingResumen {
  casoId: string
  subtotalHoras: number
  ajustes: Ajuste[]
  totalAjustes: number
  totalFinal: number
  moneda: string
  tipoFacturacion: 'flat' | 'por_horas' | null
}

interface Props {
  caseId: string
  moneda?: string
}

function formatMoney(amount: number, moneda: string): string {
  const simbolo = moneda === 'USD' ? 'USD' : 'S/'
  return `${simbolo} ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function BillingAdjustments({ caseId, moneda = 'PEN' }: Props) {
  const [data, setData] = useState<BillingResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [formNombre, setFormNombre] = useState('')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formMonto, setFormMonto] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadBilling = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/cases/${caseId}/billing`)
      setData(res.data.data)
    } catch {
      setError('Error al cargar el resumen de facturación.')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    loadBilling()
  }, [loadBilling])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const descripcion = formDescripcion.trim()
    if (!descripcion) { setFormError('La descripción es requerida'); return }

    const montoNum = parseFloat(formMonto)
    if (isNaN(montoNum)) { setFormError('El monto debe ser un número válido'); return }

    setSaving(true)
    try {
      await api.post(`/cases/${caseId}/billing/adjustments`, {
        nombre: formNombre.trim() || undefined,
        descripcion,
        monto: montoNum,
      })
      setShowForm(false)
      setFormNombre('')
      setFormDescripcion('')
      setFormMonto('')
      await loadBilling()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Error al guardar el ajuste')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (adjId: string) => {
    if (!window.confirm('¿Eliminar este ajuste?')) return
    setDeleting(adjId)
    try {
      await api.delete(`/cases/${caseId}/billing/adjustments/${adjId}`)
      await loadBilling()
    } finally {
      setDeleting(null)
    }
  }

  const handleGenerarPDF = () => {
    const base = api.defaults.baseURL || ''
    window.open(`${base}/cases/${caseId}/billing/pdf`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        Cargando facturación...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
        {error || 'Error al cargar el resumen de facturación.'}
      </div>
    )
  }

  const currMoneda = data.moneda || moneda

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Ajustes de facturación</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerarPDF}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded px-3 py-1.5 transition-colors bg-white"
          >
            <FileText size={13} />
            Generar PDF
          </button>
          <button
            onClick={() => { setShowForm(v => !v); setFormError('') }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"
          >
            <Plus size={14} />
            {showForm ? 'Cancelar' : 'Nuevo ajuste'}
          </button>
        </div>
      </div>

      {/* Adjustments table */}
      {data.ajustes.length > 0 ? (
        <div className="overflow-hidden border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Nombre</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Descripción</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Monto</th>
                <th className="px-3 py-2 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.ajustes.map((adj) => (
                <tr key={adj.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 text-slate-700 font-medium">
                    {adj.nombre || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{adj.descripcion}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    <span className={adj.monto < 0 ? 'text-red-600' : 'text-green-700'}>
                      {formatMoney(adj.monto, currMoneda)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleDelete(adj.id)}
                      disabled={deleting === adj.id}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deleting === adj.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !showForm && (
          <p className="text-sm text-slate-400 italic py-2">Sin ajustes registrados para este caso.</p>
        )
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border border-blue-100 rounded-lg p-4 bg-blue-50/40 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Nuevo ajuste</p>

          {formError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{formError}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Nombre <span className="text-slate-400">(opcional)</span>
              </label>
              <input
                type="text"
                value={formNombre}
                onChange={e => setFormNombre(e.target.value)}
                placeholder="Ej. Descuento, Recargo..."
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Monto <span className="text-slate-400">(negativo para descuentos)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formMonto}
                onChange={e => setFormMonto(e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formDescripcion}
              onChange={e => setFormDescripcion(e.target.value)}
              placeholder="Describe el ajuste..."
              rows={2}
              className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white resize-none"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Guardar ajuste
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError('') }}
              className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Totals */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between px-4 py-2.5 text-sm bg-slate-50">
            <span className="text-slate-600">
              {data.tipoFacturacion === 'flat' ? 'Honorario fijo' : 'Subtotal horas'}
            </span>
            <span className="font-medium text-slate-800">{formatMoney(data.subtotalHoras, currMoneda)}</span>
          </div>
          {data.ajustes.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 text-sm bg-slate-50">
              <span className="text-slate-600">Total ajustes</span>
              <span className={`font-medium ${data.totalAjustes < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {formatMoney(data.totalAjustes, currMoneda)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 bg-white">
            <span className="text-base font-bold text-slate-900">Total a cobrar</span>
            <span className="text-base font-bold text-green-700">{formatMoney(data.totalFinal, currMoneda)}</span>
          </div>
        </div>
      </div>

    </div>
  )
}
