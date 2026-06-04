import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Evento } from '@/types'
import { formatDate } from '@/lib/utils'
import api from '@/lib/axios'
import { Calendar, Users, FileText, Bell, Loader } from 'lucide-react'

interface CaseTimelineProps {
  caseId: string
}

export function CaseTimeline({ caseId }: CaseTimelineProps) {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchEventos()
  }, [caseId])

  const fetchEventos = async () => {
    setIsLoading(true)
    try {
      // Timeline router is mounted at /api/v1 with route /{case_id}/timeline
      const response = await api.get(`/${caseId}/timeline`)
      setEventos(response.data.data || [])
    } catch (error) {
      console.error('Error fetching eventos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const EVENT_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
    audiencia:           { label: 'Audiencia',       color: 'info',      Icon: Calendar },
    reunion:             { label: 'Reunión',          color: 'secondary', Icon: Users    },
    documento:           { label: 'Documento',        color: 'default',   Icon: FileText },
    notificacion:        { label: 'Notificación',     color: 'warning',   Icon: Bell     },
    proceso_iniciado:    { label: 'Proceso iniciado', color: 'info',      Icon: Calendar },
    proceso_completado:  { label: 'Proceso completado', color: 'success', Icon: Calendar },
    otro:                { label: 'Otro',             color: 'default',   Icon: FileText },
  }

  const getEventConfig = (tipo: string) =>
    EVENT_CONFIG[tipo] ?? { label: tipo, color: 'default', Icon: FileText }

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
        ) : eventos.length === 0 ? (
          <p className="text-slate-600 text-center py-8">No hay eventos registrados</p>
        ) : (
          <div className="space-y-4">
            {eventos.map((evento, index) => {
              const { label, color, Icon } = getEventConfig(evento.tipo)
              return (
                <div key={evento.id} className="flex gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-primary-100 p-2 rounded-full">
                      <Icon size={16} className="text-primary-700" />
                    </div>
                    {index < eventos.length - 1 && (
                      <div className="w-0.5 h-12 bg-slate-200"></div>
                    )}
                  </div>
                  <div className="pb-4 flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">{evento.titulo}</h4>
                      <Badge variant={color as any}>
                        {label}
                      </Badge>
                    </div>
                    {evento.descripcion && (
                      <p className="text-sm text-slate-600 mb-2">{evento.descripcion}</p>
                    )}
                    <p className="text-xs text-slate-500">
                      {formatDate(new Date(evento.fecha))}
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
