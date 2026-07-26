import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PortalLayout } from '@/components/portal/PortalLayout'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ArrowLeft, Users, Calendar, MapPin, Clock, CheckCircle } from 'lucide-react'
import portalApi from '@/lib/portalApi'

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
  suspended: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-blue-100 text-blue-600',
  archived: 'bg-slate-100 text-slate-500',
}

const TIMELINE_TYPE_COLOR: Record<string, string> = {
  evento: 'bg-primary-100 text-primary-700',
  actualizacion: 'bg-amber-100 text-amber-700',
}

interface CaseDetail {
  id: string
  caseNumber: string
  titulo: string
  descripcion: string | null
  estado: string
  estadoLabel: string
  tipoLabel: string
  openedDate: string | null
  closedDate: string | null
  courtName: string | null
  courtLocation: string | null
  judgeName: string | null
  plaintiff: string | null
  defendant: string | null
  team: { nombre: string; rol: string; esLider: boolean }[]
}

interface TimelineItem {
  id: string
  tipo: 'evento' | 'actualizacion'
  tipoLabel: string
  titulo: string
  descripcion: string | null
  fecha: string | null
  location: string | null
  isCompleted: boolean | null
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PortalCaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [caso, setCaso] = useState<CaseDetail | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timelineLoading, setTimelineLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    portalApi
      .get(`/client/cases/${id}`)
      .then((res) => setCaso(res.data.data))
      .catch(() => navigate('/portal/asuntos'))
      .finally(() => setIsLoading(false))

    portalApi
      .get(`/client/cases/${id}/timeline`)
      .then((res) => setTimeline(res.data.data || []))
      .catch(() => {})
      .finally(() => setTimelineLoading(false))
  }, [id])

  if (isLoading) {
    return (
      <PortalLayout>
        <div className="flex justify-center py-20">
          <LoadingSpinner inline />
        </div>
      </PortalLayout>
    )
  }

  if (!caso) return null

  return (
    <PortalLayout>
      <div className="space-y-5">
        {/* Back + header */}
        <div>
          <button
            onClick={() => navigate('/portal/asuntos')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-3 transition-colors"
          >
            <ArrowLeft size={15} />
            Mis Asuntos
          </button>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{caso.titulo}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {caso.caseNumber} · {caso.tipoLabel}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 mt-0.5 ${STATUS_COLOR[caso.estado] ?? 'bg-slate-100 text-slate-600'}`}
            >
              {caso.estadoLabel}
            </span>
          </div>
        </div>

        {/* Description */}
        {caso.descripcion && (
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-sm text-slate-600 leading-relaxed">{caso.descripcion}</p>
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dates */}
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fechas</h3>
            <div className="flex items-start gap-2 text-sm">
              <Calendar size={15} className="text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-500">Inicio: </span>
                <span className="text-slate-800 font-medium">{formatDate(caso.openedDate)}</span>
              </div>
            </div>
            {caso.closedDate && (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle size={15} className="text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500">Cierre: </span>
                  <span className="text-slate-800 font-medium">{formatDate(caso.closedDate)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Court info */}
          {(caso.courtName || caso.judgeName) && (
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Juzgado</h3>
              {caso.courtName && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin size={15} className="text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-slate-800">{caso.courtName}</span>
                </div>
              )}
              {caso.courtLocation && (
                <p className="text-xs text-slate-500 ml-5">{caso.courtLocation}</p>
              )}
              {caso.judgeName && (
                <p className="text-sm text-slate-600 ml-5">
                  <span className="text-slate-400">Juez: </span>{caso.judgeName}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Team */}
        {caso.team.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users size={13} /> Equipo asignado
            </h3>
            <div className="space-y-2">
              {caso.team.map((m, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                      {m.nombre.charAt(0)}
                    </div>
                    <span className="text-sm text-slate-800">{m.nombre}</span>
                    {m.esLider && (
                      <span className="text-xs bg-gold-100 text-gold-700 px-1.5 py-0.5 rounded font-medium">
                        Responsable
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{m.rol}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              Línea de tiempo
            </h3>
          </div>

          {timelineLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner inline />
            </div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">
              Sin eventos registrados aún.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {timeline.map((item) => (
                <li key={item.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${TIMELINE_TYPE_COLOR[item.tipo] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {item.tipoLabel}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{item.titulo}</p>
                      {item.descripcion && (
                        <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{item.descripcion}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        {item.fecha && <span>{formatDateTime(item.fecha)}</span>}
                        {item.location && <span>· {item.location}</span>}
                        {item.isCompleted === true && (
                          <span className="text-green-600 font-medium">· Completado</span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
