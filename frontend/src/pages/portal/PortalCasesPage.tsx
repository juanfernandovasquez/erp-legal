import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PortalLayout } from '@/components/portal/PortalLayout'
import portalApi from '@/lib/portalApi'

const STATUS_STYLE: Record<string, { bg: string; color: string; bar: string }> = {
  active:    { bg: '#eaf2fc', color: '#1a5ca8', bar: '#1a5ca8' },
  suspended: { bg: '#fef9e7', color: '#d68910', bar: '#d68910' },
  draft:     { bg: '#f1f5f9', color: '#475569', bar: '#94a3b8' },
  closed:    { bg: '#e8f7f0', color: '#1a9e5c', bar: '#1a9e5c' },
  archived:  { bg: '#f1f5f9', color: '#475569', bar: '#94a3b8' },
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

function CaseCard({ caso, onClick }: { caso: Case; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false)
  const st   = STATUS_STYLE[caso.estado] ?? { bg: '#f1f5f9', color: '#475569', bar: '#94a3b8' }
  const date = caso.openedDate
    ? new Date(caso.openedDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`bg-white border border-slate-200 rounded-xl mb-3 overflow-hidden cursor-pointer transition-all ${hovered ? 'shadow-md -translate-y-px' : 'shadow-sm'}`}
    >
      <div className="flex">
        {/* Colored left bar */}
        <div className="w-1 shrink-0" style={{ background: st.bar }} />
        {/* Content */}
        <div className="flex-1 px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-primary-700 text-sm mb-1">{caso.titulo}</p>
            <p className="text-xs text-slate-400">
              {caso.caseNumber} · {caso.tipoLabel}
              {date ? ` · Iniciado ${date}` : ''}
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
      </div>
    </div>
  )
}

export function PortalCasesPage() {
  const navigate       = useNavigate()
  const [cases, setCases]     = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const limit = 20

  useEffect(() => {
    setLoading(true)
    portalApi.get(`/client/cases?page=${page}&limit=${limit}`)
      .then(res => {
        setCases(res.data.data || [])
        setTotal(res.data.meta?.total ?? res.data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  const pages = Math.ceil(total / limit) || 1

  return (
    <PortalLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Historial completo
          </p>
          {total > 0 && (
            <p className="text-sm text-slate-500">
              {total} asunto{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">Cargando asuntos…</div>
      ) : cases.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
          <p className="text-3xl mb-3">⚖️</p>
          <p className="font-bold text-primary-700 mb-1">Sin asuntos registrados</p>
          <p className="text-sm text-slate-400">
            Cuando el estudio registre tus casos aparecerán aquí.
          </p>
        </div>
      ) : (
        cases.map(c => (
          <CaseCard
            key={c.id}
            caso={c}
            onClick={() => navigate(`/portal/asuntos/${c.id}`)}
          />
        ))
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm font-semibold text-primary-700 hover:text-primary-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-sm text-slate-400">{page} / {pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="text-sm font-semibold text-primary-700 hover:text-primary-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}
    </PortalLayout>
  )
}
