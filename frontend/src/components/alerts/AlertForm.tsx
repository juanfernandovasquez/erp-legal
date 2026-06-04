import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ALERT_SEVERITY_OPTIONS, ALERT_TYPE_OPTIONS } from '@/lib/utils'

interface AlertFormProps {
  /** Si se pasa, la alerta se crea bajo ese caso y no se muestra el selector de caso */
  fixedCaseId?: string
  onSuccess: () => void
  onCancel: () => void
  onCreate: (caseId: string, data: {
    alert_type: string
    severity: string
    title: string
    message: string
    due_date?: string
  }) => Promise<void>
}

export function AlertForm({ fixedCaseId, onSuccess, onCancel, onCreate }: AlertFormProps) {
  const [cases, setCases] = useState<any[]>([])
  const [caseId, setCaseId] = useState(fixedCaseId ?? '')
  const [alertType, setAlertType] = useState('custom')
  const [severity, setSeverity] = useState('warning')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!fixedCaseId) fetchCases()
  }, [])

  const fetchCases = async () => {
    try {
      const { default: api } = await import('@/lib/axios')
      const res = await api.get('/cases?limit=100')
      setCases(res.data.data || [])
    } catch {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseId) { setError('Selecciona un caso'); return }
    if (!title.trim()) { setError('El título es requerido'); return }
    if (!message.trim()) { setError('El mensaje es requerido'); return }

    setSaving(true)
    setError('')
    try {
      await onCreate(caseId, {
        alert_type: alertType,
        severity,
        title: title.trim(),
        message: message.trim(),
        due_date: dueDate || undefined,
      })
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error al crear la alerta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      {!fixedCaseId && (
        <Select
          label="Caso *"
          placeholder="Selecciona un caso..."
          options={cases.map((c) => ({ value: c.id, label: c.titulo }))}
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Tipo de alerta"
          options={ALERT_TYPE_OPTIONS}
          value={alertType}
          onChange={(e) => setAlertType(e.target.value)}
        />
        <Select
          label="Severidad"
          options={ALERT_SEVERITY_OPTIONS}
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        />
      </div>

      <Input
        label="Título *"
        placeholder="Ej: Audiencia el 15 de julio"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Mensaje *
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe el detalle de la alerta..."
          rows={3}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          required
        />
      </div>

      <Input
        label="Fecha de vencimiento (opcional)"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" isLoading={saving}>
          Crear alerta
        </Button>
      </div>
    </form>
  )
}
