import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Layers,
  Search,
  Sparkles,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  FileCheck,
  Bot,
  AlertCircle,
  Check,
  Info,
  Building,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Template, Project, BriefingData } from '@/types'
import { getIndustryLabel, INDUSTRY_OPTIONS } from '@/types'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'

interface TemplateRecommendation {
  recommended_template_id: string | null
  reason: string
  confidence: 'high' | 'medium' | 'low'
  warnings: string[]
  ai_powered: boolean
  model?: string
}

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectIdFromUrl = searchParams.get('projectId')

  const [templates, setTemplates] = useState<Template[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showAllTemplates, setShowAllTemplates] = useState<boolean>(false)

  // AI / Industry Recommendation state
  const [recommendation, setRecommendation] = useState<TemplateRecommendation | null>(null)
  const [loadingRecommendation, setLoadingRecommendation] = useState<boolean>(false)
  const [legacyIndustrySelected, setLegacyIndustrySelected] = useState<string>('professional_services')
  const [isSavingLegacyIndustry, setIsSavingLegacyIndustry] = useState<boolean>(false)

  // Preview & Project assignment modal state
  const [activePreviewTemplate, setActivePreviewTemplate] = useState<Template | null>(null)
  const [assignModalTemplate, setAssignModalTemplate] = useState<Template | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdFromUrl || '')
  const [assigning, setAssigning] = useState<boolean>(false)
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getTemplates({ category: selectedCategory, search: searchTerm })
      setTemplates(data || [])
    } catch (err) {
      console.error('Error fetching templates:', err)
      const msg = err instanceof Error ? err.message : 'Não foi possível carregar os templates.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, searchTerm])

  const fetchUserProjects = useCallback(async () => {
    try {
      const projectList = await api.getProjects()
      setProjects(projectList || [])

      if (projectIdFromUrl) {
        const found = projectList?.find((p) => p.id === projectIdFromUrl)
        if (found) {
          setCurrentProject(found)
          setSelectedProjectId(found.id)
        } else {
          // Fetch specific project if not in list
          const proj = await api.getProject(projectIdFromUrl)
          setCurrentProject(proj)
          setSelectedProjectId(proj.id)
        }
      }
    } catch {
      // Non-blocking for templates view
    }
  }, [projectIdFromUrl])

  // Fetch AI template recommendation when a project is linked
  const fetchRecommendation = useCallback(async (projId: string) => {
    setLoadingRecommendation(true)
    try {
      const rec = await api.recommendTemplate(projId)
      setRecommendation(rec)
    } catch (err) {
      console.warn('Could not load AI template recommendation:', err)
    } finally {
      setLoadingRecommendation(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
    fetchUserProjects()
  }, [fetchTemplates, fetchUserProjects])

  useEffect(() => {
    if (projectIdFromUrl && currentProject) {
      const briefing = currentProject.briefing_data as BriefingData | undefined
      if (briefing?.industry_key) {
        fetchRecommendation(projectIdFromUrl)
      }
    }
  }, [projectIdFromUrl, currentProject, fetchRecommendation])

  // Save industry for legacy project
  const handleSaveLegacyIndustry = async () => {
    if (!currentProject) return
    setIsSavingLegacyIndustry(true)
    try {
      const currentBriefing = (currentProject.briefing_data || {}) as BriefingData
      const updatedBriefing: BriefingData = {
        ...currentBriefing,
        industry_key: legacyIndustrySelected,
      }
      const updated = await api.updateProject(currentProject.id, {
        briefing_data: updatedBriefing,
      })
      setCurrentProject(updated)
      await fetchRecommendation(currentProject.id)
    } catch (err) {
      console.error('Error updating project industry:', err)
    } finally {
      setIsSavingLegacyIndustry(false)
    }
  }

  // Extract unique categories from loaded templates
  const categories = ['all', ...Array.from(new Set(templates.map((t) => t.category).filter(Boolean)))]

  // Project industry info
  const projectIndustryKey = (currentProject?.briefing_data as BriefingData | undefined)?.industry_key
  const projectIndustryLabel = getIndustryLabel(projectIndustryKey)

  // Prioritize and filter templates based on project industry
  const recommendedTemplates = useMemo(() => {
    if (!projectIndustryKey) {
      return []
    }

    const matched: Template[] = []
    const generic: Template[] = []

    templates.forEach((t) => {
      const tags = t.industry_tags || []
      if (tags.includes(projectIndustryKey)) {
        matched.push(t)
      } else if (t.is_generic) {
        generic.push(t)
      }
    })

    return [...matched, ...generic]
  }, [templates, projectIndustryKey])

  // The displayed template list
  const displayedTemplates = useMemo(() => {
    if (projectIndustryKey && !showAllTemplates) {
      return recommendedTemplates.length > 0 ? recommendedTemplates : templates
    }
    return templates
  }, [projectIndustryKey, showAllTemplates, recommendedTemplates, templates])

  const recommendedTemplateObj = useMemo(() => {
    if (!recommendation?.recommended_template_id) return null
    return templates.find((t) => t.id === recommendation.recommended_template_id) || null
  }, [recommendation, templates])

  const handleApplyToProject = async (targetTemplate?: Template) => {
    const tpl = targetTemplate || assignModalTemplate
    const projId = selectedProjectId || projectIdFromUrl

    if (!tpl || !projId) {
      setAssignError('Por favor selecione um projeto para associar este template.')
      return
    }

    setAssigning(true)
    setAssignError(null)
    setAssignSuccess(null)

    try {
      await api.assignProjectTemplate(projId, tpl.id)
      setAssignSuccess(`Template '${tpl.name}' associado com sucesso ao projeto!`)
      setTimeout(() => {
        navigate(`/projects/${projId}`)
      }, 900)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao associar o template ao projeto.'
      setAssignError(msg)
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-full bg-slate-50">
      <Header
        title="Galeria de Templates"
        subtitle="Repositório estruturado de secções de alta conversão para projetos da agência"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8">
        {/* Project Context & Industry Recommendation Section */}
        {currentProject && (
          <div className="space-y-4">
            {!projectIndustryKey ? (
              // Legacy project warning without industry
              <div className="p-5 rounded-[14px] bg-amber-50 border border-amber-200 text-amber-900 shadow-sm space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold">Confirmação de Segmento Necessária</h3>
                    <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                      O projeto <strong>"{currentProject.name}"</strong> foi registado sem segmento de negócio definido. Selecione o segmento para desbloquear recomendações inteligentes de templates de alta conversão.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <select
                    value={legacyIndustrySelected}
                    onChange={(e) => setLegacyIndustrySelected(e.target.value)}
                    className="px-3.5 py-2 text-xs rounded-[10px] border border-amber-300 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#1463FF]"
                  >
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveLegacyIndustry}
                    isLoading={isSavingLegacyIndustry}
                    className="bg-[#1463FF] hover:bg-[#064B88] font-bold text-xs"
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                  >
                    Confirmar e Recomendar
                  </Button>
                </div>
              </div>
            ) : (
              // Active project with confirmed industry
              <div className="rounded-[16px] bg-white border border-blue-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-[#064B88] via-[#0b5496] to-[#1463FF] p-5 text-white">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
                        <Building className="w-3.5 h-3.5 text-amber-300" />
                        <span>Projeto Ativo: {currentProject.name}</span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                        Templates recomendados para: <span className="text-amber-300">{projectIndustryLabel}</span>
                      </h2>
                      <p className="text-xs text-blue-100">
                        Cliente: <strong>{currentProject.client_name || 'Geral'}</strong> &bull; Nicho: {currentProject.client_business}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowAllTemplates(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          !showAllTemplates
                            ? 'bg-white text-[#064B88] shadow-sm'
                            : 'bg-white/15 text-white hover:bg-white/25'
                        }`}
                      >
                        🎯 Recomendados ({recommendedTemplates.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAllTemplates(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          showAllTemplates
                            ? 'bg-white text-[#064B88] shadow-sm'
                            : 'bg-white/15 text-white hover:bg-white/25'
                        }`}
                      >
                        Ver Todos ({templates.length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Recommendation Spotlight Card */}
                {loadingRecommendation ? (
                  <div className="p-6 text-center">
                    <LoadingState message="A analisar briefing e a gerar recomendação estratégica..." />
                  </div>
                ) : recommendation && recommendedTemplateObj ? (
                  <div className="p-5 sm:p-6 bg-blue-50/40 border-b border-blue-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-[#064B88] text-xs font-bold border border-blue-200">
                          <Bot className="w-3.5 h-3.5 text-[#1463FF]" />
                          {recommendation.ai_powered ? 'Recomendação por IA (Google Gemini)' : 'Recomendação por Segmento'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          recommendation.confidence === 'high'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          Confiança {recommendation.confidence === 'high' ? 'Alta' : 'Média'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900">
                          Template Sugerido: <span className="text-[#1463FF]">{recommendedTemplateObj.name}</span>
                        </h4>
                        <p className="text-xs text-slate-700 leading-relaxed max-w-2xl">
                          "{recommendation.reason}"
                        </p>
                      </div>

                      {recommendation.warnings && recommendation.warnings.length > 0 && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          ⚠️ {recommendation.warnings.join(' ')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActivePreviewTemplate(recommendedTemplateObj)}
                        className="text-xs font-bold"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Ver Estrutura
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => handleApplyToProject(recommendedTemplateObj)}
                        isLoading={assigning}
                        className="bg-[#1463FF] hover:bg-[#064B88] font-bold text-xs shadow-sm"
                        leftIcon={<Check className="w-4 h-4" />}
                      >
                        Usar Este Template
                      </Button>
                    </div>
                  </div>
                ) : projectIndustryKey && recommendedTemplates.length === 0 ? (
                  <div className="p-6 text-center bg-amber-50/50 space-y-2">
                    <Info className="w-6 h-6 text-amber-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">
                      Ainda não existe um template específico para este segmento.
                    </p>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Pode usar um template genérico de serviços ou criar um novo modelo estruturado no painel de administração.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Top welcome banner (only shown if no project context) */}
        {!currentProject && (
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-[#064B88] to-[#1463FF] p-5 sm:p-6 lg:p-7 rounded-[14px] text-white shadow-md">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Repositório de Estruturas</span>
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
                Templates Validados de Alta Conversão
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
                Cada template contém secções pré-configuradas e campos estruturados, prontos para receber e mapear o conteúdo do briefing do cliente.
              </p>
            </div>
            <Link to="/projects/new" className="shrink-0">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto bg-white text-[#064B88] hover:bg-blue-50 border-white font-bold shrink-0 shadow-sm"
                leftIcon={<FolderOpen className="w-4 h-4 text-[#1463FF]" />}
              >
                Criar Novo Projeto
              </Button>
            </Link>
          </div>
        )}

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-[12px] border border-slate-200 shadow-sm">
          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <span className="text-xs font-semibold text-slate-500 mr-1">Categoria:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1463FF] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'Todos os Templates' : cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full md:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar templates por nome ou nicho..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-[10px] border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
            />
          </div>
        </div>

        {/* Content list handling */}
        {loading ? (
          <LoadingState message="A carregar galeria de templates..." />
        ) : error ? (
          <ErrorState
            title="Erro ao carregar templates"
            message={error}
            onRetry={fetchTemplates}
          />
        ) : templates.length === 0 ? (
          <EmptyState
            title="Nenhum template ativo encontrado"
            description="Não existem templates ativos disponíveis para os filtros selecionados. Contacte um administrador para disponibilizar novos templates."
            actionLabel="Limpar Filtros"
            onAction={() => {
              setSelectedCategory('all')
              setSearchTerm('')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedTemplates.map((template) => {
              const sections = template.schema?.sections || []
              const isDirectIndustryMatch = Boolean(
                projectIndustryKey && template.industry_tags && template.industry_tags.includes(projectIndustryKey)
              )
              const isRecommendedByAi = recommendation?.recommended_template_id === template.id

              return (
                <Card
                  key={template.id}
                  className={`overflow-hidden border transition-all duration-200 flex flex-col justify-between group ${
                    isRecommendedByAi || isDirectIndustryMatch
                      ? 'border-[#1463FF] ring-2 ring-[#1463FF]/20 shadow-md'
                      : 'border-slate-200 hover:border-[#1463FF]/50 hover:shadow-lg'
                  }`}
                >
                  <div>
                    {/* Preview Image or Styled Fallback */}
                    <div className="h-44 w-full bg-slate-100 relative overflow-hidden border-b border-slate-100">
                      {template.preview_image_url ? (
                        <img
                          src={template.preview_image_url}
                          alt={template.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 text-[#064B88] p-4 text-center">
                          <Layers className="w-10 h-10 text-[#1463FF] mb-2 opacity-80" />
                          <span className="font-bold text-sm text-slate-800">{template.name}</span>
                          <span className="text-xs text-slate-500 mt-0.5">{template.category}</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#064B88]/90 text-white backdrop-blur-sm shadow-sm">
                          {template.category}
                        </span>
                        {isDirectIndustryMatch && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900 shadow-sm flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Segmento Direto
                          </span>
                        )}
                        {template.is_generic && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800/85 text-white shadow-sm">
                            Base Genérica
                          </span>
                        )}
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 text-slate-700 shadow-sm border border-slate-200/60">
                          {sections.length} Secções
                        </span>
                      </div>
                    </div>

                    {/* Body Content */}
                    <CardContent className="p-5 space-y-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1463FF] transition-colors">
                          {template.name}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {template.description || 'Template otimizado com estrutura padrão de alta conversão.'}
                        </p>
                      </div>

                      {/* Section Chips */}
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Estrutura de Secções:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {sections.slice(0, 5).map((sec) => (
                            <span
                              key={sec.id}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                            >
                              {sec.label || sec.type}
                            </span>
                          ))}
                          {sections.length > 5 && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1463FF] text-[11px] font-bold">
                              +{sections.length - 5} mais
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActivePreviewTemplate(template)}
                      className="text-slate-600 hover:text-slate-900 text-xs font-semibold"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Ver Detalhes
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setAssignModalTemplate(template)
                        setSelectedProjectId(currentProject?.id || '')
                        setAssignError(null)
                        setAssignSuccess(null)
                      }}
                      className="bg-[#1463FF] hover:bg-[#064B88] text-xs font-bold shadow-sm"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      {currentProject ? 'Selecionar Template' : 'Usar no Projeto'}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal 1: Template Details / Structure Preview */}
      {activePreviewTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#1463FF] uppercase tracking-wider">
                  {activePreviewTemplate.category}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{activePreviewTemplate.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewTemplate(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição</h4>
                <p className="text-sm text-slate-700">{activePreviewTemplate.description}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Secções Estruturadas ({activePreviewTemplate.schema?.sections?.length || 0})
                </h4>
                <div className="space-y-3">
                  {activePreviewTemplate.schema?.sections?.map((sec, idx) => (
                    <div key={sec.id} className="p-3.5 rounded-[10px] border border-slate-200 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#1463FF]/10 text-[#1463FF] text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-sm text-slate-900">{sec.label}</span>
                          <span className="text-xs font-mono text-slate-400">({sec.type})</span>
                        </div>
                        {sec.required ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                            Obrigatória
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                            Opcional
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5">{sec.purpose}</p>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                        {sec.editable_fields?.map((f) => (
                          <span
                            key={f.key}
                            className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600"
                          >
                            {f.label} <span className="text-slate-400 font-mono">[{f.field_type}]</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-[16px]">
              <Button variant="outline" size="md" onClick={() => setActivePreviewTemplate(null)}>
                Fechar
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setAssignModalTemplate(activePreviewTemplate)
                  setActivePreviewTemplate(null)
                  setSelectedProjectId('')
                  setAssignError(null)
                  setAssignSuccess(null)
                }}
                className="bg-[#1463FF] hover:bg-[#064B88]"
              >
                Aplicar a um Projeto
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Assign Template to an Accessible Project */}
      {assignModalTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Aplicar Template a Projeto</h3>
                  <p className="text-xs text-slate-500">
                    Template: <span className="font-semibold text-slate-800">{assignModalTemplate.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalTemplate(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {assignSuccess ? (
                <div className="p-4 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{assignSuccess} A redirecionar para o projeto...</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Escolha a qual dos seus projetos ativos deseja associar a estrutura deste template. Os dados de briefing e notas do cliente existentes serão preservados com total segurança.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Selecione o Projeto:</label>
                    {projects.length === 0 ? (
                      <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-200">
                        Não foram encontrados projetos na sua conta. Crie um projeto antes de aplicar o template.
                      </div>
                    ) : (
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-[10px] border border-slate-300 bg-white focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
                      >
                        <option value="">-- Selecione um projeto da lista --</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.client_name ? `(${p.client_name})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {assignError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                      {assignError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setAssignModalTemplate(null)} disabled={assigning}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApplyToProject()}
                isLoading={assigning}
                disabled={!selectedProjectId || assigning || Boolean(assignSuccess)}
                className="bg-[#1463FF] hover:bg-[#064B88] font-bold"
              >
                Confirmar Associação
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
