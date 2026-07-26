import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PortalLayout } from '@/components/portal/PortalLayout'
import portalApi from '@/lib/portalApi'

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:    { bg: '#eaf2fc', color: '#1a5ca8' },
  suspended: { bg: '#fef9e7', color: '#d68910' },
  draft:     { bg: '#f0f0f4', color: '#5a6a7e' },
  closed:    { bg: '#e8f7f0', color: '#1a9e5c' },
  archived:  { bg: '#f0f0f4', color: '#5a6a7e' },
}

const STATUS_BAR: Record<string, string> = {
  active:    '#1a5ca8',
  suspended: '#d68910',
  draft:     '#94a3b8',
  closed:    '#1a9e5c',
  archived:  '#94a3b8',
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
  const st  = STATUS_STYLE[caso.estado] ?? { bg: '#f0f0f4', color: '#5a6a7e' }
  const bar = STATUS_BAR[caso.estado] ?? '#94a3b8'
  const date = caso.openedDate
    ? new Date(caso.openedDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: '1px solid #e2e8f5',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: hovered ? '0 4px 14px rgba(6,24,109,.08)' : '0 1px 3px rgba(0,0,0,.04)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'box-shadow .15s, transform .15s',
      }}
    >
      <div style={{ display: 'flex' }}>
        {/* Status bar */}
        <div style={{ width: 4, background: bar, flexShrink: 0 }} />

        {/* Content */}
        <div style={{
          flex: 1, padding: '16px 20px',
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#06186d', marginBottom: 4 }}>
              {caso.titulo}
            </p>
            <p style={{ fontSize: 11, color: '#7b8aa0', fontWeight: 500 }}>
              {caso.caseNumber} · {caso.tipoLabel}
              {date ? ` · Iniciado ${date}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{
              fontSize: 10.5, fontWeight: 700,
              padding: '3px 10px', borderRadius: 20,
              background: st.bg, color: st.color,
              whiteSpace: 'nowrap',
            }}>
              {caso.estadoLabel}
            </span>
            <span style={{ color: '#c8d3e0', fontSize: 18, lineHeight: 1 }}>›</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PortalCasesPage() {
  const navigate       = useNavigate()
  const [cases, setCases]   = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
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
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#7b8aa0', marginBottom: 4 }}>
            Historial completo
          </p>
          {total > 0 && (
            <p style={{ fontSize: 13, color: '#7b8aa0', fontWeight: 500 }}>
              {total} asunto{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7b8aa0', fontSize: 13 }}>
          Cargando asuntos…
        </div>
      ) : cases.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f5', borderRadius: 12,
          textAlign: 'center', padding: '60px 20px', color: '#7b8aa0',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚖️</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#06186d', marginBottom: 4 }}>
            Sin asuntos registrados
          </p>
          <p style={{ fontSize: 12, fontWeight: 500 }}>
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              fontSize: 13, fontWeight: 700, color: page === 1 ? '#c8d3e0' : '#06186d',
              background: 'none', border: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: 13, color: '#7b8aa0', fontWeight: 500 }}>
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            style={{
              fontSize: 13, fontWeight: 700, color: page === pages ? '#c8d3e0' : '#06186d',
              background: 'none', border: 'none', cursor: page === pages ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Siguiente →
          </button>
        </div>
      )}
    </PortalLayout>
  )
}
