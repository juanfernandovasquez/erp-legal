import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PortalLayout } from '@/components/portal/PortalLayout'
import { useClientPortalStore } from '@/stores/clientPortalStore'
import portalApi from '@/lib/portalApi'

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:    { bg: '#eaf2fc', color: '#1a5ca8' },
  suspended: { bg: '#fef9e7', color: '#d68910' },
  draft:     { bg: '#f0f0f4', color: '#5a6a7e' },
  closed:    { bg: '#e8f7f0', color: '#1a9e5c' },
  archived:  { bg: '#f0f0f4', color: '#5a6a7e' },
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
    <div style={{
      background: '#fff', border: '1px solid #e2e8f5', borderRadius: 12,
      padding: '18px 20px',
    }}>
      <p style={{
        fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '1px', color: '#7b8aa0', marginBottom: 8,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 30, fontWeight: 900, lineHeight: 1,
        color: accent ? '#06186d' : '#2b2b2b',
      }}>
        {value}
      </p>
    </div>
  )
}

export function PortalHomePage() {
  const navigate        = useNavigate()
  const { client }      = useClientPortalStore()
  const [cases, setCases]   = useState<Case[]>([])
  const [total, setTotal]   = useState(0)
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

  const firstName   = client?.nombre?.split(' ')[0] ?? ''
  const activeCases = cases.filter(c => c.estado === 'active').length
  const closedCases = cases.filter(c => c.estado === 'closed' || c.estado === 'archived').length

  return (
    <PortalLayout>
      {/* Welcome bar */}
      <div style={{
        background: 'linear-gradient(100deg, #071331 0%, #06186d 100%)',
        borderLeft: '4px solid #b07d2f',
        borderRadius: 11, padding: '18px 24px',
        marginBottom: 22,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 26, flexShrink: 0 }}>⚖️</div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
            Bienvenido{firstName ? `, ${firstName}` : ''}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 3, fontWeight: 500 }}>
            Portal de seguimiento legal · RUC {client?.ruc}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: 13, marginBottom: 22,
      }}>
        <StatCard label="Asuntos activos"  value={loading ? '—' : activeCases} accent />
        <StatCard label="Total de asuntos" value={loading ? '—' : total} />
        <StatCard label="Cerrados"         value={loading ? '—' : closedCases} />
      </div>

      {/* Recent cases */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f5',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {/* Card header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '15px 20px 12px', borderBottom: '1px solid #e2e8f5',
        }}>
          <p style={{ fontSize: 13.5, fontWeight: 800, color: '#06186d' }}>
            ⚖️&nbsp; Mis Asuntos recientes
          </p>
          <button
            onClick={() => navigate('/portal/asuntos')}
            style={{
              fontSize: 12, fontWeight: 700, color: '#b07d2f',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Ver todos →
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7b8aa0', fontSize: 13 }}>
            Cargando…
          </div>
        ) : cases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7b8aa0', fontSize: 13 }}>
            No hay asuntos registrados aún.
          </div>
        ) : (
          cases.map((c, idx) => {
            const st = STATUS_STYLE[c.estado] ?? { bg: '#f0f0f4', color: '#5a6a7e' }
            const date = c.openedDate
              ? new Date(c.openedDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
              : null
            return (
              <CaseRow
                key={c.id}
                caso={c}
                st={st}
                date={date}
                hasBorder={idx < cases.length - 1}
                onClick={() => navigate(`/portal/asuntos/${c.id}`)}
              />
            )
          })
        )}
      </div>
    </PortalLayout>
  )
}

function CaseRow({
  caso, st, date, hasBorder, onClick,
}: {
  caso: Case
  st: { bg: string; color: string }
  date: string | null
  hasBorder: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '15px 20px',
        borderBottom: hasBorder ? '1px solid #e2e8f5' : 'none',
        cursor: 'pointer',
        background: hovered ? '#f8f9fc' : '#fff',
        transition: 'background .1s',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: '#06186d', marginBottom: 3 }}>
          {caso.titulo}
        </p>
        <p style={{ fontSize: 11, color: '#7b8aa0', fontWeight: 500 }}>
          {caso.caseNumber} · {caso.tipoLabel}
          {date ? ` · Desde ${date}` : ''}
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
        <span style={{ color: '#c8d3e0', fontSize: 16 }}>›</span>
      </div>
    </div>
  )
}
