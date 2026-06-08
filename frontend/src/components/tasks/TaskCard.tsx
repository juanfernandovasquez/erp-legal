import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Tarea } from '@/types'
import { formatDate, getPriorityColor, getPriorityLabel, getTaskStatusColor, getTaskStatusLabel } from '@/lib/utils'
import { Calendar, AlertCircle, Briefcase } from 'lucide-react'

interface TaskCardProps {
  task: Tarea
  onClick?: () => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const isOverdue = task.fechaVencimiento
    ? new Date(task.fechaVencimiento) < new Date() && task.estado !== 'completado' && task.estado !== 'done'
    : false

  return (
    <Card
      hover
      className="cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {task.casoTitulo && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Briefcase size={11} />
              <span className="truncate">{task.casoTitulo}</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900">{task.titulo}</h3>
            <Badge variant={getPriorityColor(task.prioridad) as any}>
              {getPriorityLabel(task.prioridad)}
            </Badge>
          </div>

          <p className="text-sm text-slate-600">{task.descripcion}</p>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2">
              {task.asignadoA ? (
                <>
                  <Avatar
                    initials={task.asignadoA.nombre
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()}
                    size="sm"
                  />
                  <span className="text-sm text-slate-700">{task.asignadoA.nombre}</span>
                </>
              ) : (
                <span className="text-sm text-slate-400 italic">Sin asignar</span>
              )}
            </div>
            <Badge variant={getTaskStatusColor(task.estado) as any}>
              {getTaskStatusLabel(task.estado)}
            </Badge>
          </div>

          {task.fechaVencimiento && (
            <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
              {isOverdue && <AlertCircle size={14} />}
              <Calendar size={14} />
              <span>{formatDate(task.fechaVencimiento)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
