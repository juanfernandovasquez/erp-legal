import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Documento } from '@/types'
import { formatDate } from '@/lib/utils'
import { FileText, Download, Trash2, Loader } from 'lucide-react'
import api from '@/lib/axios'

interface DocumentListProps {
  caseId: string
  onDelete?: () => void
}

export function DocumentList({ caseId, onDelete }: DocumentListProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchDocumentos()
  }, [caseId])

  const fetchDocumentos = async () => {
    setIsLoading(true)
    try {
      const response = await api.get(`/documents/cases/${caseId}/documents`)
      setDocumentos(response.data.data || [])
    } catch (error) {
      console.error('Error fetching documentos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(deleteTarget)
    setDeleteTarget(null)
    try {
      await api.delete(`/documents/${deleteTarget}`)
      setDocumentos((prev) => prev.filter((d) => d.id !== deleteTarget))
      onDelete?.()
    } catch (error) {
      console.error('Error deleting document:', error)
    } finally {
      setDeleting(null)
    }
  }

  const handleDownload = (url: string, nombre: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = nombre
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader className="animate-spin text-primary-700" size={24} />
          </div>
        ) : documentos.length === 0 ? (
          <p className="text-slate-600 text-center py-8">No hay documentos cargados</p>
        ) : (
          <div className="space-y-3">
            {documentos.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText size={20} className="text-slate-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-slate-900 truncate">{doc.nombre}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                      <Badge variant="secondary">{doc.tipo}</Badge>
                      <span>{(doc.tamaño / 1024).toFixed(2)} KB</span>
                      <span>{formatDate(doc.fechaCarga)}</span>
                    </div>
                    {doc.descripcion && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-1">{doc.descripcion}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc.url, doc.nombre)}
                  >
                    <Download size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(doc.id)}
                    disabled={deleting === doc.id}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <ConfirmDialog
      open={!!deleteTarget}
      onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      title="Eliminar documento"
      description="¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      variant="danger"
      isLoading={!!deleting}
      onConfirm={confirmDelete}
    />
    </>
  )
}
