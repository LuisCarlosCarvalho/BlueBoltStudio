import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowUpRight,
  Sparkles,
  Building2,
  Calendar,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { Project } from '@/types'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await api.getProjects()
      setProjects(data || [])
    } catch (err: unknown) {
      console.error('Error fetching user projects:', err)
      const message = err instanceof Error ? err.message : 'Não foi possível carregar a lista de projetos.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchProjects()
    }
  }, [user, fetchProjects])

  // Computed metrics from real data
  const totalProjects = projects.length
  const inProgressProjects = projects.filter((p) => p.status === 'building' || p.status === 'briefing').length
  const inReviewProjects = projects.filter(
    (p) => p.status === 'internal_review' || p.status === 'client_review' || p.status === 'changes_requested'
  ).length
  const approvedProjects = projects.filter((p) => p.status === 'approved' || p.status === 'delivered').length

  const filteredProjects = projects.filter((p) => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    return (
      p.name.toLowerCase().includes(term) ||
      (p.client_name && p.client_name.toLowerCase().includes(term)) ||
      (p.client_business && p.client_business.toLowerCase().includes(term))
    )
  })

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header
        title="Painel de Projetos"
        subtitle="Gestão, criação e acompanhamento de landing pages da agência"
      />

      <div className="p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Top welcome action banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-[#064B88] to-[#1463FF] p-6 rounded-[14px] text-white shadow-md">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Blue Bolt Studio
            </div>
            <h2 className="text-xl font-bold">Criação de Páginas de Alta Conversão</h2>
            <p className="text-xs text-blue-100 mt-1 max-w-lg">
              Inicie um novo projeto a partir do briefing detalhado do cliente ou continue a trabalhar nos seus projetos ativos.
            </p>
          </div>
          <Link to="/projects/new">
            <Button
              variant="outline"
              size="lg"
              className="bg-white text-[#064B88] hover:bg-blue-50 border-white font-bold shrink-0 shadow-sm"
              leftIcon={<Plus className="w-4 h-4 text-[#1463FF]" />}
            >
              Criar Novo Projeto
            </Button>
          </Link>
        </div>

        {/* Metrics overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:border-slate-300 transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Total de Projetos
                </p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {totalProjects}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-slate-300 transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Em Desenvolvimento
                </p>
                <p className="text-2xl font-extrabold text-[#1463FF] mt-1">
                  {inProgressProjects}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-slate-300 transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Em Revisão
                </p>
                <p className="text-2xl font-extrabold text-purple-600 mt-1">
                  {inReviewProjects}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-slate-300 transition-colors">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Aprovados
                </p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {approvedProjects}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent projects section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Projetos Recentes</h3>
              <p className="text-xs text-slate-500">
                Páginas e landing pages atribuídas ao seu utilizador
              </p>
            </div>

            {projects.length > 0 && (
              <div className="w-full sm:w-72">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Pesquisar por projeto ou cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-[10px] border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Content state handling */}
          {loading ? (
            <LoadingState message="A carregar projetos..." />
          ) : error ? (
            <ErrorState
              title="Erro ao carregar projetos"
              message={error}
              onRetry={fetchProjects}
            />
          ) : projects.length === 0 ? (
            <EmptyState
              title="Nenhum projeto encontrado"
              description="Ainda não tem projetos criados ou atribuídos na sua conta. Comece por registar o primeiro briefing de cliente."
              actionLabel="Criar Primeiro Projeto"
              onAction={() => window.location.assign('/projects/new')}
            />
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[12px] border border-slate-200">
              <p className="text-sm text-slate-600 font-medium">
                Nenhum projeto corresponde aos termos de pesquisa "{searchTerm}".
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-[#1463FF]"
                onClick={() => setSearchTerm('')}
              >
                Limpar pesquisa
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="group block"
                >
                  <Card className="h-full border border-slate-200 hover:border-[#1463FF]/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 group-hover:text-[#1463FF] transition-colors truncate text-sm">
                            {project.name}
                          </h4>
                          {project.client_name && (
                            <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{project.client_name}</span>
                              {project.client_business && (
                                <span className="text-slate-400">&bull; {project.client_business}</span>
                              )}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={project.status} size="sm" />
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(project.created_at).toLocaleDateString('pt-PT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-[#1463FF] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          Abrir Studio
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
