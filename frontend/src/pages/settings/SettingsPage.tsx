import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { Lock, Bell, Building2, Save, Pencil, Eye, EyeOff, User } from 'lucide-react'
import api from '@/lib/axios'

interface LawFirm {
  id: string
  name: string
  registration_number: string
  email: string
  phone: string
  street_address: string
  city: string
  state: string
  postal_code: string
  country: string
  website: string
}

function PasswordInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••'}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          tabIndex={-1}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

function PasswordChangeCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setError('')
    setSuccess(false)
    if (!current || !next || !confirm) { setError('Completa todos los campos.'); return }
    if (next.length < 8) { setError('La nueva contraseña debe tener al menos 8 caracteres.'); return }
    if (next !== confirm) { setError('La nueva contraseña y la confirmación no coinciden.'); return }
    setSaving(true)
    try {
      await api.patch('/users/me/password', { current_password: current, new_password: next })
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Error al cambiar la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock size={20} className="text-primary-700" />
          <CardTitle>Cambiar Contraseña</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <PasswordInput label="Contraseña Actual" value={current} onChange={setCurrent} />
        <PasswordInput label="Nueva Contraseña" value={next} onChange={setNext} placeholder="Mínimo 8 caracteres" />
        <PasswordInput label="Confirmar Nueva Contraseña" value={confirm} onChange={setConfirm} />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600 font-medium">✓ Contraseña actualizada correctamente</p>}

        <div className="pt-2">
          <Button onClick={handleSubmit} isLoading={saving} className="gap-2">
            {!saving && <Save size={14} />}
            Actualizar Contraseña
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function FirmSettingsTab() {
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin_firma' || user?.rol === 'super_admin'
  const [firm, setFirm] = useState<LawFirm | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<LawFirm>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/law-firms/current')
      .then(r => {
        const d = r.data.data
        setFirm(d)
        setForm(d)
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      // Strip empty strings so optional fields (e.g. website) don't fail backend validation
      const payload = Object.fromEntries(
        Object.entries(form).filter(([_, v]) => v !== '')
      )
      const r = await api.patch('/law-firms/current', payload)
      const updated = r.data.data
      setFirm(updated)
      setForm(updated)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Error al guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof LawFirm, opts?: { hint?: string }) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {editing ? (
        <input
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={(form[key] as string) ?? ''}
          onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
          placeholder={opts?.hint}
        />
      ) : (
        <p className="text-sm text-slate-900 py-2 px-1 border-b border-slate-100">
          {(firm?.[key] as string) || <span className="text-slate-400 italic">Sin datos</span>}
        </p>
      )}
    </div>
  )

  if (!firm) return <p className="text-slate-500 text-sm py-8 text-center">Cargando...</p>

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-primary-700" />
            <CardTitle>Datos del Negocio</CardTitle>
          </div>
          {isAdmin && !editing && (
            <Button size="sm" variant="outline" onClick={() => { setEditing(true); setError('') }} className="gap-2">
              <Pencil size={14} />
              Editar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Identificación */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Identificación</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('Razón Social', 'name')}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">RUC</label>
              <p className="text-sm text-slate-900 py-2 px-1 border-b border-slate-100">
                {firm.registration_number || <span className="text-slate-400 italic">Sin datos</span>}
              </p>
              {editing && (
                <p className="text-xs text-slate-400 mt-1">El RUC no puede modificarse desde aquí.</p>
              )}
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contacto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('Email', 'email', { hint: 'contacto@bufete.pe' })}
            {field('Teléfono', 'phone', { hint: '+51 999 000 000' })}
            {field('Sitio Web', 'website', { hint: 'www.bufete.pe' })}
          </div>
        </div>

        {/* Dirección */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Dirección</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('Dirección', 'street_address', { hint: 'Av. Javier Prado Este 1234, Of. 502' })}
            {field('Ciudad', 'city', { hint: 'Lima' })}
            {field('Departamento / Estado', 'state', { hint: 'Lima' })}
            {field('Código Postal', 'postal_code', { hint: '15046' })}
            {field('País', 'country', { hint: 'Perú' })}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {editing && (
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm(firm); setError('') }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={saving} className="gap-2">
              {!saving && <Save size={14} />}
              Guardar Cambios
            </Button>
          </div>
        )}

        {saved && (
          <p className="text-sm text-emerald-600 font-medium text-right">✓ Datos guardados correctamente</p>
        )}

        {!isAdmin && (
          <p className="text-xs text-slate-400 pt-2">Solo los administradores pueden modificar estos datos.</p>
        )}
      </CardContent>
    </Card>
  )
}

function ProfileTab() {
  const { user, setUser } = useAuth()
  const isAdmin = user?.rol === 'admin_firma' || user?.rol === 'super_admin'
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    first_name: (user as any)?.firstName ?? '',
    last_name: (user as any)?.lastName ?? '',
    phone: user?.telefono ?? (user as any)?.phone ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const handleEdit = () => {
    setForm({
      first_name: (user as any)?.firstName ?? '',
      last_name: (user as any)?.lastName ?? '',
      phone: user?.telefono ?? (user as any)?.phone ?? '',
    })
    setError('')
    setEditing(true)
  }

  const handleSave = async () => {
    if (!user?.id) return
    if (!form.first_name.trim()) { setError('El nombre es requerido.'); return }
    if (!form.last_name.trim()) { setError('El apellido es requerido.'); return }
    setSaving(true)
    setError('')
    try {
      const r = await api.patch(`/users/${user.id}`, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || null,
      })
      const updated = r.data.data
      setUser({
        ...user,
        nombre: updated.nombre,
        telefono: updated.phone ?? '',
        ...(updated as any),
      })
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Error al guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  const roleLabel = (rol: string) => {
    if (rol === 'admin_firma') return 'Administrador'
    if (rol === 'abogado_junior') return 'Usuario'
    return rol
  }

  const readonlyField = (label: string, value: string | undefined) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <p className="text-sm text-slate-900 py-2 px-1 border-b border-slate-100">
        {value || <span className="text-slate-400 italic">Sin datos</span>}
      </p>
    </div>
  )

  const editableField = (label: string, key: 'first_name' | 'last_name' | 'phone', placeholder?: string) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {editing ? (
        <input
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
        />
      ) : (
        <p className="text-sm text-slate-900 py-2 px-1 border-b border-slate-100">
          {form[key] || <span className="text-slate-400 italic">Sin datos</span>}
        </p>
      )}
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={20} className="text-primary-700" />
            <CardTitle>Información de Perfil</CardTitle>
          </div>
          {!editing && (
            <Button size="sm" variant="outline" onClick={handleEdit} className="gap-2">
              <Pencil size={14} />
              Editar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {editableField('Nombre', 'first_name', 'Nombre')}
          {editableField('Apellido', 'last_name', 'Apellido')}
          {readonlyField('Email', user?.email)}
          {editableField('Teléfono', 'phone', '+51 999 000 000')}
          {readonlyField('Rol', roleLabel(user?.rol ?? ''))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600 font-medium">✓ Perfil actualizado correctamente</p>}

        {editing && (
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setError('') }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={saving} className="gap-2">
              {!saving && <Save size={14} />}
              Guardar Cambios
            </Button>
          </div>
        )}

        {!isAdmin && (
          <p className="text-xs text-slate-400 pt-2">
            Para cambios de rol, contacta al administrador.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function SettingsPage() {
  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Configuración</h1>
          <p className="text-slate-600">Gestiona tu cuenta y preferencias</p>
        </div>

        <Tabs defaultValue="firma">
          <TabsList className="mb-6">
            <TabsTrigger value="firma">Mi Empresa</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="firma">
            <FirmSettingsTab />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>

          <TabsContent value="security">
            <PasswordChangeCard />
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell size={20} className="text-primary-700" />
                  <CardTitle>Notificaciones</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Tareas Asignadas', desc: 'Recibe alertas cuando te asignan tareas' },
                  { label: 'Actualizaciones de Casos', desc: 'Notificaciones sobre cambios en tus casos' },
                  { label: 'Fechas Próximas', desc: 'Recordatorios de fechas importantes' },
                ].map(n => (
                  <div key={n.label} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{n.label}</p>
                      <p className="text-sm text-slate-600">{n.desc}</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </div>
                ))}
                <div className="pt-4 border-t border-slate-200">
                  <Button variant="secondary" disabled title="Próximamente">Guardar Preferencias</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  )
}
