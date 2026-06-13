import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { ProcessForm } from '@/components/cases/ProcessForm'
import { BillingAdjustments } from '@/components/billing/BillingAdjustments'
import { Proceso, Tarea } from '@/types'
import {
  ChevronDown, ChevronRight, Plus, Pencil, Trash2,
  CheckCircle2, Circle, Clock, XCircle, DollarSign,
} from 'lucide-react'
import api from '@/lib/axios'

function formatDuration(horas: number): string {
  if (horas === 0) return '0 min'
  const totalMin = Math.round(horas * 60)
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

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
  const [activeTab, setActiveTab]     = useState<'tareas' | 'facturacion'>('tareas')
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

        {/* Tarifa del proceso */}
        {proceso.tipoTarifa && proceso.tarifa != null && (
          <span className="text-xs text-slate-500 flex-shrink-0 bg-slate-100 rounded px-2 py-0.5">
            {proceso.moneda === 'USD' ? '$' : 'S/'}{' '}
            {proceso.tarifa.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            {proceso.tipoTarifa === 'por_horas' ? '/h' : ' plana'}
          </span>
        )}

        {/* Hours & billing summary — only shown if there are hours */}
        {proceso.totalHoras > 0 && (
          <span className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formatDuration(proceso.totalHoras)}
            </span>
            {proceso.totalMonto > 0 && (
              <span className="flex items-center gap-1 text-green-700 font-medium">
                <DollarSign size={11} />
                S/ {proceso.totalMonto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            )}
          </span>
        )}

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
        <div className="border-t border-slate-100">

          {/* Tab bar */}
          <div className="flex items-center gap-0 border-b border-slate-200 px-4 bg-slate-50">
            <button
              onClick={() => setActiveTab('tareas')}
              className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'tareas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Tareas
            </button>
            <button
              onClick={() => setActiveTab('facturacion')}
              className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'facturacion'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Facturación
            </button>
          </div>

          <div className="px-4 py-4 space-y-4">

            {/* Edit process form (visible in both tabs) */}
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

            {/* ── Tareas tab ─────────────────────────────────────────────── */}
            {activeTab === 'tareas' && (
              <>
                {/* Hours & billing summary panel */}
                {proceso.totalHoras > 0 && (
                  <div className="flex items-center gap-6 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock size={14} className="text-blue-500" />
                      <span className="font-medium">{formatDuration(proceso.totalHoras)}</span>
                      <span className="text-slate-400 text-xs">({Math.round(proceso.totalHoras * 60)} min)</span>
                    </div>
                    {proceso.totalMonto > 0 && (
                      <>
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="flex items-center gap-2 text-slate-600">
                          <DollarSign size={14} className="text-green-500" />
                          <span className="font-semibold text-green-700">
                            S/ {proceso.totalMonto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-slate-400 text-xs">facturado</span>
                        </div>
                      </>
                    )}
                  </div>
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
                    <p className="text-sm font-semibold text-slate-700 mb-3">Nueva tarea</p>
                    <TaskForm
                      caseId={caseId}
                      processId={proceso.id}
                      inline
                      onSuccess={(nueva) => {
                        onTareaCreated(nueva)
                        setAddingTask(false)
                      }}
                      onCancel={() => setAddingTask(false)}
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
              </>
            )}

            {/* ── Facturación tab ────────────────────────────────────────── */}
            {activeTab === 'facturacion' && (
              <BillingAdjustments
                processId={proceso.id}
                moneda={proceso.moneda || 'PEN'}
              />
            )}

          </div>
        </div>
      )}
    </div>
  )
}
