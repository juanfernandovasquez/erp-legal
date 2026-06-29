import React, { useEffect, useState } from 'react'
import { X, Save, Trash2, ExternalLink, Calendar, User, AlignLeft, Briefcase } from 'lucide-react'
import { useEscapeKey } from '@/hooks/useEscapeKey'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/DateInput'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Tarea } from '@/types'
import { formatDate, getPriorityColor, getPriorityLabel, getTaskStatusColor, getTaskStatusLabel, TASK_STATUS_OPTIONS } from '@/lib/utils'
import api from '@/lib/axios'
import { useNavigate } from 'react-router-dom'

interface TaskDetailModalProps {
  task: Tarea
  onClose: () => void
  onSave: (updated: Tarea) => void
  onDelete?: (taskId: string) => void
}

export function TaskDetailModal({ task, onClose, onSave, onDelete }: TaskDetailModalProps) {
  const navigate = useNavigate()
  useEscapeKey(onClose)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [users, setUsers] = useState<any[]>([])

  const [titulo, setTitulo] = useState(task.titulo)
  const [descripcion, setDescripcion] = useState(task.descripcion || '')
  const [estado, setEstado] = useState(task.estado)
  const [prioridad, setPrioridad] = useState(task.prioridad)
  const [asignadoAId, setAsignadoAId] = useState(task.asignadoAId || '')
  const [fechaPresentacion, setFechaPresentacion] = useState(
    task.fechaPresentacion ? task.fechaPresentacion.split('T')[0] : ''
  )
  const [fechaVencimiento, setFechaVencimiento] = useState(
    task.fechaVencimiento ? task.fechaVencimiento.split('T')[0] : ''
  )
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users?limit=100')
      setUsers(res.data.data || [])
    } catch {}
  }


  const handleSave = async () => {
    setIsSaving(true)
    setSaveError('')
    try {
      const res = await api.patch(`/tasks/${task.id}`, {
        titulo,
        descripcion,
        estado,
        prioridad,
        asignadoAId: asignadoAId || null,
        fechaPresentacion: fechaPresentacion || null,
        fechaVencimiento: fechaVencimiento || null,
      })
      onSave(res.data.data)
      onClose()
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.response?.data?.message || 'Error al guardar la tarea'
      setSaveError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleteError('')
    setIsDeleting(true)
    try {
      await api.delete(`/tasks/${task.id}`)
      setShowDeleteConfirm(false)
      onDelete?.(task.id)
      onClose()
    } catch (error: any) {
      setDeleteError(error?.response?.data?.detail || 'Error al eliminar la tarea')
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    setTitulo(task.titulo)
    setDescripcion(task.descripcion || '')
    setEstado(task.estado)
    setPrioridad(task.prioridad)
    setAsignadoAId(task.asignadoAId || '')
    setFechaPresentacion(task.fechaPresentacion ? task.fechaPresentacion.split('T')[0] : '')
    setFechaVencimiento(task.fechaVencimiento ? task.fechaVencimiento.split('T')[0] : '')
    setIsEditing(false)
  }

  const isOverdue = task.fechaVencimiento
    ? new Date(task.fechaVencimiento) < new Date() && task.estado !== 'completado' && task.estado !== 'done'
    : false

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200">
          <div className="flex-1 min-w-0 pr-4">
            {isEditing ? (
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="text-lg font-semibold"
                placeholder="Título de la tarea"
              />
            ) : (
              <h2 className="text-xl font-semibold text-slate-900 break-words">{task.titulo}</h2>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={getPriorityColor(isEditing ? prioridad : task.prioridad) as any}>
                {getPriorityLabel(isEditing ? prioridad : task.prioridad)}
              </Badge>
              <Badge variant={getTaskStatusColor(isEditing ? estado : task.estado) as any}>
                {getTaskStatusLabel(isEditing ? estado : task.estado)}
              </Badge>
              {isOverdue && (
                <span className="text-xs text-red-600 font-medium">⚠️ Vencida</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">

          {/* Status + Priority row (edit mode) */}
          {isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Estado"
                options={TASK_STATUS_OPTIONS}
                value={estado}
                onChange={(e) => setEstado(e.target.value as any)}
              />
              <Select
                label="Prioridad"
                options={[
                  { value: 'urgente', label: '🔴 Urgente' },
                  { value: 'alta', label: '🟠 Alta' },
                  { value: 'media', label: '🟡 Media' },
                  { value: 'baja', label: '🟢 Baja' },
                ]}
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as any)}
              />
            </div>
          )}

          {/* Description */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <AlignLeft size={15} />
              <span>Descripción</span>
            </div>
            {isEditing ? (
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={4}
                placeholder="Describe la tarea..."
              />
            ) : (
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {task.descripcion || <span className="italic text-slate-400">Sin descripción</span>}
              </p>
            )}
          </div>

          {/* Assignee + Due date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <User size={15} />
                <span>Asignado a</span>
              </div>
              {isEditing ? (
                <Select
                  options={[
                    { value: '', label: 'Sin asignar' },
                    ...users.map((u) => ({ value: u.id, label: u.nombre || u.email })),
                  ]}
                  value={asignadoAId}
                  onChange={(e) => setAsignadoAId(e.target.value)}
                />
              ) : (
                <p className="text-sm text-slate-700">
                  {task.asignadoA?.nombre || <span className="italic text-slate-400">Sin asignar</span>}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Calendar size={15} />
                <span>Fecha de Presentación</span>
              </div>
              {isEditing ? (
                <DateInput
                  value={fechaPresentacion}
                  onChange={(e) => setFechaPresentacion(e.target.value)}
                />
              ) : (
                <p className="text-sm text-slate-700">
                  {task.fechaPresentacion
                    ? formatDate(task.fechaPresentacion)
                    : <span className="italic text-slate-400">Sin fecha</span>}
                </p>
              )}
            </div>
          </div>

          {/* Fecha de vencimiento */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Calendar size={15} />
              <span className={isOverdue ? 'text-red-600' : ''}>Fecha de Vencimiento</span>
            </div>
            {isEditing ? (
              <DateInput
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
              />
            ) : (
              <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-700'}`}>
                {task.fechaVencimiento
                  ? formatDate(task.fechaVencimiento)
                  : <span className="italic text-slate-400">Sin fecha</span>}
                {isOverdue && <span className="ml-2 text-xs">⚠️ Vencida</span>}
              </p>
            )}
          </div>

          {/* Case link */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Briefcase size={15} />
              <span>Caso</span>
            </div>
            <div className="flex items-center gap-3">
              {task.casoTitulo && (
                <span className="text-sm text-slate-800 font-medium">{task.casoTitulo}</span>
              )}
              <button
                onClick={() => navigate(`/cases/${task.casoId}`)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                Ver caso
                <ExternalLink size={12} />
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-400">
            <span>Creado: {task.createdAt ? formatDate(task.createdAt) : '—'}</span>
            <span>Actualizado: {task.updatedAt ? formatDate(task.updatedAt) : '—'}</span>
          </div>
        </div>

        {/* Save error */}
        {saveError && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{saveError}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            onClick={() => { setDeleteError(''); setShowDeleteConfirm(true) }}
            disabled={isDeleting}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            <Trash2 size={15} />
            {isDeleting ? 'Eliminando...' : 'Eliminar tarea'}
          </button>

          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} isLoading={isSaving} className="gap-2">
                  <Save size={15} />
                  Guardar
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="gap-2">
                Editar tarea
              </Button>
            )}
          </div>
        </div>

      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => { if (!open) { setShowDeleteConfirm(false); setDeleteError('') } }}
        title="¿Eliminar tarea?"
        description={`¿Estás seguro de que deseas eliminar la tarea "${task.titulo}"? Esta acción no se puede deshacer.`}
        confirmLabel={isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
        cancelLabel="Cancelar"
        onConfirm={handleDelete}
        variant="danger"
      />

    </div>
  )
}
