import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PortalLayout } from '@/components/portal/PortalLayout'
import { useClientPortalStore } from '@/stores/clientPortalStore'
import portalApi from '@/lib/portalApi'

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:    { bg: '#eaf2fc', color: '#1a5ca8' },
  suspended: { bg: '#fef9e7', color: '#d68910' },
  draft:     { bg: '#f1f5f9', color: '#475569' },
  closed:    { bg: '#e8f7f0', color: '#1a9e5c' },
  archived:  { bg: '#f1f5f9', color: '#475569' },
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

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold ${accent ? 'text-primary-700' : 'text-slate-700'}`}>
        {value}
      </p>
    </div>
  )
}

function CaseRow({
  caso, hasBorder, onClick,
}: {
  caso: Case; hasBorder: boolean; onClick: () => void
}) {
  const [hovered, setHovered] = React.useState(false)
  const st   = STATUS_STYLE[caso.estado] ?? { bg: '#f1f5f9', color: '#475569' }
  const date = caso.openedDate
    ? new Date(caso.openedDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex items-start justify-between gap-3 px-5 py-4 cursor-pointer transition-colors ${hasBorder ? 'border-b border-slate-100' : ''} ${hovered ? 'bg-slate-50' : 'bg-white'}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-primary-700 mb-0.5">{caso.titulo}</p>
        <p className="text-xs text-slate-400">
          {caso.caseNumber} · {caso.tipoLabel}
          {date ? ` · Desde ${date}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
          style={{ background: st.bg, color: st.color }}
        >
          {caso.estadoLabel}
        </span>
        <span className="text-slate-300 text-lg leading-none">›</span>
      </div>
    </div>
  )
}

export function PortalHomePage() {
  const navigate      = useNavigate()
  const { client }    = useClientPortalStore()
  const [cases, setCases]     = useState<Case[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    portalApi.get('/client/cases?limit=5')
      .then(res => {
        setCases(res.data.data || [])
        setTotal(res.data.meta?.total ?? res.data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const activeCases = cases.filter(c => c.estado === 'active').length
  const closedCases = cases.filter(c => c.estado === 'closed' || c.estado === 'archived').length

  return (
    <PortalLayout>
      {/* Welcome banner — gradient del ERP */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-800 border-l-4 border-gold-400 rounded-xl px-6 py-5 mb-6 flex items-center gap-4">
        <span className="text-2xl shrink-0">⚖️</span>
        <div>
          <p className="text-white font-bold text-base">
            {client?.nombre ? `Bienvenido, ${client.nombre}` : 'Bienvenido'}
          </p>
          <p className="text-primary-200 text-sm mt-0.5">
            Portal de seguimiento legal · RUC {client?.ruc}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Asuntos activos"  value={loading ? '—' : activeCases} accent />
        <StatCard label="Total de asuntos" value={loading ? '—' : total} />
        <StatCard label="Cerrados"         value={loading ? '—' : closedCases} />
      </div>

      {/* Recent cases */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="font-bold text-primary-700">⚖️ Mis Asuntos recientes</p>
          <button
            onClick={() => navigate('/portal/asuntos')}
            className="text-sm font-semibold text-gold-600 hover:text-gold-700 transition-colors"
          >
            Ver todos →
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Cargando…</div>
        ) : cases.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No hay asuntos registrados aún.
          </div>
        ) : (
          cases.map((c, idx) => (
            <CaseRow
              key={c.id}
              caso={c}
              hasBorder={idx < cases.length - 1}
              onClick={() => navigate(`/portal/asuntos/${c.id}`)}
            />
          ))
        )}
      </div>
    </PortalLayout>
  )
}
