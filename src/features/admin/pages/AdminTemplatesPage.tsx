import React, { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Layers,
  FileCode2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Archive,
  RefreshCw,
  Sparkles,
  History,
  Bot,
} from 'lucide-react'
import { api } from '@/lib/api'
import { templateCreateSchema, type Template, type TemplateCreateInput } from '@/types'
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

  const handleLoadExample = () => {
    setJsonInput(JSON.stringify(EXAMPLE_TEMPLATE_JSON, null, 2))
    setValidationErrors([])
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
      const formattedErrors = validation.error.issues.map((i) => `Campo '${i.path.join('.')}': ${i.message}`)
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
            <Button variant="primary" size="md" onClick={handleOpenNewModal} leftIcon={<Plus className="w-4 h-4" />}>
              Criar Primeiro Template
            </Button>
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
              {templates.map((template) => {
                const sections = template.schema?.sections || []
                const isDraft = template.status === 'draft'
                const isActive = template.status === 'active'
                const isArchived = template.status === 'archived'

                return (
                  <Card key={template.id} className="border border-slate-200 hover:border-slate-300 transition-all">
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base">{template.name}</h4>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            /{template.slug}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#1463FF]">
                            {template.category}
                          </span>

                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Ativo
                            </span>
                          )}
                          {isDraft && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Rascunho
                            </span>
                          )}
                          {isArchived && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              <Archive className="w-3 h-3 text-slate-500" />
                              Arquivado
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-1">
                          {template.description || 'Sem descrição registada.'}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            {sections.length} Secções estruturadas
                          </span>
                          <span className="flex items-center gap-1">
                            <History className="w-3.5 h-3.5 text-slate-400" />
                            {template.version_count || 1} Versões registadas
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Criado a{' '}
                            {new Date(template.created_at).toLocaleDateString('pt-PT', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
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
                          className={isActive ? 'text-amber-700 border-amber-200 hover:bg-amber-50 text-xs font-semibold' : 'bg-[#1463FF] text-xs font-bold'}
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
                  onClick={handleLoadExample}
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
                    {validationErrors.map((err, idx) => (
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
                versions.map((ver) => (
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
    </div>
  )
}
