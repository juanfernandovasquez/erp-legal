import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import api from '@/lib/axios'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIChatTabProps {
  caseId: string
}

export function AIChatTab({ caseId }: AIChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setError(null)
    setLoading(true)

    // history = all messages before this one (for multi-turn context)
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await api.post(`/cases/${caseId}/ai/chat`, {
        message: text,
        history,
      })
      const reply = res.data.data.reply
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Error al conectar con la IA'
      setError(msg)
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <Bot size={40} className="opacity-30" />
            <p className="text-sm text-center max-w-xs">
              Hazle una pregunta a la IA sobre este proceso. Tiene acceso al cliente, tareas, horas y más.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-700 text-white flex items-center justify-center">
                <Bot size={16} />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-700 text-white rounded-br-sm'
                  : 'bg-slate-100 text-slate-800 rounded-bl-sm'
              }`}
            >
              {msg.content.split('\n').filter(l => l.trim()).map((para, i) => (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>{para}</p>
              ))}
            </div>
            {msg.role === 'user' && (
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-700 text-white flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 size={15} className="animate-spin text-slate-500" />
              <span className="text-sm text-slate-500">Pensando...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <span className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full">{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-200 p-3 flex gap-2 items-end bg-slate-50">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu pregunta... (Enter para enviar, Shift+Enter para nueva línea)"
          rows={1}
          className="flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-slate-400 max-h-32 overflow-y-auto"
          style={{ lineHeight: '1.5' }}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="flex-shrink-0 h-9 w-9 rounded-lg bg-primary-700 text-white flex items-center justify-center hover:bg-primary-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
