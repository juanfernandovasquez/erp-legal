import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Receipt,
  AlertCircle,
  Users,
  UserCog,
  Settings,
  LogOut,
  Mail,
  Bug,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  admin_firma:     'Administrador',
  abogado_senior:  'Abogado Senior',
  abogado_junior:  'Abogado Junior',
  abogado:         'Abogado',
  paralegal:       'Paralegal',
  asistente:       'Asistente',
  practicante:     'Practicante',
  contador:        'Contador',
  super_admin:     'Super Admin',
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, logout } = useAuth()
  const location = useLocation()

  const isAdmin = ['admin_firma', 'super_admin'].includes(user?.rol ?? '')

  const menuItems = [
    { icon: LayoutDashboard, label: 'Panel de Control', href: '/dashboard' },
    { icon: FileText, label: 'Procesos', href: '/cases' },
    { icon: CheckSquare, label: 'Tareas', href: '/tasks' },
    ...(isAdmin ? [{ icon: Receipt, label: 'Facturación', href: '/hours' }] : []),
    { icon: AlertCircle, label: 'Alertas', href: '/alerts' },
    { icon: Users, label: 'Clientes', href: '/clients' },
    ...(isAdmin ? [{ icon: UserCog, label: 'Usuarios', href: '/users' }] : []),
    ...(isAdmin ? [{ icon: Bug, label: 'Monitor Errores', href: '/admin/errors' }] : []),
    { icon: Mail, label: 'Comunicaciones', href: '/emails' },
    { icon: Settings, label: 'Configuración', href: '/settings' },
  ]

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/')

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 w-64 bg-primary-700 text-white flex flex-col transition-all z-40',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6 border-b border-primary-600 shrink-0">
          <h1 className="text-2xl font-bold">Legal ERP</h1>
          <p className="text-primary-200 text-sm mt-1">Sistema de Gestión</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => { if (sidebarOpen) toggleSidebar() }}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-md transition-colors',
                  active
                    ? 'bg-primary-600 text-white'
                    : 'text-primary-100 hover:bg-primary-600'
                )}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="shrink-0 p-4 border-t border-primary-600">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-primary-600">
            <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
              {user?.nombre?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="text-sm min-w-0">
              <p className="font-medium truncate">{user?.nombre}</p>
              <p className="text-primary-200 text-xs">{ROLE_LABELS[user?.rol ?? ''] ?? user?.rol}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-2 text-primary-100 hover:bg-primary-600 rounded-md transition-colors"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

    </>
  )
}
