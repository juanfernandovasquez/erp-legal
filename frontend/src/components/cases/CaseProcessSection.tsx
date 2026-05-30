import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { ProcessForm } from '@/components/cases/ProcessForm'
import { Proceso, Tarea } from '@/types'
import {
  ChevronDown, ChevronRight, Plus, Pencil, Trash2,
  CheckCircle2, Circle, Clock, XCircle,
} from 'lucide-react'
import api from '@/lib/axios'

// ── status helpers ────────────────────────────────────────────────────────────

type ProcesoEstado = Proceso['estado']

const ESTADO_CONFIG: Record<ProcesoEstado, {
  label: string
  variant: 'success' | 'info' | 'secondary' | 'danger' | 'warning'
  icon: React.ReactNode
  bar: string
}> = {
  pendiente:   { label: 'Pendiente',   variant: 'secondary', icon: <Circle size={13} />,       bar: 'bg-slate-300' },
  en_progreso: { label: 'En progreso', variant: 'info',      icon: <Clock size={13} />,        bar: 'bg-blue-400'  },
  completado:  { label: 'Completado',  variant: 'success',   icon: <CheckCircle2 size={13} />, bar: 'bg-green-400' },
  cancelado:   { label: 'Cancelado',   variant: 'danger',    icon: <XCircle size={13} />,      bar: 'bg-red-400'   },
}

interface Props {
  proceso: Proceso
  tareas: Tarea[]
  onProcesoUpdated: (p: Proceso) => void
  onProcesoDeleted: (id: string) => void
  onTareaCreated: (t: Tarea) => void
  onTareaClick: (t: Tarea) => void
  caseId: string
  defaultOpen?: boolean
}

export function CaseProcessSection({
  proceso,
  tareas,
  onProcesoUpdated,
  onProcesoDeleted,
  onTareaCreated,
  onTareaClick,
  caseId,
  defaultOpen = true,
}: Props) {
  const [open, setOpen]               = useState(defaultOpen)
  const [editingProcess, setEditingProcess] = useState(false)
  const [addingTask, setAddingTask]   = useState(false)
  const [deletingProcess, setDeletingProcess] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const cfg = ESTADO_CONFIG[proceso.estado] ?? ESTADO_CONFIG.pendiente

  const progress =
    proceso.totalTareas > 0
      ? Math.round((proceso.tareasCompletadas / proceso.totalTareas) * 100)
      : 0

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar el proceso "${proceso.titulo}"? Esta acción no se puede deshacer.`)) return
    setDeletingProcess(true)
    setDeleteError('')
    try {
      await api.delete(`/processes/${proceso.id}`)
      onProcesoDeleted(proceso.id)
    } catch (err: any) {
      setDeleteError(err?.response?.data?.detail || 'Error al eliminar el proceso')
      setDeletingProcess(false)
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">

      {/* Process header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Expand toggle */}
        <span className="text-slate-400 flex-shrink-0">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>

        {/* Color dot */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.bar}`} />

        {/* Title */}
        <h3 className="font-semibold text-slate-900 text-sm flex-1 truncate">
          {proceso.orden}. {proceso.titulo}
        </h3>

        {/* Task count + progress */}
        <span className="text-xs text-slate-500 flex-shrink-0">
          {proceso.tareasCompletadas}/{proceso.totalTareas} tareas
        </span>

        {/* Status badge */}
        <Badge variant={cfg.variant} className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {cfg.icon}
          {cfg.label}
        </Badge>

        {/* Actions (stop propagation so clicking them doesn't toggle expand) */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            title="Editar proceso"
            onClick={() => { setEditingProcess(true); setOpen(true) }}
            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            title="Eliminar proceso"
            onClick={handleDelete}
            disabled={deletingProcess}
            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {proceso.totalTareas > 0 && (
        <div className="h-1 bg-slate-100 w-full">
          <div
            className={`h-1 transition-all duration-500 ${cfg.bar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Expandable body */}
      {open && (
        <div className="px-4 py-4 border-t border-slate-100 space-y-4">

          {/* Edit process form */}
          {editingProcess && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Editar proceso</p>
              <ProcessForm
                caseId={caseId}
                proceso={proceso}
                onSuccess={(updated) => { onProcesoUpdated(updated); setEditingProcess(false) }}
                onCancel={() => setEditingProcess(false)}
              />
            </div>
          )}

          {deleteError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {deleteError}
            </p>
          )}

          {/* Description */}
          {proceso.descripcion && (
            <p className="text-sm text-slate-500 italic">{proceso.descripcion}</p>
          )}

          {/* Task cards */}
          {tareas.length === 0 && !addingTask ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              Sin tareas en este proceso.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tareas.map((t) => (
                <TaskCard key={t.id} task={t} onClick={() => onTareaClick(t)} />
              ))}
            </div>
          )}

          {/* Add task form */}
          {addingTask && (
            <div className="border border-blue-100 rounded-lg p-4 bg-blue-50/40">
              <TaskForm
                caseId={caseId}
                processId={proceso.id}
                onSuccess={(nueva) => {
                  onTareaCreated(nueva)
                  setAddingTask(false)
                }}
              />
            </div>
          )}

          {/* Nueva tarea button */}
          {proceso.estado !== 'completado' && proceso.estado !== 'cancelado' && (
            <button
              onClick={() => setAddingTask((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors mt-1"
            >
              <Plus size={14} />
              {addingTask ? 'Cancelar' : 'Nueva tarea en este proceso'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
