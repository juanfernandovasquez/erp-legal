import React, { useEffect, useState, useMemo } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import {
  CheckSquare, Plus, X, Filter, RotateCcw,
  LayoutGrid, List, Calendar, AlertCircle, User,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import { Tarea } from '@/types'
import {
  formatDate, getPriorityColor, getPriorityLabel,
  getTaskStatusColor, getTaskStatusLabel, TASK_STATUS_OPTIONS,
} from '@/lib/utils'
import api from '@/lib/axios'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'

// ── helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<string, number> = { urgente: 4, alta: 3, media: 2, baja: 1 }
const STATUS_WEIGHT: Record<string, number>   = { pendiente: 1, todo: 1, en_progreso: 2, in_progress: 2, completado: 3, done: 3, cancelado: 4, cancelled: 4 }

type SortKey = 'cliente' | 'titulo' | 'caso' | 'asignado' | 'prioridad' | 'estado' | 'vencimiento'
type SortDir = 'asc' | 'desc'

// ── component ─────────────────────────────────────────────────────────────────

export function TasksPage() {
  const [tasks, setTasks] = useState<Tarea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'list'>('list')

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [caseFilter, setCaseFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [dueFilter, setDueFilter] = useState('')

  // Dropdown data
  const [users, setUsers] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [selectedTask, setSelectedTask] = useState<Tarea | null>(null)

  useEffect(() => { fetchUsers(); fetchCases(); fetchClients() }, [])
  useEffect(() => { fetchTasks() }, [statusFilter, priorityFilter, assigneeFilter, caseFilter, clientFilter, dueFilter])

  const fetchTasks = async () => {
    setIsLoading(true)
    try {
      const params: any = { limit: 100 }
      if (statusFilter)   params.status    = statusFilter
      if (priorityFilter) params.priority  = priorityFilter
      if (assigneeFilter) params.assignee  = assigneeFilter
      if (caseFilter)     params.case_id   = caseFilter
      if (clientFilter)   params.client_id = clientFilter
      if (dueFilter)      params.due       = dueFilter
      setTasks((await api.get('/tasks', { params })).data.data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsers   = async () => { try { setUsers((await api.get('/users?limit=100')).data.data || []) } catch {} }
  const fetchCases   = async () => { try { setCases((await api.get('/cases?limit=100')).data.data || []) } catch {} }
  const fetchClients = async () => { try { setClients((await api.get('/clients?limit=100')).data.data || []) } catch {} }

  const clearFilters = () => {
    setStatusFilter(''); setPriorityFilter(''); setAssigneeFilter('')
    setCaseFilter(''); setClientFilter(''); setDueFilter('')
  }

  const hasActiveFilters = statusFilter || priorityFilter || assigneeFilter || caseFilter || clientFilter || dueFilter
  const openModal = () => { setSelectedCaseId(''); setShowModal(true) }

  // ── sort logic ──────────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // Default direction per column type
      setSortDir(key === 'prioridad' ? 'desc' : 'asc')
    }
  }

  const sortedTasks = useMemo(() => {
    if (!sortKey) return tasks
    return [...tasks].sort((a, b) => {
      let diff = 0

      if (sortKey === 'cliente') {
        diff = (a.clienteNombre || '').localeCompare(b.clienteNombre || '', 'es')

      } else if (sortKey === 'titulo') {
        diff = (a.titulo || '').localeCompare(b.titulo || '', 'es')

      } else if (sortKey === 'caso') {
        diff = (a.casoTitulo || '').localeCompare(b.casoTitulo || '', 'es')

      } else if (sortKey === 'asignado') {
        const na = a.asignadoA?.nombre || ''
        const nb = b.asignadoA?.nombre || ''
        diff = na.localeCompare(nb, 'es')

      } else if (sortKey === 'prioridad') {
        diff = (PRIORITY_WEIGHT[a.prioridad] || 0) - (PRIORITY_WEIGHT[b.prioridad] || 0)

      } else if (sortKey === 'estado') {
        diff = (STATUS_WEIGHT[a.estado] || 0) - (STATUS_WEIGHT[b.estado] || 0)

      } else if (sortKey === 'vencimiento') {
        // Null dates go to the end regardless of direction
        if (!a.fechaVencimiento && !b.fechaVencimiento) diff = 0
        else if (!a.fechaVencimiento) return 1
        else if (!b.fechaVencimiento) return -1
        else diff = new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
      }

      return sortDir === 'asc' ? diff : -diff
    })
  }, [tasks, sortKey, sortDir])

  // ── sort icon helper ────────────────────────────────────────────────────────

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

  // ── grouped (kanban) ───────────────────────────────────────────────────────

  const groupedTasks = {
    pendiente:   tasks.filter((t) => ['pendiente','todo'].includes(t.estado)),
    en_progreso: tasks.filter((t) => ['en_progreso','in_progress','en_revision','in_review'].includes(t.estado)),
    completado:  tasks.filter((t) => ['completado','done'].includes(t.estado)),
    cancelado:   tasks.filter((t) => ['cancelado','cancelled','rechazado','bloqueado','blocked'].includes(t.estado)),
  }

  // ── list view ──────────────────────────────────────────────────────────────

  const ListView = () => (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className={`${thClass('cliente')} text-left w-[16%]`} onClick={() => handleSort('cliente')}>
              Cliente <SortIcon col="cliente" />
            </th>
            <th className={`${thClass('titulo')} text-left w-[30%]`} onClick={() => handleSort('titulo')}>
              Tarea <SortIcon col="titulo" />
            </th>
            <th className={`${thClass('caso')} text-left w-[18%]`} onClick={() => handleSort('caso')}>
              Proceso <SortIcon col="caso" />
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
          {sortedTasks.map((task, idx) => {
            const isOverdue = task.fechaVencimiento
              ? new Date(task.fechaVencimiento) < new Date()
                && !['completado','done'].includes(task.estado)
              : false
            return (
              <tr
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`border-b border-slate-100 cursor-pointer hover:bg-blue-50/40 transition-colors ${
                  idx % 2 === 0 ? '' : 'bg-slate-50/40'
                }`}
              >
                {/* Cliente */}
                <td className="px-4 py-3 text-sm text-slate-700 align-top">
                  {task.clienteNombre || <span className="text-slate-400 italic text-xs">—</span>}
                </td>

                {/* Tarea */}
                <td className="px-4 py-3 align-top">
                  <p className="font-medium text-slate-900 leading-snug">{task.titulo}</p>
                </td>

                {/* Proceso */}
                <td className="px-4 py-3 text-sm text-slate-600 align-top leading-snug">
                  {task.casoTitulo || <span className="text-slate-400 italic">—</span>}
                </td>

                {/* Prioridad */}
                <td className="px-4 py-3 text-center align-top">
                  <Badge variant={getPriorityColor(task.prioridad) as any}>
                    {getPriorityLabel(task.prioridad)}
                  </Badge>
                </td>

                {/* Estado */}
                <td className="px-4 py-3 text-center align-top">
                  <Badge variant={getTaskStatusColor(task.estado) as any}>
                    {getTaskStatusLabel(task.estado)}
                  </Badge>
                </td>

                {/* Vencimiento */}
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

  // ── kanban view ────────────────────────────────────────────────────────────

  const KanbanView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      {([
        { key: 'pendiente',   label: 'Pendientes',  color: 'bg-slate-400'  },
        { key: 'en_progreso', label: 'En progreso', color: 'bg-blue-400'   },
        { key: 'completado',  label: 'Completadas', color: 'bg-green-400'  },
        { key: 'cancelado',   label: 'Canceladas',  color: 'bg-red-400'    },
      ] as const).map(({ key, label, color }) => (
        <div key={key}>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <h2 className="font-semibold text-slate-900">{label}</h2>
            <span className="ml-auto text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {groupedTasks[key].length}
            </span>
          </div>
          <div className="space-y-3">
            {groupedTasks[key].map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Tareas</h1>
            <p className="text-slate-600">
              {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} encontrado{tasks.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => setView('kanban')}
                title="Vista tarjetas"
                className={`p-1.5 rounded-md transition-colors ${
                  view === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setView('list')}
                title="Vista lista"
                className={`p-1.5 rounded-md transition-colors ${
                  view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List size={16} />
              </button>
            </div>
            <Button className="gap-2" onClick={openModal}>
              <Plus size={18} />
              Nueva Tarea
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filtros</span>
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                {[statusFilter, priorityFilter, assigneeFilter, caseFilter, clientFilter, dueFilter].filter(Boolean).length}
              </span>
            )}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                <RotateCcw size={12} />
                Limpiar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Select
              label="Estado"
              options={[
                { value: '', label: 'Todos' },
                ...TASK_STATUS_OPTIONS,
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
            <Select
              label="Prioridad"
              options={[
                { value: '',        label: 'Todas' },
                { value: 'urgente', label: '🔴 Urgente' },
                { value: 'alta',    label: '🟠 Alta' },
                { value: 'media',   label: '🟡 Media' },
                { value: 'baja',    label: '🟢 Baja' },
              ]}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            />
            <Select
              label="Asignado a"
              options={[
                { value: '',           label: 'Todos' },
                { value: 'me',         label: '👤 Mis tareas' },
                { value: 'unassigned', label: 'Sin asignar' },
                ...users.map((u) => ({ value: u.id, label: u.nombre || `${u.first_name} ${u.last_name}` })),
              ]}
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            />
            <Select
              label="Proceso"
              options={[
                { value: '', label: 'Todos' },
                ...cases.map((c) => ({ value: c.id, label: c.titulo || c.numeroCaso || c.id })),
              ]}
              value={caseFilter}
              onChange={(e) => setCaseFilter(e.target.value)}
            />
            <Select
              label="Cliente"
              options={[
                { value: '', label: 'Todos' },
                ...clients.map((c) => ({ value: c.id, label: c.nombre || c.id })),
              ]}
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            />
            <Select
              label="Vencimiento"
              options={[
                { value: '',           label: 'Cualquier fecha' },
                { value: 'overdue',    label: '⚠️ Vencidas' },
                { value: 'today',      label: '📅 Vencen hoy' },
                { value: 'this_week',  label: '📆 Esta semana' },
                { value: 'this_month', label: '🗓️ Este mes' },
              ]}
              value={dueFilter}
              onChange={(e) => setDueFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No hay tareas"
            description={hasActiveFilters ? 'No hay tareas que coincidan con los filtros seleccionados' : 'Crea el primera tarea para empezar'}
            action={!hasActiveFilters ? { label: 'Crear Primera Tarea', onClick: openModal } : undefined}
          />
        ) : view === 'list' ? (
          <ListView />
        ) : (
          <KanbanView />
        )}
      </div>

      {/* Modal: seleccionar caso → crear tarea */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Nueva Tarea</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!selectedCaseId ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Selecciona el proceso al que pertenece la tarea:</p>
                  <Select
                    label="Proceso"
                    placeholder="Selecciona un proceso..."
                    options={cases.map((c) => ({ value: c.id, label: c.titulo || c.numeroCaso || c.id }))}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                  />
                </div>
              ) : (
                <TaskForm
                  caseId={selectedCaseId}
                  onSuccess={(nueva) => {
                    setTasks((prev) => [nueva, ...prev])
                    setShowModal(false)
                    fetchTasks()
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={(updated) => {
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
            setSelectedTask(updated)
          }}
          onDelete={(taskId) => {
            setTasks((prev) => prev.filter((t) => t.id !== taskId))
            setSelectedTask(null)
          }}
        />
      )}
    </AppLayout>
  )
}
