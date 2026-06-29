import React, { useEffect, useState } from 'react'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Cliente } from '@/types'
import { Users, Plus, Mail, X, Search, FileText, CheckSquare, Clock, Copy, Check, Hash } from 'lucide-react'
import api from '@/lib/axios'

interface ClientStats {
  active_cases: number
  pending_tasks: number
  in_progress_tasks: number
  overdue_tasks: number
  completed_tasks: number
}

const EMPTY_FORM = {
  name: '',
  client_type: 'individual',
  email: '',
  phone: '',
  tax_id: '',
  city: '',
  street_address: '',
  organization_name: '',
  notes: '',
}

export function ClientsListPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [stats, setStats] = useState<Record<string, ClientStats>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  useEscapeKey(() => setShowModal(false), showModal)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const navigate = useNavigate()

  const copyToClipboard = (e: React.MouseEvent, key: string, value: string) => {
    e.stopPropagation()
    if (!value) return
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    })
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  const fetchClientes = async () => {
    setIsLoading(true)
    try {
      const [clientesRes, statsRes] = await Promise.allSettled([
        api.get('/clients?limit=100'),
        api.get('/clients/summary'),
      ])
      if (clientesRes.status === 'fulfilled') {
        setClientes(clientesRes.value.data.data || [])
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data.data || {})
      }
    } catch (error) {
      console.error('Error fetching clientes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email) {
      setError('El nombre y el email son obligatorios.')
      return
    }
    setIsSaving(true)
    setError('')
    try {
      const res = await api.post('/clients', form)
      const nuevo = res.data.data
      setClientes((prev) => [nuevo, ...prev])
      setShowModal(false)
      setForm({ ...EMPTY_FORM })
      navigate(`/clients/${nuevo.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error al crear el cliente.')
    } finally {
      setIsSaving(false)
    }
  }

  const filtered = clientes.filter(
    (c) =>
      !search ||
      c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Clientes</h1>
            <p className="text-slate-600 text-sm sm:text-base">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}</p>
          </div>
          <Button className="gap-2 flex-shrink-0" onClick={() => { setShowModal(true); setError('') }}>
            <Plus size={18} />
            <span className="hidden sm:inline">Nuevo </span>Cliente
          </Button>
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'Sin resultados' : 'No hay clientes registrados'}
            description={search ? 'Prueba con otro término de búsqueda' : 'Comienza a registrar clientes en el sistema'}
            action={!search ? { label: 'Agregar Primer Cliente', onClick: () => setShowModal(true) } : undefined}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Lista de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead className="hidden md:table-cell">
                        <span className="flex items-center gap-1">
                          <Hash size={13} /> RUC
                        </span>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell text-center">
                        <span className="flex items-center justify-center gap-1">
                          <FileText size={13} /> Casos activos
                        </span>
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Clock size={13} /> Pendientes
                        </span>
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-center">
                        <span className="flex items-center justify-center gap-1">
                          <CheckSquare size={13} /> En progreso
                        </span>
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-center">
                        <span className="flex items-center justify-center gap-1">
                          <CheckSquare size={13} /> Completadas
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((cliente) => {
                      const s = stats[cliente.id] || { active_cases: 0, pending_tasks: 0, in_progress_tasks: 0, overdue_tasks: 0, completed_tasks: 0 }
                      return (
                        <TableRow
                          key={cliente.id}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => navigate(`/clients/${cliente.id}`)}
                        >
                          <TableCell className="font-medium">{cliente.nombre}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-1.5">
                              <Mail size={14} className="text-slate-400 flex-shrink-0" />
                              <span className="truncate max-w-[180px]">{cliente.email}</span>
                              {cliente.email && (
                                <button
                                  onClick={(e) => copyToClipboard(e, `email-${cliente.id}`, cliente.email)}
                                  className="flex-shrink-0 p-1 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Copiar email"
                                >
                                  {copiedKey === `email-${cliente.id}`
                                    ? <Check size={12} className="text-green-500" />
                                    : <Copy size={12} />}
                                </button>
                              )}
                            </div>
                          </TableCell>

                          {/* RUC */}
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-slate-700 font-mono">{cliente.ruc || <span className="text-slate-300 font-sans">—</span>}</span>
                              {cliente.ruc && (
                                <button
                                  onClick={(e) => copyToClipboard(e, `ruc-${cliente.id}`, cliente.ruc)}
                                  className="flex-shrink-0 p-1 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Copiar RUC"
                                >
                                  {copiedKey === `ruc-${cliente.id}`
                                    ? <Check size={12} className="text-green-500" />
                                    : <Copy size={12} />}
                                </button>
                              )}
                            </div>
                          </TableCell>

                          {/* Casos activos */}
                          <TableCell className="hidden sm:table-cell text-center">
                            {s.active_cases > 0 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                                {s.active_cases}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-sm">—</span>
                            )}
                          </TableCell>

                          {/* Tareas pendientes */}
                          <TableCell className="hidden md:table-cell text-center">
                            {s.pending_tasks > 0 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                                {s.pending_tasks}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-sm">—</span>
                            )}
                          </TableCell>

                          {/* Tareas en progreso */}
                          <TableCell className="hidden md:table-cell text-center">
                            {s.in_progress_tasks > 0 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                                {s.in_progress_tasks}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-sm">—</span>
                            )}
                          </TableCell>

                          {/* Tareas completadas */}
                          <TableCell className="hidden md:table-cell text-center">
                            {s.completed_tasks > 0 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                {s.completed_tasks}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-sm">—</span>
                            )}
                          </TableCell>

                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Nuevo Cliente</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Nombre completo o razón social *"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej: Juan Pérez / Empresa SAC"
                    required
                  />
                </div>

                <Select
                  label="Tipo de cliente *"
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
                  placeholder="cliente@email.com"
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
                  placeholder="20123456789"
                />

                <Input
                  label="Ciudad"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Lima"
                />

                <div className="sm:col-span-2">
                  <Input
                    label="Dirección"
                    value={form.street_address}
                    onChange={(e) => setForm({ ...form, street_address: e.target.value })}
                    placeholder="Av. Principal 123, Oficina 4"
                  />
                </div>

                {(form.client_type === 'business' || form.client_type === 'government' || form.client_type === 'non_profit') && (
                  <div className="sm:col-span-2">
                    <Input
                      label="Nombre de la organización"
                      value={form.organization_name}
                      onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
                      placeholder="Nombre legal de la empresa"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    placeholder="Información adicional sobre el cliente..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  Crear Cliente
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
