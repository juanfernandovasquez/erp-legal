import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Caso } from '@/types'
import api from '@/lib/axios'
import { CASE_STATUS_OPTIONS } from '@/lib/utils'

const caseSchema = z.object({
  titulo: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  tipoSolicitud: z.string().nonempty('El tipo de solicitud es requerido'),
  clienteId: z.string().nonempty('El cliente es requerido'),
  abogadoPrincipalId: z.string().nonempty('El abogado principal es requerido'),
  estado: z.string().optional(),
  montoAsegurado: z.coerce.number().optional(),
})

type CaseFormData = z.infer<typeof caseSchema>

interface CaseFormProps {
  onSuccess: (caso: Caso) => void
  initialData?: Caso
  defaultClienteId?: string
}

export function CaseForm({ onSuccess, initialData, defaultClienteId }: CaseFormProps) {
  const [clientes, setClientes] = useState<any[]>([])
  const [abogados, setAbogados] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: initialData ? {
      titulo: initialData.titulo,
      descripcion: initialData.descripcion,
      tipoSolicitud: initialData.tipoSolicitud,
      clienteId: initialData.clienteId,
      abogadoPrincipalId: initialData.abogadoPrincipalId,
      montoAsegurado: initialData.montoAsegurado,
      estado: initialData.estado,
    } : {},
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [clientesRes, abogadosRes] = await Promise.all([
        api.get('/clients?limit=100'),
        api.get('/users?limit=100'),
      ])
      setClientes(clientesRes.data.data || [])
      setAbogados(abogadosRes.data.data || [])

      // Pre-select client if provided
      if (defaultClienteId) {
        setValue('clienteId', defaultClienteId)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const onSubmit = async (data: CaseFormData) => {
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const endpoint = initialData ? `/cases/${initialData.id}` : '/cases'
      const method = initialData ? 'patch' : 'post'
      const response = await api[method](endpoint, data)
      onSuccess(response.data.data)
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.response?.data?.message || 'Error al guardar el caso'
      setSubmitError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Editar Caso' : 'Crear Nuevo Caso'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}
          <Input
            label="Título del Caso"
            placeholder="Ej: Demanda laboral contra XYZ"
            {...register('titulo')}
            error={errors.titulo?.message}
          />

          <Textarea
            label="Descripción"
            placeholder="Describe el caso y los detalles relevantes..."
            {...register('descripcion')}
            error={errors.descripcion?.message}
          />

          <Select
            label="Tipo de Solicitud"
            placeholder="Selecciona un tipo"
            options={[
              { value: 'civil', label: 'Civil' },
              { value: 'laboral', label: 'Laboral' },
              { value: 'comercial', label: 'Comercial' },
              { value: 'administrativo', label: 'Administrativo' },
              { value: 'constitucional', label: 'Constitucional' },
            ]}
            {...register('tipoSolicitud')}
            error={errors.tipoSolicitud?.message}
          />

          <Select
            label="Cliente"
            placeholder="Selecciona un cliente"
            options={clientes.map((c) => ({ value: c.id, label: c.nombre }))}
            {...register('clienteId')}
            error={errors.clienteId?.message}
          />

          <Select
            label="Abogado Principal"
            placeholder="Selecciona un abogado"
            options={abogados.map((a) => ({ value: a.id, label: a.nombre }))}
            {...register('abogadoPrincipalId')}
            error={errors.abogadoPrincipalId?.message}
          />

          <Input
            label="Monto Asegurado (opcional)"
            type="number"
            placeholder="0.00"
            {...register('montoAsegurado')}
            error={errors.montoAsegurado?.message}
          />

          {initialData && (
            <Select
              label="Estado"
              placeholder="Selecciona un estado"
              options={CASE_STATUS_OPTIONS}
              {...register('estado')}
            />
          )}

          <Button type="submit" isLoading={isSubmitting}>
            {initialData ? 'Actualizar Caso' : 'Crear Caso'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
