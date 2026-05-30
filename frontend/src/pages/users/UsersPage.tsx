import React, { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Users, Plus, X, Search, Edit2, Save, Mail, Phone, ShieldCheck, ToggleLeft, ToggleRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import api from '@/lib/axios'

interface UserData {
  id: string
  nombre: string
  firstName: string
  lastName: string
  email: string
  phone: string
  rol: string
  role: string
  jobTitle: string
  department: string
  estado: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  updatedAt: string
}

const ROLE_LABELS: Record<string, string> = {
  admin_firma: 'Administrador',
  abogado: 'Abogado',
  abogado_senior: 'Abogado Senior',
  paralegal: 'Paralegal',
  asistente: 'Asistente',
  practicante: 'Practicante',
  contador: 'Contador',
  super_admin: 'Super Admin',
}

const ROLE_BADGE: Record<string, string> = {
  admin_firma: 'default',
  abogado: 'primary',
  abogado_senior: 'primary',
  paralegal: 'secondary',
  asistente: 'secondary',
  practicante: 'secondary',
}

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'abogado',
  job_title: '',
  department: '',
  password: '',
}

export function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM })
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Edit modal
  const [editUser, setEditUser] = useState<UserData | null>(null)
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    role: '',
    job_title: '',
    department: '',
  })
  const [editError, setEditError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [roleFilter])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const params: any = { limit: 100 }
      if (roleFilter) params.role = roleFilter
      const res = await api.get('/users', { params })
      setUsers(res.data.data || [])
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.first_name || !createForm.last_name || !createForm.email || !createForm.password) {
      setCreateError('Nombre, apellido, email y contraseña son obligatorios.')
      return
    }
    setIsCreating(true)
    setCreateError('')
    try {
      const res = await api.post('/users', createForm)
      setUsers((prev) => [res.data.data, ...prev])
      setShowCreateModal(false)
      setCreateForm({ ...EMPTY_FORM })
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || 'Error al crear el usuario.')
    } finally {
      setIsCreating(false)
    }
  }

  const openEdit = (user: UserData) => {
    setEditUser(user)
    setEditForm({
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      phone: user.phone || '',
      role: user.role || '',
      job_title: user.jobTitle || '',
      department: user.department || '',
    })
    setEditError('')
  }

  const handleSaveEdit = async () => {
    if (!editUser) return
    if (!editForm.first_name || !editForm.last_name) {
      setEditError('Nombre y apellido son obligatorios.')
      return
    }
    setIsSaving(true)
    setEditError('')
    try {
      const res = await api.patch(`/users/${editUser.id}`, editForm)
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? res.data.data : u)))
      setEditUser(null)
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || 'Error al guardar los cambios.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (user: UserData) => {
    try {
      const res = await api.patch(`/users/${user.id}`, { is_active: !user.isActive })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data.data : u)))
    } catch {}
  }

  const filtered = users.filter(
    (u) =>
      !search ||
      u.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Usuarios</h1>
            <p className="text-slate-600">{users.length} usuario{users.length !== 1 ? 's' : ''} en el bufete</p>
          </div>
          <Button className="gap-2" onClick={() => { setShowCreateModal(true); setCreateError('') }}>
            <Plus size={18} />
            Nuevo Usuario
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="w-48">
            <Select
              placeholder="Todos los roles"
              options={[
                { value: '', label: 'Todos los roles' },
                { value: 'admin_firma', label: 'Administrador' },
                { value: 'abogado', label: 'Abogado' },
                { value: 'abogado_senior', label: 'Abogado Senior' },
                { value: 'paralegal', label: 'Paralegal' },
                { value: 'asistente', label: 'Asistente' },
                { value: 'practicante', label: 'Practicante' },
              ]}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search || roleFilter ? 'Sin resultados' : 'No hay usuarios registrados'}
            description={search || roleFilter ? 'Prueba con otro criterio de búsqueda' : 'Agrega el primer usuario al sistema'}
            action={!search && !roleFilter ? { label: 'Agregar Usuario', onClick: () => setShowCreateModal(true) } : undefined}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Equipo del Bufete</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Último acceso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                              {user.nombre?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="font-medium text-slate-900">{user.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail size={13} className="text-slate-400" />
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs bg-primary-50 text-primary-700 font-medium px-2 py-0.5 rounded-full">
                            {ROLE_LABELS[user.role] || user.role || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">{user.jobTitle || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">{user.phone || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-400">
                            {user.lastLogin ? formatDate(new Date(user.lastLogin)) : 'Nunca'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'success' : 'secondary'}>
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(user)}
                              className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={`p-1.5 rounded transition-colors ${user.isActive ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                              title={user.isActive ? 'Desactivar' : 'Activar'}
                            >
                              {user.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Nuevo Usuario</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nombre *"
                  value={createForm.first_name}
                  onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                  placeholder="Ana"
                  required
                />
                <Input
                  label="Apellido *"
                  value={createForm.last_name}
                  onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                  placeholder="García"
                  required
                />

                <div className="col-span-2">
                  <Input
                    label="Email *"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="ana.garcia@bufete.com"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    label="Contraseña *"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                    required
                  />
                </div>

                <Select
                  label="Rol *"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  options={[
                    { value: 'abogado', label: 'Abogado' },
                    { value: 'abogado_senior', label: 'Abogado Senior' },
                    { value: 'paralegal', label: 'Paralegal' },
                    { value: 'asistente', label: 'Asistente' },
                    { value: 'practicante', label: 'Practicante' },
                    { value: 'contador', label: 'Contador' },
                    { value: 'admin_firma', label: 'Administrador' },
                  ]}
                />

                <Input
                  label="Teléfono"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+51 999 999 999"
                />

                <Input
                  label="Cargo"
                  value={createForm.job_title}
                  onChange={(e) => setCreateForm({ ...createForm, job_title: e.target.value })}
                  placeholder="Ej: Abogado Asociado"
                />

                <Input
                  label="Área / Departamento"
                  value={createForm.department}
                  onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                  placeholder="Ej: Litigios Civiles"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isCreating}>
                  Crear Usuario
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Editar Usuario</h2>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nombre *"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  required
                />
                <Input
                  label="Apellido *"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  required
                />

                <Select
                  label="Rol"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  options={[
                    { value: 'abogado', label: 'Abogado' },
                    { value: 'abogado_senior', label: 'Abogado Senior' },
                    { value: 'paralegal', label: 'Paralegal' },
                    { value: 'asistente', label: 'Asistente' },
                    { value: 'practicante', label: 'Practicante' },
                    { value: 'contador', label: 'Contador' },
                    { value: 'admin_firma', label: 'Administrador' },
                  ]}
                />

                <Input
                  label="Teléfono"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+51 999 999 999"
                />

                <Input
                  label="Cargo"
                  value={editForm.job_title}
                  onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                />

                <Input
                  label="Área / Departamento"
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setEditUser(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} isLoading={isSaving} className="gap-2">
                  <Save size={15} />
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
