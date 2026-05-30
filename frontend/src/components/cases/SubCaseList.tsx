import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SubCaso } from '@/types'
import { Plus, Trash2, Loader } from 'lucide-react'
import api from '@/lib/axios'

interface SubCaseListProps {
  caseId: string
  onUpdate?: () => void
}

export function SubCaseList({ caseId, onUpdate }: SubCaseListProps) {
  const [subCasos, setSubCasos] = useState<SubCaso[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchSubCasos()
  }, [caseId])

  const fetchSubCasos = async () => {
    setIsLoading(true)
    try {
      const response = await api.get(`/cases/${caseId}/sub-cases`)
      setSubCasos(response.data.data || [])
    } catch (error) {
      console.error('Error fetching subcasos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (subCasoId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este subcaso?')) return

    try {
      // Sub-cases are deleted as regular cases by their ID
      await api.delete(`/cases/${subCasoId}`)
      setSubCasos(subCasos.filter((s) => s.id !== subCasoId))
      onUpdate?.()
    } catch (error) {
      console.error('Error deleting subcaso:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Subcasos</CardTitle>
          <Button size="sm" className="gap-2">
            <Plus size={16} />
            Agregar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader className="animate-spin text-primary-700" size={24} />
          </div>
        ) : subCasos.length === 0 ? (
          <p className="text-slate-600 text-center py-8">No hay subcasos registrados</p>
        ) : (
          <div className="space-y-3">
            {subCasos.map((subCaso) => (
              <div key={subCaso.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">{subCaso.titulo}</h4>
                  <p className="text-sm text-slate-600 mt-1">{subCaso.descripcion}</p>
                  <Badge variant={subCaso.estado === 'activo' ? 'success' : 'secondary'} className="mt-2">
                    {subCaso.estado}
                  </Badge>
                </div>
                <button
                  onClick={() => handleDelete(subCaso.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
