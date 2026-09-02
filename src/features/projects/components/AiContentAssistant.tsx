import React, { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Check,
  X,
  History,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  Info,
  CheckSquare,
  Square,
  ShieldCheck,
  Quote,
} from 'lucide-react'
import { api } from '@/lib/api'
import type {
  Project,
  Template,
  ProjectContentSource,
  ProjectAiMapping,
  AiContentMappingResult,
  AiConfidence,
} from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

interface AiContentAssistantProps {
  project: Project
  selectedTemplate: Template | null
  contentSources: ProjectContentSource[]
  onProjectUpdated: (updatedProject: Project) => void
  onOpenTemplateModal: () => void
}

export const AiContentAssistant: React.FC<AiContentAssistantProps> = ({
  project,
  selectedTemplate,
  contentSources,
  onProjectUpdated,
  onOpenTemplateModal,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Active / Selected AI Mapping
  const [activeMapping, setActiveMapping] = useState<ProjectAiMapping | null>(null)
  const [editableValues, setEditableValues] = useState<Record<string, Record<string, string>>>({})
  const [approvedFields, setApprovedFields] = useState<Record<string, Record<string, boolean>>>({})

  // Applying / Discarding states
  const [isApplying, setIsApplying] = useState<boolean>(false)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  // History states
  const [historyMappings, setHistoryMappings] = useState<ProjectAiMapping[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false)

  // Default to newest source
  useEffect(() => {
    if (contentSources.length > 0 && !selectedSourceId) {
      setSelectedSourceId(contentSources[0].id)
    }
  }, [contentSources, selectedSourceId])

  const loadMappingIntoEditor = useCallback((mapping: ProjectAiMapping) => {
    setActiveMapping(mapping)
    setGenerateError(null)
    setApplySuccess(null)
    setApplyError(null)

    const values: Record<string, Record<string, string>> = {}
    const approved: Record<string, Record<string, boolean>> = {}

    const result = mapping.mapping as AiContentMappingResult
    if (result && Array.isArray(result.sections)) {
      result.sections.forEach((sec) => {
        values[sec.section_id] = {}
        approved[sec.section_id] = {}
        sec.fields.forEach((f) => {
          const key = f.field_key || f.key || ''
          const val = f.suggested_value !== undefined ? f.suggested_value : f.value || ''
          values[sec.section_id][key] = val
          // Default approved if suggested value is non-empty and confidence is not low
          approved[sec.section_id][key] = Boolean(val && val.trim().length > 0)
        })
      })
    }

    setEditableValues(values)
    setApprovedFields(approved)
  }, [])

  // Load mappings history
  const fetchMappingsHistory = useCallback(async () => {
    if (!project.id) return
    setIsLoadingHistory(true)
    try {
      const list = await api.getAiMappings(project.id)
      setHistoryMappings(list || [])

      // If no active mapping is loaded yet, load the latest draft or applied mapping
      if (!activeMapping && list && list.length > 0) {
        const latest = list[0]
        loadMappingIntoEditor(latest)
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingHistory(false)
    }
  }, [project.id, activeMapping, loadMappingIntoEditor])

  useEffect(() => {
    fetchMappingsHistory()
  }, [fetchMappingsHistory])

  const handleGenerate = async () => {
    if (!project.selected_template_id || !selectedTemplate) {
      setGenerateError('Por favor selecione primeiro um Template Base para estruturar as secções da página.')
      return
    }

    if (contentSources.length === 0 || !selectedSourceId) {
      setGenerateError('Por favor adicione ou selecione uma fonte de conteúdo do cliente para a IA analisar.')
      return
    }

    setIsGenerating(true)
    setGenerateError(null)
    setApplySuccess(null)
    setApplyError(null)

    try {
      const response = await api.generateAiMapping(project.id, selectedSourceId)
      loadMappingIntoEditor(response.mapping)
      await fetchMappingsHistory()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível gerar as sugestões com a IA neste momento.'
      setGenerateError(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleFieldApprove = (sectionId: string, fieldKey: string, approveStatus?: boolean) => {
    setApprovedFields((prev) => {
      const current = Boolean(prev[sectionId]?.[fieldKey])
      const next = approveStatus !== undefined ? approveStatus : !current
      return {
        ...prev,
        [sectionId]: {
          ...(prev[sectionId] || {}),
          [fieldKey]: next,
        },
      }
    })
  }

  const handleFieldValueChange = (sectionId: string, fieldKey: string, newValue: string) => {
    setEditableValues((prev) => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        [fieldKey]: newValue,
      },
    }))
  }

  const handleToggleAllFields = (approveAll: boolean) => {
    if (!activeMapping) return
    const result = activeMapping.mapping as AiContentMappingResult
    if (!result?.sections) return

    const nextApproved: Record<string, Record<string, boolean>> = {}
    result.sections.forEach((sec) => {
      nextApproved[sec.section_id] = {}
      sec.fields.forEach((f) => {
        const key = f.field_key || f.key || ''
        nextApproved[sec.section_id][key] = approveAll
      })
    })
    setApprovedFields(nextApproved)
  }

  const handleApplyApproved = async () => {
    if (!activeMapping) return

    // Compile payload of only approved fields
    const appliedPayload: Record<string, Record<string, string>> = {}
    let count = 0

    Object.entries(approvedFields).forEach(([sectionId, fields]) => {
      Object.entries(fields).forEach(([fieldKey, isApproved]) => {
        if (isApproved) {
          if (!appliedPayload[sectionId]) {
            appliedPayload[sectionId] = {}
          }
          appliedPayload[sectionId][fieldKey] = editableValues[sectionId]?.[fieldKey] || ''
          count++
        }
      })
    })

    if (count === 0) {
      setApplyError('Aprove pelo menos um campo para aplicar à estrutura da página.')
      return
    }

    setIsApplying(true)
    setApplyError(null)
    setApplySuccess(null)

    try {
      const res = await api.applyAiMapping(activeMapping.id, appliedPayload)
      onProjectUpdated(res.project)
      setActiveMapping(res.mapping)
      setApplySuccess(`${count} ${count === 1 ? 'campo aprovado foi aplicado' : 'campos aprovados foram aplicados'} com sucesso à estrutura da página!`)
      await fetchMappingsHistory()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao aplicar sugestões aprovadas ao projeto.'
      setApplyError(msg)
    } finally {
      setIsApplying(false)
    }
  }

  const handleDiscard = async () => {
    if (!activeMapping) return
    if (!window.confirm('Tem a certeza de que deseja descartar estas sugestões de IA?')) return

    try {
      const res = await api.discardAiMapping(activeMapping.id)
      setActiveMapping(res.mapping)
      await fetchMappingsHistory()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao descartar sugestões.')
    }
  }

  const getApprovedCount = () => {
    let count = 0
    Object.values(approvedFields).forEach((sec) => {
      Object.values(sec).forEach((isApp) => {
        if (isApp) count++
      })
    })
    return count
  }

  const getTotalFieldsCount = () => {
    if (!activeMapping) return 0
    const result = activeMapping.mapping as AiContentMappingResult
    if (!result?.sections) return 0
    return result.sections.reduce((acc, sec) => acc + (sec.fields?.length || 0), 0)
  }

  const getConfidenceBadge = (confidence: AiConfidence) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Check className="w-2.5 h-2.5" />
            Alta Confiança
          </span>
        )
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Média Confiança
          </span>
        )
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Requer Validação
          </span>
        )
    }
  }

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
      {/* Header Bar */}
      <CardHeader className="bg-gradient-to-r from-slate-900 via-[#064B88] to-[#1463FF] text-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shrink-0">
              <Bot className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg text-white font-bold">
                  Sugestões da IA
                </CardTitle>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-blue-100">
                  Fase 3 &bull; Grounded Copywriting
                </span>
              </div>
              <CardDescription className="text-xs text-blue-100 mt-0.5">
                Mapeamento de conteúdo fundamentado no briefing e material do cliente com revisão humana obrigatória
              </CardDescription>
            </div>
          </div>

          {historyMappings.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold shrink-0"
              leftIcon={<History className="w-3.5 h-3.5" />}
              rightIcon={isHistoryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            >
              Histórico ({historyMappings.length})
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* History drawer if expanded */}
        {isHistoryOpen && (
          <div className="p-4 rounded-[12px] bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#1463FF]" />
                Histórico de Sugestões de IA do Projeto
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                {isLoadingHistory ? 'A carregar...' : `${historyMappings.length} registos`}
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {historyMappings.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => loadMappingIntoEditor(item)}
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                    activeMapping?.id === item.id
                      ? 'bg-blue-50 border-[#1463FF] shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        Sugestão #{historyMappings.length - idx}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                          item.status === 'applied'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'discarded'
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status === 'applied' ? 'Aplicada' : item.status === 'discarded' ? 'Descartada' : 'Rascunho'}
                      </span>
                      {item.model && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.model}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {item.mapping?.summary || 'Sugestão estruturada de conteúdo'}
                    </p>
                  </div>
                  <div className="text-right shrink-0 text-[10px] text-slate-400">
                    <p>{new Date(item.created_at).toLocaleDateString('pt-PT')}</p>
                    <p>{new Date(item.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Precondition 1: No template selected */}
        {!selectedTemplate ? (
          <div className="p-6 rounded-[14px] bg-amber-50/70 border border-amber-200 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Selecione um Template Base para ativar as Sugestões de IA
              </h4>
              <p className="text-xs text-amber-700 max-w-md mx-auto mt-1 leading-relaxed">
                A Inteligência Artificial precisa de conhecer as secções e campos editáveis do template para sugerir conteúdos estruturados.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenTemplateModal}
              className="bg-[#1463FF] hover:bg-[#064B88] text-xs font-bold shadow-sm"
              leftIcon={<Layers className="w-3.5 h-3.5" />}
            >
              Escolher Template Base
            </Button>
          </div>
        ) : contentSources.length === 0 ? (
          /* Precondition 2: No content sources registered */
          <div className="p-6 rounded-[14px] bg-blue-50/60 border border-blue-200 text-center space-y-3">
            <FileText className="w-8 h-8 text-[#1463FF] mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Guarde uma Fonte de Conteúdo do Cliente
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                Utilize o módulo acima para colar o texto do briefing ou material fornecido pelo cliente antes de solicitar sugestões à IA.
              </p>
            </div>
          </div>
        ) : (
          /* Preconditions Met: Source Selector and Generate Button */
          <div className="space-y-4">
            <div className="p-4 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Fonte de Conteúdo do Cliente:
                </label>
                <select
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  disabled={isGenerating}
                  className="w-full text-xs rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
                >
                  {contentSources.map((source, idx) => (
                    <option key={source.id} value={source.id}>
                      Fonte #{contentSources.length - idx} &bull; {new Date(source.created_at).toLocaleDateString('pt-PT')} ({source.extracted_text.slice(0, 60)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleGenerate}
                  isLoading={isGenerating}
                  disabled={isGenerating || !selectedSourceId}
                  className="w-full md:w-auto bg-[#1463FF] hover:bg-[#064B88] font-bold text-xs shadow-sm shrink-0"
                  leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
                >
                  {activeMapping ? 'Regenerar Sugestões a Partir do Conteúdo' : 'Gerar sugestões a partir do conteúdo'}
                </Button>
              </div>
            </div>

            {generateError && (
              <div className="p-3.5 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{generateError}</span>
              </div>
            )}
          </div>
        )}

        {/* Generated Mappings Review & Apply Section */}
        {activeMapping && (
          <div className="pt-6 border-t border-slate-200 space-y-6">
            {/* Status Header & Batch Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[12px] bg-slate-900 text-white">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Sugestões da IA Prontas para Revisão
                  </span>
                  {activeMapping.status === 'applied' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">
                      Aplicadas no Projeto
                    </span>
                  )}
                  {activeMapping.status === 'discarded' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                      Descartadas
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {activeMapping.mapping?.summary || 'Conteúdo estruturado para as secções do template.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAllFields(true)}
                  className="text-white hover:bg-slate-800 text-[11px]"
                  leftIcon={<CheckSquare className="w-3.5 h-3.5 text-emerald-400" />}
                >
                  Aprovar Todos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAllFields(false)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 text-[11px]"
                  leftIcon={<Square className="w-3.5 h-3.5" />}
                >
                  Desmarcar Todos
                </Button>
              </div>
            </div>

            {/* Warnings from AI if any */}
            {activeMapping.mapping?.warnings && activeMapping.mapping.warnings.length > 0 && (
              <div className="p-4 rounded-[12px] bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Pontos de Atenção e Validação Humana:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-amber-800 pl-1">
                  {activeMapping.mapping.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notification messages */}
            {applySuccess && (
              <div className="p-4 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{applySuccess}</span>
              </div>
            )}

            {applyError && (
              <div className="p-4 rounded-[12px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            {/* Section Cards */}
            <div className="space-y-5">
              {activeMapping.mapping?.sections?.map((sec) => {
                const templateSec = selectedTemplate?.schema?.sections?.find((s) => s.id === sec.section_id)
                return (
                  <div
                    key={sec.section_id}
                    className="p-4 sm:p-5 rounded-[12px] border border-slate-200 bg-slate-50/60 space-y-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#1463FF]/10 text-[#1463FF] text-xs font-bold flex items-center justify-center">
                          <Layers className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            {templateSec?.label || sec.section_id}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ID: {sec.section_id} {templateSec?.required && '&bull; Obrigatória'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">
                        {sec.fields.length} {sec.fields.length === 1 ? 'campo sugerido' : 'campos sugeridos'}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {sec.fields.map((field) => {
                        const fieldKey = field.field_key || field.key || ''
                        const templateField = templateSec?.editable_fields?.find((f) => f.key === fieldKey)
                        const isApproved = Boolean(approvedFields[sec.section_id]?.[fieldKey])
                        const currentValue = editableValues[sec.section_id]?.[fieldKey] ?? (field.suggested_value || field.value || '')
                        const sourceExcerpt = field.source_excerpt || ''
                        const rationale = field.rationale || field.reason || ''
                        const isNeedsReview = Boolean(field.needs_review || field.confidence === 'low' || !currentValue)

                        return (
                          <div
                            key={fieldKey}
                            className={`p-4 rounded-[12px] border transition-all ${
                              isApproved
                                ? 'bg-white border-blue-200 ring-1 ring-blue-100 shadow-xs'
                                : 'bg-white/70 border-slate-200 opacity-75'
                            }`}
                          >
                            {/* Header row of field */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">
                                  {templateField?.label || fieldKey}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {templateField?.field_type || 'text'}
                                </span>
                                {isNeedsReview && (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    Requer Revisão
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {getConfidenceBadge(field.confidence)}

                                {/* Individual Approve / Reject Buttons */}
                                <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFieldApprove(sec.section_id, fieldKey, true)}
                                    className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                      isApproved
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                    }`}
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Aprovado</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleFieldApprove(sec.section_id, fieldKey, false)}
                                    className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                      !isApproved
                                        ? 'bg-slate-700 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                    }`}
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Rejeitar</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Source excerpt quote box if available */}
                            {sourceExcerpt && sourceExcerpt.trim() !== '' && (
                              <div className="mb-2.5 p-2.5 rounded-[8px] bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
                                <Quote className="w-3.5 h-3.5 text-[#1463FF] shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">Trecho fundamentado da fonte:</span>
                                  <p className="italic text-slate-700">"{sourceExcerpt}"</p>
                                </div>
                              </div>
                            )}

                            {/* Rationale note */}
                            {rationale && rationale.trim() !== '' && (
                              <p className="text-[11px] text-slate-500 mb-2.5 italic flex items-center gap-1.5">
                                <Info className="w-3 h-3 text-[#1463FF] shrink-0" />
                                <span><strong>Justificação da IA:</strong> {rationale}</span>
                              </p>
                            )}

                            {/* Editable input / textarea */}
                            <div>
                              {templateField?.field_type === 'textarea' ||
                              templateField?.field_type === 'rich_text' ||
                              (currentValue && currentValue.length > 80) ? (
                                <textarea
                                  rows={3}
                                  value={currentValue}
                                  onChange={(e) =>
                                    handleFieldValueChange(sec.section_id, fieldKey, e.target.value)
                                  }
                                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF] leading-relaxed"
                                  placeholder="Texto sugerido para este campo..."
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={currentValue}
                                  onChange={(e) =>
                                    handleFieldValueChange(sec.section_id, fieldKey, e.target.value)
                                  }
                                  className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
                                  placeholder="Texto sugerido para este campo..."
                                />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bottom Action Controls */}
            <div className="p-4 rounded-[12px] bg-slate-100 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-3 z-10 shadow-lg">
              <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  <strong>{getApprovedCount()}</strong> de <strong>{getTotalFieldsCount()}</strong> sugestões aprovadas para aplicação
                </span>
              </div>

              <div className="flex items-center gap-2">
                {activeMapping.status !== 'discarded' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDiscard}
                    className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs"
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Descartar Sugestões
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleApplyApproved}
                  isLoading={isApplying}
                  disabled={isApplying || getApprovedCount() === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                  leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-100" />}
                >
                  Aplicar sugestões aprovadas
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
