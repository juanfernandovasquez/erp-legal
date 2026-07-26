import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useClientPortalStore } from '@/stores/clientPortalStore'
import { Home, Briefcase, User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: Home,      label: 'Inicio',      href: '/portal/inicio'  },
  { icon: Briefcase, label: 'Mis Procesos', href: '/portal/procesos' },
  { icon: User,      label: 'Mi Perfil',   href: '/portal/perfil'  },
]

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('')
}

function isActive(href: string, pathname: string) {
  if (href === '/portal/inicio' || href === '/portal/perfil') return pathname === href
  return pathname.startsWith(href)
}

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate  = useNavigate()
  const { client, logout } = useClientPortalStore()

  const handleLogout = () => { logout(); navigate('/portal/login') }

  const getPageTitle = () => {
    if (location.pathname === '/portal/inicio')             return 'Inicio'
    if (location.pathname === '/portal/procesos')           return 'Mis Procesos'
    if (location.pathname.startsWith('/portal/procesos/')) return 'Detalle del Proceso'
    if (location.pathname === '/portal/perfil')             return 'Mi Perfil'
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

        {/* WhatsApp help card */}
        <div className="shrink-0 px-4 pb-4">
          <a
            href="https://wa.me/51926791021"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-3 transition-all duration-[250ms] ease group"
          >
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.553 4.104 1.518 5.826L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.652-.49-5.19-1.348l-.372-.22-3.862 1.007 1.034-3.758-.241-.386A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white leading-tight">¿Necesitas ayuda?</p>
              <p className="text-[10px] text-primary-200 truncate">Escríbenos por WhatsApp</p>
            </div>
          </a>
        </div>

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
