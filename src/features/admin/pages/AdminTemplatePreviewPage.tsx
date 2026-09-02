import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Layers,
  Sparkles,
  CheckCircle2,
  Archive,
  ChevronDown,
  ChevronUp,
  Star,
  ShieldCheck,
  Send,
  Check,
} from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import type { Template, TemplateSection } from '@/types'

export const AdminTemplatePreviewPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()

  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  const fetchTemplate = useCallback(async () => {
    if (!templateId) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getAdminTemplate(templateId)
      setTemplate(data.template || null)
    } catch (err) {
      console.error('Error fetching template for preview:', err)
      const msg = err instanceof Error ? err.message : 'Erro ao carregar prévia do template.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  if (loading) {
    return <LoadingState message="A carregar prévia estrutural do template..." fullPage />
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <ErrorState
          title="Não foi possível carregar o template"
          message={error || 'Template não encontrado.'}
          onRetry={fetchTemplate}
        />
      </div>
    )
  }

  const schemaObj = (template.schema as any) || {}
  const sections: TemplateSection[] = schemaObj.sections || []
  const designTokens = schemaObj.design_tokens || {}
  const primaryColor = designTokens.colors?.primary || '#064B88'
  const isActive = template.status === 'active'

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-slate-900 via-[#064B88] to-[#1463FF] text-white px-4 py-2.5 text-xs flex items-center justify-center gap-2 shadow-sm shrink-0">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="font-semibold">
          Prévia estrutural do Blue Bolt — conteúdos e ativos finais serão definidos no projeto.
        </span>
      </div>

      {/* Control Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/templates')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-slate-600 hover:text-slate-900 text-xs font-bold"
          >
            Voltar aos Templates
          </Button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 truncate">{template.name}</h2>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
              <span className="bg-blue-50 text-[#064B88] text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">
                {template.category}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">
              slug: <code className="font-mono text-slate-600">{template.slug}</code> &bull; {sections.length} secções estruturadas
            </p>
          </div>
        </div>

        {/* Viewport switcher */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="bg-slate-100 p-1 rounded-[10px] flex items-center border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'desktop'
                  ? 'bg-white text-[#1463FF] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'mobile'
                  ? 'bg-white text-[#1463FF] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile
            </button>
          </div>
        </div>
      </header>

      {/* Main Preview Container */}
      <main className="flex-1 p-4 sm:p-8 flex justify-center items-start overflow-y-auto">
        <div
          className={`transition-all duration-300 w-full ${
            viewMode === 'mobile'
              ? 'max-w-[390px] border-[10px] border-slate-800 rounded-[44px] shadow-2xl bg-white overflow-hidden my-4 ring-1 ring-slate-900/10'
              : 'max-w-5xl bg-white rounded-[16px] shadow-xl border border-slate-200 overflow-hidden my-2'
          }`}
        >
          {/* Mobile Speaker / Camera Notch */}
          {viewMode === 'mobile' && (
            <div className="h-6 bg-slate-800 flex items-center justify-center relative">
              <div className="w-16 h-3 bg-slate-900 rounded-full" />
            </div>
          )}

          {/* Clean Structural Page Preview */}
          <div className="divide-y divide-slate-100 font-sans">
            {sections.length === 0 ? (
              <div className="py-24 text-center p-8 space-y-3">
                <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">Este template não possui secções definidas.</p>
              </div>
            ) : (
              sections.map((section, sIdx) => {
                const secType = section.type || 'services'
                const secLabel = section.label || `Secção ${sIdx + 1}`

                return (
                  <section
                    key={section.id || sIdx}
                    id={section.id}
                    className="relative group transition-all"
                  >
                    {/* Admin Structural Inspector Badge */}
                    <div className="absolute top-3 right-3 z-10 opacity-60 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-full pointer-events-none shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{secType}</span> &bull; <span>{section.id}</span>
                    </div>

                    {/* Section Renderers */}
                    {secType === 'hero' && (
                      <div className="py-16 sm:py-24 px-6 sm:px-12 bg-gradient-to-b from-blue-50/50 via-white to-white text-center space-y-6">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#064B88] text-xs font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-[#1463FF]" />
                          {template.category} &bull; Estrutura de Alta Conversão
                        </div>

                        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto leading-tight">
                          Transforme os Resultados do Seu Negócio com Especialistas
                        </h1>

                        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                          Apresentação de valor persuasiva gerada sob medida. Metodologia comprovada, atendimento exclusivo e foco em alta conversão de clientes.
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                          <button
                            type="button"
                            style={{ backgroundColor: primaryColor }}
                            className="px-6 py-3 rounded-[10px] text-white text-xs sm:text-sm font-bold shadow-md hover:brightness-110 transition-all cursor-pointer flex items-center gap-2"
                          >
                            Agendar Atendimento / Consulta
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          </button>
                        </div>

                        {/* Hero Visual Placeholder */}
                        <div className="mt-8 pt-4">
                          <div className="w-full h-44 sm:h-72 rounded-[16px] bg-gradient-to-br from-blue-100 via-slate-100 to-indigo-100 border border-blue-200/60 flex flex-col items-center justify-center gap-2 text-slate-400 p-6 text-center shadow-inner">
                            <Layers className="w-10 h-10 text-[#1463FF]/60" />
                            <span className="text-xs font-bold text-slate-600">Bloco de Imagem de Destaque / Vídeo</span>
                            <span className="text-[11px] text-slate-400 max-w-xs">
                              Ativo fotográfico ou institucional do cliente será vinculado na personalização do projeto.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {secType === 'services' && (
                      <div className="py-16 px-6 sm:px-12 bg-white space-y-8">
                        <div className="text-center space-y-2 max-w-xl mx-auto">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#1463FF]">
                            {secLabel}
                          </span>
                          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                            Serviços e Especialidades em Destaque
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500">
                            Soluções estruturadas para atender às necessidades específicas dos seus clientes.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {[1, 2, 3].map((num) => (
                            <div
                              key={num}
                              className="p-5 rounded-[14px] border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-[#1463FF]/40 transition-all space-y-3 shadow-xs"
                            >
                              <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#1463FF] flex items-center justify-center font-bold text-xs">
                                0{num}
                              </div>
                              <h3 className="text-sm font-bold text-slate-900">
                                Especialidade / Serviço {num}
                              </h3>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                Descrição clara dos benefícios, método aplicado e resultados esperados para este serviço.
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {secType === 'benefits' && (
                      <div className="py-16 px-6 sm:px-12 bg-slate-50/60 space-y-8">
                        <div className="text-center space-y-2 max-w-xl mx-auto">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                            {secLabel}
                          </span>
                          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                            Porquê Escolher os Nossos Serviços
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500">
                            Diferenciais estratégicos que posicionam a sua oferta à frente da concorrência.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          {['Qualidade Superior', 'Atendimento Personalizado', 'Metodologia Ágil', 'Garantia Comprovada'].map(
                            (title, idx) => (
                              <div
                                key={idx}
                                className="p-4 rounded-[12px] bg-white border border-slate-200 space-y-2 shadow-xs"
                              >
                                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                  <Check className="w-4 h-4" />
                                </div>
                                <h4 className="text-xs font-bold text-slate-900">{title}</h4>
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                  Benefício concreto gerado diretamente para a tranquilidade e satisfação do cliente.
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {secType === 'about' && (
                      <div className="py-16 px-6 sm:px-12 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                          <div className="w-full h-56 sm:h-72 rounded-[16px] bg-gradient-to-tr from-slate-100 via-blue-50 to-indigo-50 border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                            <Layers className="w-8 h-8 text-slate-400 mb-2" />
                            <span className="text-xs font-bold text-slate-700">Foto do Especialista / Equipa</span>
                            <span className="text-[11px] text-slate-400">Ativo visual representativo</span>
                          </div>
                          <div className="space-y-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#1463FF]">
                              {secLabel}
                            </span>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                              Autoridade, Experiência e Compromisso
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                              História profissional fundamentada em anos de dedicação, capacitação contínua e foco rigoroso na entrega de valor e satisfação do cliente.
                            </p>
                            <div className="pt-2 flex items-center gap-4 text-xs font-bold text-slate-700">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Atendimento Qualificado
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Suporte Dedicado
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {secType === 'process' && (
                      <div className="py-16 px-6 sm:px-12 bg-slate-50/50 space-y-8">
                        <div className="text-center space-y-2 max-w-xl mx-auto">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                            {secLabel}
                          </span>
                          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                            Como Funciona o Nosso Processo
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500">
                            Etapas simples e transparentes desde o primeiro contacto até à conclusão.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {[
                            { step: '01', title: '1. Agendamento & Diagnóstico', desc: 'Análise inicial das necessidades do cliente.' },
                            { step: '02', title: '2. Execução Personalizada', desc: 'Aplicação das melhores técnicas com rigor e precisão.' },
                            { step: '03', title: '3. Conclusão & Acompanhamento', desc: 'Entrega dos resultados e acompanhamento pós-serviço.' },
                          ].map((item, idx) => (
                            <div
                              key={idx}
                              className="p-5 rounded-[14px] bg-white border border-slate-200 space-y-2 shadow-xs"
                            >
                              <span className="text-xs font-mono font-extrabold text-[#1463FF] bg-blue-50 px-2 py-0.5 rounded">
                                Passo {item.step}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                              <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {secType === 'testimonials' && (
                      <div className="py-16 px-6 sm:px-12 bg-white space-y-8">
                        <div className="text-center space-y-2 max-w-xl mx-auto">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                            {secLabel}
                          </span>
                          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                            O Que Dizem os Nossos Clientes
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500">
                            Prova social autêntica e relatos de satisfação comprovada.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {[
                            { name: 'Marta Ribeiro', role: 'Cliente Verificada', text: 'Excelente atendimento e atenção a cada detalhe. Superou totalmente as expectativas!' },
                            { name: 'João Santos', role: 'Cliente Satisfeito', text: 'Profissionalismo impecável do início ao fim. Recomendo com toda a segurança.' },
                            { name: 'Ana Oliveira', role: 'Recomendação Positiva', text: 'Resultados visíveis e serviço de excelência. Tornou-se a minha referência.' },
                          ].map((item, idx) => (
                            <div
                              key={idx}
                              className="p-5 rounded-[14px] bg-slate-50 border border-slate-200 space-y-3 shadow-xs"
                            >
                              <div className="flex items-center gap-1 text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                                ))}
                              </div>
                              <p className="text-xs text-slate-700 italic">"{item.text}"</p>
                              <div>
                                <p className="text-xs font-bold text-slate-900">{item.name}</p>
                                <p className="text-[10px] text-slate-500">{item.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {secType === 'faq' && (
                      <div className="py-16 px-6 sm:px-12 bg-slate-50/50 space-y-8">
                        <div className="text-center space-y-2 max-w-xl mx-auto">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#1463FF]">
                            {secLabel}
                          </span>
                          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                            Perguntas Frequentes (FAQ)
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500">
                            Esclarecimentos rápidos para as principais dúvidas dos clientes.
                          </p>
                        </div>

                        <div className="max-w-2xl mx-auto space-y-3">
                          {[
                            { q: 'Como é feito o agendamento do serviço?', a: 'O agendamento pode ser realizado diretamente através do formulário ou contacto WhatsApp disponível na página.' },
                            { q: 'Quais são as formas de pagamento aceites?', a: 'Aceitamos os principais meios de pagamento, incluindo transferência bancária, cartões e soluções digitais.' },
                            { q: 'Qual a antecedência recomendada para marcações?', a: 'Recomendamos o contacto com antecedência mínima de 48 horas para assegurar a melhor disponibilidade de horários.' },
                          ].map((item, qIdx) => {
                            const isOpen = openFaqIndex === qIdx
                            return (
                              <div
                                key={qIdx}
                                className="rounded-[12px] bg-white border border-slate-200 overflow-hidden shadow-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => setOpenFaqIndex(isOpen ? null : qIdx)}
                                  className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-slate-800 hover:text-[#1463FF] transition-colors cursor-pointer"
                                >
                                  <span>{item.q}</span>
                                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </button>
                                {isOpen && (
                                  <div className="p-4 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                                    {item.a}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {(secType === 'contact' || secType === 'form') && (
                      <div className="py-16 px-6 sm:px-12 bg-white space-y-8">
                        <div className="text-center space-y-2 max-w-xl mx-auto">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#1463FF]">
                            {secLabel}
                          </span>
                          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                            Entre em Contacto & Agende
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500">
                            Preencha o formulário demonstrativo para iniciar o atendimento.
                          </p>
                        </div>

                        <div className="max-w-xl mx-auto p-6 rounded-[16px] bg-slate-50 border border-slate-200 space-y-4 shadow-sm">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">Nome Completo</label>
                            <input
                              type="text"
                              disabled
                              placeholder="Seu nome..."
                              className="w-full px-3 py-2 text-xs rounded-[8px] bg-white border border-slate-300 text-slate-400 cursor-not-allowed"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700">Email</label>
                              <input
                                type="email"
                                disabled
                                placeholder="email@exemplo.pt"
                                className="w-full px-3 py-2 text-xs rounded-[8px] bg-white border border-slate-300 text-slate-400 cursor-not-allowed"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700">Telemóvel / WhatsApp</label>
                              <input
                                type="text"
                                disabled
                                placeholder="+351 900 000 000"
                                className="w-full px-3 py-2 text-xs rounded-[8px] bg-white border border-slate-300 text-slate-400 cursor-not-allowed"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">Mensagem ou Pedido</label>
                            <textarea
                              rows={3}
                              disabled
                              placeholder="Como podemos ajudar?"
                              className="w-full px-3 py-2 text-xs rounded-[8px] bg-white border border-slate-300 text-slate-400 cursor-not-allowed"
                            />
                          </div>
                          <button
                            type="button"
                            disabled
                            style={{ backgroundColor: primaryColor }}
                            className="w-full py-3 rounded-[10px] text-white text-xs font-bold shadow-md cursor-not-allowed flex items-center justify-center gap-2 opacity-90"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Enviar Pedido de Contacto (Demonstração)
                          </button>
                        </div>
                      </div>
                    )}

                    {secType === 'footer' && (
                      <footer className="py-8 px-6 sm:px-12 bg-slate-900 text-slate-400 text-xs text-center space-y-2">
                        <p className="font-semibold text-slate-300">
                          © {new Date().getFullYear()} {template.name}. Todos os direitos reservados.
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Página estruturada e otimizada pelo Blue Bolt Page Studio.
                        </p>
                      </footer>
                    )}
                  </section>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
