import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useClientPortalStore } from '@/stores/clientPortalStore'
import { Home, Briefcase, User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: Home,      label: 'Inicio',      href: '/portal/inicio'  },
  { icon: Briefcase, label: 'Mis Asuntos', href: '/portal/asuntos' },
  { icon: User,      label: 'Mi Perfil',   href: '/portal/perfil'  },
]

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('')
}

function isActive(href: string, pathname: string) {
  if (href === '/portal/inicio') return pathname === href
  return pathname.startsWith(href)
}

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate  = useNavigate()
  const { client, logout } = useClientPortalStore()

  const handleLogout = () => { logout(); navigate('/portal/login') }

  const getPageTitle = () => {
    if (location.pathname === '/portal/inicio')            return 'Inicio'
    if (location.pathname === '/portal/asuntos')           return 'Mis Asuntos'
    if (location.pathname.startsWith('/portal/asuntos/'))  return 'Detalle del Asunto'
    if (location.pathname === '/portal/perfil')            return 'Mi Perfil'
    return 'Portal'
  }

  const initials = client ? getInitials(client.nombre) : '?'
  const today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-primary-700 text-white flex flex-col z-40">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-primary-600 shrink-0">
          <img
            src="https://kdbweb-media-2026.s3.us-east-1.amazonaws.com/logos/ee6dcaa184fa42dda843f207ced4f855_Recurso-2.png"
            alt="Katarzyna Legal & Tributario"
            className="h-10 w-auto object-contain"
          />
          <span className="inline-block mt-2 text-[9px] font-bold uppercase tracking-widest text-primary-200 bg-white/10 px-2 py-0.5 rounded">
            Portal del Cliente
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, location.pathname)
            const Icon   = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-[250ms] ease border-l-2',
                  active
                    ? 'border-gold-400 bg-white/10 text-white font-semibold'
                    : 'border-transparent text-primary-100 hover:bg-white/10 hover:text-white font-medium'
                )}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-primary-600">
          {/* Client info */}
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-primary-600">
            <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold shrink-0">
              {initials}
            </div>
            <div className="text-sm min-w-0">
              <p className="font-semibold truncate">{client?.nombre ?? '—'}</p>
              <p className="text-primary-200 text-xs truncate">
                {client?.ruc ? `RUC ${client.ruc}` : 'Cliente'}
              </p>
            </div>
          </div>
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-primary-100 hover:text-white hover:bg-white/10 rounded-md transition-all duration-[250ms] ease"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Topbar — igual al Header del ERP */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <div>
            <p className="font-bold text-primary-700 text-base">{getPageTitle()}</p>
            <p className="text-xs text-slate-400 capitalize">{today}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-primary-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-primary-700 leading-tight">{client?.nombre ?? '—'}</p>
              <p className="text-[10px] text-slate-400 font-medium">Portal del Cliente</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
