import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PortalLayout } from '@/components/portal/PortalLayout'
import { ArrowLeft } from 'lucide-react'
import portalApi from '@/lib/portalApi'

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:    { bg: '#dcfce7', color: '#166534' },
  suspended: { bg: '#fef9c3', color: '#854d0e' },
  draft:     { bg: '#f1f5f9', color: '#1e293b' },
  closed:    { bg: '#f3e8ff', color: '#6b21a8' },
  archived:  { bg: '#f1f5f9', color: '#1e293b' },
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-primary-700 text-sm">
        {title}
      </div>
      <div className="px-5 py-4">
        {children}
      </div>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-24 shrink-0 pt-0.5">
        {label}
      </p>
      <p className="text-sm font-medium text-slate-700 flex-1">{value}</p>
    </div>
  )
}

export function PortalCaseDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [caso, setCaso]             = useState<CaseDetail | null>(null)
  const [timeline, setTimeline]     = useState<TimelineItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [tlLoading, setTlLoading]   = useState(true)

  useEffect(() => {
    if (!id) return
    portalApi.get(`/client/cases/${id}`)
      .then(res => setCaso(res.data.data))
      .catch(() => navigate('/portal/procesos'))
      .finally(() => setLoading(false))

    portalApi.get(`/client/cases/${id}/timeline`)
      .then(res => setTimeline(res.data.data || []))
      .catch(() => {})
      .finally(() => setTlLoading(false))
  }, [id])

  if (loading) {
    return (
      <PortalLayout>
        <div className="py-20 text-center text-sm text-slate-400">Cargando…</div>
      </PortalLayout>
    )
  }
  if (!caso) return null

  const st           = STATUS_STYLE[caso.estado] ?? { bg: '#f1f5f9', color: '#475569' }
  const hasCourtInfo = !!(caso.courtName || caso.judgeName)
  const hasParties   = !!(caso.plaintiff || caso.defendant)

  return (
    <PortalLayout>
      {/* Back button */}
      <button
        onClick={() => navigate('/portal/procesos')}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-primary-700 mb-4 transition-colors"
      >
        <ArrowLeft size={15} /> Mis Procesos
      </button>

      {/* Case header */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            {caso.caseNumber} · {caso.tipoLabel}
          </p>
          <h1 className="text-xl font-bold text-primary-700 leading-tight">{caso.titulo}</h1>
          {caso.descripcion && (
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{caso.descripcion}</p>
          )}
        </div>
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap shrink-0"
          style={{ background: st.bg, color: st.color }}
        >
          {caso.estadoLabel}
        </span>
      </div>

      {/* Info grid */}
      <div className={`grid gap-4 mb-4 ${hasCourtInfo ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <SectionCard title="📅 Fechas">
          <DataRow label="Inicio"  value={fmt(caso.openedDate)} />
          {caso.closedDate && <DataRow label="Cierre" value={fmt(caso.closedDate)} />}
        </SectionCard>

        {hasCourtInfo && (
          <SectionCard title="🏛️ Juzgado">
            <DataRow label="Juzgado"  value={caso.courtName} />
            <DataRow label="Sede"     value={caso.courtLocation} />
            <DataRow label="Juez"     value={caso.judgeName} />
          </SectionCard>
        )}
      </div>

      {/* Parties */}
      {hasParties && (
        <div className="mb-4">
          <SectionCard title="👤 Partes">
            <div className="grid grid-cols-2 gap-4">
              {caso.plaintiff && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Demandante</p>
                  <p className="text-sm font-semibold text-slate-700">{caso.plaintiff}</p>
                </div>
              )}
              {caso.defendant && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Demandado</p>
                  <p className="text-sm font-semibold text-slate-700">{caso.defendant}</p>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Team */}
      {caso.team.length > 0 && (
        <div className="mb-4">
          <SectionCard title="👥 Equipo asignado">
            <div className="space-y-3">
              {caso.team.map((m, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {m.nombre.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary-700">{m.nombre}</p>
                      <p className="text-xs text-slate-400">{m.rol}</p>
                    </div>
                  </div>
                  {m.esLider && (
                    <span className="text-xs font-semibold bg-gold-100 text-gold-700 px-2.5 py-0.5 rounded-full">
                      Responsable
                    </span>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-primary-700 text-sm">
          🕐 Línea de tiempo
        </div>

        {tlLoading ? (
          <div className="py-10 text-center text-sm text-slate-400">Cargando…</div>
        ) : timeline.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Sin eventos registrados aún.
          </div>
        ) : (
          <div className="px-5 py-4">
            {timeline.map((item, idx) => {
              const isEvento = item.tipo === 'evento'
              const dotColor = item.isCompleted === true
                ? '#1a9e5c'
                : isEvento ? '#1e35a3' : '#b07d2f'
              const isLast   = idx === timeline.length - 1

              return (
                <div key={item.id} className="flex gap-3" style={{ marginBottom: isLast ? 0 : 8 }}>
                  {/* Dot + line */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                      style={{ background: dotColor, boxShadow: `0 0 0 3px ${dotColor}22` }}
                    />
                    {!isLast && (
                      <div className="w-px flex-1 bg-slate-200 mt-1 min-h-[20px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 ${isLast ? '' : 'pb-3'}`}>
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-primary-700 flex-1">{item.titulo}</p>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                        style={{
                          background: isEvento ? '#eaf2fc' : '#fdf6e8',
                          color:      isEvento ? '#1a5ca8' : '#b07d2f',
                        }}
                      >
                        {item.tipoLabel}
                      </span>
                    </div>
                    {item.descripcion && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.descripcion}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                      {item.fecha && <span>{fmt(item.fecha)}</span>}
                      {item.location && <span>· 📍 {item.location}</span>}
                      {item.isCompleted === true && (
                        <span className="text-green-600 font-semibold">· ✓ Completado</span>
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
