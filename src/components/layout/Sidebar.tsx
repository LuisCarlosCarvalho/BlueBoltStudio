import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  FolderKanban,
  LayoutTemplate,
  Palette,
  Workflow,
  HelpCircle,
  Shield,
  UserCheck,
  FileCode2,
} from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { clsx } from 'clsx'

export const Sidebar: React.FC = () => {
  const { profile, user, role } = useAuth()

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Colaborador'
  const userInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'U'

  return (
    <aside className="w-64 bg-[#05192D] text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 select-none border-r border-slate-800">
      {/* Brand logo & Studio name */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 shadow-inner shrink-0">
          <img
            src="/logo.png"
            alt="Blue Bolt Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <span className="font-bold text-white tracking-tight text-sm block leading-tight">
            Blue Bolt
          </span>
          <span className="text-[11px] font-medium text-[#1463FF] tracking-wide block uppercase">
            Page Studio
          </span>
        </div>
      </div>

      {/* Navigation menu */}
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Navegação Principal
          </div>
          <nav className="space-y-1">
            <NavLink
              to="/user"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-xs font-semibold transition-colors duration-150',
                  isActive
                    ? 'bg-[#1463FF] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                )
              }
            >
              <FolderKanban className="w-4 h-4 shrink-0" />
              <span>Projetos</span>
            </NavLink>

            {/* Active Phase 2 Route: Templates Gallery */}
            <NavLink
              to="/templates"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-xs font-semibold transition-colors duration-150',
                  isActive
                    ? 'bg-[#1463FF] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                )
              }
            >
              <LayoutTemplate className="w-4 h-4 shrink-0" />
              <span>Templates</span>
            </NavLink>

            {/* Phase 4 Active Route: Identidade Visual por Projeto */}
            <NavLink
              to={(() => {
                const match = window.location.pathname.match(/\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i) || window.location.pathname.match(/\/projects\/([^/]+)/)
                if (match && match[1] && match[1] !== 'new') {
                  return `/projects/${match[1]}/brand`
                }
                return '/user?notice=select_project_brand'
              })()}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-xs font-semibold transition-colors duration-150',
                  isActive
                    ? 'bg-[#1463FF] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                )
              }
            >
              <Palette className="w-4 h-4 shrink-0" />
              <span>Identidade Visual</span>
            </NavLink>

            <div
              className="flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium text-slate-500 cursor-not-allowed"
              title="Módulo em desenvolvimento para a próxima fase"
            >
              <div className="flex items-center gap-3">
                <Workflow className="w-4 h-4 shrink-0" />
                <span>Fluxo</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                Brevemente
              </span>
            </div>
          </nav>
        </div>

        {/* Administration section if user is admin */}
        {role === 'admin' && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Administração
            </div>
            <nav className="space-y-1">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-xs font-semibold transition-colors duration-150',
                    isActive
                      ? 'bg-[#064B88] text-white border border-[#1463FF]/30 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  )
                }
              >
                <Shield className="w-4 h-4 text-[#1463FF] shrink-0" />
                <span>Painel Admin</span>
              </NavLink>

              <NavLink
                to="/admin/templates"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-xs font-semibold transition-colors duration-150',
                    isActive
                      ? 'bg-[#064B88] text-white border border-[#1463FF]/30 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  )
                }
              >
                <FileCode2 className="w-4 h-4 text-[#1463FF] shrink-0" />
                <span>Gestão Templates</span>
              </NavLink>
            </nav>
          </div>
        )}

        <div>
          <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Ajuda
          </div>
          <div
            className="flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium text-slate-500 cursor-not-allowed"
            title="Módulo de suporte e documentação interna"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>Suporte</span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              Brevemente
            </span>
          </div>
        </div>
      </div>

      {/* Profile area at bottom */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 p-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-[#064B88] text-white font-semibold text-xs flex items-center justify-center shrink-0">
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
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="capitalize">{role === 'admin' ? 'Administrador' : 'Colaborador'}</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
