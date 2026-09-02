import React from 'react'
import { LogOut, Shield } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'

interface HeaderProps {
  title?: string
  subtitle?: string
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { user, profile, role, signOut } = useAuth()

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Colaborador'
  const userInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'U'

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0">
      <div className="min-w-0 pr-3">
        {title && <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">{title}</h1>}
        {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {/* User badge */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#064B88] text-white font-semibold text-xs flex items-center justify-center shadow-xs">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>{userInitials}</span>
              )}
            </div>
            <div className="hidden sm:block text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-800 leading-none">
                  {displayName}
                </span>
                {role === 'admin' && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-[#064B88] uppercase">
                    <Shield className="w-2.5 h-2.5" />
                    Admin
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 block leading-tight truncate max-w-[150px]">
                {user?.email}
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            title="Terminar sessão"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-200"
            aria-label="Terminar sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
