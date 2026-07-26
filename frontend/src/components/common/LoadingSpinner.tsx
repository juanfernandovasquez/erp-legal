import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  inline?: boolean
}

export function LoadingSpinner({ size = 'md', inline = false }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  }

  const spinner = (
    <svg
      className={cn('animate-spin text-primary-700', sizeClasses[size])}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )

  if (inline || size === 'sm') {
    return spinner
  }

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="text-center">
        <div className="mb-4 flex justify-center">{spinner}</div>
        <p className="text-slate-600 font-medium">Cargando...</p>
      </div>
    </div>
  )
}
