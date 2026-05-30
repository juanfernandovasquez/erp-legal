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

  const getEventIcon = (tipo: string) => {
    const icons: Record<string, any> = {
      audiencia: Calendar,
      reunion: Users,
      documento: FileText,
      notificacion: Bell,
      otro: FileText,
    }
    return icons[tipo] || FileText
  }

  const getEventColor = (tipo: string) => {
    const colors: Record<string, string> = {
      audiencia: 'info',
      reunion: 'secondary',
      documento: 'default',
      notificacion: 'warning',
      otro: 'default',
    }
    return colors[tipo] || 'default'
  }

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
              const Icon = getEventIcon(evento.tipo)
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
                      <Badge variant={getEventColor(evento.tipo) as any}>
                        {evento.tipo}
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
