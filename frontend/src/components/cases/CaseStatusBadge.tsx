import React from 'react'
import { Badge } from '@/components/ui/badge'

interface CaseStatusBadgeProps {
  status: string
}

export function CaseStatusBadge({ status }: CaseStatusBadgeProps) {
  // Normalise legacy multi-value statuses that may still exist in old data
  const normalize = (s: string): 'activo' | 'inactivo' => {
    if (['activo', 'en_progreso', 'pendiente', 'en_pausa', 'active', 'open'].includes(s)) {
      return 'activo'
    }
    return 'inactivo'
  }

  const canonical = normalize(status)

  const labels: Record<string, string> = {
    activo:   'Activo',
    inactivo: 'Inactivo',
  }

  const variants: Record<string, any> = {
    activo:   'success',
    inactivo: 'secondary',
  }

  return (
    <Badge variant={variants[canonical]}>
      {labels[canonical]}
    </Badge>
  )
}
