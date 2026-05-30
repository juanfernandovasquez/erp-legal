import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge'
import { CaseTimeline } from '@/components/cases/CaseTimeline'
import { CaseTeamList } from '@/components/cases/CaseTeamList'
import { CaseForm } from '@/components/cases/CaseForm'
import { ProcessForm } from '@/components/cases/ProcessForm'
import { CaseProcessSection } from '@/components/cases/CaseProcessSection'
import { DocumentList } from '@/components/documents/DocumentList'
import { DocumentUpload } from '@/components/documents/DocumentUpload'
import { HoursTable } from '@/components/hours/HoursTable'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useCases } from '@/hooks/useCases'
import { formatDate, formatCurrency, getPriorityColor, getTaskStatusColor } from '@/lib/utils'
import { Caso, Tarea, Proceso } from '@/types'
import {
  ArrowLeft, Calendar, DollarSign, User, Plus, Pencil, Check, X,
  LayoutGrid, List, ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle,
} from 'lucide-react'
import api from '@/lib/axios'

// ── sort helpers ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', todo: 'Pendiente',
  en_progreso: 'En Progreso', in_progress: 'En Progreso',
  en_revision: 'En Revisión', in_review: 'En Revisión',
  completado: 'Completado', done: 'Completado',
  bloqueado: 'Bloqueado', blocked: 'Bloqueado',
  cancelado: 'Cancelado', cancelled: 'Cancelado',
}

const PRIORITY_LABEL: Record<string, string> = {
  urgente: 'Urgente', alta: 'Alta', media: 'Media', baja: 'Baja',
}

const PRIORITY_WEIGHT: Record<string, number> = {
  urgente: 4, alta: 3, media: 2, baja: 1,
}

const STATUS_WEIGHT: Record<string, number> = {
  pendiente: 1, todo: 1,
  en_progreso: 2, in_progress: 2,
  en_revision: 3, in_review: 3,
  completado: 4, done: 4,
  bloqueado: 5, blocked: 5,
  cancelado: 6, cancelled: 6,
}

type SortKey = 'titulo' | 'asignado' | 'prioridad' | 'estado' | 'vencimiento'
type SortDir = 'asc' | 'desc'

const CASE_STATUS_OPTIONS = [
  { value: 'activo',   label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
]

const INACTIVE_STATUSES = ['inactivo']

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentCase, isLoading: caseLoading, fetchCaseById } = useCases()
  const [caso, setCaso] = useState<Caso | null>(currentCase)
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [tareasLoading, setTareasLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Tarea | null>(null)

  // Processes
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [procesosLoading, setProcesosLoading] = useState(false)
  const [showNewProcessForm, setShowNewProcessForm] = useState(false)

  // Status editing
  const [editingStatus, setEditingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')

  // Guard: don't fetch from API when creating a new case
  const isNew = id === 'new'

  useEffect(() => {
    if (id && !isNew) {
      fetchCaseById(id)
      fetchTareas()
    }
  }, [id])

  useEffect(() => {
    setCaso(currentCase)
  }, [currentCase])

  const fetchTareas = async () => {
    if (!id || isNew) return
    setTareasLoading(true)
    try {
      const response = await api.get(`/cases/${id}/tasks`)
      setTareas(response.data.data || [])
    } catch (error) {
      console.error('Error fetching tareas:', error)
    } finally {
      setTareasLoading(false)
    }
  }

  const fetchProcesos = async () => {
    if (!id || isNew) return
    setProcesosLoading(true)
    try {
      const res = await api.get(`/cases/${id}/processes`)
      setProcesos(res.data.data || [])
    } catch (err) {
      console.error('Error fetching procesos:', err)
    } finally {
      setProcesosLoading(false)
    }
  }

  const handleStatusChange = async () => {
    if (!newStatus || newStatus === caso?.estado) {
      setEditingStatus(false)
      return
    }
    setSavingStatus(true)
    setStatusError('')
    try {
      const res = await api.patch(`/cases/${id}`, { estado: newStatus })
      const updated = res.data.data
      setCaso(updated)
      setEditingStatus(false)
    } catch (err: any) {
      setStatusError(err?.response?.data?.detail || 'Error al actualizar el estado')
    } finally {
      setSavingStatus(false)
    }
  }

  const openStatusEditor = () => {
    setNewStatus(caso?.estado || 'activo')
    setStatusError('')
    setEditingStatus(true)
  }

  // ── sort & group ─────────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'prioridad' ? 'desc' : 'asc')
    }
  }

  const sortedTareas = useMemo(() => {
    if (!sortKey) return tareas
    return [...tareas].sort((a, b) => {
      let diff = 0
      if (sortKey === 'titulo') {
        diff = (a.titulo || '').localeCompare(b.titulo || '', 'es')
      } else if (sortKey === 'asignado') {
        diff = (a.asignadoA?.nombre || '').localeCompare(b.asignadoA?.nombre || '', 'es')
      } else if (sortKey === 'prioridad') {
        diff = (PRIORITY_WEIGHT[a.prioridad] || 0) - (PRIORITY_WEIGHT[b.prioridad] || 0)
      } else if (sortKey === 'estado') {
        diff = (STATUS_WEIGHT[a.estado] || 0) - (STATUS_WEIGHT[b.estado] || 0)
      } else if (sortKey === 'vencimiento') {
        if (!a.fechaVencimiento && !b.fechaVencimiento) diff = 0
        else if (!a.fechaVencimiento) return 1
        else if (!b.fechaVencimiento) return -1
        else diff = new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
      }
      return sortDir === 'asc' ? diff : -diff
    })
  }, [tareas, sortKey, sortDir])

  const groupedTareas = {
    pendiente:   tareas.filter((t) => ['pendiente','todo'].includes(t.estado)),
    en_progreso: tareas.filter((t) => ['en_progreso','in_progress'].includes(t.estado)),
    en_revision: tareas.filter((t) => ['en_revision','in_review'].includes(t.estado)),
    completado:  tareas.filter((t) => ['completado','done'].includes(t.estado)),
    bloqueado:   tareas.filter((t) => ['bloqueado','blocked','cancelado','cancelled'].includes(t.estado)),
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={13} className="text-slate-400 ml-1 inline" />
    return sortDir === 'asc'
      ? <ChevronUp   size={13} className="text-blue-500 ml-1 inline" />
      : <ChevronDown size={13} className="text-blue-500 ml-1 inline" />
  }

  const thClass = (col: SortKey) =>
    `px-4 py-3 font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-100 transition-colors whitespace-nowrap ${
      sortKey === col ? 'text-blue-600' : ''
    }`

  const TareasListView = () => (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className={`${thClass('titulo')} text-left w-[32%]`} onClick={() => handleSort('titulo')}>
              Tarea <SortIcon col="titulo" />
            </th>
            <th className={`${thClass('asignado')} text-left`} onClick={() => handleSort('asignado')}>
              Asignado a <SortIcon col="asignado" />
            </th>
            <th className={`${thClass('prioridad')} text-center`} onClick={() => handleSort('prioridad')}>
              Prioridad <SortIcon col="prioridad" />
            </th>
            <th className={`${thClass('estado')} text-center`} onClick={() => handleSort('estado')}>
              Estado <SortIcon col="estado" />
            </th>
            <th className={`${thClass('vencimiento')} text-left`} onClick={() => handleSort('vencimiento')}>
              Vencimiento <SortIcon col="vencimiento" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTareas.map((task, idx) => {
            const isOverdue = task.fechaVencimiento
              ? new Date(task.fechaVencimiento) < new Date() && !['completado','done'].includes(task.estado)
              : false
            return (
              <tr
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`border-b border-slate-100 cursor-pointer hover:bg-blue-50/40 transition-colors ${
                  idx % 2 === 0 ? '' : 'bg-slate-50/40'
                }`}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900 truncate max-w-[260px]">{task.titulo}</p>
                  {task.descripcion && (
                    <p className="text-xs text-slate-400 truncate max-w-[260px] mt-0.5">{task.descripcion}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {task.asignadoA ? (
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="text-slate-700 truncate max-w-[150px]">{task.asignadoA.nombre}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Sin asignar</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={getPriorityColor(task.prioridad) as any}>
                    {PRIORITY_LABEL[task.prioridad] || task.prioridad}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={getTaskStatusColor(task.estado) as any}>
                    {STATUS_LABEL[task.estado] || task.estado}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {task.fechaVencimiento ? (
                    <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                      {isOverdue && <AlertCircle size={13} />}
                      <Calendar size={13} className="flex-shrink-0" />
                      <span>{formatDate(new Date(task.fechaVencimiento))}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Sin fecha</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  const TareasKanbanView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {([
        { key: 'pendiente',   label: 'Pendientes',  color: 'bg-yellow-400' },
        { key: 'en_progreso', label: 'En Progreso', color: 'bg-blue-400'   },
        { key: 'en_revision', label: 'En Revisión', color: 'bg-purple-400' },
        { key: 'completado',  label: 'Completadas', color: 'bg-green-400'  },
        { key: 'bloqueado',   label: 'Bloqueadas',  color: 'bg-red-400'    },
      ] as const).map(({ key, label, color }) => (
        <div key={key}>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <h2 className="font-semibold text-slate-900">{label}</h2>
            <span className="ml-auto text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {groupedTareas[key].length}
            </span>
          </div>
          <div className="space-y-3">
            {groupedTareas[key].map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  // Render create form when navigating to /cases/new
  if (isNew) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <Button variant="ghost" onClick={() => navigate('/cases')} className="mb-4 gap-2">
            <ArrowLeft size={18} />
            Volver a Casos
          </Button>
          <CaseForm onSuccess={(nuevoCaso) => navigate(`/cases/${nuevoCaso.id}`)} />
        </div>
      </AppLayout>
    )
  }

  if (caseLoading || !caso) {
    return <LoadingSpinner />
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/cases')}
          className="mb-4 gap-2"
        >
          <ArrowLeft size={18} />
          Volver a Casos
        </Button>

        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{caso.titulo}</h1>
              <p className="text-slate-600">{caso.descripcion}</p>
            </div>

            {/* Status area */}
            <div className="flex flex-col items-end gap-2 min-w-[180px]">
              <CaseStatusBadge status={caso.estado} />

              {/* Inactive case warning */}
              {INACTIVE_STATUSES.includes(caso.estado) && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                  Caso inactivo — tareas ocultas en la sección global
                </span>
              )}

              {!editingStatus ? (
                <button
                  onClick={openStatusEditor}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Pencil size={11} />
                  Cambiar estado
                </button>
              ) : (
                <div className="flex flex-col items-end gap-2 bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="text-sm border border-slate-200 rounded-md px-2 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CASE_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {statusError && (
                    <p className="text-xs text-red-500">{statusError}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleStatusChange} disabled={savingStatus} className="gap-1 h-7 text-xs">
                      <Check size={12} />
                      {savingStatus ? 'Guardando…' : 'Guardar'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingStatus(false)} className="gap-1 h-7 text-xs">
                      <X size={12} />
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            {caso.cliente && (
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 uppercase font-semibold mb-1">Cliente</p>
                <p className="font-medium text-slate-900">{caso.cliente.nombre}</p>
              </div>
            )}
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 uppercase font-semibold mb-1 flex items-center gap-1">
                <Calendar size={14} />
                Abierto
              </p>
              <p className="font-medium text-slate-900">{formatDate(new Date(caso.fechaApertura))}</p>
            </div>
            {caso.montoAsegurado && (
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 uppercase font-semibold mb-1 flex items-center gap-1">
                  <DollarSign size={14} />
                  Monto
                </p>
                <p className="font-medium text-slate-900">{formatCurrency(caso.montoAsegurado)}</p>
              </div>
            )}
            {caso.abogadoPrincipal && (
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 uppercase font-semibold mb-1 flex items-center gap-1">
                  <User size={14} />
                  Abogado
                </p>
                <p className="font-medium text-slate-900">{caso.abogadoPrincipal.nombre}</p>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="info" onValueChange={(v) => { if (v === 'tareas') { fetchTareas(); fetchProcesos() } }}>
          <TabsList className="mb-6">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
            <TabsTrigger value="tareas">Tareas</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="equipo">Equipo</TabsTrigger>
            <TabsTrigger value="horas">Horas</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Detalles del Caso</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-600 font-medium">Tipo de Solicitud</p>
                      <p className="text-slate-900">{caso.tipoSolicitud}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 font-medium">Estado</p>
                      <div className="flex items-center gap-2 mt-1">
                        <CaseStatusBadge status={caso.estado} />
                        {INACTIVE_STATUSES.includes(caso.estado) && (
                          <span className="text-xs text-amber-600">· Caso inactivo</span>
                        )}
                      </div>
                    </div>
                    {caso.fechaCierre && (
                      <div>
                        <p className="text-sm text-slate-600 font-medium">Fecha de Cierre</p>
                        <p className="text-slate-900">{formatDate(new Date(caso.fechaCierre))}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-600 uppercase font-semibold mb-1">ID del Caso</p>
                      <p className="text-sm text-slate-900">{caso.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 uppercase font-semibold mb-1">Creado</p>
                      <p className="text-sm text-slate-900">{formatDate(new Date(caso.createdAt))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 uppercase font-semibold mb-1">Actualizado</p>
                      <p className="text-sm text-slate-900">{formatDate(new Date(caso.updatedAt))}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <CaseTimeline caseId={caso.id} />
          </TabsContent>

          <TabsContent value="tareas">
            <div className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Procesos del Caso
                  {procesos.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      ({procesos.length} proceso{procesos.length !== 1 ? 's' : ''}, {tareas.length} tarea{tareas.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </h3>
                <Button
                  className="gap-2"
                  onClick={() => setShowNewProcessForm((v) => !v)}
                  variant={showNewProcessForm ? 'ghost' : 'default'}
                >
                  <Plus size={16} />
                  {showNewProcessForm ? 'Cancelar' : 'Nuevo proceso'}
                </Button>
              </div>

              {/* New process form */}
              {showNewProcessForm && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Crear nuevo proceso</p>
                  <ProcessForm
                    caseId={caso.id}
                    onSuccess={(nuevo) => {
                      setProcesos((prev) => [...prev, nuevo])
                      setShowNewProcessForm(false)
                    }}
                    onCancel={() => setShowNewProcessForm(false)}
                  />
                </div>
              )}

              {/* Content */}
              {procesosLoading ? (
                <LoadingSpinner />
              ) : procesos.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="font-medium text-slate-600 mb-1">Sin procesos aún</p>
                  <p className="text-sm">Crea el primer proceso para empezar a organizar las tareas del caso.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {procesos.map((proc) => (
                    <CaseProcessSection
                      key={proc.id}
                      proceso={proc}
                      tareas={tareas.filter((t) => t.procesoId === proc.id)}
                      caseId={caso.id}
                      onProcesoUpdated={(updated) =>
                        setProcesos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                      }
                      onProcesoDeleted={(deletedId) =>
                        setProcesos((prev) => prev.filter((p) => p.id !== deletedId))
                      }
                      onTareaCreated={(nueva) => setTareas((prev) => [...prev, nueva])}
                      onTareaClick={(t) => setSelectedTask(t)}
                    />
                  ))}

                  {/* Tasks without a process (legacy) */}
                  {tareas.filter((t) => !t.procesoId).length > 0 && (
                    <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                        Tareas sin proceso asignado
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {tareas
                          .filter((t) => !t.procesoId)
                          .map((t) => (
                            <div
                              key={t.id}
                              className="opacity-70 cursor-pointer"
                              onClick={() => setSelectedTask(t)}
                            >
                              {/* Reuse TaskCard but muted */}
                              <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all">
                                <p className="text-sm font-medium text-slate-700 truncate">{t.titulo}</p>
                                {t.descripcion && (
                                  <p className="text-xs text-slate-400 truncate mt-0.5">{t.descripcion}</p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="documentos">
            <div className="space-y-6">
              <DocumentUpload caseId={caso.id} onSuccess={() => fetchCaseById(caso.id)} />
              <DocumentList caseId={caso.id} onDelete={() => fetchCaseById(caso.id)} />
            </div>
          </TabsContent>

          <TabsContent value="equipo">
            <CaseTeamList
              caseId={caso.id}
              abogados={caso.abogados || []}
              asistentes={caso.asistentes || []}
              onUpdate={() => fetchCaseById(caso.id)}
            />
          </TabsContent>

          <TabsContent value="horas">
            <HoursTable caseId={caso.id} onUpdate={() => fetchCaseById(caso.id)} />
          </TabsContent>
        </Tabs>
      </div>
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={(updated) => {
            setTareas((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
            setSelectedTask(updated)
          }}
          onDelete={(taskId) => {
            setTareas((prev) => prev.filter((t) => t.id !== taskId))
            setSelectedTask(null)
          }}
        />
      )}
    </AppLayout>
  )
}
