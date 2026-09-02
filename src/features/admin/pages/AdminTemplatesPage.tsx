import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Layers,
  FileCode2,
  CheckCircle2,
  AlertCircle,
  Archive,
  RefreshCw,
  Sparkles,
  History,
  Bot,
  Upload,
  FileUp,
  Info,
  Check,
  ShieldCheck,
  Eye,
  Settings2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { convertElementorJson } from '@/lib/elementorConverter'
import {
  templateCreateSchema,
  INDUSTRY_OPTIONS,
  type Template,
  type TemplateCreateInput,
  type TemplateSection,
} from '@/types'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

const EXAMPLE_TEMPLATE_JSON = {
  name: 'Serviços Profissionais',
  slug: 'servicos-profissionais',
  category: 'Serviços',
  description: 'Template estruturado de alta conversão para consultorias, agências e prestadores de serviços qualificados.',
  preview_image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
  status: 'active',
  schema: {
    schema_version: '1.0.0',
    template_name: 'Serviços Profissionais',
    category: 'Serviços',
    design_tokens: {
      colors: {
        primary: '#064B88',
        accent: '#1463FF',
        background: '#F8FAFC',
        text: '#0F172A',
      },
      typography: {
        heading_font: 'Inter',
        body_font: 'Inter',
      },
      spacing: {
        section_padding: 'py-20',
        container_max_width: 'max-w-7xl',
      },
    },
    sections: [
      {
        id: 'hero_main',
        type: 'hero',
        label: 'Secção Hero Principal',
        purpose: 'Apresentar a proposta de valor irresistível e captar a atenção imediata com CTA principal.',
        required: true,
        editable_fields: [
          {
            key: 'headline',
            label: 'Título Principal (Headline)',
            field_type: 'text',
            required: true,
            placeholder: 'Transforme os resultados do seu negócio com especialistas',
            ai_hint: 'Título curto de alto impacto focado no benefício principal',
          },
          {
            key: 'subheadline',
            label: 'Subtítulo Persuasivo',
            field_type: 'textarea',
            required: true,
            placeholder: 'Ajudamos empresas a escalar com estratégias comprovadas e soluções à medida.',
            ai_hint: 'Descrição complementar curta explicando como resolve a dor do cliente',
          },
          {
            key: 'cta_text',
            label: 'Texto do Botão Principal',
            field_type: 'cta',
            required: true,
            placeholder: 'Agendar Consulta Gratuita',
            ai_hint: 'Ação principal de conversão',
          },
        ],
      },
      {
        id: 'benefits_grid',
        type: 'benefits',
        label: 'Benefícios Estratégicos',
        purpose: 'Evidenciar as 3 maiores vantagens competitivas do cliente.',
        required: true,
        editable_fields: [
          {
            key: 'section_title',
            label: 'Título dos Benefícios',
            field_type: 'text',
            required: true,
            placeholder: 'Porquê escolher os nossos serviços',
            ai_hint: 'Título que introduz as vantagens',
          },
          {
            key: 'items',
            label: 'Lista de Benefícios',
            field_type: 'card_list',
            required: true,
            placeholder: 'Lista com título e descrição para 3 a 4 benefícios principais',
            ai_hint: 'Pontos fortes que diferenciam a empresa da concorrência',
          },
        ],
      },
      {
        id: 'contact_conversion',
        type: 'contact',
        label: 'Formulário de Contacto e Conversão',
        purpose: 'Capturar o contacto direto do lead qualificado.',
        required: true,
        editable_fields: [
          {
            key: 'form_title',
            label: 'Título do Formulário',
            field_type: 'text',
            required: true,
            placeholder: 'Pronto para dar o próximo passo?',
            ai_hint: 'Chamada final para ação',
          },
          {
            key: 'submit_label',
            label: 'Texto do Botão de Envio',
            field_type: 'cta',
            required: true,
            placeholder: 'Enviar Pedido',
            ai_hint: 'Ação de submissão',
          },
        ],
      },
      {
        id: 'footer_bottom',
        type: 'footer',
        label: 'Rodapé da Página',
        purpose: 'Apresentar informações legais, morada e direitos reservados.',
        required: true,
        editable_fields: [
          {
            key: 'copyright',
            label: 'Texto de Direitos Reservados',
            field_type: 'text',
            required: true,
            placeholder: '© 2026 Blue Bolt Studio. Todos os direitos reservados.',
            ai_hint: 'Informação legal de rodapé',
          },
        ],
      },
    ],
  },
}

export const AdminTemplatesPage: React.FC = () => {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // New Template Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [jsonInput, setJsonInput] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Version History Modal state
  const [historyTemplate, setHistoryTemplate] = useState<Template | null>(null)
  const [versions, setVersions] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false)

  // Elementor Import Modal state
  const [isElementorModalOpen, setIsElementorModalOpen] = useState<boolean>(false)
  const [elementorStep, setElementorStep] = useState<'upload' | 'review'>('upload')
  const [elementorLoading, setElementorLoading] = useState<boolean>(false)
  const [elementorError, setElementorError] = useState<string | null>(null)
  const [elementorSuccess, setElementorSuccess] = useState<string | null>(null)
  const [elementorCandidate, setElementorCandidate] = useState<TemplateCreateInput | null>(null)
  const [elementorWarnings, setElementorWarnings] = useState<string[]>([])
  const [elementorStats, setElementorStats] = useState<{
    file_size_bytes?: number
    detected_sections_count: number
    detected_widgets_count: number
    structural_nodes_count?: number
  } | null>(null)

  // Elementor Review Form State
  const [candName, setCandName] = useState<string>('')
  const [candSlug, setCandSlug] = useState<string>('')
  const [candCategory, setCandCategory] = useState<string>('')
  const [candIndustryTags, setCandIndustryTags] = useState<string[]>([])
  const [candIsGeneric, setCandIsGeneric] = useState<boolean>(false)
  const [candDescription, setCandDescription] = useState<string>('')
  const [candSchemaJson, setCandSchemaJson] = useState<string>('')
  const [candActiveTab, setCandActiveTab] = useState<'metadata' | 'sections' | 'json'>('metadata')
  const [savingElementorDraft, setSavingElementorDraft] = useState<boolean>(false)

  // Thumbnail Generation State
  const [generatingThumbnailId, setGeneratingThumbnailId] = useState<string | null>(null)

  // Quick Edit Metadata Modal State
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false)
  const [editName, setEditName] = useState<string>('')
  const [editSlug, setEditSlug] = useState<string>('')
  const [editCategory, setEditCategory] = useState<string>('')
  const [editIndustryTags, setEditIndustryTags] = useState<string[]>([])
  const [editDescription, setEditDescription] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState<boolean>(false)
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({})

  const fetchAdminTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getAdminTemplates()
      setTemplates(data || [])
    } catch (err) {
      console.error('Error fetching admin templates:', err)
      const msg = err instanceof Error ? err.message : 'Erro ao carregar repositório de templates.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdminTemplates()
  }, [fetchAdminTemplates])

  const handleOpenNewModal = () => {
    setJsonInput('')
    setValidationErrors([])
    setSuccessMessage(null)
    setIsModalOpen(true)
  }

  const handleOpenElementorModal = () => {
    setElementorStep('upload')
    setElementorLoading(false)
    setElementorError(null)
    setElementorSuccess(null)
    setElementorCandidate(null)
    setElementorWarnings([])
    setElementorStats(null)
    setCandName('')
    setCandSlug('')
    setCandCategory('')
    setCandIndustryTags([])
    setCandIsGeneric(false)
    setCandDescription('')
    setCandSchemaJson('')
    setCandActiveTab('metadata')
    setIsElementorModalOpen(true)
  }

  const handleProcessElementorFile = async (file: File) => {
    setElementorError(null)
    setElementorSuccess(null)

    if (!file.name.toLowerCase().endsWith('.json')) {
      setElementorError('Apenas ficheiros com extensão .json são permitidos.')
      return
    }

    const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
    if (file.size > MAX_FILE_SIZE) {
      setElementorError(
        `O ficheiro selecionado (${(file.size / (1024 * 1024)).toFixed(2)} MB) excede o limite máximo de 25 MB.`
      )
      return
    }

    setElementorLoading(true)

    try {
      const fileText = await file.text()
      let parsedJson: unknown
      try {
        parsedJson = JSON.parse(fileText)
      } catch {
        throw new Error('O ficheiro selecionado não possui uma estrutura JSON válida.')
      }

      // Hybrid processing:
      // For smaller files (<= 2MB), attempt server conversion with seamless local fallback.
      // For larger files (> 2MB), run local high-performance converter directly.
      let conversionResult: {
        candidate: TemplateCreateInput
        warnings: string[]
        stats: {
          file_size_bytes?: number
          detected_sections_count: number
          detected_widgets_count: number
          structural_nodes_count: number
        }
      }

      if (file.size <= 2 * 1024 * 1024) {
        try {
          const res = await api.importElementorTemplate({
            elementor_json: parsedJson,
            file_name: file.name,
          })
          if (res.success && res.candidate) {
            conversionResult = {
              candidate: res.candidate,
              warnings: res.warnings || [],
              stats: {
                file_size_bytes: file.size,
                detected_sections_count: res.stats?.detected_sections_count || 0,
                detected_widgets_count: res.stats?.detected_widgets_count || 0,
                structural_nodes_count: (res.stats as any)?.structural_nodes_count || 0,
              },
            }
          } else {
            conversionResult = convertElementorJson(parsedJson, file.name, file.size)
          }
        } catch {
          conversionResult = convertElementorJson(parsedJson, file.name, file.size)
        }
      } else {
        conversionResult = convertElementorJson(parsedJson, file.name, file.size)
      }

      setElementorCandidate(conversionResult.candidate)
      setElementorWarnings(conversionResult.warnings)
      setElementorStats(conversionResult.stats)

      setCandName(conversionResult.candidate.name)
      setCandSlug(conversionResult.candidate.slug)
      setCandCategory(conversionResult.candidate.category)
      setCandIndustryTags(conversionResult.candidate.industry_tags || [])
      setCandIsGeneric(Boolean(conversionResult.candidate.is_generic))
      setCandDescription(conversionResult.candidate.description || '')
      setCandSchemaJson(JSON.stringify(conversionResult.candidate.schema, null, 2))

      setElementorStep('review')
    } catch (err) {
      console.error('[Elementor Import Error]:', err)
      const msg = err instanceof Error ? err.message : 'Erro ao processar ficheiro Elementor.'
      setElementorError(msg)
    } finally {
      setElementorLoading(false)
    }
  }

  const handleToggleIndustryTag = (key: string) => {
    setCandIndustryTags((prev: string[]) =>
      prev.includes(key) ? prev.filter((k: string) => k !== key) : [...prev, key]
    )
  }

  const handleSaveElementorDraft = async () => {
    setElementorError(null)
    setElementorSuccess(null)

    if (!candName.trim()) {
      setElementorError('O nome do template é obrigatório.')
      return
    }

    if (!candSlug.trim()) {
      setElementorError('O slug do template é obrigatório.')
      return
    }

    if (!candCategory.trim()) {
      setElementorError('A categoria do template é obrigatória.')
      return
    }

    let parsedSchema: any
    try {
      parsedSchema = JSON.parse(candSchemaJson)
    } catch (err: any) {
      setElementorError(`Erro no esquema JSON editado: ${err.message}`)
      return
    }

    const payload: TemplateCreateInput = {
      name: candName.trim(),
      slug: candSlug.trim(),
      category: candCategory.trim(),
      industry_tags: candIndustryTags,
      is_generic: candIsGeneric,
      description: candDescription.trim() || null,
      preview_image_url: null,
      status: 'draft', // MUST always be draft on import
      schema: parsedSchema,
    }

    const validation = templateCreateSchema.safeParse(payload)
    if (!validation.success) {
      const issues = validation.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join('; ')
      setElementorError(`Validação falhou: ${issues}`)
      return
    }

    setSavingElementorDraft(true)
    try {
      const created = await api.createAdminTemplate(validation.data as TemplateCreateInput)
      setElementorSuccess(`Template '${created.name}' guardado com sucesso como Rascunho (Versão 1)!`)
      fetchAdminTemplates()
      setTimeout(() => {
        setIsElementorModalOpen(false)
      }, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao persistir template no servidor.'
      setElementorError(msg)
    } finally {
      setSavingElementorDraft(false)
    }
  }

  const handleValidateAndSubmit = async () => {
    setValidationErrors([])
    setSuccessMessage(null)

    if (!jsonInput.trim()) {
      setValidationErrors(['O campo de código JSON do template não pode estar vazio.'])
      return
    }

    let parsed: any
    try {
      parsed = JSON.parse(jsonInput)
    } catch (err: any) {
      setValidationErrors([`Erro de sintaxe JSON: ${err.message}`])
      return
    }

    const validation = templateCreateSchema.safeParse(parsed)
    if (!validation.success) {
      const formattedErrors = validation.error.issues.map((i: any) => `Campo '${i.path.join('.')}': ${i.message}`)
      setValidationErrors(formattedErrors)
      return
    }

    setSubmitting(true)
    try {
      const created = await api.createAdminTemplate(validation.data as TemplateCreateInput)
      setSuccessMessage(`Template '${created.name}' registado com sucesso com a Versão 1!`)
      fetchAdminTemplates()
      setTimeout(() => {
        setIsModalOpen(false)
      }, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao guardar template no servidor.'
      setValidationErrors([msg])
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (template: Template) => {
    const nextStatus = template.status === 'active' ? 'draft' : 'active'
    try {
      await api.updateAdminTemplate(template.id, {
        status: nextStatus,
        change_note: `Alteração de estado para ${nextStatus}.`,
      })
      fetchAdminTemplates()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao alterar estado do template.')
    }
  }

  const handleOpenHistory = async (template: Template) => {
    setHistoryTemplate(template)
    setLoadingHistory(true)
    try {
      const data = await api.getAdminTemplate(template.id)
      setVersions(data.versions || [])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao obter histórico de versões.')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleGenerateThumbnail = async (templateId: string) => {
    setGeneratingThumbnailId(templateId)
    try {
      const res = await api.generateTemplateThumbnail(templateId)
      setSuccessMessage(res.message || 'Miniatura gerada com sucesso!')
      await fetchAdminTemplates()
    } catch (err: any) {
      console.error('Error generating thumbnail:', err)
      const msg = err instanceof Error ? err.message : 'Erro ao gerar miniatura do template.'
      alert(msg)
    } finally {
      setGeneratingThumbnailId(null)
    }
  }

  const handleOpenEditModal = (t: Template) => {
    setEditingTemplate(t)
    setEditName(t.name)
    setEditSlug(t.slug)
    setEditCategory(t.category)
    setEditIndustryTags(Array.isArray(t.industry_tags) ? (t.industry_tags as string[]) : [])
    setEditDescription(t.description || '')
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingTemplate) return
    setSavingEdit(true)
    try {
      await api.updateAdminTemplate(editingTemplate.id, {
        name: editName.trim(),
        slug: editSlug.trim(),
        category: editCategory.trim(),
        industry_tags: editIndustryTags,
        description: editDescription.trim(),
        change_note: 'Atualização de metadados pelo administrador.',
      })
      setIsEditModalOpen(false)
      setSuccessMessage('Metadados atualizados com sucesso!')
      await fetchAdminTemplates()
    } catch (err: any) {
      console.error('Error updating template metadata:', err)
      alert(err?.message || 'Erro ao atualizar metadados.')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header
        title="Gestão de Templates (Administração)"
        subtitle="Repositório global, controlo de versões e validação de estruturas JSON"
      />

      <div className="p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Top actions banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#064B88] to-[#1463FF] p-6 rounded-[14px] text-white shadow-md">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Painel de Administração
            </div>
            <h2 className="text-xl font-bold">Repositório Oficial de Templates</h2>
            <p className="text-xs text-blue-100 mt-1 max-w-xl">
              Crie, edite e valide os esquemas JSON de templates com controlo de versões imutável. Cada versão é rastreada para garantir integridade estrutural.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleOpenElementorModal}
              className="bg-white/10 text-white hover:bg-white/20 border-white/30 font-bold shrink-0 shadow-sm"
              leftIcon={<FileUp className="w-4 h-4 text-amber-300" />}
            >
              Importar JSON do Elementor
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleOpenNewModal}
              className="bg-white text-[#064B88] hover:bg-blue-50 border-white font-bold shrink-0 shadow-sm"
              leftIcon={<Plus className="w-4 h-4 text-[#1463FF]" />}
            >
              Novo Template JSON
            </Button>
          </div>
        </div>

        {/* Phase 3 AI Schema Information Notice */}
        <div className="p-4 rounded-[12px] bg-blue-50/80 border border-blue-200 text-[#064B88] text-xs flex items-start gap-3">
          <Bot className="w-5 h-5 text-[#1463FF] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-slate-900">
              Contrato de Esquema JSON &bull; Mapeamento por Inteligência Artificial
            </p>
            <p className="text-blue-900/80 leading-relaxed">
              As secções e os campos editáveis definidos neste esquema JSON estabelecem o contrato estrito de dados que a IA utiliza para gerar sugestões de copywriting a partir do briefing e dos textos do cliente.
            </p>
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <LoadingState message="A carregar templates de administração..." />
        ) : error ? (
          <ErrorState
            title="Erro no repositório de templates"
            message={error}
            onRetry={fetchAdminTemplates}
          />
        ) : templates.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[14px] border border-slate-200 p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1463FF] mx-auto flex items-center justify-center">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Nenhum template registado no repositório</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Comece por registar o primeiro template JSON de serviços ou carregue o modelo padrão de desenvolvimento.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="md" onClick={handleOpenElementorModal} leftIcon={<FileUp className="w-4 h-4" />}>
                Importar do Elementor
              </Button>
              <Button variant="primary" size="md" onClick={handleOpenNewModal} leftIcon={<Plus className="w-4 h-4" />}>
                Criar Primeiro Template
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Templates Registados ({templates.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAdminTemplates}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="text-xs text-slate-500"
              >
                Atualizar Lista
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {templates.map((template: Template) => {
                const isActive = template.status === 'active'
                const schemaObj = (template.schema as any) || {}
                const sections = schemaObj.sections || []

                return (
                  <Card key={template.id} className="border-slate-200 hover:border-slate-300 transition-all shadow-xs">
                    <CardContent className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                      {/* Left: Thumbnail & Info */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
                        {/* Thumbnail preview */}
                        <div className="w-full sm:w-40 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 shrink-0 flex items-center justify-center relative shadow-inner">
                          {template.preview_image_url && !imgErrorMap[template.id] ? (
                            <img
                              src={template.preview_image_url}
                              alt={`Miniatura de ${template.name}`}
                              onError={() => setImgErrorMap((prev) => ({ ...prev, [template.id]: true }))}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 text-slate-400 p-2 text-center bg-gradient-to-br from-slate-900 to-[#0A2540] w-full h-full">
                              <Layers className="w-6 h-6 text-[#1463FF]" />
                              <span className="text-[10px] font-bold tracking-wider text-slate-300">Estrutura Blue Bolt</span>
                              <span className="text-[9px] text-slate-500">{template.category}</span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900 truncate">{template.name}</h4>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ativo na Galeria
                                </>
                              ) : (
                                <>
                                  <Archive className="w-3 h-3 text-slate-500" /> Rascunho (Draft)
                                </>
                              )}
                            </span>
                            <span className="bg-blue-50 text-[#064B88] text-[11px] font-semibold px-2 py-0.5 rounded border border-blue-100">
                              {template.category}
                            </span>
                            {template.is_generic && (
                              <span className="bg-amber-50 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded border border-amber-200">
                                Base Genérica
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 line-clamp-1">{template.description || 'Sem descrição.'}</p>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1 font-mono">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px]">
                              slug: {template.slug}
                            </span>
                            <span className="flex items-center gap-1 font-sans">
                              <Layers className="w-3.5 h-3.5 text-slate-400" />
                              {sections.length} Secções estruturadas
                            </span>
                            <span className="flex items-center gap-1 font-sans">
                              <History className="w-3.5 h-3.5 text-slate-400" />
                              {template.version_count || 1} Versões
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-end xl:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateThumbnail(template.id)}
                          disabled={generatingThumbnailId === template.id}
                          className="text-xs text-slate-700 border-slate-200 hover:bg-slate-50 font-semibold"
                          leftIcon={
                            generatingThumbnailId === template.id ? (
                              <RefreshCw className="w-3.5 h-3.5 text-[#1463FF] animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            )
                          }
                        >
                          {generatingThumbnailId === template.id
                            ? 'A gerar...'
                            : template.preview_image_url
                            ? 'Regenerar Miniatura'
                            : 'Gerar Miniatura'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(template)}
                          className="text-xs text-slate-600 font-semibold"
                          leftIcon={<Settings2 className="w-3.5 h-3.5" />}
                        >
                          Metadados
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/templates/${template.id}/preview`)}
                          className="text-xs text-[#064B88] border-blue-200 hover:bg-blue-50 font-bold"
                          leftIcon={<Eye className="w-3.5 h-3.5 text-[#1463FF]" />}
                        >
                          Visualizar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenHistory(template)}
                          className="text-xs text-slate-600 font-semibold"
                          leftIcon={<History className="w-3.5 h-3.5" />}
                        >
                          Versões
                        </Button>
                        <Button
                          variant={isActive ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleStatus(template)}
                          className={
                            isActive
                              ? 'text-amber-700 border-amber-200 hover:bg-amber-50 text-xs font-semibold'
                              : 'bg-[#1463FF] text-xs font-bold'
                          }
                        >
                          {isActive ? 'Mudar para Rascunho' : 'Ativar Template'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Elementor JSON Safe Importer */}
      {isElementorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Importar Template JSON do Elementor
                  </h3>
                  <p className="text-xs text-slate-500">
                    Conversão segura de estruturas e widgets com revisão humana obrigatória
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsElementorModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {elementorStep === 'upload' ? (
                /* Step 1: Upload File */
                <div className="space-y-6">
                  <div className="p-4 rounded-[12px] bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800">Diretrizes de Segurança e Processamento Escalável:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                        <li>Ficheiros <code>.json</code> até <strong>25 MB</strong> suportados com processamento híbrido local/servidor.</li>
                        <li>Suporta páginas completas com até <strong>15.000 elementos estruturais</strong> e 250 secções.</li>
                        <li>Nenhum script, estilo CSS ou código executável é executado ou armazenado.</li>
                        <li>Imagens e URLs de terceiros são neutralizadas; apenas a estrutura de secções é aproveitada.</li>
                        <li>O template será guardado obrigatoriamente como <strong>Rascunho (Draft)</strong>.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Dropzone */}
                  <label className="border-2 border-dashed border-slate-300 hover:border-[#1463FF] rounded-[16px] p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-all">
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleProcessElementorFile(file)
                      }}
                      disabled={elementorLoading}
                    />
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 text-[#1463FF] flex items-center justify-center shadow-xs">
                      {elementorLoading ? (
                        <RefreshCw className="w-7 h-7 animate-spin" />
                      ) : (
                        <Upload className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {elementorLoading ? 'A processar e converter template...' : 'Clique para selecionar ou arraste o ficheiro .json'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Exportação padrão do Elementor (suporta landing pages até 25 MB)
                      </p>
                    </div>
                  </label>

                  {elementorError && (
                    <div className="p-4 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{elementorError}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Step 2: Review Screen (Obrigatório antes de guardar) */
                <div className="space-y-6">
                  {/* Diagnostics & Stats */}
                  <div className="p-4 rounded-[12px] bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#064B88]">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Sparkles className="w-4 h-4 text-[#1463FF]" />
                        <span>Estrutura Convertida com Sucesso:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-700">
                        <span className="bg-white px-2 py-0.5 rounded border border-blue-100 font-bold text-[#064B88]">
                          {elementorStats?.detected_sections_count || 0} secções
                        </span>
                        <span className="bg-white px-2 py-0.5 rounded border border-blue-100">
                          {elementorStats?.detected_widgets_count || 0} widgets
                        </span>
                        {elementorStats?.structural_nodes_count !== undefined && (
                          <span className="bg-white px-2 py-0.5 rounded border border-blue-100">
                            {elementorStats.structural_nodes_count} nós estruturais
                          </span>
                        )}
                        {elementorStats?.file_size_bytes && (
                          <span className="bg-white px-2 py-0.5 rounded border border-blue-100">
                            {elementorStats.file_size_bytes < 1024 * 1024
                              ? `${(elementorStats.file_size_bytes / 1024).toFixed(1)} KB`
                              : `${(elementorStats.file_size_bytes / (1024 * 1024)).toFixed(2)} MB`}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px] shrink-0 self-start sm:self-center">
                      Estado: Rascunho (Draft)
                    </span>
                  </div>

                  {/* Conversion Warnings */}
                  {elementorWarnings.length > 0 && (
                    <div className="p-4 rounded-[10px] bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Info className="w-4 h-4 text-amber-700 shrink-0" />
                        Avisos de Conversão:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                        {elementorWarnings.map((w: string, idx: number) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCandActiveTab('metadata')}
                      className={`pb-2.5 cursor-pointer border-b-2 transition-all ${
                        candActiveTab === 'metadata'
                          ? 'border-[#1463FF] text-[#1463FF]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      1. Metadados e Segmento
                    </button>
                    <button
                      type="button"
                      onClick={() => setCandActiveTab('sections')}
                      className={`pb-2.5 cursor-pointer border-b-2 transition-all ${
                        candActiveTab === 'sections'
                          ? 'border-[#1463FF] text-[#1463FF]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      2. Secções Detetadas ({elementorCandidate?.schema?.sections?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCandActiveTab('json')}
                      className={`pb-2.5 cursor-pointer border-b-2 transition-all ${
                        candActiveTab === 'json'
                          ? 'border-[#1463FF] text-[#1463FF]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      3. Editor JSON Blue Bolt
                    </button>
                  </div>

                  {/* Tab 1: Metadata */}
                  {candActiveTab === 'metadata' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Template *</label>
                          <input
                            type="text"
                            value={candName}
                            onChange={(e) => setCandName(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-[8px] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/30"
                            placeholder="Ex: Página de Vendas Maquiadora"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Slug do Template *</label>
                          <input
                            type="text"
                            value={candSlug}
                            onChange={(e) => setCandSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            className="w-full px-3 py-2 text-xs font-mono rounded-[8px] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/30"
                            placeholder="Ex: pagina-vendas-maquiadora"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Categoria Principal *</label>
                          <input
                            type="text"
                            value={candCategory}
                            onChange={(e) => setCandCategory(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-[8px] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/30"
                            placeholder="Ex: Estética e Beleza"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-6">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={candIsGeneric}
                              onChange={(e) => setCandIsGeneric(e.target.checked)}
                              className="rounded border-slate-300 text-[#1463FF] focus:ring-[#1463FF]"
                            />
                            Template Base Genérico (Compatível com múltiplos ramos)
                          </label>
                        </div>
                      </div>

                      {/* Segment Confirmation */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Segmentos Compatíveis (Confirmar Industry Tags) *:
                        </label>
                        <p className="text-[11px] text-slate-500 mb-2">
                          Selecione os segmentos para os quais a IA deve recomendar este template:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-3 rounded-[10px] border border-slate-200 bg-slate-50">
                          {INDUSTRY_OPTIONS.map((opt) => {
                            const isChecked = candIndustryTags.includes(opt.key)
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => handleToggleIndustryTag(opt.key)}
                                className={`p-2 rounded-[8px] border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                                  isChecked
                                    ? 'bg-blue-100 border-[#1463FF] text-[#064B88] font-bold'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span className="truncate">{opt.label.split(' ')[0]} {opt.label.split(' ')[1]}</span>
                                {isChecked && <Check className="w-3.5 h-3.5 text-[#1463FF] shrink-0" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Descrição do Template</label>
                        <textarea
                          value={candDescription}
                          onChange={(e) => setCandDescription(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 text-xs rounded-[8px] border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/30"
                          placeholder="Descrição opcional..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Detected Sections */}
                  {candActiveTab === 'sections' && (
                    <div className="space-y-3">
                      {elementorCandidate?.schema?.sections?.map((sec: TemplateSection, sIdx: number) => (
                        <div key={sec.id || sIdx} className="p-3.5 rounded-[10px] border border-slate-200 bg-slate-50/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">
                                {sIdx + 1}. {sec.label}
                              </span>
                              <span className="bg-blue-100 text-[#064B88] text-[10px] font-bold px-2 py-0.5 rounded">
                                tipo: {sec.type}
                              </span>
                              {sec.required && (
                                <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                  obrigatória
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">id: {sec.id}</span>
                          </div>
                          <p className="text-xs text-slate-500">{sec.purpose}</p>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {sec.editable_fields?.map((f: any, fIdx: number) => (
                              <span
                                key={fIdx}
                                className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono"
                              >
                                {f.key} ({f.field_type})
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 3: JSON Schema Editor */}
                  {candActiveTab === 'json' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Pode inspecionar ou afinar o esquema JSON final gerado:</span>
                      </div>
                      <textarea
                        value={candSchemaJson}
                        onChange={(e) => setCandSchemaJson(e.target.value)}
                        rows={14}
                        className="w-full p-4 font-mono text-xs rounded-[10px] border border-slate-300 bg-slate-900 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/30"
                        spellCheck={false}
                      />
                    </div>
                  )}

                  {elementorError && (
                    <div className="p-4 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{elementorError}</span>
                    </div>
                  )}

                  {elementorSuccess && (
                    <div className="p-4 rounded-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{elementorSuccess}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-[16px]">
              {elementorStep === 'review' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setElementorStep('upload')}
                  disabled={savingElementorDraft}
                  className="text-xs text-slate-600 font-semibold"
                >
                  &larr; Selecionar Outro Ficheiro
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsElementorModalOpen(false)}
                  disabled={savingElementorDraft || elementorLoading}
                >
                  Cancelar
                </Button>

                {elementorStep === 'review' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveElementorDraft}
                    isLoading={savingElementorDraft}
                    disabled={savingElementorDraft}
                    className="bg-[#1463FF] hover:bg-[#064B88] font-bold"
                  >
                    Guardar como Rascunho (Draft v1)
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Template JSON Creator */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1463FF] flex items-center justify-center">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Novo Template JSON</h3>
                  <p className="text-xs text-slate-500">Validação e inserção direta no repositório de templates</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Estrutura JSON do Template:</label>
                <button
                  type="button"
                  onClick={() => setJsonInput(JSON.stringify(EXAMPLE_TEMPLATE_JSON, null, 2))}
                  className="text-xs text-[#1463FF] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Carregar Exemplo Padrão (Serviços Profissionais)
                </button>
              </div>

              <textarea
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value)
                  if (validationErrors.length > 0) setValidationErrors([])
                }}
                placeholder='Cole aqui a estrutura JSON do template com name, slug, category, status e schema...'
                rows={14}
                className="w-full p-4 font-mono text-xs rounded-[10px] border border-slate-300 bg-slate-900 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/30"
                spellCheck={false}
              />

              {validationErrors.length > 0 && (
                <div className="p-4 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Erros de Validação da Estrutura:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {validationErrors.map((err: string, idx: number) => (
                      <li key={idx} className="text-[11px] leading-relaxed">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {successMessage && (
                <div className="p-4 rounded-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-[16px]">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleValidateAndSubmit}
                isLoading={submitting}
                disabled={submitting}
                className="bg-[#1463FF] hover:bg-[#064B88] font-bold"
              >
                Validar e Guardar Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Version History */}
      {historyTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Histórico de Versões</h3>
                <p className="text-xs text-slate-500">
                  Template: <span className="font-semibold text-slate-800">{historyTemplate.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryTemplate(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {loadingHistory ? (
                <LoadingState message="A carregar versões..." />
              ) : versions.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Nenhuma versão anterior registada.</p>
              ) : (
                versions.map((ver: any) => (
                  <div key={ver.id} className="p-3.5 rounded-[10px] border border-slate-200 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1463FF] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        Versão {ver.version}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(ver.created_at).toLocaleDateString('pt-PT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{ver.change_note || 'Alteração de esquema registada.'}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end rounded-b-[16px]">
              <Button variant="outline" size="sm" onClick={() => setHistoryTemplate(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quick Edit Metadata */}
      {isEditModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Editar Metadados do Template</h3>
                <p className="text-xs text-slate-500">
                  Revisão de nome, categoria, nichos e descrição oficial Blue Bolt
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nome do Template</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-slate-300 focus:outline-hidden focus:border-[#1463FF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Slug Identificador</label>
                  <input
                    type="text"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-slate-300 font-mono focus:outline-hidden focus:border-[#1463FF]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Categoria</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[8px] border border-slate-300 focus:outline-hidden focus:border-[#1463FF]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Segmentos / Nichos Compatíveis
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-[10px] max-h-36 overflow-y-auto">
                  {INDUSTRY_OPTIONS.map((opt) => {
                    const isChecked = editIndustryTags.includes(opt.key)
                    return (
                      <label
                        key={opt.key}
                        className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditIndustryTags([...editIndustryTags, opt.key])
                            } else {
                              setEditIndustryTags(editIndustryTags.filter((t) => t !== opt.key))
                            }
                          }}
                          className="rounded text-[#1463FF]"
                        />
                        <span className="truncate">{opt.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Descrição</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-[8px] border border-slate-300 focus:outline-hidden focus:border-[#1463FF]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 rounded-b-[16px]">
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
                isLoading={savingEdit}
                disabled={savingEdit}
                className="bg-[#1463FF] hover:bg-[#064B88] font-bold"
              >
                Guardar Alterações
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
