import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center">
        <FileQuestion size={64} className="mx-auto mb-6 text-slate-400" />
        <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>
        <p className="text-slate-600 text-lg mb-8">La página que buscas no existe</p>
        <Link to="/dashboard">
          <Button>Volver al Panel de Control</Button>
        </Link>
      </div>
    </div>
  )
}
