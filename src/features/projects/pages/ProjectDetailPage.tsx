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
  FileText,
  Palette,
  Bot,
  Sliders,
  Clock,
  Sparkles,
  Layers,
  FileUp,
  AlertCircle,
  RefreshCw,
  Info,
  CheckCircle2,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Project, BriefingData, ProjectStatus, Template, ProjectContentSource } from '@/types'
import { getIndustryLabel, INDUSTRY_OPTIONS } from '@/types'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { statusMap } from '@/components/ui/statusConfig'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { AiContentAssistant } from '../components/AiContentAssistant'

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Briefing editing state
  const [isEditingBriefing, setIsEditingBriefing] = useState<boolean>(false)
  const [isSavingBriefing, setIsSavingBriefing] = useState<boolean>(false)
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null)

  // Editable briefing fields
  const [editName, setEditName] = useState<string>('')
  const [editClientName, setEditClientName] = useState<string>('')
  const [editClientBusiness, setEditClientBusiness] = useState<string>('')
  const [editIndustryKey, setEditIndustryKey] = useState<string>('professional_services')
  const [editIndustryCustom, setEditIndustryCustom] = useState<string>('')
  const [editObjective, setEditObjective] = useState<string>('')
  const [editTargetAudience, setEditTargetAudience] = useState<string>('')
  const [editCustomerPains, setEditCustomerPains] = useState<string>('')
  const [editServicesProducts, setEditServicesProducts] = useState<string>('')
  const [editMainCta, setEditMainCta] = useState<string>('')
  const [editStatus, setEditStatus] = useState<ProjectStatus>('briefing')

  // Phase 2/3: Template Selection & Recommendation State
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [recommendedTemplateId, setRecommendedTemplateId] = useState<string | null>(null)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false)
  const [selectedModalTemplateId, setSelectedModalTemplateId] = useState<string>('')
  const [isAssigningTemplate, setIsAssigningTemplate] = useState<boolean>(false)
  const [templateAssignMessage, setTemplateAssignMessage] = useState<string | null>(null)
  const [isChangeConfirmOpen, setIsChangeConfirmOpen] = useState<boolean>(false)

  // Phase 2: Content Sources State
  const [contentSources, setContentSources] = useState<ProjectContentSource[]>([])
  const [pastedText, setPastedText] = useState<string>('')
  const [isSavingContent, setIsSavingContent] = useState<boolean>(false)
  const [contentSaveSuccess, setContentSaveSuccess] = useState<string | null>(null)
  const [contentSaveError, setContentSaveError] = useState<string | null>(null)

  const fetchProjectData = useCallback(async () => {
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
      setEditIndustryKey(briefing.industry_key || 'professional_services')
      setEditIndustryCustom(briefing.industry_custom || '')
      setEditObjective(briefing.objective || '')
      setEditTargetAudience(briefing.target_audience || '')
      setEditCustomerPains(briefing.customer_pains || '')
      setEditServicesProducts(briefing.services_products || '')
      setEditMainCta(briefing.main_cta || '')
      setEditStatus(p.status)

      // Load active templates for selection
      const templatesList = await api.getTemplates()
      setAvailableTemplates(templatesList || [])

      // Resolve current selected template if present
      if (p.selected_template_id) {
        const found = templatesList.find((t) => t.id === p.selected_template_id)
        if (found) {
          setSelectedTemplate(found)
        } else {
          try {
            const single = await api.getTemplate(p.selected_template_id)
            setSelectedTemplate(single)
          } catch {
            // Template might be draft/archived
          }
        }
      } else {
        setSelectedTemplate(null)
      }

      // Recommend template in background
      try {
        const rec = await api.recommendTemplate(projectId)
        if (rec?.recommended_template_id) {
          setRecommendedTemplateId(rec.recommended_template_id)
        }
      } catch {
        // Non-blocking
      }

      // Load project content sources history
      const sources = await api.getProjectContentSources(projectId)
      setContentSources(sources || [])
    } catch (err: unknown) {
      console.error('Error fetching project detail:', err)
      const message = err instanceof Error ? err.message : 'Não foi possível carregar os detalhes do projeto.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProjectData()
  }, [fetchProjectData])

  const handleSaveBriefing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !project) return

    setIsSavingBriefing(true)

    try {
      const updatedBriefing: BriefingData = {
        industry_key: editIndustryKey,
        industry_custom: editIndustryCustom,
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
    } catch {
      alert('Erro ao guardar as alterações do briefing.')
    } finally {
      setIsSavingBriefing(false)
    }
  }

  const handleConfirmTemplateSelection = async () => {
    if (!projectId || !selectedModalTemplateId) return

    setIsAssigningTemplate(true)
    setTemplateAssignMessage(null)

    try {
      const result = await api.assignProjectTemplate(projectId, selectedModalTemplateId)
      setProject(result.project)
      setSelectedTemplate(result.template)
      setTemplateAssignMessage(`Template '${result.template.name}' associado com sucesso!`)
      setIsTemplateModalOpen(false)
      setIsChangeConfirmOpen(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao associar o template.')
    } finally {
      setIsAssigningTemplate(false)
    }
  }

  const handleSavePastedContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return

    if (!selectedTemplate) {
      setContentSaveError('Por favor selecione um Template Base antes de importar o conteúdo.')
      return
    }

    if (!pastedText.trim()) {
      setContentSaveError('Introduza o texto fornecido pelo cliente antes de guardar.')
      return
    }

    setIsSavingContent(true)
    setContentSaveSuccess(null)
    setContentSaveError(null)

    try {
      const res = await api.addProjectContentSource(projectId, pastedText.trim(), 'pasted_text')
      setContentSaveSuccess(res.message || 'Conteúdo do cliente registado com sucesso no projeto.')
      setPastedText('')
      // Refresh content sources list
      const sources = await api.getProjectContentSources(projectId)
      setContentSources(sources || [])
    } catch (err) {
      setContentSaveError(err instanceof Error ? err.message : 'Erro ao guardar o conteúdo.')
    } finally {
      setIsSavingContent(false)
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
            onRetry={fetchProjectData}
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

            <Link to={`/projects/${project.id}/brand`}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Palette className="w-3.5 h-3.5" />}
              >
                Identidade Visual
              </Button>
            </Link>

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
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-blue-200 text-xs font-medium">
                    <Building className="w-3.5 h-3.5 text-[#1463FF]" />
                    {project.client_business || 'Setor de Atividade'}
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30 text-xs font-semibold">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    Segmento: {getIndustryLabel((project.briefing_data as BriefingData)?.industry_key)}
                  </div>
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

        {/* Phase 2: Live Feedback Alert */}
        {templateAssignMessage && (
          <div className="p-4 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{templateAssignMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setTemplateAssignMessage(null)}
              className="text-xs text-emerald-700 font-bold hover:underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Main Grid: Briefing Details & Studio Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 cols): Strategic Briefing & Content Sources */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Briefing Card */}
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
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
                          Segmento do Negócio
                        </label>
                        <select
                          value={editIndustryKey}
                          onChange={(e) => setEditIndustryKey(e.target.value)}
                          className="w-full rounded-[10px] border border-slate-200 text-sm text-slate-900 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
                        >
                          {INDUSTRY_OPTIONS.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Input
                        label="Ramo / Nicho Específico"
                        value={editClientBusiness}
                        onChange={(e) => setEditClientBusiness(e.target.value)}
                        required
                      />
                    </div>

                    {editIndustryKey === 'other' && (
                      <Input
                        label="Especificação do Segmento Personalizado"
                        value={editIndustryCustom}
                        onChange={(e) => setEditIndustryCustom(e.target.value)}
                        placeholder="Ex: Aluguer de Drones para Agricultura"
                        required
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* 2. Content Import & Client Material (Phase 2 Real Implementation) */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1463FF] flex items-center justify-center">
                      <FileUp className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle>Importar Conteúdo para o Template</CardTitle>
                      <CardDescription>
                        Registo do material bruto, textos e referências fornecidos pelo cliente
                      </CardDescription>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1463FF] border border-blue-100">
                    Fase 2 Ativa
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Informative Alert about AI Phase 3 */}
                <div className="p-4 rounded-[12px] bg-blue-50/80 border border-blue-200 text-[#064B88] text-xs flex items-start gap-3">
                  <Info className="w-4 h-4 text-[#1463FF] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">Preparação do Conteúdo Estruturado</p>
                    <p className="text-blue-900/80 leading-relaxed">
                      Na próxima fase, a IA irá sugerir a distribuição deste conteúdo pelas secções do template selecionado.
                    </p>
                  </div>
                </div>

                {!selectedTemplate ? (
                  <div className="p-6 rounded-[12px] bg-amber-50/70 border border-amber-200 text-center space-y-2">
                    <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                    <p className="text-xs font-bold text-amber-900">
                      É necessário selecionar um Template Base primeiro
                    </p>
                    <p className="text-xs text-amber-700 max-w-md mx-auto">
                      Para importar conteúdos com precisão de mapeamento, escolha primeiro o template no módulo lateral.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsTemplateModalOpen(true)}
                      className="mt-2 bg-[#1463FF] hover:bg-[#064B88] text-xs font-bold"
                    >
                      Escolher Template Agora
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSavePastedContent} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Texto do Cliente (Material de Apoio / Briefing Completo):
                      </label>
                      <span className="text-[11px] font-mono text-slate-400">
                        {pastedText.length} / 50.000 caracteres
                      </span>
                    </div>

                    <textarea
                      value={pastedText}
                      onChange={(e) => {
                        setPastedText(e.target.value)
                        if (contentSaveError) setContentSaveError(null)
                      }}
                      placeholder="Cole aqui o texto enviado pelo cliente (proposta, apresentação, rascunho de site, emails explicativos, notas de reuniões)..."
                      rows={5}
                      className="w-full p-3.5 text-xs rounded-[10px] border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF] leading-relaxed"
                    />

                    {contentSaveError && (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                        {contentSaveError}
                      </div>
                    )}

                    {contentSaveSuccess && (
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{contentSaveSuccess}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isSavingContent}
                        disabled={!pastedText.trim() || isSavingContent}
                        className="bg-[#1463FF] hover:bg-[#064B88] font-bold text-xs shadow-sm"
                        leftIcon={<Save className="w-3.5 h-3.5" />}
                      >
                        Guardar Fonte de Conteúdo
                      </Button>
                    </div>
                  </form>
                )}

                {/* Content History List */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Histórico de Fontes Importadas ({contentSources.length})
                    </h4>
                  </div>

                  {contentSources.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      Nenhuma fonte de conteúdo registada até ao momento.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {contentSources.map((source, idx) => (
                        <div
                          key={source.id}
                          className="p-3 rounded-[10px] bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-slate-500 text-[11px]">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-[#1463FF]" />
                              Fonte #{contentSources.length - idx} &bull; Texto Colado
                            </span>
                            <span>
                              {new Date(source.created_at).toLocaleDateString('pt-PT', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-700 line-clamp-2 italic bg-white p-2 rounded border border-slate-100 font-mono text-[11px]">
                            "{source.extracted_text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 3. AI Content Assistant (Phase 3 Real Implementation) */}
            <AiContentAssistant
              project={project}
              selectedTemplate={selectedTemplate}
              contentSources={contentSources}
              onProjectUpdated={(updated) => {
                setProject(updated)
              }}
              onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
            />
          </div>

          {/* Right Column (1 col): Active Studio Modules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Módulos do Estúdio</h3>
              <span className="text-[10px] font-bold text-[#1463FF] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                Fase 3 &bull; Ativa
              </span>
            </div>

            {/* Module 1: Template Base (Real Phase 2 Implementation) */}
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedTemplate ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-[#1463FF]'
                  }`}>
                    <LayoutTemplate className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">Template Base</h4>
                      {selectedTemplate ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Pendente
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Estrutura de secções da página de alta conversão.
                    </p>
                  </div>
                </div>

                {selectedTemplate ? (
                  <div className="p-3.5 rounded-[12px] bg-slate-50 border border-slate-200 space-y-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-[#1463FF] uppercase tracking-wider">
                        {selectedTemplate.category}
                      </span>
                      <h5 className="text-sm font-bold text-slate-900">{selectedTemplate.name}</h5>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedTemplate.schema?.sections?.length || 0} Secções estruturadas</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsChangeConfirmOpen(true)}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 w-full"
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                      >
                        Alterar Template
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                      Nenhum template selecionado. Escolha um template da galeria da agência para estruturar as secções da página.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsTemplateModalOpen(true)}
                      className="w-full bg-[#1463FF] hover:bg-[#064B88] text-xs font-bold shadow-sm"
                      leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                    >
                      Escolher Template
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Module 2: Mapeamento Inteligente IA (Phase 3 Real Implementation) */}
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Mapeamento Inteligente (IA)</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1463FF] border border-blue-100 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Ativo
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Geração e distribuição assistida de conteúdo com validação humana.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Module 3: Identidade Visual (Phase 4 Real Implementation) */}
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center shrink-0">
                  <Palette className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Identidade Visual</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Ativo
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 mb-2.5">
                    Cores, tipografia e diretrizes da marca do cliente.
                  </p>
                  <Link to={`/projects/${project.id}/brand`}>
                    <Button variant="outline" size="sm" className="w-full text-xs font-bold text-[#1463FF] border-blue-200 hover:bg-blue-50">
                      Gerir Identidade Visual
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Module 4: Personalização & Revisão (Phase 4) */}
            <Card className="border border-slate-200 opacity-80 hover:opacity-100 transition-opacity">
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Personalização & Revisão</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      Brevemente
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ajuste fino de blocos e aprovação pela equipa.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal: Template Selection Dialog */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Selecionar Template Base</h3>
                  <p className="text-xs text-slate-500">Escolha a estrutura de secções para este projeto</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {availableTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-500">Nenhum template ativo disponível na agência.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {(() => {
                    const projectIndKey = (project?.briefing_data as BriefingData | undefined)?.industry_key
                    const sorted = [...availableTemplates].sort((a, b) => {
                      const aIsRec = a.id === recommendedTemplateId ? 1 : 0
                      const bIsRec = b.id === recommendedTemplateId ? 1 : 0
                      if (aIsRec !== bIsRec) return bIsRec - aIsRec

                      const aMatchesInd = projectIndKey && a.industry_tags?.includes(projectIndKey) ? 1 : 0
                      const bMatchesInd = projectIndKey && b.industry_tags?.includes(projectIndKey) ? 1 : 0
                      if (aMatchesInd !== bMatchesInd) return bMatchesInd - aMatchesInd

                      const aGen = a.is_generic ? 1 : 0
                      const bGen = b.is_generic ? 1 : 0
                      if (aGen !== bGen) return bGen - aGen

                      return a.name.localeCompare(b.name)
                    })

                    return sorted.map((t) => {
                      const isSelected = selectedModalTemplateId === t.id
                      const sections = t.schema?.sections || []
                      const isRec = t.id === recommendedTemplateId
                      const matchesIndustry = Boolean(
                        projectIndKey && t.industry_tags && t.industry_tags.includes(projectIndKey)
                      )

                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedModalTemplateId(t.id)}
                          className={`p-4 rounded-[12px] border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'border-[#1463FF] bg-blue-50/50 ring-2 ring-[#1463FF]/20 shadow-sm'
                              : isRec || matchesIndustry
                              ? 'border-blue-300 bg-blue-50/20 hover:border-[#1463FF]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold text-[#1463FF] uppercase tracking-wider">
                                  {t.category}
                                </span>
                                {isRec && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                    Recomendado pela IA
                                  </span>
                                )}
                                {matchesIndustry && !isRec && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                                    Segmento Compatível
                                  </span>
                                )}
                                {t.is_generic && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    Base Genérica
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-slate-900">{t.name}</h4>
                              <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                              {sections.length} Secções
                            </span>
                          </div>

                          {/* Sections Preview */}
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                            {sections.map((sec) => (
                              <span
                                key={sec.id}
                                className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-medium"
                              >
                                {sec.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-[16px]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTemplateModalOpen(false)}
                disabled={isAssigningTemplate}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmTemplateSelection}
                isLoading={isAssigningTemplate}
                disabled={!selectedModalTemplateId || isAssigningTemplate}
                className="bg-[#1463FF] hover:bg-[#064B88] font-bold text-xs"
              >
                Confirmar Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change Template Confirmation Dialog */}
      {isChangeConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Alterar Template do Projeto</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tem a certeza de que deseja alterar o template deste projeto?
              <br />
              <br />
              <strong className="text-slate-800">
                Nota de Segurança: O briefing, notas do cliente e fontes de conteúdo existentes NÃO serão apagados.
              </strong>
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsChangeConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsChangeConfirmOpen(false)
                  setSelectedModalTemplateId(selectedTemplate?.id || '')
                  setIsTemplateModalOpen(true)
                }}
                className="bg-[#1463FF] hover:bg-[#064B88] font-bold text-xs"
              >
                Continuar para Seleção
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
