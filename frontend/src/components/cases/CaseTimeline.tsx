import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Evento, Tarea } from '@/types'
import { formatDate, getTaskStatusColor, getTaskStatusLabel } from '@/lib/utils'
import api from '@/lib/axios'
import { Calendar, Users, FileText, Bell, Loader, CheckSquare } from 'lucide-react'

interface CaseTimelineProps {
  caseId: string
}

interface TimelineItem {
  id: string
  fecha: string
  tipo: 'evento' | 'tarea'
  titulo: string
  descripcion?: string
  label: string
  color: string
  Icon: any
  estado?: string
}

export function CaseTimeline({ caseId }: CaseTimelineProps) {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [caseId])

  const fetchAll = async () => {
    setIsLoading(true)
    try {
      const [eventosRes, tareasRes] = await Promise.allSettled([
        api.get(`/${caseId}/timeline`),
        api.get(`/cases/${caseId}/tasks`),
      ])

      const eventos: Evento[] = eventosRes.status === 'fulfilled'
        ? (eventosRes.value.data.data || []) : []

      const tareas: Tarea[] = tareasRes.status === 'fulfilled'
        ? (tareasRes.value.data.data || []) : []

      // Map eventos to timeline items
      const eventoItems: TimelineItem[] = eventos.map((e) => {
        const cfg = EVENT_CONFIG[e.tipo] ?? { label: e.tipo, color: 'default', Icon: FileText }
        return {
          id: `evento-${e.id}`,
          fecha: e.fecha,
          tipo: 'evento',
          titulo: e.titulo,
          descripcion: e.descripcion,
          label: cfg.label,
          color: cfg.color,
          Icon: cfg.Icon,
        }
      })

      // Map tareas con fechaPresentacion to timeline items
      const tareaItems: TimelineItem[] = tareas
        .filter((t) => !!t.fechaPresentacion)
        .map((t) => ({
          id: `tarea-${t.id}`,
          fecha: t.fechaPresentacion,
          tipo: 'tarea' as const,
          titulo: t.titulo,
          descripcion: t.descripcion,
          label: 'Presentación',
          color: getTaskStatusColor(t.estado),
          Icon: CheckSquare,
          estado: t.estado,
        }))

      // Merge and sort by date ascending
      const merged = [...eventoItems, ...tareaItems].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      )

      setItems(merged)
    } catch (error) {
      console.error('Error fetching timeline:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const EVENT_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
    audiencia:           { label: 'Audiencia',          color: 'info',      Icon: Calendar },
    reunion:             { label: 'Reunión',             color: 'secondary', Icon: Users    },
    documento:           { label: 'Documento',           color: 'default',   Icon: FileText },
    notificacion:        { label: 'Notificación',        color: 'warning',   Icon: Bell     },
    proceso_iniciado:    { label: 'Proceso iniciado',    color: 'info',      Icon: Calendar },
    proceso_completado:  { label: 'Proceso completado',  color: 'success',   Icon: Calendar },
    otro:                { label: 'Otro',                color: 'default',   Icon: FileText },
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Línea de Tiempo</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader className="animate-spin text-primary-700" size={24} />
          </div>
        ) : items.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            No hay eventos ni tareas con fecha de presentación registrados.
          </p>
        ) : (
          <div className="space-y-0">
            {items.map((item, index) => {
              const isPast = new Date(item.fecha) < today
              const isToday = formatDate(new Date(item.fecha)) === formatDate(today)
              return (
                <div key={item.id} className="flex gap-4">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={`p-2 rounded-full flex-shrink-0 ${
                      isToday ? 'bg-yellow-100' :
                      isPast  ? 'bg-slate-100' : 'bg-primary-100'
                    }`}>
                      <item.Icon size={15} className={
                        isToday ? 'text-yellow-700' :
                        isPast  ? 'text-slate-400' : 'text-primary-700'
                      } />
                    </div>
                    {index < items.length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-200 my-1 min-h-[24px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-5 flex-1 pt-1 ${isPast && !isToday ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`text-sm font-semibold ${isToday ? 'text-yellow-700' : 'text-slate-900'}`}>
                        {item.titulo}
                      </span>
                      {item.tipo === 'tarea' && item.estado ? (
                        <Badge variant={getTaskStatusColor(item.estado) as any}>
                          {getTaskStatusLabel(item.estado)}
                        </Badge>
                      ) : (
                        <Badge variant={item.color as any}>{item.label}</Badge>
                      )}
                      {isToday && (
                        <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                          Hoy
                        </span>
                      )}
                    </div>
                    {item.descripcion && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.descripcion}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDate(new Date(item.fecha))}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
