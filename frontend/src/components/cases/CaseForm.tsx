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
  clienteId: z.string().nonempty('El cliente es requerido'),
  abogadoPrincipalId: z.string().optional(),
  estado: z.string().optional(),
  // Billing
  tipoFacturacion: z.enum(['flat', 'por_horas', '']).optional(),
  monedaFacturacion: z.enum(['PEN', 'USD']).optional(),
  precioFacturacion: z.coerce.number().min(0).optional(),
})

type CaseFormData = z.infer<typeof caseSchema>

interface CaseFormProps {
  onSuccess: (caso: Caso) => void
  initialData?: Caso
  defaultClienteId?: string
  inline?: boolean
}

export function CaseForm({ onSuccess, initialData, defaultClienteId, inline = false }: CaseFormProps) {
  const [clientes, setClientes] = useState<any[]>([])
  const [abogados, setAbogados] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: initialData ? {
      titulo: initialData.titulo,
      descripcion: initialData.descripcion,
      clienteId: initialData.clienteId,
      abogadoPrincipalId: initialData.abogadoPrincipalId ?? '',
      estado: initialData.estado,
      tipoFacturacion: (initialData.tipoFacturacion as any) ?? '',
      monedaFacturacion: initialData.monedaFacturacion ?? 'PEN',
      precioFacturacion: initialData.precioFacturacion ?? undefined,
    } : {
      monedaFacturacion: 'PEN',
      tipoFacturacion: '',
    },
  })

  const tipoFacturacion = watch('tipoFacturacion')
  const monedaFacturacion = watch('monedaFacturacion') ?? 'PEN'
  const simbolo = monedaFacturacion === 'USD' ? '$' : 'S/'

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

      // Re-apply select values after options load (async options don't honour defaultValues)
      if (initialData) {
        setValue('clienteId', initialData.clienteId ?? '')
        setValue('abogadoPrincipalId', initialData.abogadoPrincipalId ?? '')
      } else if (defaultClienteId) {
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
      const payload = {
        ...data,
        tipoSolicitud: 'otro',
        tipoFacturacion: data.tipoFacturacion || null,
        abogadoPrincipalId: data.abogadoPrincipalId || null,
        precioFacturacion: data.precioFacturacion ?? null,
      }
      const response = await api[method](endpoint, payload)
      onSuccess(response.data.data)
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.response?.data?.message || 'Error al guardar el proceso'
      setSubmitError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setIsSubmitting(false)
    }
  }

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-5 ${inline ? 'p-6' : ''}`}>
      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      <Input
        label="Título del Proceso"
        placeholder="Ej: Demanda contra SUNAT — Luciana Gómez"
        {...register('titulo')}
        error={errors.titulo?.message}
      />

      <Textarea
        label="Descripción del Servicio"
        placeholder="Describe el servicio legal que se brindará y los detalles relevantes..."
        {...register('descripcion')}
        error={errors.descripcion?.message}
      />

      <Select
        label="Cliente"
        options={[
          { value: '', label: '— Selecciona un cliente —' },
          ...clientes.map((c) => ({ value: c.id, label: c.nombre })),
        ]}
        {...register('clienteId')}
        error={errors.clienteId?.message}
      />

      <Select
        label="Encargado Principal (opcional)"
        options={[
          { value: '', label: '— Sin encargado —' },
          ...abogados.map((a) => ({ value: a.id, label: a.nombre })),
        ]}
        {...register('abogadoPrincipalId')}
      />

      {/* ── Facturación ── */}
      <div className="border-t border-slate-100 pt-4 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Facturación <span className="font-normal normal-case text-slate-400">(opcional)</span>
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo de facturación"
            options={[
              { value: '',          label: '— Sin facturación —' },
              { value: 'flat',      label: 'Tarifa flat' },
              { value: 'por_horas', label: 'Por horas' },
            ]}
            {...register('tipoFacturacion')}
          />
          <Select
            label="Moneda"
            options={[
              { value: 'PEN', label: 'S/ Soles (PEN)' },
              { value: 'USD', label: '$ Dólares (USD)' },
            ]}
            {...register('monedaFacturacion')}
          />
        </div>

        {tipoFacturacion && tipoFacturacion !== '' && (
          <Input
            label={tipoFacturacion === 'por_horas'
              ? `Precio por hora (${simbolo})`
              : `Tarifa flat (${simbolo})`}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register('precioFacturacion')}
            error={errors.precioFacturacion?.message}
          />
        )}
      </div>

      {initialData && (
        <Select
          label="Estado"
          options={CASE_STATUS_OPTIONS}
          {...register('estado')}
        />
      )}

      <Button type="submit" isLoading={isSubmitting} className="w-full">
        {initialData ? 'Actualizar Proceso' : 'Crear Proceso'}
      </Button>
    </form>
  )

  if (inline) return formContent

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Editar Proceso' : 'Crear Nuevo Proceso'}</CardTitle>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  )
}
