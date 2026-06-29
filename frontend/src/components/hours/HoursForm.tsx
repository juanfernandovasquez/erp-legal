import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/DateInput'
import { Select } from '@/components/ui/select'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

const ADMIN_ROLES = ['admin_firma', 'super_admin']

interface HoursFormProps {
  onSuccess: () => void
  onCancel?: () => void
  caseId?: string
  taskId?: string
  taskTitle?: string
  defaultRate?: number
  defaultMoneda?: 'PEN' | 'USD'
  tipoFacturacion?: 'flat' | 'por_horas' | null
  inline?: boolean
  /** Lista de tareas del proceso para el selector */
  tareas?: { id: string; titulo: string }[]
  /** Lista de abogados/usuarios del caso para el selector */
  abogados?: { id: string; nombre: string }[]
}

export function HoursForm({
  onSuccess, onCancel, caseId, taskId, taskTitle,
  defaultRate = 0, defaultMoneda = 'PEN', tipoFacturacion, inline = false, tareas = [], abogados = [],
}: HoursFormProps) {
  const { user: currentUser } = useAuthStore()
  const isAdmin = ADMIN_ROLES.includes(currentUser?.rol ?? '')

  const [casos, setCasos]             = useState<any[]>([])
  const [caseTareas, setCaseTareas]   = useState<{ id: string; titulo: string }[]>(tareas)
  const [firmUsers, setFirmUsers]     = useState<{ id: string; nombre: string }[]>([])

  const [selectedCaseId, setSelectedCaseId] = useState(caseId || '')
  const [selectedTaskId, setSelectedTaskId] = useState(taskId || '')
  // Default to current user so the selector always shows a sensible value
  const [selectedUserId, setSelectedUserId] = useState(abogados[0]?.id || currentUser?.id || '')

  const [fecha, setFecha]           = useState(new Date().toISOString().split('T')[0])
  const [minutos, setMinutos]       = useState('')
  const [tarifa, setTarifa]         = useState(tipoFacturacion === 'flat' ? '0' : (defaultRate ? String(defaultRate) : ''))
  const [moneda, setMoneda]         = useState<'PEN' | 'USD'>(defaultMoneda)
  const [descripcion, setDescripcion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)

  const isFlat = tipoFacturacion === 'flat'

  // Sync selectedUserId when abogados list loads
  useEffect(() => {
    if (abogados.length > 0 && !selectedUserId) {
      setSelectedUserId(abogados[0].id)
    }
  }, [abogados])

  // Fetch all firm users for admins (when no explicit list provided)
  useEffect(() => {
    if (isAdmin && abogados.length === 0) {
      api.get('/users?limit=100')
        .then(res => setFirmUsers(res.data.data || []))
        .catch(() => {})
    }
  }, [isAdmin, abogados.length])

  useEffect(() => {
    if (!caseId) fetchCasos()
  }, [])

  useEffect(() => {
    if (selectedCaseId && tareas.length === 0) fetchCaseTareas(selectedCaseId)
  }, [selectedCaseId])

  const fetchCasos = async () => {
    try {
      const res = await api.get('/cases?limit=100')
      setCasos(res.data.data || [])
    } catch {}
  }

  const fetchCaseTareas = async (id: string) => {
    try {
      const res = await api.get(`/cases/${id}/tasks`)
      setCaseTareas(res.data.data?.map((t: any) => ({ id: t.id, titulo: t.titulo })) || [])
    } catch {}
  }

  // Effective user list for the selector
  const userList = abogados.length > 0 ? abogados : firmUsers

  // Calculations
  const minutosNum   = parseInt(minutos) || 0
  const horasDecimal = minutosNum / 60
  const tarifaNum    = parseFloat(tarifa) || 0
  const total        = horasDecimal * tarifaNum

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCaseId) { setError('Selecciona un caso'); return }
    if (!minutos || minutosNum <= 0) { setError('Ingresa los minutos trabajados'); return }

    setIsSubmitting(true)
    setError('')
    try {
      await api.post(`/cases/${selectedCaseId}/hours`, {
        horas:         horasDecimal,
        tarifaHora:    tarifaNum,
        descripcion:   descripcion.trim(),
        fechaRegistro: fecha,
        tareaId:       selectedTaskId || null,
        usuarioId:     selectedUserId || null,
        esBonificable: true,
        moneda,
      })
      setSuccess(true)
      setMinutos('')
      setDescripcion('')
      setSelectedTaskId(taskId || '')
      setTimeout(() => setSuccess(false), 3000)
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error al registrar horas')
    } finally {
      setIsSubmitting(false)
    }
  }

  const allTareas = tareas.length > 0 ? tareas : caseTareas

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      {taskTitle && (
        <div className="text-xs text-slate-500 bg-slate-50 rounded-md px-3 py-2">
          Tarea: <span className="font-medium text-slate-700">{taskTitle}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {isFlat
            ? `✓ ${minutosNum} min (${horasDecimal.toFixed(2)} h) registrados — Montos redistribuidos automáticamente`
            : `✓ ${minutosNum} min (${horasDecimal.toFixed(2)} h) registrados — Total: ${moneda === 'USD' ? '$' : 'S/'} ${total.toFixed(2)}`
          }
        </div>
      )}

      {/* Case selector (only if not fixed) */}
      {!caseId && (
        <Select
          label="Proceso *"
          placeholder="Selecciona un proceso..."
          options={casos.map((c) => ({ value: c.id, label: c.titulo }))}
          value={selectedCaseId}
          onChange={(e) => { setSelectedCaseId(e.target.value); setSelectedTaskId('') }}
        />
      )}

      {/* User selector — only admins can log hours for others */}
      {isAdmin && userList.length > 0 && (
        <Select
          label="Profesional *"
          options={userList.map((u) => ({
            value: u.id,
            label: u.id === currentUser?.id ? `${u.nombre} (yo)` : u.nombre,
          }))}
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        />
      )}

      {/* Task selector */}
      {!taskId && (
        <Select
          label="Tarea (opcional)"
          options={[
            { value: '', label: '— Sin tarea específica —' },
            ...allTareas.map((t) => ({ value: t.id, label: t.titulo })),
          ]}
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
        />
      )}

      <DateInput
        label="Fecha de trabajo *"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        required
      />

      {/* Billing type info */}
      {tipoFacturacion && (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
          <span className="font-medium text-slate-600">
            {tipoFacturacion === 'por_horas' ? '⏱ Facturación por horas' : '📋 Tarifa flat'}
          </span>
          <span className="text-slate-400">— configurada en el proceso</span>
        </div>
      )}

      {/* Minutes + rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Input
            label="Minutos trabajados *"
            type="number"
            step="1"
            min="1"
            max="1440"
            placeholder="Ej: 90"
            value={minutos}
            onChange={(e) => setMinutos(e.target.value)}
            required
          />
          {minutosNum > 0 && (
            <p className="text-xs text-slate-400 mt-1">= {horasDecimal.toFixed(2)} horas</p>
          )}
        </div>
        {isFlat ? (
          <div className="flex flex-col justify-center">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Valorización</p>
            <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-700 leading-snug">
              El monto se redistribuye automáticamente entre todos los registros del proceso al guardar.
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tarifa por hora ({moneda === 'USD' ? '$' : 'S/'}) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={tarifa}
              onChange={(e) => setTarifa(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {total > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Total: <span className="font-semibold text-slate-700">
                  {moneda === 'USD' ? '$' : 'S/'} {total.toFixed(2)}
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Descripción del trabajo <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Describe brevemente el trabajo realizado..."
          rows={2}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" isLoading={isSubmitting}>
          Registrar
        </Button>
      </div>
    </form>
  )
}
