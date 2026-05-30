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

const taskSchema = z.object({
  titulo: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']),
  asignadoAId: z.string().nonempty('El responsable es requerido'),
  fechaVencimiento: z.string().nonempty('La fecha de vencimiento es requerida'),
  estado: z.enum(['pendiente', 'en_progreso', 'completado', 'rechazado']).optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskFormProps {
  caseId: string
  processId?: string   // si se pasa, la tarea se crea dentro de ese proceso
  onSuccess: (tarea: Tarea) => void
  initialData?: Tarea
}

export function TaskForm({ caseId, processId, onSuccess, initialData }: TaskFormProps) {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      fechaVencimiento: initialData.fechaVencimiento.split('T')[0],
      estado: initialData.estado,
    } : {},
  })

  useEffect(() => {
    fetchUsuarios()
  }, [])

  const fetchUsuarios = async () => {
    try {
      // Only show team members assigned to this specific case
      const response = await api.get(`/cases/${caseId}/team`)
      setUsuarios(response.data.data || [])
    } catch (error) {
      console.error('Error fetching case team:', error)
    }
  }

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true)
    try {
      const endpoint = initialData
        ? `/tasks/${initialData.id}`
        : `/cases/${caseId}/tasks`
      const method = initialData ? 'patch' : 'post'
      // Include procesoId if provided (new task inside a process)
      const payload = processId ? { ...data, procesoId: processId } : data
      const response = await api[method](endpoint, payload)
      onSuccess(response.data.data)
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Editar Tarea' : 'Crear Nueva Tarea'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            placeholder="Selecciona un miembro del caso"
            options={usuarios.map((u) => ({
              value: u.user_id ?? u.id,
              label: u.nombre,
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
              options={[
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'en_progreso', label: 'En Progreso' },
                { value: 'completado', label: 'Completado' },
                { value: 'rechazado', label: 'Rechazado' },
              ]}
              {...register('estado')}
            />
          )}

          <Button type="submit" isLoading={isSubmitting}>
            {initialData ? 'Actualizar Tarea' : 'Crear Tarea'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
