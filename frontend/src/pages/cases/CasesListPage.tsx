import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { CaseCard } from '@/components/cases/CaseCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'
import { useCases } from '@/hooks/useCases'
import { FileText, Plus } from 'lucide-react'
import { CASE_STATUS_OPTIONS } from '@/lib/utils'

export function CasesListPage() {
  const navigate = useNavigate()
  const { cases, isLoading, error, pagination, fetchCases } = useCases()
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchCases({
      page: currentPage,
      limit: 12,
      status: statusFilter || undefined,
    })
  }, [statusFilter, currentPage])

  const handleCreateCase = () => {
    navigate('/cases/new')
  }

  return (
    <AppLayout onSearch={(query) => fetchCases({ search: query, page: 1 })}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Casos</h1>
            <p className="text-slate-600">Gestiona todos tus casos jurídicos</p>
          </div>
          <Button onClick={handleCreateCase} className="gap-2">
            <Plus size={18} />
            Nuevo Caso
          </Button>
        </div>

        <div className="mb-6 flex gap-4">
          <Select
            placeholder="Filtrar por estado"
            options={[
              { value: '', label: 'Todos los estados' },
              ...CASE_STATUS_OPTIONS,
            ]}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="max-w-xs"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {cases.length === 0 && !isLoading ? (
          <EmptyState
            icon={FileText}
            title="No hay casos registrados"
            description="Comienza a crear casos para gestionar tus asuntos jurídicos"
            action={{
              label: 'Crear Primer Caso',
              onClick: handleCreateCase,
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {cases.map((caso) => (
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
