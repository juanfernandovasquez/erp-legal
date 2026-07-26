import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PortalLayout } from '@/components/portal/PortalLayout'
import { useClientPortalStore } from '@/stores/clientPortalStore'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Briefcase, ChevronRight } from 'lucide-react'
import portalApi from '@/lib/portalApi'

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
  suspended: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-blue-100 text-blue-600',
  archived: 'bg-slate-100 text-slate-500',
}

interface Case {
  id: string
  caseNumber: string
  titulo: string
  estado: string
  estadoLabel: string
  tipoLabel: string
  openedDate: string | null
}

export function PortalHomePage() {
  const navigate = useNavigate()
  const { client } = useClientPortalStore()
  const [cases, setCases] = useState<Case[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    portalApi
      .get('/client/cases?limit=5')
      .then((res) => {
        setCases(res.data.data || [])
        setTotal(res.data.meta?.total ?? res.data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const activeCases = cases.filter((c) => c.estado === 'active').length

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bienvenido{client?.nombre ? `, ${client.nombre.split(' ')[0]}` : ''}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            RUC {client?.ruc} — Portal de seguimiento legal
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Asuntos activos</p>
            <p className="text-3xl font-bold text-primary-700 mt-1">{isLoading ? '—' : activeCases}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total de asuntos</p>
            <p className="text-3xl font-bold text-slate-700 mt-1">{isLoading ? '—' : total}</p>
          </div>
        </div>

        {/* Recent cases */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Asuntos recientes</h2>
            <button
              onClick={() => navigate('/portal/asuntos')}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              Ver todos →
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner inline />
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Briefcase size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No hay asuntos registrados aún.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cases.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => navigate(`/portal/asuntos/${c.id}`)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{c.titulo}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {c.caseNumber} · {c.tipoLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[c.estado] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {c.estadoLabel}
                      </span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
