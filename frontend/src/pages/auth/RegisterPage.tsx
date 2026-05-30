import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function RegisterPage() {
  const [formData, setFormData] = useState({
    nombreBuffete: '',
    direccionBuffete: '',
    telefonoBuffete: '',
    emailBuffete: '',
    rucBuffete: '',
    nombreAdmin: '',
    emailAdmin: '',
    passwordAdmin: '',
    confirmarPassword: '',
  })
  const [error, setError] = useState('')
  const { register, isLoading } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.passwordAdmin !== formData.confirmarPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    try {
      await register(formData)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrarse')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <h1 className="text-3xl font-bold text-primary-700 mb-2">Legal ERP</h1>
          <CardTitle>Registrar Bufete Jurídico</CardTitle>
          <p className="text-sm text-slate-600 mt-2">Crea tu cuenta y comienza a gestionar casos</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <h3 className="col-span-full font-semibold text-slate-900">Información del Bufete</h3>

              <Input
                label="Nombre del Bufete"
                placeholder="Bufete Jurídico XYZ"
                name="nombreBuffete"
                value={formData.nombreBuffete}
                onChange={handleChange}
                required
              />

              <Input
                label="RUC"
                placeholder="20123456789"
                name="rucBuffete"
                value={formData.rucBuffete}
                onChange={handleChange}
                required
              />

              <Input
                label="Teléfono"
                placeholder="+51 1 1234567"
                name="telefonoBuffete"
                value={formData.telefonoBuffete}
                onChange={handleChange}
                required
              />

              <Input
                label="Email del Bufete"
                type="email"
                placeholder="info@bufete.com"
                name="emailBuffete"
                value={formData.emailBuffete}
                onChange={handleChange}
                required
              />

              <Input
                label="Dirección"
                placeholder="Av. Principal 123"
                name="direccionBuffete"
                value={formData.direccionBuffete}
                onChange={handleChange}
                required
                className="md:col-span-2"
              />
            </div>

            <div className="h-px bg-slate-200"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <h3 className="col-span-full font-semibold text-slate-900">Información del Administrador</h3>

              <Input
                label="Nombre Completo"
                placeholder="Juan Pérez García"
                name="nombreAdmin"
                value={formData.nombreAdmin}
                onChange={handleChange}
                required
              />

              <Input
                label="Email"
                type="email"
                placeholder="admin@bufete.com"
                name="emailAdmin"
                value={formData.emailAdmin}
                onChange={handleChange}
                required
              />

              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                name="passwordAdmin"
                value={formData.passwordAdmin}
                onChange={handleChange}
                required
              />

              <Input
                label="Confirmar Contraseña"
                type="password"
                placeholder="••••••••"
                name="confirmarPassword"
                value={formData.confirmarPassword}
                onChange={handleChange}
                required
              />
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
            >
              Crear Cuenta
            </Button>

            <p className="text-center text-sm text-slate-600">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-primary-700 hover:text-primary-800 font-medium">
                Inicia sesión
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
