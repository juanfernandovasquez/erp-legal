import React, { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useClientPortalStore } from '@/stores/clientPortalStore'
import { Home, Briefcase, User, LogOut } from 'lucide-react'

const NAV_ITEMS = [
  { icon: Home,     label: 'Inicio',      href: '/portal/inicio'  },
  { icon: Briefcase, label: 'Mis Asuntos', href: '/portal/asuntos' },
  { icon: User,     label: 'Mi Perfil',   href: '/portal/perfil'  },
]

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('')
}

function isActive(href: string, pathname: string) {
  if (href === '/portal/inicio') return pathname === href
  return pathname.startsWith(href)
}

function SidebarNavLink({ item, pathname }: { item: (typeof NAV_ITEMS)[0]; pathname: string }) {
  const [hovered, setHovered] = React.useState(false)
  const active = isActive(item.href, pathname)
  const Icon = item.icon

  return (
    <Link
      to={item.href}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 22px',
        color: active ? '#d4a355' : hovered ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.55)',
        fontSize: 13, fontWeight: active ? 700 : 500,
        background: active ? 'rgba(176,125,47,.15)' : hovered ? 'rgba(255,255,255,.05)' : 'transparent',
        textDecoration: 'none', position: 'relative',
        transition: 'background .12s, color .12s', letterSpacing: '.2px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {active && (
        <span style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 3, background: '#b07d2f', borderRadius: '0 2px 2px 0',
        }} />
      )}
      <Icon size={17} />
      {item.label}
    </Link>
  )
}

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { client, logout } = useClientPortalStore()
  const [logoutHover, setLogoutHover] = React.useState(false)

  useEffect(() => {
    if (!document.getElementById('portal-montserrat')) {
      const link = document.createElement('link')
      link.id   = 'portal-montserrat'
      link.rel  = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap'
      document.head.appendChild(link)
    }
  }, [])

  const handleLogout = () => { logout(); navigate('/portal/login') }

  const getPageTitle = () => {
    if (location.pathname === '/portal/inicio')             return 'Inicio'
    if (location.pathname === '/portal/asuntos')            return 'Mis Asuntos'
    if (location.pathname.startsWith('/portal/asuntos/'))   return 'Detalle del Asunto'
    if (location.pathname === '/portal/perfil')             return 'Mi Perfil'
    return 'Portal'
  }

  const initials = client ? getInitials(client.nombre) : '?'
  const today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: '#f4f6fb',
      fontFamily: "'Montserrat', 'Segoe UI', system-ui, sans-serif",
    }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside style={{
        width: 256, background: '#071331',
        borderRight: '1px solid rgba(176,125,47,.15)',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        zIndex: 200, display: 'flex', flexDirection: 'column',
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid rgba(176,125,47,.2)' }}>
          <img
            src="https://kdbweb-media-2026.s3.us-east-1.amazonaws.com/logos/ee6dcaa184fa42dda843f207ced4f855_Recurso-2.png"
            alt="Katarzyna Legal"
            style={{ height: 32, objectFit: 'contain', display: 'block', marginBottom: 8 }}
          />
          <span style={{
            display: 'inline-block', fontSize: 9, fontWeight: 700,
            letterSpacing: '1.2px', textTransform: 'uppercase',
            color: 'rgba(255,255,255,.35)', background: 'rgba(255,255,255,.07)',
            padding: '3px 9px', borderRadius: 4,
          }}>
            Portal del Cliente
          </span>
        </div>

        {/* Client chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: '#b07d2f', color: '#071331',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontSize: 12.5, fontWeight: 700, color: '#fff', lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {client?.nombre ?? '—'}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.38)', marginTop: 2 }}>
              {client?.ruc ? `RUC ${client.ruc}` : ''}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => (
            <SidebarNavLink key={item.href} item={item} pathname={location.pathname} />
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{
            background: 'rgba(176,125,47,.12)', border: '1px solid rgba(176,125,47,.22)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 12,
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#d4a355' }}>¿Necesitas ayuda?</p>
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.38)', marginTop: 2, lineHeight: 1.4 }}>
              Tu asesor responde en menos de 24 h hábiles
            </p>
          </div>
          <button
            onClick={handleLogout}
            onMouseEnter={() => setLogoutHover(true)}
            onMouseLeave={() => setLogoutHover(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, color: logoutHover ? '#ef4444' : 'rgba(255,255,255,.28)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, fontFamily: 'inherit', transition: 'color .15s',
            }}
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div style={{ marginLeft: 256, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Topbar */}
        <header style={{
          height: 60, background: '#fff', borderBottom: '1px solid #e2e8f5',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 30px', position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#06186d' }}>{getPageTitle()}</p>
            <p style={{ fontSize: 11, color: '#7b8aa0', marginTop: 1, fontWeight: 500 }}>{today}</p>
          </div>
          {client && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              border: '1px solid #e2e8f5', borderRadius: 9, padding: '6px 13px 6px 10px',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#06186d', color: '#d4a355',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, flexShrink: 0,
              }}>
                {initials}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#06186d', lineHeight: 1.2 }}>
                  {client.nombre}
                </p>
                <p style={{ fontSize: 10, color: '#7b8aa0', fontWeight: 500 }}>
                  Portal del Cliente
                </p>
              </div>
            </div>
          )}
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '26px 30px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
