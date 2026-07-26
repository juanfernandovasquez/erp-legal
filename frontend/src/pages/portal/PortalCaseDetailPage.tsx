import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PortalLayout } from '@/components/portal/PortalLayout'
import { ArrowLeft } from 'lucide-react'
import portalApi from '@/lib/portalApi'

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:    { bg: '#eaf2fc', color: '#1a5ca8' },
  suspended: { bg: '#fef9e7', color: '#d68910' },
  draft:     { bg: '#f0f0f4', color: '#5a6a7e' },
  closed:    { bg: '#e8f7f0', color: '#1a9e5c' },
  archived:  { bg: '#f0f0f4', color: '#5a6a7e' },
}

interface CaseDetail {
  id: string; caseNumber: string; titulo: string; descripcion: string | null
  estado: string; estadoLabel: string; tipoLabel: string
  openedDate: string | null; closedDate: string | null
  courtName: string | null; courtLocation: string | null
  judgeName: string | null; plaintiff: string | null; defendant: string | null
  team: { nombre: string; rol: string; esLider: boolean }[]
}

interface TimelineItem {
  id: string; tipo: 'evento' | 'actualizacion'; tipoLabel: string
  titulo: string; descripcion: string | null
  fecha: string | null; location: string | null; isCompleted: boolean | null
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f5',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{
        padding: '13px 20px', borderBottom: '1px solid #e2e8f5',
        fontSize: 13, fontWeight: 800, color: '#06186d',
      }}>
        {title}
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div style={{
      display: 'flex', gap: 8,
      paddingBottom: 10, marginBottom: 10,
      borderBottom: '1px solid #f0f2f7',
    }}>
      <p style={{ fontSize: 10.5, fontWeight: 700, color: '#7b8aa0', textTransform: 'uppercase', letterSpacing: '.5px', width: 100, flexShrink: 0, paddingTop: 1 }}>
        {label}
      </p>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#2b2b2b', flex: 1 }}>{value}</p>
    </div>
  )
}

export function PortalCaseDetailPage() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const [caso, setCaso]         = useState<CaseDetail | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [tlLoading, setTlLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    portalApi.get(`/client/cases/${id}`)
      .then(res => setCaso(res.data.data))
      .catch(() => navigate('/portal/asuntos'))
      .finally(() => setLoading(false))

    portalApi.get(`/client/cases/${id}/timeline`)
      .then(res => setTimeline(res.data.data || []))
      .catch(() => {})
      .finally(() => setTlLoading(false))
  }, [id])

  if (loading) {
    return (
      <PortalLayout>
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#7b8aa0' }}>
          Cargando…
        </div>
      </PortalLayout>
    )
  }

  if (!caso) return null

  const st = STATUS_STYLE[caso.estado] ?? { bg: '#f0f0f4', color: '#5a6a7e' }
  const hasCourtInfo = !!(caso.courtName || caso.judgeName)
  const hasParties   = !!(caso.plaintiff || caso.defendant)

  return (
    <PortalLayout>
      {/* Back */}
      <button
        onClick={() => navigate('/portal/asuntos')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 600, color: '#7b8aa0',
          background: 'none', border: 'none', cursor: 'pointer',
          marginBottom: 16, padding: 0, fontFamily: 'inherit',
        }}
      >
        <ArrowLeft size={15} /> Mis Asuntos
      </button>

      {/* Case header */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f5', borderRadius: 12,
        padding: '20px 24px', marginBottom: 16,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#7b8aa0', marginBottom: 6 }}>
            {caso.caseNumber} · {caso.tipoLabel}
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#06186d', lineHeight: 1.2, marginBottom: 0 }}>
            {caso.titulo}
          </h1>
          {caso.descripcion && (
            <p style={{ fontSize: 13, color: '#5a6a7e', marginTop: 10, lineHeight: 1.6, fontWeight: 500 }}>
              {caso.descripcion}
            </p>
          )}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700,
          padding: '5px 12px', borderRadius: 20,
          background: st.bg, color: st.color,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {caso.estadoLabel}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: hasCourtInfo ? '1fr 1fr' : '1fr', gap: 14, marginBottom: 16 }}>
        {/* Dates */}
        <InfoCard title="📅 Fechas">
          <InfoRow label="Inicio"  value={fmt(caso.openedDate)} />
          {caso.closedDate && <InfoRow label="Cierre" value={fmt(caso.closedDate)} />}
        </InfoCard>

        {/* Court info */}
        {hasCourtInfo && (
          <InfoCard title="🏛️ Juzgado">
            {caso.courtName     && <InfoRow label="Juzgado"  value={caso.courtName} />}
            {caso.courtLocation && <InfoRow label="Sede"     value={caso.courtLocation} />}
            {caso.judgeName     && <InfoRow label="Juez"     value={caso.judgeName} />}
          </InfoCard>
        )}
      </div>

      {/* Parties */}
      {hasParties && (
        <InfoCard title="👤 Partes">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {caso.plaintiff && (
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#7b8aa0', marginBottom: 4 }}>Demandante</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#2b2b2b' }}>{caso.plaintiff}</p>
              </div>
            )}
            {caso.defendant && (
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#7b8aa0', marginBottom: 4 }}>Demandado</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#2b2b2b' }}>{caso.defendant}</p>
              </div>
            )}
          </div>
        </InfoCard>
      )}

      {/* Team */}
      {caso.team.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <InfoCard title="👥 Equipo asignado">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {caso.team.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: '#06186d', color: '#d4a355',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800, flexShrink: 0,
                    }}>
                      {m.nombre.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#06186d' }}>{m.nombre}</p>
                      <p style={{ fontSize: 11, color: '#7b8aa0', fontWeight: 500 }}>{m.rol}</p>
                    </div>
                  </div>
                  {m.esLider && (
                    <span style={{
                      fontSize: 10.5, fontWeight: 700,
                      background: '#f5e9d5', color: '#b07d2f',
                      padding: '3px 10px', borderRadius: 6,
                    }}>
                      Responsable
                    </span>
                  )}
                </div>
              ))}
            </div>
          </InfoCard>
        </div>
      )}

      {/* Timeline */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f5',
        borderRadius: 12, overflow: 'hidden', marginTop: 14,
      }}>
        <div style={{
          padding: '13px 20px', borderBottom: '1px solid #e2e8f5',
          fontSize: 13, fontWeight: 800, color: '#06186d',
        }}>
          🕐 Línea de tiempo
        </div>

        {tlLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7b8aa0', fontSize: 13 }}>
            Cargando…
          </div>
        ) : timeline.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#7b8aa0', fontSize: 13 }}>
            Sin eventos registrados aún.
          </div>
        ) : (
          <div style={{ padding: '16px 20px' }}>
            {timeline.map((item, idx) => {
              const isEvento = item.tipo === 'evento'
              const dotColor = item.isCompleted === true
                ? '#1a9e5c'
                : isEvento ? '#b07d2f' : '#1a5ca8'
              const isLast = idx === timeline.length - 1

              return (
                <div key={item.id} style={{ display: 'flex', gap: 12, marginBottom: isLast ? 0 : 10 }}>
                  {/* Dot + line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: dotColor, flexShrink: 0, marginTop: 3,
                      boxShadow: `0 0 0 3px ${dotColor}22`,
                    }} />
                    {!isLast && (
                      <div style={{
                        width: 1, flex: 1, background: '#e2e8f5',
                        minHeight: 20, marginTop: 3,
                      }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: '#06186d', flex: 1 }}>
                        {item.titulo}
                      </p>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 6,
                        background: isEvento ? '#eaf2fc' : '#f5e9d5',
                        color: isEvento ? '#1a5ca8' : '#b07d2f',
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        {item.tipoLabel}
                      </span>
                    </div>
                    {item.descripcion && (
                      <p style={{ fontSize: 12, color: '#5a6a7e', marginTop: 3, lineHeight: 1.5, fontWeight: 500 }}>
                        {item.descripcion}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                      {item.fecha && (
                        <span style={{ fontSize: 10.5, color: '#7b8aa0', fontWeight: 500 }}>
                          {fmtDt(item.fecha)}
                        </span>
                      )}
                      {item.location && (
                        <span style={{ fontSize: 10.5, color: '#7b8aa0', fontWeight: 500 }}>
                          · 📍 {item.location}
                        </span>
                      )}
                      {item.isCompleted === true && (
                        <span style={{ fontSize: 10.5, color: '#1a9e5c', fontWeight: 700 }}>
                          · ✓ Completado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
