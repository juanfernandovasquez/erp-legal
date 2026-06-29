import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { Lock, Bell, Building2, Save, Pencil } from 'lucide-react'
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

function FirmSettingsTab() {
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin_firma' || user?.rol === 'super_admin' || user?.rol === 'admin'
  const [firm, setFirm] = useState<LawFirm | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<LawFirm>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
    try {
      const r = await api.patch('/law-firms/current', form)
      const updated = r.data.data
      setFirm(updated)
      setForm(updated)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
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
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-2">
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

        {editing && (
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm(firm) }}>
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

export function SettingsPage() {
  const { user } = useAuth()

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
            <Card>
              <CardHeader>
                <CardTitle>Información de Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Nombre" value={user?.nombre || ''} disabled />
                  <Input label="Email" type="email" value={user?.email || ''} disabled />
                  <Input label="Teléfono" value={user?.telefono || ''} disabled />
                  <Input label="Rol" value={user?.rol || ''} disabled />
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <Button variant="secondary" disabled title="Próximamente">Editar Perfil</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock size={20} className="text-primary-700" />
                  <CardTitle>Seguridad</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium text-slate-900 mb-4">Cambiar Contraseña</h4>
                  <div className="space-y-4">
                    <Input label="Contraseña Actual" type="password" placeholder="••••••••" />
                    <Input label="Nueva Contraseña" type="password" placeholder="••••••••" />
                    <Input label="Confirmar Nueva Contraseña" type="password" placeholder="••••••••" />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <Button variant="secondary" disabled title="Próximamente">Actualizar Contraseña</Button>
                </div>
              </CardContent>
            </Card>
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
