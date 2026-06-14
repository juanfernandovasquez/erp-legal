import React, { useState, useEffect, useCallback } from 'react'
import { Trash2, Plus, FileText, Loader2, Pencil, Check, X, SlidersHorizontal, DollarSign } from 'lucide-react'
import api from '@/lib/axios'

interface Ajuste {
  id: string
  casoId: string
  nombre: string | null
  descripcion: string
  monto: number
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

function fmt(amount: number, moneda: string): string {
  const s = moneda === 'USD' ? 'USD' : 'S/'
  return `${s} ${Math.abs(amount).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white'

export function BillingAdjustments({ caseId, moneda = 'PEN' }: Props) {
  const [data, setData]       = useState<BillingResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [generatingPDF, setGeneratingPDF] = useState(false)

  // New form
  const [showForm, setShowForm]           = useState(false)
  const [formDesc, setFormDesc]           = useState('')
  const [formMonto, setFormMonto]         = useState('')
  const [formError, setFormError]         = useState('')
  const [saving, setSaving]               = useState(false)

  // Inline edit
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [editDesc, setEditDesc]           = useState('')
  const [editMonto, setEditMonto]         = useState('')
  const [editError, setEditError]         = useState('')
  const [savingEdit, setSavingEdit]       = useState(false)

  const [deleting, setDeleting]           = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await api.get(`/cases/${caseId}/billing`)
      setData(res.data.data)
    } catch { setError('Error al cargar la facturación.') }
    finally { setLoading(false) }
  }, [caseId])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('')
    const monto = parseFloat(formMonto)
    if (isNaN(monto)) { setFormError('Monto inválido'); return }
    setSaving(true)
    try {
      await api.post(`/cases/${caseId}/billing/adjustments`, {
        descripcion: formDesc.trim() || null,
        monto,
      })
      setShowForm(false); setFormDesc(''); setFormMonto('')
      await load()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const startEdit = (adj: Ajuste) => {
    setEditingId(adj.id)
    setEditDesc(adj.descripcion); setEditMonto(String(adj.monto)); setEditError('')
  }

  const handleEdit = async (adj: Ajuste) => {
    setEditError('')
    const monto = parseFloat(editMonto)
    if (isNaN(monto)) { setEditError('Monto inválido'); return }
    setSavingEdit(true)
    try {
      await api.patch(`/cases/${caseId}/billing/adjustments/${adj.id}`, {
        descripcion: editDesc.trim() || null,
        monto,
      })
      setEditingId(null); await load()
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || 'Error al guardar')
    } finally { setSavingEdit(false) }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este ajuste?')) return
    setDeleting(id)
    try { await api.delete(`/cases/${caseId}/billing/adjustments/${id}`); await load() }
    finally { setDeleting(null) }
  }

  const handlePDF = async () => {
    setGeneratingPDF(true)
    try {
      const res = await api.get(`/cases/${caseId}/billing/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = 'factura.pdf'; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Error al generar el PDF') }
    finally { setGeneratingPDF(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-10 text-slate-400">
      <Loader2 size={18} className="animate-spin mr-2" /> Cargando facturación...
    </div>
  )

  if (error || !data) return (
    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error || 'Error al cargar.'}</div>
  )

  const m = data.moneda || moneda

  return (
    <div className="space-y-5">

      {/* ── Ajustes ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

        {/* Section header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-violet-50 rounded-lg">
              <SlidersHorizontal size={15} className="text-violet-600" />
            </div>
            <span className="text-sm font-semibold text-slate-800">Ajustes de facturación</span>
            {data.ajustes.length > 0 && (
              <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">{data.ajustes.length}</span>
            )}
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setFormError('') }}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Plus size={13} />
            {showForm ? 'Cancelar' : 'Nuevo ajuste'}
          </button>
        </div>

        {/* New form */}
        {showForm && (
          <form onSubmit={handleCreate} className="px-5 py-4 bg-slate-50 border-b border-slate-100 space-y-3">
            {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-1.5">{formError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Monto <span className="font-normal text-slate-400">(negativo = descuento)</span></label>
                <input type="number" step="0.01" value={formMonto} onChange={e => setFormMonto(e.target.value)}
                  placeholder="0.00" className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Descripción <span className="font-normal text-slate-400">(opcional)</span></label>
                <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)}
                  placeholder="Ej. Descuento por pronto pago..." className={inputCls} />
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
        {data.ajustes.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center italic">
            Sin ajustes — usa "+ Nuevo ajuste" para agregar descuentos o recargos.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500">Descripción</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-slate-500">Monto</th>
                <th className="px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.ajustes.map(adj =>
                editingId === adj.id ? (
                  <tr key={adj.id} className="bg-amber-50/60">
                    <td className="px-3 py-2">
                      <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)}
                        placeholder="Descripción (opcional)" className={inputCls} />
                      {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" value={editMonto} onChange={e => setEditMonto(e.target.value)}
                        className={`${inputCls} text-right`} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleEdit(adj)} disabled={savingEdit}
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50">
                          {savingEdit ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={adj.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-600">
                      {adj.descripcion || <span className="text-slate-400 italic text-xs">Sin descripción</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">
                      <span className={adj.monto < 0 ? 'text-red-500' : 'text-emerald-600'}>
                        {adj.monto < 0 ? '−' : '+'} {fmt(adj.monto, m)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => startEdit(adj)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(adj.id)} disabled={deleting === adj.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                          {deleting === adj.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Totales ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
          <div className="p-1.5 bg-green-50 rounded-lg">
            <DollarSign size={15} className="text-green-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800">Resumen de facturación</span>
        </div>

        <div className="px-5 py-4 space-y-2.5">
          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {data.tipoFacturacion === 'flat' ? 'Honorario fijo' : 'Subtotal horas'}
            </span>
            <span className="text-sm font-medium text-slate-700">{fmt(data.subtotalHoras, m)}</span>
          </div>

          {/* Adjustments */}
          {data.ajustes.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total ajustes ({data.ajustes.length})</span>
              <span className={`text-sm font-medium ${data.totalAjustes < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                {data.totalAjustes < 0 ? '−' : '+'} {fmt(data.totalAjustes, m)}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-100 pt-3 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-900">Total a cobrar</span>
              <span className="text-2xl font-bold text-emerald-600">{fmt(data.totalFinal, m)}</span>
            </div>
          </div>
        </div>

        {/* PDF */}
        <div className="flex justify-end px-5 pb-4">
          <button
            onClick={handlePDF}
            disabled={generatingPDF}
            className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            {generatingPDF ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {generatingPDF ? 'Generando...' : 'Generar PDF'}
          </button>
        </div>
      </div>

    </div>
  )
}
