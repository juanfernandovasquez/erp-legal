import React, { useEffect, useState } from 'react'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Users, Plus, X, Search, Edit2, Save, Mail, Phone, KeyRound, ShieldCheck, Shield, Trash2 } from 'lucide-react'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface UserData {
  id: string
  nombre: string
  firstName: string
  lastName: string
  email: string
  phone: string
  rol: string
  role: string
  createdAt: string
  updatedAt: string
}

// ── Helpers de rol ─────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['admin_firma', 'super_admin']

const isAdminRole = (role: string) => ADMIN_ROLES.includes(role)

// Al crear, Administrador → admin_firma, Usuario → abogado_junior
const ROLE_TO_BACKEND: Record<string, string> = {
  administrador: 'admin_firma',
  usuario:       'abogado_junior',
}

const EMPTY_CREATE = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'usuario',   // valor del selector simplificado
  password: '',
}

// ── Componente ────────────────────────────────────────────────────────────────

export function UsersPage() {
  const { user: currentUser } = useAuthStore()
  const currentIsAdmin = isAdminRole(currentUser?.rol ?? '')

  const [users, setUsers]       = useState<UserData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('')   // '' | 'admin' | 'usuario'

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE })
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Edit modal
  const [editUser, setEditUser]   = useState<UserData | null>(null)
  const [editForm, setEditForm]   = useState({ first_name: '', last_name: '', phone: '', role: 'usuario' })
  const [editError, setEditError] = useState('')
  const [isSaving, setIsSaving]   = useState(false)

  // Change password modal
  const [pwUser, setPwUser]         = useState<UserData | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [pwError, setPwError]       = useState('')
  const [isSavingPw, setIsSavingPw] = useState(false)

  // Delete user
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null)
  const [isDeleting, setIsDeleting]     = useState(false)
  const [deleteError, setDeleteError]   = useState('')

  useEscapeKey(() => {
    if (deleteTarget) setDeleteTarget(null)
    else if (pwUser) setPwUser(null)
    else if (editUser) setEditUser(null)
    else setShowCreateModal(false)
  }, showCreateModal || !!editUser || !!pwUser || !!deleteTarget)

  // ── Data fetch ────────────────────────────────────────────────────────────

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/users', { params: { limit: 100 } })
      setUsers(res.data.data || [])
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }

  // ── Filtrado cliente ──────────────────────────────────────────────────────

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      u.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole =
      !roleFilter ||
      (roleFilter === 'admin'   &&  isAdminRole(u.role)) ||
      (roleFilter === 'usuario' && !isAdminRole(u.role))
    return matchSearch && matchRole
  })

  // ── Crear usuario ─────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.first_name || !createForm.last_name || !createForm.email || !createForm.password) {
      setCreateError('Nombre, apellido, email y contraseña son obligatorios.')
      return
    }
    if (createForm.password.length < 8) {
      setCreateError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setIsCreating(true)
    setCreateError('')
    try {
      const payload = {
        first_name: createForm.first_name,
        last_name:  createForm.last_name,
        email:      createForm.email,
        phone:      createForm.phone,
        password:   createForm.password,
        role:       ROLE_TO_BACKEND[createForm.role] ?? 'abogado_junior',
      }
      const res = await api.post('/users', payload)
      setUsers((prev) => [res.data.data, ...prev])
      setShowCreateModal(false)
      setCreateForm({ ...EMPTY_CREATE })
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || 'Error al crear el usuario.')
    } finally {
      setIsCreating(false)
    }
  }

  // ── Editar usuario ────────────────────────────────────────────────────────

  const openEdit = (user: UserData) => {
    setEditUser(user)
    setEditForm({
      first_name: user.firstName || '',
      last_name:  user.lastName  || '',
      phone:      user.phone     || '',
      role:       isAdminRole(user.role) ? 'administrador' : 'usuario',
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
      const payload: any = {
        first_name: editForm.first_name,
        last_name:  editForm.last_name,
        phone:      editForm.phone,
      }
      // Solo admins pueden cambiar el rol de otro usuario
      if (currentIsAdmin) {
        payload.role = ROLE_TO_BACKEND[editForm.role] ?? 'abogado_junior'
      }
      const res = await api.patch(`/users/${editUser.id}`, payload)
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? res.data.data : u)))
      setEditUser(null)
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || 'Error al guardar los cambios.')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Cambiar contraseña ────────────────────────────────────────────────────

  const handleChangePassword = async () => {
    if (!pwUser) return
    if (!newPassword || newPassword.length < 8) {
      setPwError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setIsSavingPw(true)
    setPwError('')
    try {
      await api.patch(`/users/${pwUser.id}`, { password: newPassword })
      setPwUser(null)
      setNewPassword('')
    } catch (err: any) {
      setPwError(err?.response?.data?.detail || 'Error al cambiar la contraseña.')
    } finally {
      setIsSavingPw(false)
    }
  }

  // ── Eliminar usuario ──────────────────────────────────────────────────────

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/users/${deleteTarget.id}`)
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: any) {
      setDeleteError(err?.response?.data?.detail || 'Error al eliminar el usuario.')
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Usuarios</h1>
            <p className="text-slate-600 text-sm sm:text-base">{users.length} usuario{users.length !== 1 ? 's' : ''} en el bufete</p>
          </div>
          {currentIsAdmin && (
            <Button className="gap-2 flex-shrink-0" onClick={() => { setShowCreateModal(true); setCreateError('') }}>
              <Plus size={18} />
              <span className="hidden sm:inline">Nuevo </span>Usuario
            </Button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              placeholder="Todos los roles"
              options={[
                { value: '',        label: 'Todos los roles' },
                { value: 'admin',   label: 'Administrador' },
                { value: 'usuario', label: 'Usuario' },
              ]}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla */}
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search || roleFilter ? 'Sin resultados' : 'No hay usuarios registrados'}
            description={search || roleFilter ? 'Prueba con otro criterio de búsqueda' : 'Agrega el primer usuario al sistema'}
            action={currentIsAdmin && !search && !roleFilter
              ? { label: 'Agregar Usuario', onClick: () => setShowCreateModal(true) }
              : undefined}
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
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((user) => {
                      const isAdmin = isAdminRole(user.role)
                      const isSelf  = user.id === currentUser?.id
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                {user.nombre?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <span className="font-medium text-slate-900">{user.nombre}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                              <Mail size={13} className="text-slate-400 flex-shrink-0" />
                              <span className="truncate max-w-[180px]">{user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              isAdmin
                                ? 'bg-violet-50 text-violet-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isAdmin ? <ShieldCheck size={11} /> : <Shield size={11} />}
                              <span className="hidden xs:inline">{isAdmin ? 'Administrador' : 'Usuario'}</span>
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-slate-500">{user.phone || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {/* Editar — admin edita a todos; usuario solo a sí mismo */}
                              {(currentIsAdmin || isSelf) && (
                                <button
                                  onClick={() => openEdit(user)}
                                  className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                              {/* Cambiar contraseña — admin a todos; usuario solo a sí mismo */}
                              {(currentIsAdmin || isSelf) && (
                                <button
                                  onClick={() => { setPwUser(user); setNewPassword(''); setPwError('') }}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                  title="Cambiar contraseña"
                                >
                                  <KeyRound size={14} />
                                </button>
                              )}
                              {/* Eliminar — solo admin, no puede eliminarse a sí mismo */}
                              {currentIsAdmin && !isSelf && (
                                <button
                                  onClick={() => { setDeleteTarget(user); setDeleteError('') }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Eliminar usuario"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
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

      {/* ── Modal: Crear usuario ─────────────────────────────────────────── */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="sm:col-span-2">
                  <Input
                    label="Email *"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="ana.garcia@bufete.com"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
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
                  label="Tipo de cuenta *"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  options={[
                    { value: 'usuario',       label: 'Usuario' },
                    { value: 'administrador', label: 'Administrador' },
                  ]}
                />

                <Input
                  label="Teléfono"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+51 999 999 999"
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

      {/* ── Modal: Editar usuario ─────────────────────────────────────────── */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <Input
                  label="Teléfono"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+51 999 999 999"
                />

                {/* Solo el admin puede cambiar el tipo de cuenta */}
                {currentIsAdmin && (
                  <Select
                    label="Tipo de cuenta"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    options={[
                      { value: 'usuario',       label: 'Usuario' },
                      { value: 'administrador', label: 'Administrador' },
                    ]}
                  />
                )}
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

      {/* ── Modal: Cambiar contraseña ─────────────────────────────────────── */}
      
      {/* ── Modal: Cambiar contraseña ─────────────────────────────────────── */}
      {pwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Cambiar contraseña</h2>
                <p className="text-sm text-slate-500 mt-0.5">{pwUser.nombre}</p>
              </div>
              <button onClick={() => setPwUser(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {pwError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {pwError}
                </div>
              )}

              <Input
                label="Nueva contraseña"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoFocus
              />

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setPwUser(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleChangePassword} isLoading={isSavingPw} className="gap-2">
                  <KeyRound size={15} />
                  Guardar contraseña
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar eliminación de usuario ───────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Eliminar usuario</h2>
              <button onClick={() => setDeleteTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                ¿Estás seguro de que deseas eliminar a{' '}
                <span className="font-semibold text-slate-900">{deleteTarget.nombre}</span>?
                Esta acción no se puede deshacer.
              </p>
              <p className="text-xs text-slate-400">
                Sus tareas, horas y demás registros permanecerán en el sistema.
              </p>

              {deleteError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeleteUser}
                  isLoading={isDeleting}
                  className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 size={15} />
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  )
}
