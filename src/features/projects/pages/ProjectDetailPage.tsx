import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Edit3,
  Save,
  Check,
  Building,
  Calendar,
  LayoutTemplate,
  FileUp,
  Palette,
  Bot,
  Sliders,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Project, BriefingData, ProjectStatus } from '@/types'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { statusMap } from '@/components/ui/statusConfig'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  // Briefing editing state
  const [isEditingBriefing, setIsEditingBriefing] = useState<boolean>(false)
  const [isSavingBriefing, setIsSavingBriefing] = useState<boolean>(false)
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null)
  
  // Editable form fields
  const [editName, setEditName] = useState<string>('')
  const [editClientName, setEditClientName] = useState<string>('')
  const [editClientBusiness, setEditClientBusiness] = useState<string>('')
  const [editObjective, setEditObjective] = useState<string>('')
  const [editTargetAudience, setEditTargetAudience] = useState<string>('')
  const [editCustomerPains, setEditCustomerPains] = useState<string>('')
  const [editServicesProducts, setEditServicesProducts] = useState<string>('')
  const [editMainCta, setEditMainCta] = useState<string>('')
  const [editStatus, setEditStatus] = useState<ProjectStatus>('briefing')

  const fetchProject = useCallback(async () => {
    if (!projectId) return

    setLoading(true)
    setError(null)

    try {
      const p = await api.getProject(projectId)
      setProject(p)
      
      // Initialize edit fields
      const briefing = (p.briefing_data || {}) as BriefingData
      setEditName(p.name || '')
      setEditClientName(p.client_name || '')
      setEditClientBusiness(p.client_business || '')
      setEditObjective(briefing.objective || '')
      setEditTargetAudience(briefing.target_audience || '')
      setEditCustomerPains(briefing.customer_pains || '')
      setEditServicesProducts(briefing.services_products || '')
      setEditMainCta(briefing.main_cta || '')
      setEditStatus(p.status)
    } catch (err: unknown) {
      console.error('Error fetching project detail:', err)
      const message = err instanceof Error ? err.message : 'Não foi possível carregar os detalhes do projeto.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  const handleSaveBriefing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !project) return

    setIsSavingBriefing(true)

    try {
      const updatedBriefing: BriefingData = {
        objective: editObjective,
        target_audience: editTargetAudience,
        customer_pains: editCustomerPains,
        services_products: editServicesProducts,
        main_cta: editMainCta,
        additional_notes: (project.briefing_data as BriefingData)?.additional_notes || '',
      }

      const updated = await api.updateProject(projectId, {
        name: editName,
        client_name: editClientName,
        client_business: editClientBusiness,
        status: editStatus,
        briefing_data: updatedBriefing,
      })

      setProject(updated)
      setIsEditingBriefing(false)
      const nowFormatted = new Date().toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      setLastSavedTimestamp(nowFormatted)
    } catch (err: unknown) {
      console.error('Error saving updated briefing:', err)
      alert('Erro ao guardar as alterações do briefing.')
    } finally {
      setIsSavingBriefing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header title="A carregar projeto..." />
        <LoadingState message="A obter informações do projeto..." fullPage={false} />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header title="Detalhes do Projeto" />
        <div className="p-8 max-w-4xl mx-auto w-full">
          <ErrorState
            title="Projeto não encontrado"
            message={error || 'O projeto solicitado não existe ou não tem permissões para aceder.'}
            onRetry={fetchProject}
          />
          <div className="mt-4 text-center">
            <Link to="/user">
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Voltar ao Painel
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const briefing = (project.briefing_data || {}) as BriefingData

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header
        title={project.name}
        subtitle={`Cliente: ${project.client_name || 'Não especificado'} • Studio ID: ${project.id.slice(0, 8)}`}
      />

      <div className="p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/user"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Projetos
            </Link>
            <div className="h-4 w-px bg-slate-300" />
            <StatusBadge status={project.status} />
          </div>

          <div className="flex items-center gap-3">
            {lastSavedTimestamp && (
              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Guardado às {lastSavedTimestamp}</span>
              </div>
            )}

            {!isEditingBriefing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingBriefing(true)}
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              >
                Editar Briefing
              </Button>
            )}
          </div>
        </div>

        {/* Project Header Overview Card */}
        <Card className="bg-gradient-to-r from-slate-900 via-[#064B88] to-slate-900 text-white border-0 shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-blue-200 text-xs font-medium">
                  <Building className="w-3.5 h-3.5 text-[#1463FF]" />
                  {project.client_business || 'Setor de Atividade'}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {project.name}
                </h1>
                <p className="text-sm text-blue-100/90 font-medium">
                  Cliente: <span className="text-white font-semibold">{project.client_name || 'N/A'}</span>
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-blue-200/80 bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-white/10 shrink-0">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-300 font-semibold">
                    Criado em
                  </p>
                  <p className="font-medium text-white mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#1463FF]" />
                    {new Date(project.created_at).toLocaleDateString('pt-PT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="h-7 w-px bg-white/10" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-300 font-semibold">
                    Última Atualização
                  </p>
                  <p className="font-medium text-white mt-0.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#1463FF]" />
                    {new Date(project.updated_at).toLocaleTimeString('pt-PT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Grid: Briefing Details & Future Studio Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 cols): Strategic Briefing */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <CardTitle>Briefing Estratégico do Projeto</CardTitle>
                    <CardDescription>
                      Diretrizes de conteúdo e requisitos essenciais para a landing page
                    </CardDescription>
                  </div>
                  {isEditingBriefing && (
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Modo de Edição
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isEditingBriefing ? (
                  <form onSubmit={handleSaveBriefing} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Nome do Projeto"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                      <Input
                        label="Nome do Cliente"
                        value={editClientName}
                        onChange={(e) => setEditClientName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Ramo de Atividade"
                        value={editClientBusiness}
                        onChange={(e) => setEditClientBusiness(e.target.value)}
                        required
                      />
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
                          Estado do Projeto
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                          className="w-full rounded-[10px] border border-slate-200 text-sm text-slate-900 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
                        >
                          {Object.entries(statusMap).map(([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <Textarea
                      label="Objetivo Principal"
                      value={editObjective}
                      onChange={(e) => setEditObjective(e.target.value)}
                      rows={3}
                      required
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Textarea
                        label="Público-Alvo"
                        value={editTargetAudience}
                        onChange={(e) => setEditTargetAudience(e.target.value)}
                        rows={2}
                      />
                      <Textarea
                        label="Dores e Necessidades"
                        value={editCustomerPains}
                        onChange={(e) => setEditCustomerPains(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Textarea
                        label="Serviços / Produtos"
                        value={editServicesProducts}
                        onChange={(e) => setEditServicesProducts(e.target.value)}
                        rows={2}
                      />
                      <Input
                        label="Call-to-Action Principal"
                        value={editMainCta}
                        onChange={(e) => setEditMainCta(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingBriefing(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isSavingBriefing}
                        leftIcon={<Save className="w-3.5 h-3.5" />}
                      >
                        Guardar Alterações
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Objetivo do Projeto
                      </h4>
                      <p className="text-sm text-slate-800 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed font-medium">
                        {briefing.objective || 'Nenhum objetivo especificado.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Público-Alvo
                        </h4>
                        <p className="text-xs text-slate-700 bg-slate-50/80 p-3 rounded-lg border border-slate-200/80">
                          {briefing.target_audience || 'Não especificado.'}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Dores do Cliente
                        </h4>
                        <p className="text-xs text-slate-700 bg-slate-50/80 p-3 rounded-lg border border-slate-200/80">
                          {briefing.customer_pains || 'Não especificado.'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Serviços / Produtos
                        </h4>
                        <p className="text-xs text-slate-700 bg-slate-50/80 p-3 rounded-lg border border-slate-200/80">
                          {briefing.services_products || 'Não especificado.'}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Call-To-Action Principal
                        </h4>
                        <p className="text-xs text-slate-700 bg-blue-50/50 p-3 rounded-lg border border-blue-100 font-semibold text-[#064B88]">
                          {briefing.main_cta || 'Não especificado.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (1 col): Planned Studio Modules (Placeholders) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Módulos do Estúdio</h3>
              <span className="text-[10px] font-bold text-[#1463FF] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Fase 2 &bull; Próxima Etapa
              </span>
            </div>

            {/* Module 1: Template */}
            <Card className="border border-slate-200 opacity-90 hover:opacity-100 transition-opacity">
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Template Base</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      Pendente
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Seleção de estrutura de página de alta conversão.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Module 1.1: Intelligent Content Mapping Placeholder */}
            <Card className="border border-slate-200 opacity-90 hover:opacity-100 transition-opacity">
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0">
                  <FileUp className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Importar conteúdo para o template</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#064B88]">
                      Fase 2
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Mapeamento inteligente via IA a partir de texto colado, .txt, .docx, PDF ou briefing diretamente para as secções do template com ecrã de revisão prévia.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Module 2: Identidade Visual */}
            <Card className="border border-slate-200 opacity-90 hover:opacity-100 transition-opacity">
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Palette className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Identidade Visual</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      Pendente
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Paleta de cores do cliente, tipografia e logótipos.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Module 3: Agente IA */}
            <Card className="border border-slate-200 opacity-90 hover:opacity-100 transition-opacity">
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#1463FF] flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Gerador IA</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#064B88]">
                      Fase 2
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Geração de copy persuasivo com base no briefing.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Module 4: Editor Visual */}
            <Card className="border border-slate-200 opacity-90 hover:opacity-100 transition-opacity">
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Editor Visual</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      Pendente
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ajuste fino de blocos, secções e tipografia em tempo real.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Module 5: Aprovação */}
            <Card className="border border-slate-200 opacity-90 hover:opacity-100 transition-opacity">
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Portal de Aprovação</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      Pendente
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Fluxo de revisão interna e aprovação direta pelo cliente.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
