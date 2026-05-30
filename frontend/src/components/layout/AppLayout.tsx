import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
  onSearch?: (query: string) => void
}

export function AppLayout({ children, onSearch }: AppLayoutProps) {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="h-screen flex flex-col">
      <Sidebar />
      <div className={cn(
        'flex-1 flex flex-col overflow-hidden transition-all',
        'lg:ml-64'
      )}>
        <Header onSearch={onSearch} />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  )
}
