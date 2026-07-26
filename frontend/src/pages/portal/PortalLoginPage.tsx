import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientPortalStore } from '@/stores/clientPortalStore'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export function PortalLoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error } = useClientPortalStore()
  const [ruc, setRuc] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(ruc.trim(), password)
      navigate('/portal/inicio')
    } catch {
      // error is in store
    }
  }

  return (
    <div className="min-h-screen bg-primary-700 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img
            src="https://kdbweb-media-2026.s3.us-east-1.amazonaws.com/logos/ee6dcaa184fa42dda843f207ced4f855_Recurso-2.png"
            alt="Katarzyna Legal"
            className="h-14 w-auto object-contain"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Portal del Cliente</h1>
          <p className="text-sm text-slate-500 mb-6">Ingresa con tu RUC y contraseña</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">RUC</label>
              <input
                type="text"
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                placeholder="20123456789"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-700 hover:bg-primary-800 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : null}
              Ingresar
            </button>
          </form>
        </div>

        <p className="text-center text-primary-200 text-xs mt-6">
          ¿Problemas para ingresar? Contacta a tu abogado responsable.
        </p>
      </div>
    </div>
  )
}
