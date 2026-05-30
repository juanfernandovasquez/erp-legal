import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CaseStatusBadge } from './CaseStatusBadge'
import { Caso } from '@/types'
import { formatDate } from '@/lib/utils'
import { ChevronRight, Calendar, User, DollarSign } from 'lucide-react'

interface CaseCardProps {
  caso: Caso
}

export function CaseCard({ caso }: CaseCardProps) {
  return (
    <Link to={`/cases/${caso.id}`}>
      <Card hover>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{caso.titulo}</CardTitle>
            <CaseStatusBadge status={caso.estado} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{caso.descripcion}</p>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <User size={16} className="text-slate-400" />
                <span className="text-sm text-slate-600">{caso.cliente?.nombre}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                <span className="text-sm text-slate-600">
                  {formatDate(new Date(caso.fechaApertura))}
                </span>
              </div>

              {caso.montoAsegurado && (
                <div className="flex items-center gap-2 col-span-2">
                  <DollarSign size={16} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-900">
                    S/. {caso.montoAsegurado?.toLocaleString('es-PE')}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-200">
              <div className="text-sm">
                {caso.abogados && caso.abogados.length > 0 && (
                  <span className="text-slate-600">
                    {caso.abogados.length} abogado{caso.abogados.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
