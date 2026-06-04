import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Horas } from '@/types'
import { formatDate } from '@/lib/utils'
import { Loader, Trash2 } from 'lucide-react'
import api from '@/lib/axios'

interface HoursTableProps {
  caseId?: string
  onUpdate?: () => void
}

export function HoursTable({ caseId, onUpdate }: HoursTableProps) {
  const [horas, setHoras] = useState<Horas[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  useEffect(() => {
    fetchHoras()
  }, [caseId])

  const fetchHoras = async () => {
    setIsLoading(true)
    try {
      const endpoint = caseId ? `/cases/${caseId}/hours` : '/hours/my-hours'
      const response = await api.get(endpoint)
      setHoras(response.data.data || [])
    } catch (error) {
      console.error('Error fetching horas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(deleteTarget)
    setDeleteTarget(null)
    try {
      await api.delete(`/hours/${deleteTarget}`)
      setHoras((prev) => prev.filter((h) => h.id !== deleteTarget))
      onUpdate?.()
    } catch (error) {
      console.error('Error deleting horas:', error)
    } finally {
      setDeleting(null)
    }
  }

  const tipoLabels: Record<string, string> = {
    consulta: 'Consulta',
    redaccion: 'Redacción',
    investigacion: 'Investigación',
    audiencia: 'Audiencia',
    otro: 'Otro',
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Registro de Horas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader className="animate-spin text-primary-700" size={24} />
          </div>
        ) : horas.length === 0 ? (
          <p className="text-slate-600 text-center py-8">No hay registros de horas</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {horas.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{formatDate(new Date(h.fechaRegistro))}</TableCell>
                    <TableCell>
                      <Badge variant="info">{tipoLabels[h.tipo] || h.tipo}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{h.horasTrabajas}</TableCell>
                    <TableCell className="max-w-xs truncate">{h.descripcion}</TableCell>
                    <TableCell>{h.usuario?.nombre}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => setDeleteTarget(h.id)}
                        disabled={deleting === h.id}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>

    <ConfirmDialog
      open={!!deleteTarget}
      onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      title="Eliminar registro de horas"
      description="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      variant="danger"
      isLoading={!!deleting}
      onConfirm={confirmDelete}
    />
    </>
  )
}
