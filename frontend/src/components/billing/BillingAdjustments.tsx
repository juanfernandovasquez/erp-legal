import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, FileText, Loader2 } from 'lucide-react'
import api from '@/lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Ajuste {
  id: string
  procesoId: string
  nombre: string | null
  descripcion: string
  monto: number
  createdAt: string
  updatedAt: string
}

interface BillingResumen {
  procesoId: string
  subtotalHoras: number
  ajustes: Ajuste[]
  totalAjustes: number
  totalFinal: number
  moneda: 'PEN' | 'USD'
  tipoTarifa: 'plana' | 'por_horas' | null
}

interface Props {
  processId: string
  moneda?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMoney(amount: number, moneda: string): string {
  const simbolo = moneda === 'USD' ? 'USD' : 'S/'
  return `${simbolo} ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BillingAdjustments({ processId, moneda = 'PEN' }: Props) {
  const qc = useQueryClient()

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formNombre, setFormNombre] = useState('')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formMonto, setFormMonto] = useState('')
  const [formError, setFormError] = useState('')

  // Load billing summary
  const { data, isLoading, isError } = useQuery<BillingResumen>({
    queryKey: ['billing', processId],
    queryFn: async () => {
      const res = await api.get(`/processes/${processId}/billing`)
      return res.data.data
    },
  })

  // Create adjustment
  const createMutation = useMutation({
    mutationFn: async (body: { nombre?: string; descripcion: string; monto: number }) => {
      await api.post(`/processes/${processId}/billing/adjustments`, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing', processId] })
      setShowForm(false)
      setFormNombre('')
      setFormDescripcion('')
      setFormMonto('')
      setFormError('')
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.detail || 'Error al guardar el ajuste')
    },
  })

  // Delete adjustment
  const deleteMutation = useMutation({
    mutationFn: async (adjId: string) => {
      await api.delete(`/processes/${processId}/billing/adjustments/${adjId}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing', processId] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const descripcion = formDescripcion.trim()
    if (!descripcion) {
      setFormError('La descripción es requerida')
      return
    }

    const montoNum = parseFloat(formMonto)
    if (isNaN(montoNum)) {
      setFormError('El monto debe ser un número válido')
      return
    }

    createMutation.mutate({
      nombre: formNombre.trim() || undefined,
      descripcion,
      monto: montoNum,
    })
  }

  const handleDeleteAjuste = (adjId: string) => {
    if (!window.confirm('¿Eliminar este ajuste?')) return
    deleteMutation.mutate(adjId)
  }

  const handleGenerarPDF = () => {
    // Open the PDF in a new tab — the browser will handle download/view
    const base = api.defaults.baseURL || ''
    window.open(`${base}/processes/${processId}/billing/pdf`, '_blank')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        Cargando facturación...
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
        Error al cargar el resumen de facturación.
      </div>
    )
  }

  const currMoneda = data.moneda || moneda

  return (
    <div className="space-y-4">

      {/* Header row */}
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
            onClick={() => { setShowForm((v) => !v); setFormError('') }}
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
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Nombre
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Descripción
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Monto
                </th>
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
                      onClick={() => handleDeleteAjuste(adj.id)}
                      disabled={deleteMutation.isPending}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Eliminar ajuste"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !showForm && (
          <p className="text-sm text-slate-400 italic py-2">
            Sin ajustes registrados para este proceso.
          </p>
        )
      )}

      {/* Add adjustment form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border border-blue-100 rounded-lg p-4 bg-blue-50/40 space-y-3"
        >
          <p className="text-sm font-semibold text-slate-700">Nuevo ajuste</p>

          {formError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              {formError}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Nombre <span className="text-slate-400">(opcional)</span>
              </label>
              <input
                type="text"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
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
                onChange={(e) => setFormMonto(e.target.value)}
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
              onChange={(e) => setFormDescripcion(e.target.value)}
              placeholder="Describe el ajuste..."
              rows={2}
              className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white resize-none"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Plus size={12} />
              )}
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

      {/* Totals summary */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between px-4 py-2.5 text-sm bg-slate-50">
            <span className="text-slate-600">
              {data.tipoTarifa === 'plana' ? 'Honorario fijo' : 'Subtotal horas'}
            </span>
            <span className="font-medium text-slate-800">
              {formatMoney(data.subtotalHoras, currMoneda)}
            </span>
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
            <span className="text-base font-bold text-green-700">
              {formatMoney(data.totalFinal, currMoneda)}
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
