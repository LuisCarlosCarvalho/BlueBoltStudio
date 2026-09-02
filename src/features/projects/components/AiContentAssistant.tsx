import React, { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Check,
  History,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  Info,
  CheckSquare,
  Square,
  ShieldCheck,
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
  const [selectedFields, setSelectedFields] = useState<Record<string, Record<string, boolean>>>({})

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
    const selected: Record<string, Record<string, boolean>> = {}

    const result = mapping.mapping as AiContentMappingResult
    if (result && Array.isArray(result.sections)) {
      result.sections.forEach((sec) => {
        values[sec.section_id] = {}
        selected[sec.section_id] = {}
        sec.fields.forEach((f) => {
          values[sec.section_id][f.key] = f.value || ''
          // Default to selected if value is not empty
          selected[sec.section_id][f.key] = Boolean(f.value && f.value.trim().length > 0)
        })
      })
    }

    setEditableValues(values)
    setSelectedFields(selected)
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
    if (!selectedSourceId) {
      setGenerateError('Por favor selecione uma fonte de conteúdo para a IA analisar.')
      return
    }

    if (!selectedTemplate) {
      setGenerateError('Por favor selecione primeiro um Template Base.')
      return
    }

    setIsGenerating(true)
    setGenerateError(null)
    setApplySuccess(null)
    setApplyError(null)

    try {
      const response = await api.generateAiMapping(project.id, selectedSourceId)
      loadMappingIntoEditor(response.mapping)
      fetchMappingsHistory()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar sugestões com a IA.'
      setGenerateError(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleFieldSelect = (sectionId: string, fieldKey: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        [fieldKey]: !prev[sectionId]?.[fieldKey],
      },
    }))
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

  const handleToggleAllFields = (select: boolean) => {
    if (!activeMapping) return
    const result = activeMapping.mapping as AiContentMappingResult
    if (!result?.sections) return

    const nextSelected: Record<string, Record<string, boolean>> = {}
    result.sections.forEach((sec) => {
      nextSelected[sec.section_id] = {}
      sec.fields.forEach((f) => {
        nextSelected[sec.section_id][f.key] = select
      })
    })
    setSelectedFields(nextSelected)
  }

  const handleApplySelected = async () => {
    if (!activeMapping) return

    // Compile payload of only selected fields
    const appliedPayload: Record<string, Record<string, string>> = {}
    let count = 0

    Object.entries(selectedFields).forEach(([sectionId, fields]) => {
      Object.entries(fields).forEach(([fieldKey, isSelected]) => {
        if (isSelected) {
          if (!appliedPayload[sectionId]) {
            appliedPayload[sectionId] = {}
          }
          appliedPayload[sectionId][fieldKey] = editableValues[sectionId]?.[fieldKey] || ''
          count++
        }
      })
    })

    if (count === 0) {
      setApplyError('Selecione pelo menos um campo para aplicar à página.')
      return
    }

    setIsApplying(true)
    setApplyError(null)
    setApplySuccess(null)

    try {
      const res = await api.applyAiMapping(activeMapping.id, appliedPayload)
      onProjectUpdated(res.project)
      setActiveMapping(res.mapping)
      setApplySuccess(`${count} ${count === 1 ? 'campo aplicado' : 'campos aplicados'} com sucesso à estrutura da página!`)
      fetchMappingsHistory()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao aplicar sugestões ao projeto.'
      setApplyError(msg)
    } finally {
      setIsApplying(false)
    }
  }

  const handleDiscard = async () => {
    if (!activeMapping) return
    if (!window.confirm('Tem a certeza de que deseja descartar esta sugestão de IA?')) return

    try {
      const res = await api.discardAiMapping(activeMapping.id)
      setActiveMapping(res.mapping)
      fetchMappingsHistory()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao descartar sugestão.')
    }
  }

  // Helper count of selected fields
  const getSelectedCount = () => {
    let count = 0
    Object.values(selectedFields).forEach((sec) => {
      Object.values(sec).forEach((sel) => {
        if (sel) count++
      })
    })
    return count
  }

  const getConfidenceBadge = (confidence: AiConfidence) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <Check className="w-2.5 h-2.5" />
            Alta Confiança
          </span>
        )
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            Média Confiança
          </span>
        )
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            Requer Validação
          </span>
        )
    }
  }

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-900 via-[#064B88] to-[#1463FF] text-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shrink-0">
              <Bot className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg text-white font-bold">
                  Assistente de Conteúdo (IA)
                </CardTitle>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-blue-100">
                  Fase 3 &bull; Ativa
                </span>
              </div>
              <CardDescription className="text-xs text-blue-100 mt-0.5">
                Mapeamento inteligente do texto do cliente para as secções do template com supervisão humana
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

        {/* State 1: No template selected */}
        {!selectedTemplate ? (
          <div className="p-6 rounded-[14px] bg-amber-50/70 border border-amber-200 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Selecione um Template Base para ativar a IA
              </h4>
              <p className="text-xs text-amber-700 max-w-md mx-auto mt-1 leading-relaxed">
                A Inteligência Artificial precisa de conhecer as secções e campos estruturados do template para organizar o conteúdo com rigor.
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
          /* State 2: No content sources registered */
          <div className="p-6 rounded-[14px] bg-blue-50/60 border border-blue-200 text-center space-y-3">
            <FileText className="w-8 h-8 text-[#1463FF] mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Guarde uma Fonte de Conteúdo do Cliente
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                Utilize o módulo acima para colar o texto do briefing ou material de apoio fornecido pelo cliente antes de solicitar sugestões à IA.
              </p>
            </div>
          </div>
        ) : (
          /* State 3: Ready to generate / configure source */
          <div className="space-y-4">
            <div className="p-4 rounded-[12px] bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Fonte de Conteúdo a Analisar:
                </label>
                <select
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  disabled={isGenerating}
                  className="w-full text-xs rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
                >
                  {contentSources.map((source, idx) => (
                    <option key={source.id} value={source.id}>
                      Fonte #{contentSources.length - idx} &bull; {new Date(source.created_at).toLocaleDateString('pt-PT')} ({source.extracted_text.slice(0, 50)}...)
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
                  {activeMapping ? 'Gerar Novas Sugestões com IA' : 'Gerar Sugestões com IA'}
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

        {/* State 4: Generated Mappings Review & Apply Editor */}
        {activeMapping && (
          <div className="pt-6 border-t border-slate-200 space-y-6">
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[12px] bg-slate-900 text-white">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Sugestão Pronta para Revisão Humana
                  </span>
                  {activeMapping.status === 'applied' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">
                      Aplicada no Projeto
                    </span>
                  )}
                  {activeMapping.status === 'discarded' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                      Descartada
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
                  leftIcon={<CheckSquare className="w-3.5 h-3.5" />}
                >
                  Marcar Todos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAllFields(false)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 text-[11px]"
                  leftIcon={<Square className="w-3.5 h-3.5" />}
                >
                  Desmarcar
                </Button>
              </div>
            </div>

            {/* Warnings from AI if any */}
            {activeMapping.mapping?.warnings && activeMapping.mapping.warnings.length > 0 && (
              <div className="p-4 rounded-[12px] bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Pontos de Atenção e Validação com o Cliente:</span>
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
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#1463FF]/10 text-[#1463FF] text-xs font-bold flex items-center justify-center">
                          <Layers className="w-3.5 h-3.5" />
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
                        {sec.fields.length} {sec.fields.length === 1 ? 'campo' : 'campos'}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {sec.fields.map((field) => {
                        const templateField = templateSec?.editable_fields?.find((f) => f.key === field.key)
                        const isSelected = Boolean(selectedFields[sec.section_id]?.[field.key])
                        const currentValue = editableValues[sec.section_id]?.[field.key] ?? field.value

                        return (
                          <div
                            key={field.key}
                            className={`p-3.5 rounded-[10px] border transition-all ${
                              isSelected
                                ? 'bg-white border-blue-200 ring-1 ring-blue-100 shadow-2xs'
                                : 'bg-white/60 border-slate-200 opacity-70'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <label
                                onClick={() => handleToggleFieldSelect(sec.section_id, field.key)}
                                className="flex items-center gap-2 cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleFieldSelect(sec.section_id, field.key)}
                                  className="w-4 h-4 rounded text-[#1463FF] focus:ring-[#1463FF]/20 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-900">
                                  {templateField?.label || field.key}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  [{templateField?.field_type || 'text'}]
                                </span>
                              </label>

                              <div className="flex items-center gap-2 pl-6 sm:pl-0">
                                {getConfidenceBadge(field.confidence)}
                              </div>
                            </div>

                            {field.reason && (
                              <p className="text-[11px] text-slate-500 mb-2 pl-6 italic flex items-center gap-1">
                                <Info className="w-3 h-3 text-[#1463FF] shrink-0" />
                                {field.reason}
                              </p>
                            )}

                            <div className="pl-6">
                              {templateField?.field_type === 'textarea' ||
                              templateField?.field_type === 'rich_text' ||
                              (currentValue && currentValue.length > 80) ? (
                                <textarea
                                  rows={3}
                                  value={currentValue}
                                  onChange={(e) =>
                                    handleFieldValueChange(sec.section_id, field.key, e.target.value)
                                  }
                                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF] leading-relaxed"
                                  placeholder="Texto sugerido para este campo..."
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={currentValue}
                                  onChange={(e) =>
                                    handleFieldValueChange(sec.section_id, field.key, e.target.value)
                                  }
                                  className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
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
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{getSelectedCount()} campos selecionados para aplicação</span>
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
                    Descartar
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleApplySelected}
                  isLoading={isApplying}
                  disabled={isApplying || getSelectedCount() === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                  leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-100" />}
                >
                  Aplicar Sugestões Selecionadas
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
