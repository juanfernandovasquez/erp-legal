import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Tarea } from '@/types'
import api from '@/lib/axios'
import { TASK_STATUS_OPTIONS } from '@/lib/utils'

const taskSchema = z.object({
  titulo: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']),
  asignadoAId: z.string().nonempty('El responsable es requerido'),
  fechaVencimiento: z.string().nonempty('La fecha de vencimiento es requerida'),
  estado: z.enum(['pendiente', 'en_progreso', 'completado', 'cancelado']).optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskFormProps {
  caseId: string
  processId?: string
  onSuccess: (tarea: Tarea) => void
  onCancel?: () => void
  initialData?: Tarea
  /** Si es true, no envuelve en Card (para usar inline dentro de otro contenedor) */
  inline?: boolean
}

export function TaskForm({ caseId, processId, onSuccess, onCancel, initialData, inline = false }: TaskFormProps) {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: initialData ? {
      titulo: initialData.titulo,
      descripcion: initialData.descripcion,
      prioridad: initialData.prioridad,
      asignadoAId: initialData.asignadoAId,
      fechaVencimiento: initialData.fechaVencimiento?.split('T')[0],
      estado: initialData.estado,
    } : {},
  })

  useEffect(() => {
    fetchUsuarios()
  }, [])

  const fetchUsuarios = async () => {
    try {
      // Primero intenta el equipo del caso
      const teamRes = await api.get(`/cases/${caseId}/team`)
      const team = teamRes.data.data || []
      if (team.length > 0) {
        setUsuarios(team)
        return
      }
    } catch {
      // Si falla, cae al fallback
    }
    try {
      // Fallback: todos los usuarios del bufete
      const usersRes = await api.get('/users?limit=100')
      setUsuarios(usersRes.data.data || [])
    } catch (error) {
      console.error('Error fetching usuarios:', error)
    }
  }

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const endpoint = initialData ? `/tasks/${initialData.id}` : `/cases/${caseId}/tasks`
      const method = initialData ? 'patch' : 'post'
      const payload = processId ? { ...data, procesoId: processId } : data
      const response = await api[method](endpoint, payload)
      onSuccess(response.data.data)
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.response?.data?.message || 'Error al guardar la tarea'
      setSubmitError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setIsSubmitting(false)
    }
  }

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      <Input
        label="Título"
        placeholder="Ej: Preparar demanda"
        {...register('titulo')}
        error={errors.titulo?.message}
      />

      <Textarea
        label="Descripción"
        placeholder="Describe la tarea en detalle..."
        {...register('descripcion')}
        error={errors.descripcion?.message}
      />

      <Select
        label="Prioridad"
        placeholder="Selecciona una prioridad"
        options={[
          { value: 'baja', label: 'Baja' },
          { value: 'media', label: 'Media' },
          { value: 'alta', label: 'Alta' },
          { value: 'urgente', label: 'Urgente' },
        ]}
        {...register('prioridad')}
        error={errors.prioridad?.message}
      />

      <Select
        label="Asignado a"
        placeholder={usuarios.length === 0 ? 'Cargando usuarios…' : 'Selecciona un responsable'}
        options={usuarios.map((u) => ({
          value: u.user_id ?? u.id,
          label: u.nombre ?? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
        }))}
        {...register('asignadoAId')}
        error={errors.asignadoAId?.message}
      />

      <Input
        label="Fecha de Vencimiento"
        type="date"
        {...register('fechaVencimiento')}
        error={errors.fechaVencimiento?.message}
      />

      {initialData && (
        <Select
          label="Estado"
          options={TASK_STATUS_OPTIONS}
          {...register('estado')}
        />
      )}

      <div className="flex gap-2 justify-end pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting}>
          {initialData ? 'Actualizar Tarea' : 'Crear Tarea'}
        </Button>
      </div>
    </form>
  )

  if (inline) return formContent

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Editar Tarea' : 'Crear Nueva Tarea'}</CardTitle>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  )
}
