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
  AlertCircle,
  Cpu,
  Clock,
  RefreshCw,
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

  // AI Diagnostic and Testing State
  const [aiLoading, setAiLoading] = useState<boolean>(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [eligibleModels, setEligibleModels] = useState<
    Array<{
      id: string
      displayName: string
      description?: string
      supportedGenerationMethods: string[]
      type: string
    }>
  >([])
  const [approvedModel, setApprovedModel] = useState<string | null>(null)
  const [selectedModelToTest, setSelectedModelToTest] = useState<string>('')
  const [isTestingModel, setIsTestingModel] = useState<boolean>(false)
  const [testResult, setTestResult] = useState<{
    ok: boolean
    model: string
    method: string
    httpStatus: number | null
    elapsedMs: number
    code: string
    error?: string | null
    errorBody?: string | null
    approved?: boolean
  } | null>(null)

  const fetchAiDiagnostic = useCallback(async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await api.getAiDiagnostic()
      if (res.ok) {
        setEligibleModels(res.eligibleModels || [])
        setApprovedModel(res.approvedModel)
        if (res.eligibleModels && res.eligibleModels.length > 0 && !selectedModelToTest) {
          setSelectedModelToTest(res.eligibleModels[0].id)
        }
      } else {
        setAiError(res.error || 'Falha ao carregar diagnóstico de IA.')
      }
    } catch (err: unknown) {
      console.error('Error loading AI diagnostic:', err)
      setAiError(err instanceof Error ? err.message : 'Erro ao comunicar com o endpoint de diagnóstico.')
    } finally {
      setAiLoading(false)
    }
  }, [selectedModelToTest])

  const handleTestModel = async () => {
    if (!selectedModelToTest) return
    setIsTestingModel(true)
    setTestResult(null)
    try {
      const res = await api.testAiModel(selectedModelToTest)
      setTestResult(res)
      if (res.ok && res.httpStatus === 200) {
        setApprovedModel(res.model)
      }
    } catch (err: unknown) {
      setTestResult({
        ok: false,
        model: selectedModelToTest,
        method: 'generateContent',
        httpStatus: null,
        elapsedMs: 0,
        code: 'NETWORK_ERROR',
        error: err instanceof Error ? err.message : 'Erro ao executar teste de modelo.',
      })
    } finally {
      setIsTestingModel(false)
    }
  }

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
    fetchAiDiagnostic()
  }, [fetchAdminStats, fetchAiDiagnostic])

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

        {/* AI Model Diagnostic & Execution Management Card */}
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Diagnóstico de IA & Validação de Modelo de Copywriting
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Separação estrita de descoberta e execução. O estúdio usa exclusivamente o modelo testado e aprovado com HTTP 200.
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Modelo Aprovado Atual:</span>
                {approvedModel ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {approvedModel}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Pendente de Validação
                  </span>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {aiLoading ? (
              <div className="py-6 flex items-center justify-center gap-3 text-slate-500 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-[#1463FF]" />
                A consultar modelos elegíveis na Google API...
              </div>
            ) : aiError ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Erro no Diagnóstico:</p>
                  <p>{aiError}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="md:col-span-2 space-y-1.5">
                    <label htmlFor="ai-model-select" className="text-xs font-semibold text-slate-700 block">
                      Escolha o modelo elegível a testar ({eligibleModels.length} modelos de texto encontrados):
                    </label>
                    <select
                      id="ai-model-select"
                      value={selectedModelToTest}
                      onChange={(e) => setSelectedModelToTest(e.target.value)}
                      disabled={isTestingModel}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
                    >
                      {eligibleModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName} ({m.id}) — Tipo: {m.type.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Button
                      id="btn-test-ai-model"
                      onClick={handleTestModel}
                      disabled={isTestingModel || !selectedModelToTest}
                      className="w-full h-10 text-xs font-semibold"
                    >
                      {isTestingModel ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          A testar modelo (máx 8s)...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5" />
                          Testar Modelo
                        </span>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Test Result Display */}
                {testResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      testResult.ok && testResult.httpStatus === 200
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-2">
                        {testResult.ok && testResult.httpStatus === 200 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>
                          Resultado do Teste: {testResult.model} (Status HTTP {testResult.httpStatus || 'N/A'})
                        </span>
                      </div>
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        {testResult.elapsedMs} ms
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/50">
                      <div><span className="font-semibold">Modelo:</span> {testResult.model}</div>
                      <div><span className="font-semibold">Método:</span> {testResult.method}</div>
                      <div><span className="font-semibold">Status HTTP:</span> {testResult.httpStatus || 'Erro de Ligação'}</div>
                      <div><span className="font-semibold">Código:</span> {testResult.code}</div>
                    </div>

                    {testResult.ok && testResult.httpStatus === 200 ? (
                      <p className="font-semibold text-emerald-700 pt-1">
                        ✓ Sucesso confirmado (HTTP 200). Este modelo foi gravado como o modelo aprovado de copywriting para todos os projetos do estúdio.
                      </p>
                    ) : (
                      <div className="space-y-1 pt-1">
                        <p className="font-semibold text-rose-700">
                          {testResult.error || 'O modelo falhou na inferência.'}
                        </p>
                        {testResult.errorBody && (
                          <div className="mt-2 p-2.5 rounded-lg bg-white/80 border border-rose-200 font-mono text-[10px] text-rose-800 break-all max-h-36 overflow-y-auto">
                            <span className="font-bold block mb-1">Resposta sanitizada do provedor:</span>
                            {testResult.errorBody}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
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
