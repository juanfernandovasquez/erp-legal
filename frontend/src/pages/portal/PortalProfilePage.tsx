import React, { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/portal/PortalLayout'
import portalApi from '@/lib/portalApi'

const CLIENT_TYPE_LABELS: Record<string, string> = {
  individual: 'Persona natural',
  business:   'Empresa',
  government: 'Entidad pública',
  non_profit: 'ONG / Sin fines de lucro',
  other:      'Otro',
}

interface ProfileData {
  id: string; nombre: string; ruc: string
  email: string | null; phone: string | null
  clientType: string; organizationName: string | null
  streetAddress: string | null; city: string | null
  state: string | null; country: string | null
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('')
}

function ProfileRow({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  if (!value) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 20px', borderBottom: '1px solid #e2e8f5',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'rgba(6,24,109,.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#7b8aa0' }}>
          {label}
        </p>
        <p style={{ fontSize: 12.5, fontWeight: 600, color: '#06186d', marginTop: 1 }}>
          {value}
        </p>
      </div>
    </div>
  )
}

export function PortalProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    portalApi.get('/client/me')
      .then(res => setProfile(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <PortalLayout>
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#7b8aa0', fontSize: 13 }}>
          Cargando…
        </div>
      </PortalLayout>
    )
  }

  if (!profile) return null

  const initials  = getInitials(profile.nombre)
  const typeLabel = CLIENT_TYPE_LABELS[profile.clientType] ?? profile.clientType
  const address   = [profile.streetAddress, profile.city, profile.state, profile.country]
    .filter(Boolean).join(', ')

  return (
    <PortalLayout>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 18, alignItems: 'start' }}>
        {/* Left — data sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Personal data */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f5',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid #e2e8f5',
              fontSize: 13, fontWeight: 800, color: '#06186d',
            }}>
              👤 Datos de contacto
            </div>
            <div>
              <ProfileRow icon="🆔" label="RUC"               value={profile.ruc} />
              <ProfileRow icon="✉️" label="Correo electrónico" value={profile.email} />
              <ProfileRow icon="📱" label="Teléfono"           value={profile.phone} />
            </div>
          </div>

          {/* Company data */}
          {(profile.organizationName || address) && (
            <div style={{
              background: '#fff', border: '1px solid #e2e8f5',
              borderRadius: 12, overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid #e2e8f5',
                fontSize: 13, fontWeight: 800, color: '#06186d',
              }}>
                🏢 Datos de empresa
              </div>
              <div>
                <ProfileRow icon="🏢" label="Razón social" value={profile.organizationName} />
                <ProfileRow icon="📍" label="Dirección"    value={address || null} />
              </div>
            </div>
          )}

          {/* Note */}
          <div style={{
            background: 'rgba(176,125,47,.06)', border: '1px solid rgba(176,125,47,.2)',
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
            <p style={{ fontSize: 12, color: '#5a6a7e', fontWeight: 500, lineHeight: 1.5 }}>
              Tus datos son gestionados por el estudio legal. Para actualizarlos, contacta a tu abogado responsable.
            </p>
          </div>
        </div>

        {/* Right — avatar card */}
        <div>
          <div style={{
            background: '#fff', border: '1px solid #e2e8f5',
            borderRadius: 12, padding: '24px 20px', textAlign: 'center',
          }}>
            {/* Avatar */}
            <div style={{
              width: 70, height: 70, borderRadius: '50%',
              background: '#06186d', color: '#d4a355',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 900,
              margin: '0 auto 14px',
            }}>
              {initials}
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#06186d', marginBottom: 4 }}>
              {profile.nombre}
            </p>
            {profile.organizationName && (
              <p style={{ fontSize: 12, color: '#7b8aa0', fontWeight: 500, marginBottom: 4 }}>
                {profile.organizationName}
              </p>
            )}
            <span style={{
              display: 'inline-block', marginTop: 6,
              fontSize: 11, fontWeight: 700,
              background: '#eaf2fc', color: '#1a5ca8',
              padding: '3px 10px', borderRadius: 20,
            }}>
              {typeLabel}
            </span>
          </div>

          {/* Portal access info */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f5',
            borderRadius: 12, padding: '16px 20px', marginTop: 12,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#7b8aa0', marginBottom: 10 }}>
              Acceso al portal
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#1a9e5c', flexShrink: 0,
              }} />
              <p style={{ fontSize: 12, fontWeight: 600, color: '#1a9e5c' }}>Acceso activo</p>
            </div>
            <p style={{ fontSize: 11, color: '#7b8aa0', fontWeight: 500, marginTop: 6, lineHeight: 1.4 }}>
              Ingreso con tu RUC y contraseña configurada por el estudio.
            </p>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
