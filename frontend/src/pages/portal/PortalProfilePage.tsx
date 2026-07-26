import React, { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/portal/PortalLayout'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Phone, Mail, MapPin, Building2, Hash } from 'lucide-react'
import portalApi from '@/lib/portalApi'

const CLIENT_TYPE_LABELS: Record<string, string> = {
  individual: 'Persona natural',
  business: 'Empresa',
  government: 'Entidad pública',
  non_profit: 'ONG / Sin fines de lucro',
  other: 'Otro',
}

interface ProfileData {
  id: string
  nombre: string
  ruc: string
  email: string | null
  phone: string | null
  clientType: string
  organizationName: string | null
  streetAddress: string | null
  city: string | null
  state: string | null
  country: string | null
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <Icon size={16} className="text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export function PortalProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    portalApi
      .get('/client/me')
      .then((res) => setProfile(res.data.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <PortalLayout>
        <div className="flex justify-center py-20">
          <LoadingSpinner inline />
        </div>
      </PortalLayout>
    )
  }

  if (!profile) return null

  const address = [profile.streetAddress, profile.city, profile.state, profile.country]
    .filter(Boolean)
    .join(', ')

  return (
    <PortalLayout>
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-slate-900">Mi Perfil</h1>

        {/* Avatar + name */}
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold shrink-0">
            {profile.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-lg">{profile.nombre}</p>
            <p className="text-sm text-slate-500">
              {CLIENT_TYPE_LABELS[profile.clientType] ?? profile.clientType}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-2">
          <InfoRow icon={Hash} label="RUC" value={profile.ruc} />
          <InfoRow icon={Mail} label="Correo electrónico" value={profile.email} />
          <InfoRow icon={Phone} label="Teléfono" value={profile.phone} />
          <InfoRow icon={Building2} label="Razón social" value={profile.organizationName} />
          <InfoRow icon={MapPin} label="Dirección" value={address || null} />
        </div>

        <p className="text-xs text-slate-400 text-center px-4">
          Para actualizar tus datos, contacta a tu abogado responsable.
        </p>
      </div>
    </PortalLayout>
  )
}
