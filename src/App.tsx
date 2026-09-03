import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { RoleGuard } from '@/features/auth/components/RoleGuard'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { UnauthorizedPage } from '@/features/auth/pages/UnauthorizedPage'
import { AppLayout } from '@/components/layout/AppLayout'
import { UserDashboardPage } from '@/features/projects/pages/UserDashboardPage'
import { NewProjectPage } from '@/features/projects/pages/NewProjectPage'
import { ProjectDetailPage } from '@/features/projects/pages/ProjectDetailPage'
import { ProjectBrandPage } from '@/features/projects/pages/ProjectBrandPage'
import { StudioPage } from '@/features/studio/pages/StudioPage'
import { TemplatesPage } from '@/features/templates/pages/TemplatesPage'
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage'
import { AdminTemplatesPage } from '@/features/admin/pages/AdminTemplatesPage'
import { AdminTemplatePreviewPage } from '@/features/admin/pages/AdminTemplatePreviewPage'
import { LoadingState } from '@/components/ui/LoadingState'

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingState message="A inicializar o Blue Bolt Page Studio..." fullPage />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to="/user" replace />
}

const PublicLoginRoute: React.FC = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingState message="A verificar sessão..." fullPage />
  }

  if (user) {
    return <Navigate to="/user" replace />
  }

  return <LoginPage />
}

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public / Auth routes */}
          <Route path="/login" element={<PublicLoginRoute />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* User Dashboard */}
            <Route path="/user" element={<UserDashboardPage />} />

            {/* Templates Gallery */}
            <Route path="/templates" element={<TemplatesPage />} />

            {/* Project Creation, Details & Brand Identity */}
            <Route path="/projects/new" element={<NewProjectPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="/projects/:projectId/brand" element={<ProjectBrandPage />} />

            {/* Admin-only Routes */}
            <Route
              path="/admin"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/templates"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AdminTemplatesPage />
                </RoleGuard>
              }
            />
            <Route
              path="/admin/templates/:templateId/preview"
              element={
                <RoleGuard allowedRoles={['admin']}>
                  <AdminTemplatePreviewPage />
                </RoleGuard>
              }
            />
          </Route>

          {/* Full-width Studio Page (Lot 3) */}
          <Route
            path="/projects/:projectId/studio"
            element={
              <ProtectedRoute>
                <StudioPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
