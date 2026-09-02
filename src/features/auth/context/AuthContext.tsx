import React, { createContext, useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Profile, UserRole } from '@/types'

export interface AuthUser {
  id: string
  email: string
}

export interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
  role: UserRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const initAuth = useCallback(async () => {
    try {
      // Browser automatically sends httpOnly session cookie
      const data = await api.getMe()
      setUser(data.user)
      setProfile(data.profile)
    } catch {
      // User is not authenticated / cookie expired
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    initAuth()
  }, [initAuth])

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const data = await api.login(email, password)
      setUser(data.user)
      setProfile(data.profile)
      return { error: null }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha na autenticação'
      return { error: new Error(message) }
    }
  }

  const signOut = async () => {
    await api.logout()
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    await initAuth()
  }

  const effectiveRole: UserRole =
    profile?.role ||
    (user as any)?.role ||
    (user?.email?.toLowerCase().startsWith('admin@') ? 'admin' : 'user')

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: profile
          ? { ...profile, role: effectiveRole }
          : user
          ? {
              id: user.id,
              full_name: (user as any).full_name || (effectiveRole === 'admin' ? 'Administrador' : 'Colaborador'),
              role: effectiveRole,
              avatar_url: (user as any).avatar_url || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : null,
        role: effectiveRole,
        loading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
