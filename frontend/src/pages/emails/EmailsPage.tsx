import React, { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Mail, Send, History, Loader2, Check, X, Users } from 'lucide-react'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

interface UserOption { id: string; nombre: string; email: string }
interface LogEntry {
  id: string; eventType: string; toEmail: string; toName: string
  subject: string; sentAt: string; success: boolean
}

const EVENT_LABELS: Record<string, string> = {
  manual: 'Manual',
  task_assigned: 'Tarea asignada',
  task_status_changed: 'Cambio de estado',
  hours_logged: 'Horas registradas',
  deadline_reminder: 'Recordatorio de plazo',
}

export default function EmailsPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<'send' | 'history'>('send')

  // Send form
  const [users, setUsers]         = useState<UserOption[]>([])
  const [selected, setSelected]   = useState<string[]>([])
  const [subject, setSubject]     = useState('')
  const [message, setMessage]     = useState('')
  const [sending, setSending]     = useState(false)
  const [sendResult, setSendResult] = useState<{sent:number;failed:number}|null>(null)
  const [sendError, setSendError] = useState('')

  // History
  const [logs, setLogs]         = useState<LogEntry[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    api.get('/users?limit=100').then(res => setUsers(res.data.data || []))
  }, [])

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const res = await api.get('/emails/logs?limit=50')
      setLogs(res.data.data || [])
    } finally { setLoadingLogs(false) }
  }, [])

  useEffect(() => { if (tab === 'history') loadLogs() }, [tab, loadLogs])

  const toggleUser = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const selectAll = () => setSelected(users.map(u => u.id))
  const clearAll  = () => setSelected([])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendError(''); setSendResult(null)
    if (!selected.length) { setSendError('Selecciona al menos un destinatario'); return }
    if (!subject.trim()) { setSendError('El asunto es requerido'); return }
    if (!message.trim()) { setSendError('El mensaje es requerido'); return }
    setSending(true)
    try {
      const res = await api.post('/emails/send', { userIds: selected, subject: subject.trim(), message: message.trim() })
      setSendResult(res.data.data)
      setSubject(''); setMessage(''); setSelected([])
    } catch (err: any) {
      setSendError(err?.response?.data?.detail || 'Error al enviar')
    } finally { setSending(false) }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl">
            <Mail size={22} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Comunicaciones</h1>
            <p className="text-sm text-slate-500">Envío de emails a usuarios del estudio</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {([['send','Redactar',Send],['history','Historial',History]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ── SEND TAB ── */}
        {tab === 'send' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Recipients */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-800">Destinatarios</span>
                  {selected.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{selected.length}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Todos</button>
                  <button onClick={clearAll} className="text-xs text-slate-400 hover:underline">Ninguno</button>
                </div>
              </div>
              <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleUser(u.id)}
                      className="rounded border-slate-300 text-blue-600" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{u.nombre}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Compose */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSend} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <span className="text-sm font-semibold text-slate-800">Redactar mensaje</span>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {sendError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{sendError}</p>}
                  {sendResult && (
                    <div className="text-xs bg-green-50 border border-green-200 rounded px-3 py-2 text-green-700">
                      ✓ Enviado a {sendResult.sent} usuario{sendResult.sent !== 1 ? 's' : ''}
                      {sendResult.failed > 0 && ` · ${sendResult.failed} fallaron`}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Asunto</label>
                    <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                      placeholder="Asunto del mensaje..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Mensaje</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)}
                      placeholder="Escribe el mensaje aquí..."
                      rows={8}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
                  </div>
                </div>
                <div className="px-5 pb-4 flex justify-end">
                  <button type="submit" disabled={sending}
                    className="flex items-center gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {sending ? 'Enviando...' : `Enviar${selected.length > 0 ? ` a ${selected.length}` : ''}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Historial de emails enviados</span>
            </div>
            {loadingLogs ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 size={18} className="animate-spin mr-2" /> Cargando...
              </div>
            ) : logs.length === 0 ? (
              <p className="px-5 py-12 text-sm text-slate-400 text-center italic">Sin emails enviados aún.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500">Fecha</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500">Destinatario</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500">Asunto</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-500">Tipo</th>
                    <th className="px-5 py-2.5 text-center text-xs font-medium text-slate-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(log.sentAt)}</td>
                      <td className="px-5 py-3">
                        <p className="text-slate-800 font-medium text-xs">{log.toName || log.toEmail}</p>
                        <p className="text-slate-400 text-xs">{log.toEmail}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600 max-w-xs truncate">{log.subject}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                          {EVENT_LABELS[log.eventType] || log.eventType}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {log.success
                          ? <Check size={14} className="text-emerald-500 mx-auto" />
                          : <X size={14} className="text-red-400 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
