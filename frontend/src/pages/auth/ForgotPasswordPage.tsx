import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail } from 'lucide-react'
import api from '@/lib/axios'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ocurrió un error. Inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail size={32} className="text-blue-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Revisa tu correo</h2>
            <p className="text-slate-600 mb-6">
              Si el correo <span className="font-semibold">{email}</span> está registrado, recibirás un enlace para restablecer tu contraseña. El enlace expira en 1 hora.
            </p>
            <Link to="/login" className="text-primary-700 hover:text-primary-800 font-medium text-sm">
              Volver al inicio de sesión
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h1 className="text-3xl font-bold text-primary-700 mb-2">Legal ERP</h1>
          <CardTitle>¿Olvidaste tu contraseña?</CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Ingresa tu correo y te enviaremos un enlace para restablecerla.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button type="submit" isLoading={isLoading} className="w-full">
              Enviar enlace
            </Button>

            <p className="text-center text-sm text-slate-600">
              <Link to="/login" className="text-primary-700 hover:text-primary-800 font-medium">
                Volver al inicio de sesión
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
