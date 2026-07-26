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
    <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">{value}</p>
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
        <div className="py-20 text-center text-sm text-slate-400">Cargando…</div>
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
      <div className="grid grid-cols-[1fr_250px] gap-5 items-start">
        {/* Left — data sections */}
        <div className="space-y-4">
          {/* Contact data */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-primary-700 text-sm">
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
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-primary-700 text-sm">
                🏢 Datos de empresa
              </div>
              <div>
                <ProfileRow icon="🏢" label="Razón social" value={profile.organizationName} />
                <ProfileRow icon="📍" label="Dirección"    value={address || null} />
              </div>
            </div>
          )}

          {/* Info note */}
          <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 flex gap-3">
            <span className="text-base shrink-0">ℹ️</span>
            <p className="text-xs text-primary-700 font-medium leading-relaxed">
              Tus datos son gestionados por el estudio legal. Para actualizarlos, contacta a tu abogado responsable.
            </p>
          </div>
        </div>

        {/* Right — avatar card */}
        <div className="space-y-4">
          {/* Avatar card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-700 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3">
              {initials}
            </div>
            <p className="font-bold text-primary-700 text-base">{profile.nombre}</p>
            {profile.organizationName && (
              <p className="text-sm text-slate-500 mt-1">{profile.organizationName}</p>
            )}
            <span className="inline-block mt-3 text-xs font-semibold bg-primary-100 text-primary-700 px-3 py-1 rounded-full">
              {typeLabel}
            </span>
          </div>

          {/* Access status */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Acceso al portal
            </p>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <p className="text-sm font-semibold text-green-700">Acceso activo</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ingreso con tu RUC y contraseña configurada por el estudio.
            </p>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
