import React, { useState, useRef, useEffect } from 'react'
import { Bell, Settings, Menu, X, AlertCircle } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/lib/axios'

export function Header() {
  const { notifications, sidebarOpen, toggleSidebar } = useUIStore()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [bellOpen, setBellOpen] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    if (bellOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [bellOpen])

  const handleBellClick = async () => {
    const next = !bellOpen
    setBellOpen(next)
    if (next) {
      try {
        const res = await api.get('/alerts?limit=5')
        setAlerts(res.data.data || [])
      } catch {
        setAlerts([])
      }
    }
  }

  const unreadNotifications = notifications.filter(
    (n) => n.type === 'warning' || n.type === 'error'
  )

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-20">
      {/* Hamburger — solo en móvil */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden flex-shrink-0 p-1.5 text-slate-600 hover:text-primary-700 rounded-md transition-all duration-[250ms] ease"
        aria-label="Menú"
      >
        {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Acciones */}
      <div className="flex items-center gap-2 sm:gap-3 ml-4 sm:ml-auto">
        {/* Campana de alertas */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={handleBellClick}
            className="relative p-2 text-slate-600 hover:text-primary-700 rounded-md transition-all duration-[250ms] ease"
            aria-label="Alertas"
          >
            <Bell size={20} />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800">Alertas</span>
                <button
                  onClick={() => { setBellOpen(false); navigate('/alerts') }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Ver todas
                </button>
              </div>
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-slate-400">
                  <AlertCircle size={24} className="mb-2 opacity-40" />
                  <p className="text-sm">Sin alertas pendientes</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                  {alerts.map((a) => (
                    <div key={a.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {a.titulo || a.nombre || 'Alerta'}
                      </p>
                      {a.mensaje && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{a.mensaje}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Menú de usuario — oculto en desktop (ya visible en sidebar) */}
        <div className="lg:hidden">
          <DropdownMenu
            trigger={
              <button className="flex items-center gap-2 px-2 sm:px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                <div className="h-8 w-8 rounded-full bg-primary-700 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {user?.nombre?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <span className="text-sm font-medium hidden sm:inline max-w-[120px] truncate">
                  {user?.nombre}
                </span>
              </button>
            }
          >
            <div className="py-2">
              <div className="px-4 py-2 text-sm text-slate-600 border-b border-slate-100">
                <p className="font-medium truncate">{user?.nombre}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <Link to="/settings">
                <DropdownMenuItem>
                  <Settings size={16} className="mr-2" />
                  Configuración
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                Cerrar Sesión
              </DropdownMenuItem>
            </div>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
