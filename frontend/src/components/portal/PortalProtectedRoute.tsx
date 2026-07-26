import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useClientPortalStore } from '@/stores/clientPortalStore'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export function PortalProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, client, checkAuth } = useClientPortalStore()

  useEffect(() => {
    // Always rehydrate client data from token on mount
    if (localStorage.getItem('portalToken') && !client) {
      checkAuth()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner inline />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />
  }

  return <>{children}</>
}
