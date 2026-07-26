import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientPortalStore } from '@/stores/clientPortalStore'

export function PortalLoginPage() {
  const navigate  = useNavigate()
  const { login, isLoading, error } = useClientPortalStore()
  const [ruc, setRuc]           = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(ruc.trim(), password)
      navigate('/portal/inicio')
    } catch {
      // error in store
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 p-4">
      <div className="w-full max-w-md">
        {/* Card — mismo patrón que ERP LoginPage */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          {/* Logo area — igual al ERP */}
          <div className="bg-primary-700 flex justify-center items-center py-8 px-6">
            <img
              src="https://kdbweb-media-2026.s3.us-east-1.amazonaws.com/logos/ee6dcaa184fa42dda843f207ced4f855_Recurso-2.png"
              alt="Katarzyna Legal & Tributario"
              className="h-14 w-auto object-contain"
            />
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-slate-900">Portal del Cliente</h1>
              <p className="text-sm text-slate-500 mt-1">Ingresa con tu RUC y contraseña de acceso</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* RUC */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  RUC
                </label>
                <input
                  type="text"
                  value={ruc}
                  onChange={e => setRuc(e.target.value)}
                  placeholder="20123456789"
                  required
                  autoComplete="username"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Botón */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {isLoading ? 'Verificando…' : 'Ingresar al Portal'}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-6">
              ¿Problemas para ingresar? Contacta a tu abogado responsable.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
