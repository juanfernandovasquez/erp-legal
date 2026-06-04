import React from 'react'
import { Badge } from '@/components/ui/badge'
import { getCaseStatusColor, getCaseStatusLabel } from '@/lib/utils'

interface CaseStatusBadgeProps {
  status: string
}

export function CaseStatusBadge({ status }: CaseStatusBadgeProps) {
  return (
    <Badge variant={getCaseStatusColor(status) as any}>
      {getCaseStatusLabel(status)}
    </Badge>
  )
}
