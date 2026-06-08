import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CaseCard } from '@/components/cases/CaseCard'
import { CaseStatusBadge } from '@/components/cases/CaseStatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'
import { useCases } from '@/hooks/useCases'
import {
  FileText, Plus, LayoutGrid, List,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Filter, RotateCcw, Calendar, User,
} from 'lucide-react'
import { CASE_STATUS_OPTIONS, formatDate } from '@/lib/utils'
import { Caso } from '@/types'
import api from '@/lib/axios'

// ── sort ──────────────────────────────────────────────────────────────────────

type SortKey = 'titulo' | 'cliente' | 'estado' | 'abogado' | 'vencimiento'
type SortDir = 'asc' | 'desc'

const STATUS_WEIGHT: Record<string, number> = { activo: 1, pendiente: 2, cerrado: 3, archivado: 4 }

// ── component ─────────────────────────────────────────────────────────────────

export function CasesListPage() {
  const navigate = useNavigate()
  const { cases, isLoading, error, pagination, fetchCases } = useCases()

  const [view, setView]                   = useState<'grid' | 'list'>('list')
  const [statusFilter, setStatusFilter]   = useState('')
  const [clientFilter, setClientFilter]   = useState('')
  const [abogadoFilter, setAbogadoFilter] = useState('')
  const [tipoFilter, setTipoFilter]       = useState('')
  const [vencFilter, setVencFilter]       = useState('')
  const [currentPage, setCurrentPage]     = useState(1)

  // Dropdown data
  const [clients, setClients] = useState<any[]>([])
  const [users, setUsers]     = useState<any[]>([])

  // Nearest task due date per case
  const [nearestDue, setNearestDue] = useState<Record<string, string | null>>({})

  // Sort
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    api.get('/clients?limit=100').then((r) => setClients(r.data.data || [])).catch(() => {})
    api.get('/users?limit=100').then((r) => setUsers(r.data.data || [])).catch(() => {})
    api.get('/tasks?limit=500').then((r) => {
      const tasks: any[] = r.data.data || []
      const map: Record<string, string | null> = {}
      tasks.forEach((t) => {
        if (!t.casoId || !t.fechaVencimiento) return
        const due = t.fechaVencimiento.split('T')[0]
        if (!map[t.casoId] || due < map[t.casoId]!) map[t.casoId] = due
      })
      setNearestDue(map)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetchCases({ page: currentPage, limit: 20, status: statusFilter || undefined })
  }, [statusFilter, currentPage])

  const today = new Date().toISOString().split('T')[0]
  const in7   = new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0]

  const hasActiveFilters = !!(statusFilter || clientFilter || abogadoFilter || tipoFilter || vencFilter)
  const activeCount = [statusFilter, clientFilter, abogadoFilter, tipoFilter, vencFilter].filter(Boolean).length

  const clearFilters = () => {
    setStatusFilter(''); setClientFilter(''); setAbogadoFilter('')
    setTipoFilter(''); setVencFilter(''); setCurrentPage(1)
  }

  // Client-side filters
  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (clientFilter  && c.clienteId !== clientFilter) return false
      if (abogadoFilter && c.abogadoPrincipal?.id !== abogadoFilter) return false
      if (tipoFilter    && (c.tipoFacturacion ?? '') !== tipoFilter) return false
      if (vencFilter) {
        const due = nearestDue[c.id]
        if (vencFilter === 'sin_tareas'  && due)                         return false
        if (vencFilter === 'con_tareas'  && !due)                        return false
        if (vencFilter === 'vencido'     && (!due || due >= today))      return false
        if (vencFilter === 'proximo'     && (!due || due < today || due > in7)) return false
      }
      return true
    })
  }, [cases, clientFilter, abogadoFilter, tipoFilter, vencFilter, nearestDue, today, in7])

  // Sort
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      let diff = 0
      if (sortKey === 'titulo')      diff = (a.titulo || '').localeCompare(b.titulo || '', 'es')
      if (sortKey === 'cliente')     diff = (a.cliente?.nombre || '').localeCompare(b.cliente?.nombre || '', 'es')
      if (sortKey === 'estado')      diff = (STATUS_WEIGHT[a.estado] || 9) - (STATUS_WEIGHT[b.estado] || 9)
      if (sortKey === 'abogado')     diff = (a.abogadoPrincipal?.nombre || '').localeCompare(b.abogadoPrincipal?.nombre || '', 'es')
      if (sortKey === 'vencimiento') {
        const da = nearestDue[a.id] ?? '9999'
        const db = nearestDue[b.id] ?? '9999'
        diff = da.localeCompare(db)
      }
      return sortDir === 'asc' ? diff : -diff
    })
  }, [filtered, sortKey, sortDir, nearestDue])

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={13} className="text-slate-400 ml-1 inline" />
    return sortDir === 'asc'
      ? <ChevronUp   size={13} className="text-blue-500 ml-1 inline" />
      : <ChevronDown size={13} className="text-blue-500 ml-1 inline" />
  }

  const thCls = (col: SortKey) =>
    `px-4 py-3 font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-100 transition-colors whitespace-nowrap ${sortKey === col ? 'text-blue-600' : ''}`

  // ── list view ──────────────────────────────────────────────────────────────

  const ListView = () => (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className={`${thCls('titulo')} text-left w-[32%]`} onClick={() => handleSort('titulo')}>
              Proceso <SortIcon col="titulo" />
            </th>
            <th className={`${thCls('cliente')} text-left`} onClick={() => handleSort('cliente')}>
              Cliente <SortIcon col="cliente" />
            </th>
            <th className={`${thCls('estado')} text-center`} onClick={() => handleSort('estado')}>
              Estado <SortIcon col="estado" />
            </th>
            <th className={`${thCls('abogado')} text-left`} onClick={() => handleSort('abogado')}>
              Encargado <SortIcon col="abogado" />
            </th>
            <th className={`${thCls('vencimiento')} text-left`} onClick={() => handleSort('vencimiento')}>
              Próx. vencimiento <SortIcon col="vencimiento" />
            </th>
            <th className="px-4 py-3 font-semibold text-slate-700 text-left whitespace-nowrap">Tarifa</th>
            <th className="px-4 py-3 font-semibold text-slate-700 text-left whitespace-nowrap">Tipo</th>
            <th className="px-4 py-3 font-semibold text-slate-700 text-right whitespace-nowrap">Total facturado</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((caso, idx) => {
            const simbolo = caso.monedaFacturacion === 'USD' ? '$' : 'S/'
            return (
              <tr
                key={caso.id}
                onClick={() => navigate(`/cases/${caso.id}`)}
                className={`border-b border-slate-100 cursor-pointer hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}
              >
                <td className="px-4 py-3 align-top">
                  <p className="font-medium text-slate-900 leading-snug">{caso.titulo}</p>
                  {caso.descripcion && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{caso.descripcion}</p>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-slate-700">
                  {caso.cliente?.nombre || <span className="text-slate-400 italic text-xs">—</span>}
                </td>
                <td className="px-4 py-3 align-top text-center">
                  <CaseStatusBadge status={caso.estado} />
                </td>
                <td className="px-4 py-3 align-top">
                  {caso.abogadoPrincipal ? (
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="text-slate-700">{caso.abogadoPrincipal.nombre}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Sin asignar</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-slate-600">
                  {nearestDue[caso.id] ? (
                    <div className="flex items-center gap-1">
                      <Calendar size={13} className={`flex-shrink-0 ${nearestDue[caso.id]! < today ? 'text-red-400' : 'text-slate-400'}`} />
                      <span className={nearestDue[caso.id]! < today ? 'text-red-600 font-medium' : ''}>
                        {formatDate(nearestDue[caso.id]!)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Sin tareas</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-sm text-slate-700">
                  {caso.precioFacturacion != null
                    ? `${simbolo} ${caso.precioFacturacion.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                    : <span className="text-slate-400 italic text-xs">—</span>}
                </td>
                <td className="px-4 py-3 align-top">
                  {caso.tipoFacturacion
                    ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${caso.tipoFacturacion === 'por_horas' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {caso.tipoFacturacion === 'por_horas' ? 'Por horas' : 'Flat'}
                      </span>
                    : <span className="text-slate-400 italic text-xs">—</span>}
                </td>
                <td className="px-4 py-3 align-top text-right">
                  {(caso.totalFacturado ?? 0) > 0
                    ? <span className="text-sm font-semibold text-green-700">
                        {simbolo} {(caso.totalFacturado ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    : <span className="text-slate-400 text-xs">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <AppLayout onSearch={(query) => fetchCases({ search: query, page: 1 })}>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Procesos</h1>
            <p className="text-slate-600">
              {pagination.total > 0 ? `${pagination.total} proceso${pagination.total !== 1 ? 's' : ''}` : 'Gestiona todos los procesos legales'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => setView('grid')}
                title="Vista tarjetas"
                className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setView('list')}
                title="Vista lista"
                className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <List size={16} />
              </button>
            </div>
            <Button onClick={() => navigate('/cases/new')} className="gap-2">
              <Plus size={18} />
              Nuevo Proceso
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
                {activeCount}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Select
              label="Estado"
              options={[{ value: '', label: 'Todos' }, ...CASE_STATUS_OPTIONS]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
            />
            <Select
              label="Cliente"
              options={[
                { value: '', label: 'Todos' },
                ...clients.map((c) => ({ value: c.id, label: c.nombre || c.name || c.id })),
              ]}
              value={clientFilter}
              onChange={(e) => { setClientFilter(e.target.value); setCurrentPage(1) }}
            />
            <Select
              label="Encargado"
              options={[
                { value: '', label: 'Todos' },
                ...users.map((u) => ({
                  value: u.id,
                  label: u.nombre || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.id,
                })),
              ]}
              value={abogadoFilter}
              onChange={(e) => { setAbogadoFilter(e.target.value); setCurrentPage(1) }}
            />
            <Select
              label="Tipo tarifa"
              options={[
                { value: '',          label: 'Todas' },
                { value: 'por_horas', label: 'Por horas' },
                { value: 'flat',      label: 'Flat' },
              ]}
              value={tipoFilter}
              onChange={(e) => { setTipoFilter(e.target.value); setCurrentPage(1) }}
            />
            <Select
              label="Vencimiento"
              options={[
                { value: '',           label: 'Todos' },
                { value: 'vencido',    label: 'Vencido' },
                { value: 'proximo',    label: 'Próximos 7 días' },
                { value: 'con_tareas', label: 'Con tareas' },
                { value: 'sin_tareas', label: 'Sin tareas' },
              ]}
              value={vencFilter}
              onChange={(e) => { setVencFilter(e.target.value); setCurrentPage(1) }}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Content */}
        {sorted.length === 0 && !isLoading ? (
          <EmptyState
            icon={FileText}
            title="No hay procesos"
            description={hasActiveFilters ? 'No hay procesos que coincidan con los filtros' : 'Comienza creando el primer proceso'}
            action={!hasActiveFilters ? { label: 'Crear Primer Proceso', onClick: () => navigate('/cases/new') } : undefined}
          />
        ) : view === 'list' ? (
          <>
            <ListView />
            {pagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  page={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                  isLoading={isLoading}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {sorted.map((caso) => (
                <CaseCard key={caso.id} caso={caso} />
              ))}
            </div>
            {pagination.totalPages > 1 && (
              <Pagination
                page={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
                isLoading={isLoading}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
