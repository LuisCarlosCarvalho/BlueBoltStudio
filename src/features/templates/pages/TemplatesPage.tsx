import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  CheckCircle2,
  FileCheck,
  Building,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Template, Project, BriefingData } from '@/types'
import { getIndustryLabel } from '@/types'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
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

  // AI / Industry Recommendation state
  const [recommendation, setRecommendation] = useState<TemplateRecommendation | null>(null)

  // Preview & Project assignment modal state
  const [activePreviewTemplate, setActivePreviewTemplate] = useState<Template | null>(null)
  const [assignModalTemplate, setAssignModalTemplate] = useState<Template | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdFromUrl || '')
  const [assigning, setAssigning] = useState<boolean>(false)
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({})

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
    try {
      const rec = await api.recommendTemplate(projId)
      setRecommendation(rec)
    } catch (err) {
      console.warn('Could not load AI template recommendation:', err)
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

  // Extract unique categories from loaded templates
  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(templates.map((t) => t.category).filter(Boolean)))]
  }, [templates])

  // Project industry info
  const projectIndustryKey = (currentProject?.briefing_data as BriefingData | undefined)?.industry_key
  const projectIndustryLabel = getIndustryLabel(projectIndustryKey)

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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Light standard Header matching /user */}
      <Header
        title="Galeria de Templates"
        subtitle="Repositório estruturado de landing pages de alta conversão"
      />

      {/* Main Container with generous breathing room */}
      <div className="p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 flex-1">
        
        {/* Linked Active Project Context (Understated light banner) */}
        {currentProject && (
          <div className="p-4 rounded-[12px] bg-blue-50/80 border border-blue-200 text-[#064B88] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#1463FF] flex items-center justify-center shrink-0 border border-blue-200">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Projeto Ativo: {currentProject.name}</span>
                  {projectIndustryLabel && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-[#064B88] border border-blue-200">
                      {projectIndustryLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Clique em qualquer template para visualizar a estrutura ou associar a este projeto.
                </p>
              </div>
            </div>

            {recommendation?.recommended_template_id && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Recomendação IA Ativa</span>
              </div>
            )}
          </div>
        )}

        {/* Search & Category Filter Bar — Clean White Card matching /user */}
        <div className="bg-white p-4 rounded-[12px] border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" />
            <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider">Filtro:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1463FF] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'Todos os Templates' : cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-72 relative shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-[10px] border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF] transition-all"
            />
          </div>
        </div>

        {/* Template Grid: 3 equal columns on Desktop, 2 on Tablet, 1 on Mobile */}
        {loading ? (
          <div className="py-20 text-center">
            <LoadingState message="A carregar galeria de templates..." />
          </div>
        ) : error ? (
          <ErrorState
            title="Erro ao carregar templates"
            message={error}
            onRetry={fetchTemplates}
          />
        ) : templates.length === 0 ? (
          <EmptyState
            title="Nenhum template ativo encontrado"
            description="Não existem templates disponíveis para os filtros selecionados."
            actionLabel="Limpar Filtros"
            onAction={() => {
              setSelectedCategory('all')
              setSearchTerm('')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => {
              const hasValidImage = Boolean(template.preview_image_url && !imgErrorMap[template.id])
              const isRecommended = recommendation?.recommended_template_id === template.id

              return (
                <div
                  key={template.id}
                  onClick={() => {
                    if (currentProject) {
                      setAssignModalTemplate(template)
                      setSelectedProjectId(currentProject.id)
                      setAssignError(null)
                      setAssignSuccess(null)
                    } else {
                      setActivePreviewTemplate(template)
                    }
                  }}
                  className={`group relative flex flex-col bg-white border rounded-[14px] overflow-hidden cursor-pointer transition-all duration-200 shadow-xs ${
                    isRecommended
                      ? 'border-[#1463FF] ring-2 ring-[#1463FF]/20 shadow-md'
                      : 'border-slate-200 hover:border-[#1463FF]/50 hover:shadow-md'
                  }`}
                >
                  {/* Upper Area: Visual Thumbnail (~16:9 Aspect Ratio) */}
                  <div className="w-full aspect-[16/9] bg-slate-100 overflow-hidden relative border-b border-slate-100">
                    {hasValidImage ? (
                      /* Success: Real Visual Preview */
                      <img
                        src={template.preview_image_url || ''}
                        alt={template.name}
                        onError={() => setImgErrorMap((prev) => ({ ...prev, [template.id]: true }))}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    ) : (
                      /* Pending/No Image: Compact Light Neutral Skeleton State */
                      <div className="w-full h-full bg-slate-100 flex flex-col justify-between p-4 sm:p-5 select-none relative overflow-hidden">
                        {/* Minimalist wireframe skeleton header */}
                        <div className="space-y-2">
                          <div className="w-20 h-2 rounded bg-slate-200" />
                          <div className="w-3/4 h-3 rounded bg-slate-300/80" />
                          <div className="w-1/2 h-2 rounded bg-slate-200" />
                        </div>
                        {/* Minimalist wireframe card blocks */}
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <div className="h-10 rounded bg-white border border-slate-200/60 shadow-xs" />
                          <div className="h-10 rounded bg-white border border-slate-200/60 shadow-xs" />
                          <div className="h-10 rounded bg-white border border-slate-200/60 shadow-xs" />
                        </div>
                        {/* Minimalist CTA button skeleton */}
                        <div className="h-5 w-24 rounded bg-slate-200 mt-1" />
                      </div>
                    )}

                    {/* Subtle Recommended Accent Badge (if applicable) */}
                    {isRecommended && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#1463FF] text-white shadow-xs flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          Sugerido
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Lower Area: Template Name + Category / Subtitle */}
                  <div className="p-4 sm:p-5 flex items-center justify-between gap-3 bg-white">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate group-hover:text-[#1463FF] transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                        {template.category || 'Template'}
                      </p>
                    </div>

                    {/* Subtle action indicator on hover */}
                    <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-[#1463FF] group-hover:text-white transition-all flex items-center justify-center border border-slate-200/60 shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal 1: Template Details & Structure Preview (Clean Light Theme) */}
      {activePreviewTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 text-slate-900 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <span className="text-xs font-bold text-[#1463FF] uppercase tracking-wider">
                  {activePreviewTemplate.category}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{activePreviewTemplate.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewTemplate(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 bg-white">
              {/* Visual Thumbnail in Modal */}
              {activePreviewTemplate.preview_image_url && (
                <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img
                    src={activePreviewTemplate.preview_image_url}
                    alt={activePreviewTemplate.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {activePreviewTemplate.description && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Descrição
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {activePreviewTemplate.description}
                  </p>
                </div>
              )}

              {/* Sections Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Secções Estruturadas ({activePreviewTemplate.schema?.sections?.length || 0})
                </h4>
                <div className="space-y-2.5">
                  {activePreviewTemplate.schema?.sections?.map((sec, idx) => (
                    <div
                      key={sec.id}
                      className="p-3.5 rounded-[10px] border border-slate-200 bg-slate-50/50 space-y-2"
                    >
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
                      {sec.purpose && (
                        <p className="text-xs text-slate-600">{sec.purpose}</p>
                      )}
                      {sec.editable_fields && sec.editable_fields.length > 0 && (
                        <div className="pt-1.5 flex flex-wrap gap-1.5">
                          {sec.editable_fields.map((f) => (
                            <span
                              key={f.key}
                              className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600"
                            >
                              {f.label} <span className="text-slate-400 font-mono">[{f.field_type}]</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-[16px]">
              <Button
                variant="outline"
                size="md"
                onClick={() => setActivePreviewTemplate(null)}
              >
                Fechar
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setAssignModalTemplate(activePreviewTemplate)
                  setActivePreviewTemplate(null)
                  setSelectedProjectId(currentProject?.id || '')
                  setAssignError(null)
                  setAssignSuccess(null)
                }}
                className="bg-[#1463FF] hover:bg-[#064B88] font-bold"
              >
                Aplicar a um Projeto
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Assign Template to Project (Clean Light Theme) */}
      {assignModalTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] max-w-lg w-full shadow-2xl border border-slate-200 text-slate-900 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center border border-blue-100">
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
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
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
                    Escolha o projeto ao qual deseja associar esta estrutura. Os dados de briefing e notas do cliente existentes serão preservados com total segurança.
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
                        className="w-full p-2.5 text-xs rounded-[10px] border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
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

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-[16px]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssignModalTemplate(null)}
                disabled={assigning}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApplyToProject()}
                isLoading={assigning}
                disabled={!selectedProjectId || assigning || Boolean(assignSuccess)}
                className="bg-[#1463FF] hover:bg-[#064B88] font-bold text-xs shadow-xs"
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
