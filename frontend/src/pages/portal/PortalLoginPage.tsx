import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientPortalStore } from '@/stores/clientPortalStore'

export function PortalLoginPage() {
  const navigate  = useNavigate()
  const { login, isLoading, error } = useClientPortalStore()
  const [ruc, setRuc]         = useState('')
  const [password, setPassword] = useState('')
  const [pwVisible, setPwVisible] = useState(false)

  useEffect(() => {
    if (!document.getElementById('portal-montserrat')) {
      const link = document.createElement('link')
      link.id   = 'portal-montserrat'
      link.rel  = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap'
      document.head.appendChild(link)
    }
  }, [])

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #071331 0%, #06186d 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Montserrat', 'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Decorative top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: 'linear-gradient(90deg, #b07d2f, #d4a355, #b07d2f)',
      }} />

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="https://kdbweb-media-2026.s3.us-east-1.amazonaws.com/logos/ee6dcaa184fa42dda843f207ced4f855_Recurso-2.png"
            alt="Katarzyna Legal"
            style={{ height: 48, objectFit: 'contain', display: 'inline-block', marginBottom: 12 }}
          />
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '2px',
            textTransform: 'uppercase', color: '#d4a355', marginTop: 4,
          }}>
            Legal &amp; Tributario
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,.35)',
          padding: '36px 36px 32px',
          border: '1px solid rgba(176,125,47,.15)',
        }}>
          {/* Card header */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#06186d', lineHeight: 1.1 }}>
              Portal del Cliente
            </p>
            <p style={{ fontSize: 13, color: '#7b8aa0', marginTop: 6, fontWeight: 500 }}>
              Ingresa con tu RUC y contraseña de acceso
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* RUC */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '.5px',
                color: '#7b8aa0', marginBottom: 6,
              }}>
                RUC
              </label>
              <input
                type="text"
                value={ruc}
                onChange={e => setRuc(e.target.value)}
                placeholder="20123456789"
                required
                autoComplete="username"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1.5px solid #e2e8f5', borderRadius: 8,
                  padding: '11px 14px', fontSize: 14, color: '#2b2b2b',
                  outline: 'none', fontFamily: 'inherit',
                  background: '#fff',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#06186d')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f5')}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '.5px',
                color: '#7b8aa0', marginBottom: 6,
              }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={pwVisible ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: '1.5px solid #e2e8f5', borderRadius: 8,
                    padding: '11px 40px 11px 14px', fontSize: 14, color: '#2b2b2b',
                    outline: 'none', fontFamily: 'inherit', background: '#fff',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#06186d')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f5')}
                />
                <button
                  type="button"
                  onClick={() => setPwVisible(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#7b8aa0', fontSize: 11, fontFamily: 'inherit', padding: 0,
                  }}
                >
                  {pwVisible ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: '#fdf0ee', border: '1px solid #f5c6c0',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: '#c0392b', fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '12px 0',
                background: isLoading ? '#8a9ad9' : '#06186d',
                color: '#fff', border: 'none', borderRadius: 9,
                fontSize: 14, fontWeight: 800, cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'background .15s',
                letterSpacing: '.3px',
              }}
            >
              {isLoading ? 'Verificando…' : 'Ingresar al portal →'}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p style={{
          textAlign: 'center', color: 'rgba(255,255,255,.35)',
          fontSize: 11, marginTop: 20, fontWeight: 500, lineHeight: 1.5,
        }}>
          ¿Problemas para ingresar?<br />
          Contacta a tu abogado responsable.
        </p>
      </div>
    </div>
  )
}
