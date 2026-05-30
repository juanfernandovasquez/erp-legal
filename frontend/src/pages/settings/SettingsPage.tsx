import React from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { Lock, Bell, Shield, Users } from 'lucide-react'

export function SettingsPage() {
  const { user } = useAuth()

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Configuración</h1>
          <p className="text-slate-600">Gestiona tu cuenta y preferencias</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Información de Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nombre"
                    value={user?.nombre || ''}
                    disabled
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                  />
                  <Input
                    label="Teléfono"
                    value={user?.telefono || ''}
                    disabled
                  />
                  <Input
                    label="Rol"
                    value={user?.rol || ''}
                    disabled
                  />
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Button variant="secondary">Editar Perfil</Button>
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
                    <Input
                      label="Contraseña Actual"
                      type="password"
                      placeholder="••••••••"
                    />
                    <Input
                      label="Nueva Contraseña"
                      type="password"
                      placeholder="••••••••"
                    />
                    <Input
                      label="Confirmar Nueva Contraseña"
                      type="password"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Button variant="secondary">Actualizar Contraseña</Button>
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
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Tareas Asignadas</p>
                    <p className="text-sm text-slate-600">Recibe alertas cuando te asignan tareas</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Actualizaciones de Casos</p>
                    <p className="text-sm text-slate-600">Notificaciones sobre cambios en tus casos</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">Fechas Próximas</p>
                    <p className="text-sm text-slate-600">Recordatorios de fechas importantes</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Button variant="secondary">Guardar Preferencias</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={20} className="text-primary-700" />
                    <CardTitle>Gestión de Usuarios</CardTitle>
                  </div>
                  <Button size="sm" className="gap-2">
                    <Users size={14} />
                    Agregar Usuario
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-center py-8">Funcionalidad disponible pronto</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
