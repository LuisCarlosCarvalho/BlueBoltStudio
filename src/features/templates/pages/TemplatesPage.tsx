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
    <div className="flex-1 flex flex-col min-h-screen bg-[#05192D] text-slate-100">
      {/* Main Container with Generous Breathing Room */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        
        {/* Clean Header & Filter Bar — No large marketing hero banner */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Templates
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Galeria de templates profissionais e estruturas de alta conversão.
              </p>
            </div>

            {/* Search Box */}
            <div className="w-full sm:w-72 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Pesquisar templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:bg-white/10 focus:outline-none focus:border-[#1463FF] focus:ring-1 focus:ring-[#1463FF] transition-all"
              />
            </div>
          </div>

          {/* Category Filter Tabs */}
          {categories.length > 2 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#1463FF] text-white shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {cat === 'all' ? 'Todos' : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Linked Active Project Context (Understated, non-intrusive banner) */}
        {currentProject && (
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/20 text-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1463FF]/20 text-[#1463FF] flex items-center justify-center shrink-0 border border-[#1463FF]/30">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Projeto Ativo: {currentProject.name}</span>
                  {projectIndustryLabel && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {projectIndustryLabel}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Clique em qualquer template para visualizar a estrutura ou associar a este projeto.
                </p>
              </div>
            </div>

            {recommendation?.recommended_template_id && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Recomendação IA Ativa</span>
              </div>
            )}
          </div>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
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
                  className={`group relative flex flex-col bg-[#091524] border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                    isRecommended
                      ? 'border-[#1463FF] shadow-[0_0_20px_rgba(20,99,255,0.2)]'
                      : 'border-white/10 hover:border-[#1463FF]/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)]'
                  }`}
                >
                  {/* Upper Area: Visual Thumbnail (~16:9 Aspect Ratio) */}
                  <div className="w-full aspect-[16/9] bg-[#05111F] overflow-hidden relative border-b border-white/5">
                    {hasValidImage ? (
                      /* Success: Real Visual Preview */
                      <img
                        src={template.preview_image_url || ''}
                        alt={template.name}
                        onError={() => setImgErrorMap((prev) => ({ ...prev, [template.id]: true }))}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    ) : (
                      /* Pending/No Image: Compact Neutral Skeleton State */
                      <div className="w-full h-full bg-[#071322] flex flex-col justify-between p-4 sm:p-5 relative overflow-hidden select-none">
                        {/* Minimalist wireframe skeleton header */}
                        <div className="space-y-2">
                          <div className="w-20 h-2 rounded bg-white/15 animate-pulse" />
                          <div className="w-4/5 h-3 rounded bg-white/20" />
                          <div className="w-1/2 h-2 rounded bg-white/10" />
                        </div>
                        {/* Minimalist wireframe card blocks */}
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <div className="h-10 rounded bg-white/5 border border-white/5" />
                          <div className="h-10 rounded bg-white/5 border border-white/5" />
                          <div className="h-10 rounded bg-white/5 border border-white/5" />
                        </div>
                        {/* Minimalist CTA button skeleton */}
                        <div className="h-5 w-24 rounded bg-white/10" />
                        {/* Ambient gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#05111F]/80 via-transparent to-transparent pointer-events-none" />
                      </div>
                    )}

                    {/* Subtle Recommended Accent Badge (if applicable) */}
                    {isRecommended && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#1463FF] text-white shadow-md flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          Sugerido
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Lower Area: Template Name + Category / Subtitle */}
                  <div className="p-4 sm:p-5 flex items-center justify-between gap-3 bg-[#091524]">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base text-white truncate group-hover:text-[#1463FF] transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-normal mt-0.5 truncate">
                        {template.category || 'Template'}
                      </p>
                    </div>

                    {/* Subtle action indicator on hover */}
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 group-hover:bg-[#1463FF] group-hover:text-white group-hover:border-[#1463FF] transition-all shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal 1: Template Details & Structure Preview */}
      {activePreviewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#091524] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-white/10 text-white overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#1463FF] uppercase tracking-wider">
                  {activePreviewTemplate.category}
                </span>
                <h3 className="text-lg font-bold text-white">{activePreviewTemplate.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewTemplate(null)}
                className="w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Visual Thumbnail in Modal */}
              {activePreviewTemplate.preview_image_url && (
                <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/10 bg-[#05111F]">
                  <img
                    src={activePreviewTemplate.preview_image_url}
                    alt={activePreviewTemplate.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {activePreviewTemplate.description && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Descrição
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {activePreviewTemplate.description}
                  </p>
                </div>
              )}

              {/* Sections Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Secções Estruturadas ({activePreviewTemplate.schema?.sections?.length || 0})
                </h4>
                <div className="space-y-2.5">
                  {activePreviewTemplate.schema?.sections?.map((sec, idx) => (
                    <div
                      key={sec.id}
                      className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#1463FF]/20 text-[#1463FF] text-xs font-bold flex items-center justify-center border border-[#1463FF]/30">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-sm text-white">{sec.label}</span>
                          <span className="text-xs font-mono text-slate-500">({sec.type})</span>
                        </div>
                        {sec.required ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Obrigatória
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/10 text-slate-400">
                            Opcional
                          </span>
                        )}
                      </div>
                      {sec.purpose && (
                        <p className="text-xs text-slate-400">{sec.purpose}</p>
                      )}
                      {sec.editable_fields && sec.editable_fields.length > 0 && (
                        <div className="pt-1.5 flex flex-wrap gap-1.5">
                          {sec.editable_fields.map((f) => (
                            <span
                              key={f.key}
                              className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/5 text-slate-300"
                            >
                              {f.label} <span className="text-slate-500 font-mono">[{f.field_type}]</span>
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
            <div className="p-4 border-t border-white/10 bg-[#05111F] flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setActivePreviewTemplate(null)}
                className="bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
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

      {/* Modal 2: Assign Template to Project */}
      {assignModalTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#091524] rounded-2xl max-w-lg w-full shadow-2xl border border-white/10 text-white overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#1463FF]/20 text-[#1463FF] flex items-center justify-center border border-[#1463FF]/30">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Aplicar Template a Projeto</h3>
                  <p className="text-xs text-slate-400">
                    Template: <span className="font-semibold text-white">{assignModalTemplate.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalTemplate(null)}
                className="w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {assignSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{assignSuccess} A redirecionar para o projeto...</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Escolha o projeto ao qual deseja associar esta estrutura. Os dados de briefing e notas do cliente existentes serão preservados com total segurança.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Selecione o Projeto:</label>
                    {projects.length === 0 ? (
                      <div className="p-3 bg-amber-500/10 rounded-xl text-xs text-amber-300 border border-amber-500/20">
                        Não foram encontrados projetos na sua conta. Crie um projeto antes de aplicar o template.
                      </div>
                    ) : (
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-[#1463FF] focus:ring-1 focus:ring-[#1463FF]"
                      >
                        <option value="" className="bg-[#091524] text-slate-300">-- Selecione um projeto da lista --</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id} className="bg-[#091524] text-white">
                            {p.name} {p.client_name ? `(${p.client_name})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {assignError && (
                    <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                      {assignError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-[#05111F] flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssignModalTemplate(null)}
                disabled={assigning}
                className="bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
              >
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
