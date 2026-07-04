import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import api from '@/lib/axios'

type State = 'loading' | 'success' | 'error'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const [state, setState] = useState<State>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setState('error')
      setMessage('Token de verificación no encontrado en el enlace.')
      return
    }

    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setMessage(res.data.data?.message || 'Correo verificado correctamente.')
        setState('success')
      })
      .catch((err) => {
        setMessage(err.response?.data?.detail || 'El enlace es inválido o ha expirado.')
        setState('error')
      })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center">
          {state === 'loading' && (
            <>
              <Loader size={40} className="mx-auto mb-4 text-slate-400 animate-spin" />
              <p className="text-slate-600">Verificando tu correo...</p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Correo confirmado!</h2>
              <p className="text-slate-600 mb-6">{message}</p>
              <Link
                to="/login"
                className="inline-block bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-800 transition-colors"
              >
                Iniciar sesión
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle size={32} className="text-red-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Enlace inválido</h2>
              <p className="text-slate-500 mb-6">{message}</p>
              <Link to="/login" className="text-primary-700 hover:text-primary-800 font-medium text-sm">
                Volver al inicio de sesión
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
