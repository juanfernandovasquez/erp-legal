import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Send, Pencil, Trash2, Check, X, Loader, MessageSquare } from 'lucide-react'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

interface Update {
  id: string
  casoId: string
  titulo: string
  contenido: string
  tipoActualizacion: string
  creadoPorId?: string | null
  creadoPor?: string | null
  createdAt: string
  updatedAt: string
}

interface CaseUpdatesProps {
  caseId: string
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatDateTime(iso: string): string {
  // If the backend returns a naive datetime (no tz offset, no Z), treat it as UTC
  // so JavaScript doesn't interpret it as local time (which shifts it 5h into the future in Lima UTC-5)
  const normalized = iso.endsWith('Z') || iso.includes('+', 10) ? iso : iso + 'Z'
  const d = new Date(normalized)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH   = Math.floor(diffMs / 3600000)
  const diffD   = Math.floor(diffMs / 86400000)

  if (diffMin < 1)  return 'ahora mismo'
  if (diffMin < 60) return `hace ${diffMin} min`
  if (diffH   < 24) return `hace ${diffH}h`
  if (diffD   === 1) return `ayer, ${d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`

  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

export function CaseUpdates({ caseId }: CaseUpdatesProps) {
  const { user: currentUser } = useAuthStore()

  const [updates, setUpdates]         = useState<Update[]>([])
  const [isLoading, setIsLoading]     = useState(false)
  const [newContent, setNewContent]   = useState('')
  const [isPosting, setIsPosting]     = useState(false)
  const [postError, setPostError]     = useState('')

  // Edit state
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving]       = useState(false)
  const [editError, setEditError]     = useState('')

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDeleting, setIsDeleting]     = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { fetchUpdates() }, [caseId])

  const fetchUpdates = async () => {
    setIsLoading(true)
    try {
      const res = await api.get(`/${caseId}/updates?limit=50&sort=-created_at`)
      setUpdates(res.data.data || [])
    } catch (e) {
      console.error('Error fetching updates:', e)
    } finally {
      setIsLoading(false)
    }
  }

  /* ── Post ── */
  const handlePost = async () => {
    const content = newContent.trim()
    if (!content) return
    setIsPosting(true)
    setPostError('')
    try {
      const res = await api.post(`/${caseId}/updates`, { content })
      setUpdates((prev) => [res.data.data, ...prev])
      setNewContent('')
      textareaRef.current?.focus()
    } catch (e: any) {
      setPostError(e?.response?.data?.detail || 'Error al publicar la actualización')
    } finally {
      setIsPosting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePost()
  }

  /* ── Edit ── */
  const startEdit = (u: Update) => {
    setEditingId(u.id)
    setEditContent(u.contenido)
    setEditError('')
  }

  const cancelEdit = () => { setEditingId(null); setEditError('') }

  const saveEdit = async () => {
    const content = editContent.trim()
    if (!content) { setEditError('El contenido no puede estar vacío'); return }
    setIsSaving(true)
    setEditError('')
    try {
      const res = await api.patch(`/${caseId}/updates/${editingId}`, { content })
      setUpdates((prev) => prev.map((u) => (u.id === editingId ? res.data.data : u)))
      setEditingId(null)
    } catch (e: any) {
      setEditError(e?.response?.data?.detail || 'Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  /* ── Delete ── */
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await api.delete(`/${caseId}/updates/${deleteTarget}`)
      setUpdates((prev) => prev.filter((u) => u.id !== deleteTarget))
      setDeleteTarget(null)
    } catch (e: any) {
      console.error('Error deleting update:', e)
    } finally {
      setIsDeleting(false)
    }
  }

  const isAdmin = currentUser?.rol && ['admin_firma', 'super_admin', 'admin'].includes(currentUser.rol)

  return (
    <div className="space-y-5">

      {/* ── Compose ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Nueva actualización
        </label>
        <textarea
          ref={textareaRef}
          rows={3}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe una actualización sobre el estado del proceso… (Ctrl+Enter para publicar)"
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-400"
        />
        {postError && (
          <p className="text-xs text-red-600 mt-1">{postError}</p>
        )}
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            className="gap-2"
            onClick={handlePost}
            disabled={!newContent.trim() || isPosting}
            isLoading={isPosting}
          >
            <Send size={14} />
            Publicar
          </Button>
        </div>
      </div>

      {/* ── Feed ── */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader className="animate-spin text-slate-400" size={24} />
        </div>
      ) : updates.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm text-slate-500 font-medium">Sin actualizaciones aún</p>
          <p className="text-xs mt-1">Sé el primero en escribir una actualización del proceso.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map((u) => {
            const isOwn   = currentUser?.id === u.creadoPorId
            const canEdit = isOwn
            const canDelete = isOwn || isAdmin

            return (
              <div key={u.id} className="flex gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">

                {/* Avatar */}
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 select-none">
                  {getInitials(u.creadoPor)}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {u.creadoPor || 'Usuario'}
                      </span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {formatDateTime(u.createdAt)}
                        {u.updatedAt !== u.createdAt && (
                          <span className="ml-1 italic">(editado)</span>
                        )}
                      </span>
                    </div>
                    {/* Actions */}
                    {(canEdit || canDelete) && editingId !== u.id && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canEdit && (
                          <button
                            onClick={() => startEdit(u)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(u.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content or edit form */}
                  {editingId === u.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        autoFocus
                      />
                      {editError && <p className="text-xs text-red-600">{editError}</p>}
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <X size={12} /> Cancelar
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={isSaving}
                          className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors disabled:opacity-50"
                        >
                          <Check size={12} /> {isSaving ? 'Guardando…' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                      {u.contenido}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Eliminar actualización"
        description="¿Estás seguro de que deseas eliminar esta actualización? No se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
