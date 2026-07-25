import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import api from '@/lib/axios'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'El enlace es inválido o ha expirado.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-red-500 mb-4">Enlace inválido. No se encontró el token.</p>
            <Link to="/forgot-password" className="text-primary-700 font-medium text-sm">
              Solicitar nuevo enlace
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Contraseña actualizada!</h2>
            <p className="text-slate-600 mb-2">Tu contraseña fue cambiada correctamente.</p>
            <p className="text-sm text-slate-400">Redirigiendo al inicio de sesión...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="bg-primary-700 flex justify-center items-center py-8 px-6">
          <img
            src="https://kdbweb-media-2026.s3.us-east-1.amazonaws.com/logos/ee6dcaa184fa42dda843f207ced4f855_Recurso-2.png"
            alt="Katarzyna Legal & Tributario"
            className="h-14 w-auto object-contain"
          />
        </div>
        <CardHeader className="text-center pt-6">
          <CardTitle>Nueva contraseña</CardTitle>
          <p className="text-sm text-slate-600 mt-2">Elige una contraseña segura (mínimo 8 caracteres).</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Input
              label="Nueva contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />

            <Button type="submit" isLoading={isLoading} className="w-full">
              Guardar nueva contraseña
            </Button>

            <p className="text-center text-sm">
              <Link to="/forgot-password" className="text-primary-700 hover:text-primary-800 font-medium">
                Solicitar nuevo enlace
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
