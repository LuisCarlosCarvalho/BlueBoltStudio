import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield,
  Users,
  FolderKanban,
  CheckCircle2,
  FileJson,
  Sliders,
  History,
  Lock,
  Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

export const AdminDashboardPage: React.FC = () => {
  const [totalUsers, setTotalUsers] = useState<number>(0)
  const [totalProjects, setTotalProjects] = useState<number>(0)
  const [approvedProjects, setApprovedProjects] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAdminStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const stats = await api.getAdminStats()
      setTotalUsers(stats.totalUsers || 0)
      setTotalProjects(stats.totalProjects || 0)
      setApprovedProjects(stats.approvedProjects || 0)
    } catch (err: unknown) {
      console.error('Error loading admin stats:', err)
      const message = err instanceof Error ? err.message : 'Não foi possível carregar as métricas de administração.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdminStats()
  }, [fetchAdminStats])

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header
        title="Painel de Administração"
        subtitle="Controlo global de utilizadores, templates, acessos e parâmetros do estúdio"
      />

      <div className="p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Banner Admin */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#05192D] p-6 rounded-[14px] text-white border border-slate-800 shadow-md">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#064B88] text-xs font-semibold text-blue-200 mb-2">
              <Shield className="w-3.5 h-3.5 text-[#1463FF]" />
              Área Restrita a Administradores
            </div>
            <h2 className="text-xl font-bold">Gestão Global Blue Bolt Page Studio</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-lg">
              Monitore a atividade da agência, parametrize modelos JSON e supervisione todos os projetos e membros.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/user">
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
              >
                Ver Área de Colaborador
              </Button>
            </Link>
          </div>
        </div>

        {/* Real counts metrics */}
        {loading ? (
          <LoadingState message="A calcular estatísticas globais..." />
        ) : error ? (
          <ErrorState
            title="Erro nas métricas de administração"
            message={error}
            onRetry={fetchAdminStats}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Utilizadores Registados
                  </p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1">
                    {totalUsers}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Perfis ativos no sistema</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#064B88] flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Total de Projetos
                  </p>
                  <p className="text-3xl font-extrabold text-[#1463FF] mt-1">
                    {totalProjects}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Todas as páginas da agência</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center">
                  <FolderKanban className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Projetos Aprovados
                  </p>
                  <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                    {approvedProjects}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Páginas aprovadas ou entregues</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Administration Modules (Placeholders for upcoming phases) */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Módulos de Gestão Administrativa</h3>
            <p className="text-xs text-slate-500">
              Funcionalidades planeadas para a governança e infraestrutura do estúdio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Module 1: User Management */}
            <Card className="border border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#064B88] flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle>Gestão de Utilizadores e Roles</CardTitle>
                      <CardDescription>Atribuição de papéis (admin / user) e acessos</CardDescription>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                    Fase 2
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Permitirá aos administradores convidar novos membros para a agência, alterar papéis de utilizadores e revogar acessos de segurança com auditoria completa.
                </p>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Promoção segura de Administrador via SQL / Dashboard
                  </span>
                  <span className="font-semibold text-slate-500">Configurado</span>
                </div>
              </CardContent>
            </Card>

            {/* Module 2: Template Repository */}
            <Card className="border border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <FileJson className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle>Repositório de Templates JSON</CardTitle>
                      <CardDescription>Modelos estruturais e padrões de conversão</CardDescription>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                    Fase 2
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Catálogo centralizado de esquemas JSON para templates de landing pages divididos por nicho (saúde, consultoria, e-commerce, imobiliário).
                </p>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Upload e validação de esquemas JSON
                  </span>
                  <span className="font-semibold text-slate-500">Planeado</span>
                </div>
              </CardContent>
            </Card>

            {/* Module 3: Approval Settings */}
            <Card className="border border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle>Configurações de Fluxo de Aprovação</CardTitle>
                      <CardDescription>Regras de revisão interna e etapas de entrega</CardDescription>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                    Fase 2
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Definição de etapas obrigatórias de controlo de qualidade antes do envio de links de aprovação aos clientes finais.
                </p>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Checklist de conformidade de design & copy
                  </span>
                  <span className="font-semibold text-slate-500">Planeado</span>
                </div>
              </CardContent>
            </Card>

            {/* Module 4: Activity Logs */}
            <Card className="border border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle>Registos de Atividade e Auditoria</CardTitle>
                      <CardDescription>Histórico de edições e acessos do sistema</CardDescription>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                    Fase 2
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Rastreabilidade completa de alterações em projetos, exportações de código e atualizações de briefing efetuadas pela equipa.
                </p>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Timeline de eventos do estúdio
                  </span>
                  <span className="font-semibold text-slate-500">Planeado</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
