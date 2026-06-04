import React, { useState } from 'react'
import { Bell, Search, Settings } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router-dom'

interface HeaderProps {
  onSearch?: (query: string) => void
}

export function Header({ onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { notifications } = useUIStore()
  const { user, logout } = useAuth()

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch?.(query)
  }

  const unreadNotifications = notifications.filter(
    (n) => n.type === 'warning' || n.type === 'error'
  )

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar casos, tareas, documentos..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 ml-6">
        <div className="relative">
          <button className="relative p-2 text-slate-600 hover:text-primary-700 transition-colors">
            <Bell size={20} />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>

        <DropdownMenu
          trigger={
            <button className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
              <div className="h-8 w-8 rounded-full bg-primary-700 text-white flex items-center justify-center text-sm font-medium">
                {user?.nombre?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{user?.nombre}</span>
            </button>
          }
        >
          <div className="py-2">
            <div className="px-4 py-2 text-sm text-slate-600 border-b border-slate-100">
              <p className="font-medium">{user?.nombre}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
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
    </header>
  )
}
