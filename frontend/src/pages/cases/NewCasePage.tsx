import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { CaseForm } from '@/components/cases/CaseForm'
import { Caso } from '@/types'
import { ArrowLeft } from 'lucide-react'

export function NewCasePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultClienteId = searchParams.get('client_id') || undefined

  const handleSuccess = (caso: Caso) => {
    navigate(`/cases/${caso.id}`)
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2">
          <ArrowLeft size={18} />
          Volver
        </Button>

        <h1 className="text-3xl font-bold text-slate-900 mb-6">Nuevo Proceso</h1>

        <CaseForm onSuccess={handleSuccess} defaultClienteId={defaultClienteId} />
      </div>
    </AppLayout>
  )
}
