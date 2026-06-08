import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge'
import { ArrowLeft, Edit2, Save, X, Trash2, Mail, Phone, MapPin, Building2, FileText, Hash } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import api from '@/lib/axios'

interface ClientData {
  id: string
  nombre: string
  email: string
  phone: string
  streetAddress: string
  city: string
  state: string
  country: string
  clientType: string
  organizationName: string
  taxId: string
  isActive: boolean
  isPreferred: boolean
  createdAt: string
  updatedAt: string
}

interface ClientCase {
  id: string
  caseNumber: string
  titulo: string
  estado: string
  tipoSolicitud: string
  createdAt: string
}

const CLIENT_TYPE_LABELS: Record<string, string> = {
  individual: 'Persona natural',
  business: 'Empresa',
  government: 'Entidad pública',
  non_profit: 'ONG / Sin fines de lucro',
  other: 'Otro',
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [client, setClient] = useState<ClientData | null>(null)
  const [cases, setCases] = useState<ClientCase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [casesLoading, setCasesLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    street_address: '',
    city: '',
    state: '',
    country: '',
    client_type: 'individual',
    tax_id: '',
    giro_negocio: '',
    tarifa_hora: '',
    tipo_cobro: 'por_hora',
  })

  useEffect(() => {
    if (id) {
      fetchClient()
      fetchCases()
    }
  }, [id])

  const fetchClient = async () => {
    setIsLoading(true)
    try {
      const res = await api.get(`/clients/${id}`)
      const c = res.data.data
      setClient(c)
      setForm({
        name: c.nombre || '',
        email: c.email || '',
        phone: c.phone || '',
        street_address: c.streetAddress || '',
        city: c.city || '',
        state: c.state || '',
        country: c.country || '',
        client_type: c.clientType || 'individual',
        tax_id: c.taxId || '',
        giro_negocio: c.giroNegocio || c.notes || '',
        tarifa_hora: c.tarifaHora ? String(c.tarifaHora) : '',
        tipo_cobro: c.tipoCobro || 'por_hora',
      })
    } catch {
      setError('No se pudo cargar el cliente.')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCases = async () => {
    setCasesLoading(true)
    try {
      const res = await api.get(`/clients/${id}/cases`)
      setCases(res.data.data || [])
    } catch {
      // silently fail
    } finally {
      setCasesLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name || !form.email) {
      setError('El nombre y el email son obligatorios.')
      return
    }
    setIsSaving(true)
    setError('')
    try {
      const res = await api.patch(`/clients/${id}`, form)
      setClient(res.data.data)
      setIsEditing(false)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error al guardar los cambios.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (client) {
      setForm({
        name: client.nombre || '',
        email: client.email || '',
        phone: client.phone || '',
        street_address: client.streetAddress || '',
        city: client.city || '',
        state: client.state || '',
        country: client.country || '',
        client_type: client.clientType || 'individual',
        tax_id: client.taxId || '',
        giro_negocio: (client as any).giroNegocio || '',
        tarifa_hora: (client as any).tarifaHora ? String((client as any).tarifaHora) : '',
        tipo_cobro: (client as any).tipoCobro || 'por_hora',
      })
    }
    setIsEditing(false)
    setError('')
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar al cliente "${client?.nombre}"? Esta acción no se puede deshacer.`)) return
    setIsDeleting(true)
    try {
      await api.delete(`/clients/${id}`)
      navigate('/clients')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error al eliminar el cliente.')
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async () => {
    if (!client) return
    try {
      const res = await api.patch(`/clients/${id}`, { is_active: !client.isActive })
      setClient(res.data.data)
    } catch {}
  }

  if (isLoading) return <AppLayout><div className="flex justify-center py-24"><LoadingSpinner /></div></AppLayout>

  if (!client) return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto text-center py-24 text-slate-500">
        Cliente no encontrado.
        <br />
        <Button variant="ghost" onClick={() => navigate('/clients')} className="mt-4">
          Volver a Clientes
        </Button>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Back */}
        <Button variant="ghost" onClick={() => navigate('/clients')} className="mb-4 gap-2">
          <ArrowLeft size={18} />
          Volver a Clientes
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-slate-900">{client.nombre}</h1>
              {client.isPreferred && (
                <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">⭐ Preferente</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{CLIENT_TYPE_LABELS[client.clientType] || client.clientType}</span>
              <span>·</span>
              <Badge variant={client.isActive ? 'success' : 'secondary'}>
                {client.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isEditing && (
              <>
                <Button variant="ghost" onClick={handleToggleActive} className="text-sm">
                  {client.isActive ? 'Desactivar' : 'Activar'}
                </Button>
                <Button variant="ghost" onClick={() => setIsEditing(true)} className="gap-2">
                  <Edit2 size={16} />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="gap-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  Eliminar
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
                  <X size={16} className="mr-1" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} isLoading={isSaving} className="gap-2">
                  <Save size={16} />
                  Guardar
                </Button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Input
                        label="Nombre completo o razón social *"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>

                    <Select
                      label="Tipo de cliente"
                      value={form.client_type}
                      onChange={(e) => setForm({ ...form, client_type: e.target.value })}
                      options={[
                        { value: 'individual', label: 'Persona natural' },
                        { value: 'business', label: 'Empresa' },
                        { value: 'government', label: 'Entidad pública' },
                        { value: 'non_profit', label: 'ONG / Sin fines de lucro' },
                        { value: 'other', label: 'Otro' },
                      ]}
                    />

                    <Input
                      label="Email *"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />

                    <Input
                      label="Teléfono"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+51 999 999 999"
                    />

                    <Input
                      label="RUC / Tax ID"
                      value={form.tax_id}
                      onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                    />

                    <Input
                      label="Ciudad"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />

                    <Input
                      label="Departamento / Estado"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                    />

                    <Input
                      label="País"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                    />

                    <div className="col-span-2">
                      <Input
                        label="Dirección"
                        value={form.street_address}
                        onChange={(e) => setForm({ ...form, street_address: e.target.value })}
                        placeholder="Av. Principal 123, Oficina 4"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Giro del negocio</label>
                      <textarea
                        value={form.giro_negocio}
                        onChange={(e) => setForm({ ...form, giro_negocio: e.target.value })}
                        placeholder="Descripción de las actividades principales del negocio..."
                        rows={2}
                        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      />
                    </div>

                    <Input
                      label="Tarifa por hora (S/)"
                      type="number"
                      value={form.tarifa_hora}
                      onChange={(e) => setForm({ ...form, tarifa_hora: e.target.value })}
                      placeholder="0.00"
                    />

                    <Select
                      label="Tipo de cobro"
                      value={form.tipo_cobro}
                      onChange={(e) => setForm({ ...form, tipo_cobro: e.target.value })}
                      options={[
                        { value: 'por_hora',    label: 'Por hora' },
                        { value: 'por_proceso', label: 'Por proceso' },
                        { value: 'mixto',       label: 'Mixto' },
                      ]}
                    />
                  </div>
                ) : (
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1">
                        <Mail size={13} /> Email
                      </dt>
                      <dd className="text-sm text-slate-900">{client.email || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1">
                        <Phone size={13} /> Teléfono
                      </dt>
                      <dd className="text-sm text-slate-900">{client.phone || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1">
                        <Hash size={13} /> RUC / Tax ID
                      </dt>
                      <dd className="text-sm text-slate-900">{client.taxId || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1">
                        <MapPin size={13} /> Ciudad
                      </dt>
                      <dd className="text-sm text-slate-900">
                        {[client.city, client.state, client.country].filter(Boolean).join(', ') || '—'}
                      </dd>
                    </div>
                    {client.streetAddress && (
                      <div className="col-span-2">
                        <dt className="text-xs text-slate-500 uppercase font-semibold mb-1">Dirección</dt>
                        <dd className="text-sm text-slate-900">{client.streetAddress}</dd>
                      </div>
                    )}
                    {(client as any).giroNegocio && (
                      <div className="col-span-2">
                        <dt className="text-xs text-slate-500 uppercase font-semibold mb-1">Giro del negocio</dt>
                        <dd className="text-sm text-slate-900">{(client as any).giroNegocio}</dd>
                      </div>
                    )}
                    {(client as any).tarifaHora && (
                      <div>
                        <dt className="text-xs text-slate-500 uppercase font-semibold mb-1">Tarifa por hora</dt>
                        <dd className="text-sm text-slate-900">S/ {(client as any).tarifaHora}</dd>
                      </div>
                    )}
                    {(client as any).tipoCobro && (
                      <div>
                        <dt className="text-xs text-slate-500 uppercase font-semibold mb-1">Tipo de cobro</dt>
                        <dd className="text-sm text-slate-900">
                          {{ por_hora: 'Por hora', por_proceso: 'Por proceso', mixto: 'Mixto' }[(client as any).tipoCobro] ?? (client as any).tipoCobro}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </CardContent>
            </Card>

            {/* Cases */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText size={18} />
                    Procesos ({cases.length})
                  </CardTitle>
                  <Button
                    variant="ghost"
                    className="text-sm gap-1"
                    onClick={() => navigate(`/cases/new?client_id=${id}`)}
                  >
                    + Nuevo proceso
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {casesLoading ? (
                  <div className="flex justify-center py-8"><LoadingSpinner /></div>
                ) : cases.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">No hay procesos para este cliente.</p>
                ) : (
                  <div className="space-y-2">
                    {cases.map((caso) => (
                      <div
                        key={caso.id}
                        onClick={() => navigate(`/cases/${caso.id}`)}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{caso.titulo}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {caso.caseNumber && <span>{caso.caseNumber}</span>}
                          </p>
                        </div>
                        <CaseStatusBadge status={caso.estado as any} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar info */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Datos del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">ID</p>
                  <p className="text-xs text-slate-700 font-mono break-all">{client.id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Creado</p>
                  <p className="text-sm text-slate-700">{client.createdAt ? formatDate(new Date(client.createdAt)) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Actualizado</p>
                  <p className="text-sm text-slate-700">{client.updatedAt ? formatDate(new Date(client.updatedAt)) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Tipo</p>
                  <p className="text-sm text-slate-700">{CLIENT_TYPE_LABELS[client.clientType] || client.clientType || '—'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
