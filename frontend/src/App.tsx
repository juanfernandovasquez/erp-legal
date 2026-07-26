import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

import { LoginPage } from '@/pages/auth/LoginPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { CasesListPage } from '@/pages/cases/CasesListPage'
import { CaseDetailPage } from '@/pages/cases/CaseDetailPage'
import { NewCasePage } from '@/pages/cases/NewCasePage'
import { TasksPage } from '@/pages/tasks/TasksPage'
import { HoursPage } from '@/pages/hours/HoursPage'
import { AlertsPage } from '@/pages/alerts/AlertsPage'
import { ClientsListPage } from '@/pages/clients/ClientsListPage'
import { ClientDetailPage } from '@/pages/clients/ClientDetailPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import EmailsPage from '@/pages/emails/EmailsPage'
import { ErrorLogsPage } from '@/pages/admin/ErrorLogsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PortalLoginPage } from '@/pages/portal/PortalLoginPage'
import { PortalHomePage } from '@/pages/portal/PortalHomePage'
import { PortalCasesPage } from '@/pages/portal/PortalCasesPage'
import { PortalCaseDetailPage } from '@/pages/portal/PortalCaseDetailPage'
import { PortalProfilePage } from '@/pages/portal/PortalProfilePage'
import { PortalProtectedRoute } from '@/components/portal/PortalProtectedRoute'

export default function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [])

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
        />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cases"
          element={
            <ProtectedRoute>
              <CasesListPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cases/new"
          element={
            <ProtectedRoute>
              <NewCasePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cases/:id"
          element={
            <ProtectedRoute>
              <CaseDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TasksPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hours"
          element={
            <ProtectedRoute>
              <HoursPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <AlertsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <ClientsListPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients/:id"
          element={
            <ProtectedRoute>
              <ClientDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/emails"
          element={
            <ProtectedRoute>
              <EmailsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/errors"
          element={
            <ProtectedRoute>
              <ErrorLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Client Portal — separate auth, no AppLayout */}
        <Route path="/portal/login" element={<PortalLoginPage />} />
        <Route
          path="/portal/inicio"
          element={<PortalProtectedRoute><PortalHomePage /></PortalProtectedRoute>}
        />
        <Route
          path="/portal/asuntos"
          element={<PortalProtectedRoute><PortalCasesPage /></PortalProtectedRoute>}
        />
        <Route
          path="/portal/asuntos/:id"
          element={<PortalProtectedRoute><PortalCaseDetailPage /></PortalProtectedRoute>}
        />
        <Route
          path="/portal/perfil"
          element={<PortalProtectedRoute><PortalProfilePage /></PortalProtectedRoute>}
        />
        <Route path="/portal" element={<Navigate to="/portal/login" />} />

        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  )
}
