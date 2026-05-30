import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import api from '@/lib/axios'

const hoursSchema = z.object({
  casoId: z.string().nonempty('El caso es requerido'),
  fechaRegistro: z.string().nonempty('La fecha es requerida'),
  horasTrabajas: z.coerce.number().min(0.5, 'Mínimo 0.5 horas'),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  tipo: z.enum(['consulta', 'redaccion', 'investigacion', 'audiencia', 'otro']),
})

type HoursFormData = z.infer<typeof hoursSchema>

interface HoursFormProps {
  onSuccess: () => void
  caseId?: string
}

export function HoursForm({ onSuccess, caseId }: HoursFormProps) {
  const [casos, setCasos] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<HoursFormData>({
    resolver: zodResolver(hoursSchema),
    defaultValues: {
      casoId: caseId || '',
      fechaRegistro: new Date().toISOString().split('T')[0],
      tipo: 'consulta',
    },
  })

  useEffect(() => {
    fetchCasos()
  }, [])

  const fetchCasos = async () => {
    try {
      const response = await api.get('/cases?limit=100')
      setCasos(response.data.data || [])
    } catch (error) {
      console.error('Error fetching casos:', error)
    }
  }

  const onSubmit = async (data: HoursFormData) => {
    setIsSubmitting(true)
    try {
      // Hours are posted per case: /cases/{case_id}/hours
      const caseIdValue = (data as any).casoId
      await api.post(`/cases/${caseIdValue}/hours`, data)
      onSuccess()
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Error al registrar horas')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Horas de Trabajo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Select
            label="Caso"
            placeholder="Selecciona un caso"
            options={casos.map((c) => ({ value: c.id, label: c.titulo }))}
            {...register('casoId')}
            error={errors.casoId?.message}
          />

          <Input
            label="Fecha de Trabajo"
            type="date"
            {...register('fechaRegistro')}
            error={errors.fechaRegistro?.message}
          />

          <Input
            label="Horas Trabajadas"
            type="number"
            step="0.5"
            placeholder="Ej: 2.5"
            {...register('horasTrabajas')}
            error={errors.horasTrabajas?.message}
          />

          <Select
            label="Tipo de Actividad"
            placeholder="Selecciona un tipo"
            options={[
              { value: 'consulta', label: 'Consulta' },
              { value: 'redaccion', label: 'Redacción' },
              { value: 'investigacion', label: 'Investigación' },
              { value: 'audiencia', label: 'Audiencia' },
              { value: 'otro', label: 'Otro' },
            ]}
            {...register('tipo')}
            error={errors.tipo?.message}
          />

          <Textarea
            label="Descripción del Trabajo"
            placeholder="Describe el trabajo realizado..."
            {...register('descripcion')}
            error={errors.descripcion?.message}
          />

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Registrar Horas
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
