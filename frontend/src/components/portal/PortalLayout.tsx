import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useClientPortalStore } from '@/stores/clientPortalStore'
import { Briefcase, Home, User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: Home, label: 'Inicio', href: '/portal/inicio' },
  { icon: Briefcase, label: 'Mis Asuntos', href: '/portal/asuntos' },
  { icon: User, label: 'Mi Perfil', href: '/portal/perfil' },
]

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { client, logout } = useClientPortalStore()

  const handleLogout = () => {
    logout()
    navigate('/portal/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-primary-700 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://kdbweb-media-2026.s3.us-east-1.amazonaws.com/logos/ee6dcaa184fa42dda843f207ced4f855_Recurso-2.png"
              alt="Katarzyna Legal"
              className="h-8 w-auto object-contain"
            />
            <span className="text-sm font-medium text-primary-200 hidden sm:inline">Portal del Cliente</span>
          </div>
          <div className="flex items-center gap-3">
            {client && (
              <span className="text-sm text-primary-200 hidden sm:inline truncate max-w-[180px]">
                {client.nombre}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-primary-200 hover:text-white transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = location.pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors',
                    active
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  )}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
