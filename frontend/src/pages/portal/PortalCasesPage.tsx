import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PortalLayout } from '@/components/portal/PortalLayout'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Briefcase, ChevronRight } from 'lucide-react'
import portalApi from '@/lib/portalApi'

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
  suspended: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-blue-100 text-blue-600',
  archived: 'bg-slate-100 text-slate-500',
}

interface Case {
  id: string
  caseNumber: string
  titulo: string
  estado: string
  estadoLabel: string
  tipoLabel: string
  openedDate: string | null
}

export function PortalCasesPage() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<Case[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 20

  useEffect(() => {
    setIsLoading(true)
    portalApi
      .get(`/client/cases?page=${page}&limit=${limit}`)
      .then((res) => {
        setCases(res.data.data || [])
        setTotal(res.data.meta?.total ?? res.data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [page])

  const pages = Math.ceil(total / limit) || 1

  return (
    <PortalLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Mis Asuntos</h1>
          {total > 0 && (
            <span className="text-sm text-slate-500">{total} en total</span>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-14">
              <LoadingSpinner inline />
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-14 text-slate-500">
              <Briefcase size={36} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No hay asuntos registrados.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cases.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => navigate(`/portal/asuntos/${c.id}`)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{c.titulo}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {c.caseNumber} · {c.tipoLabel}
                        {c.openedDate ? ` · Desde ${new Date(c.openedDate).toLocaleDateString('es-PE', { year: 'numeric', month: 'short' })}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLOR[c.estado] ?? 'bg-slate-100 text-slate-600'}`}
                      >
                        {c.estadoLabel}
                      </span>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-sm text-primary-600 hover:text-primary-800 disabled:opacity-40"
            >
              ← Anterior
            </button>
            <span className="text-sm text-slate-500">
              {page} / {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="text-sm text-primary-600 hover:text-primary-800 disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
