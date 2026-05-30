import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon?: LucideIcon
  title: string
  value: string | number
  subtitle?: string
  subtitleColor?: 'red' | 'green' | 'default'
  change?: {
    value: number
    positive: boolean
  }
  bgColor?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  onClick?: () => void
}

export function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  subtitleColor = 'default',
  change,
  bgColor = 'blue',
  onClick,
}: StatCardProps) {
  const bgColors = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    red: 'bg-red-50',
    purple: 'bg-purple-50',
  }

  const iconColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
  }

  const subtitleColors = {
    red: 'text-red-600',
    green: 'text-green-600',
    default: 'text-slate-500',
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-base border border-slate-200 p-6 transition-shadow',
        onClick && 'cursor-pointer hover:shadow-md hover:border-slate-300'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-600 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          {subtitle && (
            <p className={cn('text-xs font-medium mt-1', subtitleColors[subtitleColor])}>
              {subtitle}
            </p>
          )}
          {change && (
            <p className={cn(
              'text-sm font-medium mt-2',
              change.positive ? 'text-green-600' : 'text-red-600'
            )}>
              {change.positive ? '+' : '-'}{Math.abs(change.value)}% desde el mes anterior
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-lg', bgColors[bgColor])}>
            <Icon className={cn('w-6 h-6', iconColors[bgColor])} />
          </div>
        )}
      </div>
    </div>
  )
}
