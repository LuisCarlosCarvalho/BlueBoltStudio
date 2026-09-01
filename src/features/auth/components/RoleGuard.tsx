import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { UnauthorizedPage } from '../pages/UnauthorizedPage'
import { LoadingState } from '@/components/ui/LoadingState'
import type { UserRole } from '@/types'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { role, loading } = useAuth()

  if (loading) {
    return <LoadingState message="A verificar permissões..." fullPage />
  }

  // Admins can access everything, otherwise check if user's role is allowed
  const hasAccess = role === 'admin' || (role && allowedRoles.includes(role))

  if (!hasAccess) {
    return <UnauthorizedPage />
  }

  return <>{children}</>
}
