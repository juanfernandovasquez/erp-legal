import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge'
import { CaseTimeline } from '@/components/cases/CaseTimeline'
import { CaseTeamList } from '@/components/cases/CaseTeamList'
import { CaseForm } from '@/components/cases/CaseForm'
import { TaskForm } from '@/components/tasks/TaskForm'
import { DocumentList } from '@/components/documents/DocumentList'
import { DocumentUpload } from '@/components/documents/DocumentUpload'
import { HoursTable } from '@/components/hours/HoursTable'
import { HoursForm } from '@/components/hours/HoursForm'
import { CaseUpdates } from '@/components/cases/CaseUpdates'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { AlertCard } from '@/components/alerts/AlertCard'
import { AlertForm } from '@/components/alerts/AlertForm'
import { useAlerts } from '@/hooks/useAlerts'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useCases } from '@/hooks/useCases'
import { formatDate, formatCurrency, getPriorityColor, getPriorityLabel, getTaskStatusColor, getTaskStatusLabel, CASE_STATUS_OPTIONS } from '@/lib/utils'
import { Caso, Tarea } from '@/types'
import { BillingAdjustments } from '@/components/billing/BillingAdjustments'
import {
  ArrowLeft, Calendar, DollarSign, User, Plus, Pencil, Check, X,
  LayoutGrid, List, ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle, Trash2, RefreshCw,
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

type SortKey = 'titulo' | 'asignado' | 'prioridad' | 'estado' | 'presentacion' | 'vencimiento'
type SortDir = 'asc' | 'desc'

const INACTIVE_STATUSES = ['archivado', 'cerrado', 'inactivo']

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultTab = searchParams.get('tab') || 'info'
  const { currentCase, isLoading: caseLoading, fetchCaseById, setCurrentCase } = useCases()
  const [caso, setCaso] = useState<Caso | null>(currentCase)
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [tareasLoading, setTareasLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Tarea | null>(null)

  const [showNewProcessForm, setShowNewProcessForm] = useState(false)
  const [tareasView, setTareasView] = useState<'grid' | 'list'>('list')
  const [horasKey, setHorasKey] = useState(0)
  const [showHorasForm, setShowHorasForm] = useState(false)

  // Sort
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Status editing
  const [editingStatus, setEditingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [deletingCase, setDeletingCase] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editingCase, setEditingCase] = useState(false)

  // Alerts
  const {
    alerts: caseAlerts,
    isLoading: alertsLoading,
    fetchCaseAlerts,
    createAlert,
    resolveAlert,
    acknowledgeAlert,
    deleteAlert,
  } = useAlerts()
  const [showAlertForm, setShowAlertForm] = useState(false)

  // Guard: don't fetch from API when creating a new case
  const isNew = id === 'new'

  useEffect(() => {
    if (id && !isNew) {
      setCurrentCase(null)
      fetchCaseById(id)
      fetchTareas()
      fetchCaseAlerts(id)
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

  const handleDeleteCase = async () => {
    if (!caso) return
    setDeletingCase(true)
    try {
      await api.delete(`/cases/${caso.id}`)
      navigate('/cases')
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Error al eliminar el caso')
      setDeletingCase(false)
    }
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
      } else if (sortKey === 'presentacion') {
        if (!a.fechaPresentacion && !b.fechaPresentacion) diff = 0
        else if (!a.fechaPresentacion) return 1
        else if (!b.fechaPresentacion) return -1
        else diff = new Date(a.fechaPresentacion).getTime() - new Date(b.fechaPresentacion).getTime()
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
    en_progreso: tareas.filter((t) => ['en_progreso','in_progress','en_revision','in_review'].includes(t.estado)),
    completado:  tareas.filter((t) => ['completado','done'].includes(t.estado)),
    cancelado:   tareas.filter((t) => ['cancelado','cancelled','rechazado','bloqueado','blocked'].includes(t.estado)),
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
            <th className={`${thClass('titulo')} text-left w-[28%]`} onClick={() => handleSort('titulo')}>
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
            <th className={`${thClass('presentacion')} text-left`} onClick={() => handleSort('presentacion')}>
              Presentación <SortIcon col="presentacion" />
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
                <td className="px-4 py-3 align-top">
                  <p className="font-medium text-slate-900 leading-snug">{task.titulo}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  {task.asignadoA ? (
                    <div className="flex items-start gap-1.5">
                      <User size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{task.asignadoA.nombre}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Sin asignar</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <Badge variant={getPriorityColor(task.prioridad) as any}>
                    {getPriorityLabel(task.prioridad)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <Badge variant={getTaskStatusColor(task.estado) as any}>
                    {getTaskStatusLabel(task.estado)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 align-top">
                  {task.fechaPresentacion
                    ? formatDate(task.fechaPresentacion)
                    : <span className="text-slate-400 italic text-xs">—</span>}
                </td>
                <td className="px-4 py-3 align-top">
                  {task.fechaVencimiento ? (
                    <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                      {isOverdue && <AlertCircle size={13} />}
                      <Calendar size={13} className="flex-shrink-0" />
                      <span>{formatDate(task.fechaVencimiento)}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">—</span>
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
        { key: 'pendiente',   label: 'Pendientes',  color: 'bg-slate-400' },
        { key: 'en_progreso', label: 'En progreso', color: 'bg-blue-400'  },
        { key: 'completado',  label: 'Completadas', color: 'bg-green-400' },
        { key: 'cancelado',   label: 'Canceladas',  color: 'bg-red-400'   },
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

  if (caseLoading) {
    return <LoadingSpinner />
  }

  if (!caso) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto text-center py-24 text-slate-500">
          <p className="text-lg font-medium mb-2">No se encontró el caso</p>
          <p className="text-sm mb-6">Es posible que el caso no exista o no tengas permisos para verlo.</p>
          <Button variant="ghost" onClick={() => navigate('/cases')}>
            Volver a Casos
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cases')} className="gap-2">
            <ArrowLeft size={16} />
            Volver a Casos
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingCase(true)} className="gap-2">
              <Pencil size={14} />
              Editar caso
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deletingCase}
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 size={14} />
              {deletingCase ? 'Eliminando…' : 'Eliminar caso'}
            </Button>
          </div>
        </div>

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
                <Button variant="outline" size="sm" onClick={openStatusEditor} className="gap-1.5">
                  <RefreshCw size={13} />
                  Cambiar estado
                </Button>
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
              <p className="font-medium text-slate-900">{formatDate(caso.fechaApertura)}</p>
            </div>
            {caso.tipoFacturacion && caso.precioFacturacion != null && (
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 uppercase font-semibold mb-1 flex items-center gap-1">
                  <DollarSign size={14} />
                  Facturación
                </p>
                <p className="font-medium text-slate-900">
                  {caso.monedaFacturacion === 'USD' ? '$' : 'S/'}{' '}
                  {caso.precioFacturacion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  {caso.tipoFacturacion === 'por_horas' ? '/h' : ' flat'}
                </p>
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

        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
            <TabsTrigger value="tareas">Tareas</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="equipo">Equipo</TabsTrigger>
            <TabsTrigger value="horas">Facturación</TabsTrigger>
            <TabsTrigger value="actualizaciones">Actualizaciones</TabsTrigger>
            <TabsTrigger value="alertas">Alertas</TabsTrigger>
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
                        <p className="text-slate-900">{formatDate(caso.fechaCierre)}</p>
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
                      <p className="text-sm text-slate-900">{formatDate(caso.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 uppercase font-semibold mb-1">Actualizado</p>
                      <p className="text-sm text-slate-900">{formatDate(caso.updatedAt)}</p>
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
                <h3 className="text-base font-semibold text-slate-900">
                  Tareas
                  {tareas.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      ({tareas.length} tarea{tareas.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  {/* View toggle */}
                  <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
                    <button
                      onClick={() => setTareasView('grid')}
                      className={`p-1.5 rounded-md transition-colors ${tareasView === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <LayoutGrid size={14} />
                    </button>
                    <button
                      onClick={() => setTareasView('list')}
                      className={`p-1.5 rounded-md transition-colors ${tareasView === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <List size={14} />
                    </button>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowNewProcessForm((v) => !v)}
                    variant={showNewProcessForm ? 'ghost' : 'default'}
                  >
                    <Plus size={15} />
                    {showNewProcessForm ? 'Cancelar' : 'Nueva tarea'}
                  </Button>
                </div>
              </div>

              {/* New task form */}
              {showNewProcessForm && (
                <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm">
                  <TaskForm
                    caseId={caso.id}
                    inline
                    onSuccess={(nueva) => {
                      setTareas((prev) => [...prev, nueva])
                      setShowNewProcessForm(false)
                    }}
                    onCancel={() => setShowNewProcessForm(false)}
                  />
                </div>
              )}

              {/* Content */}
              {tareasLoading ? (
                <LoadingSpinner />
              ) : tareas.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <div className="text-3xl mb-3">📋</div>
                  <p className="font-medium text-slate-600 mb-1">Sin tareas aún</p>
                  <p className="text-sm">Crea la primera tarea para empezar a registrar el trabajo.</p>
                </div>
              ) : tareasView === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tareas.map((t) => (
                    <TaskCard key={t.id} task={t} onClick={() => setSelectedTask(t)} />
                  ))}
                </div>
              ) : (
                <TareasListView />
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
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowHorasForm(true)}
                  >
                    <Plus size={15} />
                    Registrar horas
                  </Button>
                </div>

                <HoursTable
                  key={horasKey}
                  caseId={caso.id}
                  tareas={tareas.map((t) => ({ id: t.id, titulo: t.titulo, fechaPresentacion: t.fechaPresentacion }))}
                  moneda={caso.monedaFacturacion ?? 'PEN'}
                  tipoFacturacion={caso.tipoFacturacion ?? null}
                  onUpdate={() => setHorasKey((k) => k + 1)}
                />
              </div>

              <div className="border-t border-slate-200 pt-6">
                <BillingAdjustments
                  caseId={caso.id}
                  moneda={caso.monedaFacturacion ?? 'PEN'}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="actualizaciones">
            <CaseUpdates caseId={caso.id} />
          </TabsContent>

        </Tabs>
      </div>

      {/* ── Modal: detalle / edición de tarea ─────────────────────────────── */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={(updated) => {
            setSelectedTask(null)
            if (updated) {
              setTareas((prev) => prev.map((t) => t.id === updated.id ? updated : t))
            }
          }}
          onDelete={(taskId) => {
            setSelectedTask(null)
            fetchCaseById(caso.id)
          }}
        />
      )}

      {/* ── Modal: registrar horas ─────────────────────────────────────────── */}
      {showHorasForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-base font-semibold text-slate-900">Registrar horas</h2>
              <button
                onClick={() => setShowHorasForm(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <span className="sr-only">Cerrar</span>✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <HoursForm
                caseId={caso.id}
                tipoFacturacion={caso.tipoFacturacion ?? null}
                defaultRate={caso.precioFacturacion ?? 0}
                defaultMoneda={caso.monedaFacturacion ?? 'PEN'}
                onSuccess={() => {
                  setShowHorasForm(false)
                  setHorasKey((k) => k + 1)
                }}
                onCancel={() => setShowHorasForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: editar caso ───────────────────────────────────────────── */}
      {editingCase && caso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Editar caso</h2>
              <button
                onClick={() => setEditingCase(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>
            <CaseForm
              initialData={caso}
              inline
              onSuccess={(updatedCaso) => {
                setCaso(updatedCaso)
                setEditingCase(false)
              }}
            />
          </div>
        </div>
      )}

      {/* ── Confirm: eliminar caso ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="¿Eliminar caso?"
        description={`Esta acción eliminará permanentemente "${caso.titulo}" y todos sus datos asociados. No se puede deshacer.`}
        confirmLabel={deletingCase ? 'Eliminando…' : 'Sí, eliminar'}
        cancelLabel="Cancelar"
        onConfirm={handleDeleteCase}
        variant="danger"
      />

    </AppLayout>
  )
}
