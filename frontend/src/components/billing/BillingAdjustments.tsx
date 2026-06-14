import React, { useState, useEffect, useCallback } from 'react'
import { Trash2, Plus, FileText, Loader2, Pencil, Check, X } from 'lucide-react'
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

function fmt(amount: number, moneda: string): string {
  const s = moneda === 'USD' ? 'USD' : 'S/'
  return `${s} ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const inputCls = 'w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white'

export function BillingAdjustments({ caseId, moneda = 'PEN' }: Props) {
  const [data, setData] = useState<BillingResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generatingPDF, setGeneratingPDF] = useState(false)

  // New adjustment form
  const [showForm, setShowForm] = useState(false)
  const [formNombre, setFormNombre] = useState('')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formMonto, setFormMonto] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editDescripcion, setEditDescripcion] = useState('')
  const [editMonto, setEditMonto] = useState('')
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/cases/${caseId}/billing`)
      setData(res.data.data)
    } catch {
      setError('Error al cargar la facturación.')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { load() }, [load])

  // ── Create ────────────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    const descripcion = formDescripcion.trim()
    if (!descripcion) { setFormError('La descripción es requerida'); return }
    const monto = parseFloat(formMonto)
    if (isNaN(monto)) { setFormError('El monto debe ser un número'); return }
    setSaving(true)
    try {
      await api.post(`/cases/${caseId}/billing/adjustments`, {
        nombre: formNombre.trim() || undefined,
        descripcion,
        monto,
      })
      setShowForm(false)
      setFormNombre(''); setFormDescripcion(''); setFormMonto('')
      await load()
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  const startEdit = (adj: Ajuste) => {
    setEditingId(adj.id)
    setEditNombre(adj.nombre || '')
    setEditDescripcion(adj.descripcion)
    setEditMonto(String(adj.monto))
    setEditError('')
  }

  const cancelEdit = () => { setEditingId(null); setEditError('') }

  const handleEdit = async (adj: Ajuste) => {
    setEditError('')
    const descripcion = editDescripcion.trim()
    if (!descripcion) { setEditError('La descripción es requerida'); return }
    const monto = parseFloat(editMonto)
    if (isNaN(monto)) { setEditError('El monto debe ser un número'); return }
    setSavingEdit(true)
    try {
      await api.patch(`/cases/${caseId}/billing/adjustments/${adj.id}`, {
        nombre: editNombre.trim() || null,
        descripcion,
        monto,
      })
      setEditingId(null)
      await load()
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || 'Error al guardar')
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (adjId: string) => {
    if (!window.confirm('¿Eliminar este ajuste?')) return
    setDeleting(adjId)
    try {
      await api.delete(`/cases/${caseId}/billing/adjustments/${adjId}`)
      await load()
    } finally {
      setDeleting(null)
    }
  }

  // ── PDF ───────────────────────────────────────────────────────────────────

  const handlePDF = async () => {
    setGeneratingPDF(true)
    try {
      const res = await api.get(`/cases/${caseId}/billing/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'factura.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Error al generar el PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        Cargando facturación...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
        {error || 'Error al cargar.'}
      </div>
    )
  }

  const currMoneda = data.moneda || moneda

  return (
    <div className="space-y-6">

      {/* ── Sección: Ajustes ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800">
          <h4 className="text-sm font-semibold text-white tracking-wide">Ajustes de facturación</h4>
          <button
            onClick={() => { setShowForm(v => !v); setFormError('') }}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 rounded-md px-3 py-1.5 transition-colors"
          >
            <Plus size={13} />
            {showForm ? 'Cancelar' : 'Nuevo ajuste'}
          </button>
        </div>

        {/* New adjustment form */}
        {showForm && (
          <form onSubmit={handleCreate} className="px-5 py-4 bg-blue-50 border-b border-blue-100 space-y-3">
            {formError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{formError}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre <span className="text-slate-400">(opcional)</span></label>
                <input type="text" value={formNombre} onChange={e => setFormNombre(e.target.value)}
                  placeholder="Ej. Descuento, Recargo..." className={inputCls} />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Monto <span className="text-slate-400">(negativo = descuento)</span>
                </label>
                <input type="number" step="0.01" value={formMonto} onChange={e => setFormMonto(e.target.value)}
                  placeholder="0.00" className={inputCls} required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción <span className="text-red-500">*</span></label>
              <textarea value={formDescripcion} onChange={e => setFormDescripcion(e.target.value)}
                placeholder="Describe el ajuste..." rows={2}
                className={`${inputCls} resize-none`} required />
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Guardar ajuste
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFormError('') }}
                className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Adjustments list */}
        {data.ajustes.length === 0 && !showForm ? (
          <p className="px-5 py-6 text-sm text-slate-400 italic text-center">Sin ajustes registrados.</p>
        ) : data.ajustes.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Monto</th>
                <th className="px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.ajustes.map((adj) =>
                editingId === adj.id ? (
                  <tr key={adj.id} className="bg-amber-50">
                    <td className="px-3 py-2">
                      <input type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)}
                        placeholder="Nombre" className={inputCls} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)}
                        placeholder="Descripción" className={inputCls} />
                      {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.01" value={editMonto} onChange={e => setEditMonto(e.target.value)}
                        className={`${inputCls} text-right`} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleEdit(adj)} disabled={savingEdit}
                          className="p-1.5 rounded text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50" title="Guardar">
                          {savingEdit ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        </button>
                        <button onClick={cancelEdit}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Cancelar">
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={adj.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {adj.nombre || <span className="text-slate-400 italic font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{adj.descripcion}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={adj.monto < 0 ? 'text-red-600' : 'text-emerald-700'}>
                        {fmt(adj.monto, currMoneda)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => startEdit(adj)}
                          className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(adj.id)} disabled={deleting === adj.id}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50" title="Eliminar">
                          {deleting === adj.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        ) : null}
      </div>

      {/* ── Sección: Totales ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">

        <div className="px-5 py-3 bg-slate-800">
          <h4 className="text-sm font-semibold text-white tracking-wide">Resumen de facturación</h4>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Subtotal */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-white">
            <span className="text-sm text-slate-600">
              {data.tipoFacturacion === 'flat' ? 'Honorario fijo' : 'Subtotal horas'}
            </span>
            <span className="text-sm font-semibold text-slate-800">{fmt(data.subtotalHoras, currMoneda)}</span>
          </div>

          {/* Adjustments total */}
          {data.ajustes.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3.5 bg-white">
              <span className="text-sm text-slate-600">Total ajustes ({data.ajustes.length})</span>
              <span className={`text-sm font-semibold ${data.totalAjustes < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {data.totalAjustes >= 0 ? '+' : ''}{fmt(data.totalAjustes, currMoneda)}
              </span>
            </div>
          )}

          {/* Grand total */}
          <div className="flex items-center justify-between px-5 py-5 bg-slate-800">
            <span className="text-base font-bold text-white">Total a cobrar</span>
            <span className="text-2xl font-bold text-emerald-400">{fmt(data.totalFinal, currMoneda)}</span>
          </div>
        </div>

        {/* PDF button */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={handlePDF}
            disabled={generatingPDF}
            className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            {generatingPDF ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            {generatingPDF ? 'Generando PDF...' : 'Generar PDF'}
          </button>
        </div>
      </div>

    </div>
  )
}
