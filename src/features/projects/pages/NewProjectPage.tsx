import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Save, Building, Target, CheckCircle2, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { newProjectSchema, type NewProjectFormData, INDUSTRY_OPTIONS } from '@/types'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

export const NewProjectPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<NewProjectFormData>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      name: '',
      client_name: '',
      client_business: '',
      industry_key: 'professional_services',
      industry_custom: '',
      objective: '',
      target_audience: '',
      customer_pains: '',
      services_products: '',
      main_cta: '',
      additional_notes: '',
    },
  })

  const selectedIndustry = watch('industry_key')

  const onSubmit = async (formData: NewProjectFormData) => {
    if (!user) {
      setServerError('Precisa de ter sessão iniciada para criar um projeto.')
      return
    }

    setServerError(null)
    setIsSubmitting(true)

    try {
      const briefingData = {
        industry_key: formData.industry_key,
        industry_custom: formData.industry_custom || '',
        objective: formData.objective,
        target_audience: formData.target_audience,
        customer_pains: formData.customer_pains,
        services_products: formData.services_products,
        main_cta: formData.main_cta,
        additional_notes: formData.additional_notes || '',
      }

      const project = await api.createProject({
        name: formData.name,
        client_name: formData.client_name,
        client_business: formData.client_business,
        briefing_data: briefingData,
        brand_data: {},
        page_data: {},
      })

      setSaveSuccess(true)
      if (project?.id) {
        setTimeout(() => {
          navigate(`/templates?projectId=${project.id}`)
        }, 500)
      }
    } catch (err: unknown) {
      console.error('Error saving project:', err)
      const message = err instanceof Error ? err.message : 'Falha ao guardar o projeto no banco de dados.'
      setServerError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header
        title="Novo Projeto & Briefing"
        subtitle="Registe os dados estratégicos do cliente para orientar a criação da landing page"
      />

      <div className="p-6 sm:p-8 max-w-4xl w-full mx-auto space-y-6">
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <Link
            to="/user"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar aos Projetos
          </Link>
          <span className="text-xs font-medium text-slate-400">
            Fase 1 &bull; Estrutura de Briefing
          </span>
        </div>

        {serverError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Erro ao criar o projeto</p>
              <p className="mt-0.5">{serverError}</p>
            </div>
          </div>
        )}

        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="font-semibold">
              Projeto criado com sucesso! A redirecionar para o estúdio...
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Card 1: Informações Gerais do Cliente */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1463FF] flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle>Identificação do Projeto e Cliente</CardTitle>
                  <CardDescription>
                    Dados fundamentais de catálogo e organização interna
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome do Projeto"
                  placeholder="Ex: Landing Page de Lançamento Black Friday"
                  required
                  error={errors.name?.message}
                  {...register('name')}
                />
                <Input
                  label="Nome do Cliente / Empresa"
                  placeholder="Ex: Clínica Dentária Sorriso Real"
                  required
                  error={errors.client_name?.message}
                  {...register('client_name')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Segmento do Negócio <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('industry_key')}
                    className="w-full px-3.5 py-2.5 text-xs rounded-[10px] border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF] font-medium transition-all"
                  >
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.industry_key && (
                    <p className="text-[11px] text-red-500">{errors.industry_key.message}</p>
                  )}
                </div>

                <Input
                  label="Ramo de Atividade / Nicho Específico"
                  placeholder="Ex: Medicina Dentária e Implantes, Banho e Tosa Canino, etc."
                  required
                  error={errors.client_business?.message}
                  {...register('client_business')}
                />
              </div>

              {selectedIndustry === 'other' && (
                <div className="p-3.5 rounded-[12px] bg-amber-50/70 border border-amber-200 space-y-2">
                  <Input
                    label="Especifique o Segmento de Atuação"
                    placeholder="Ex: Aluguer de Drones para Agricultura, Joalharia Artesanal, etc."
                    required
                    error={errors.industry_custom?.message}
                    {...register('industry_custom')}
                  />
                  <p className="text-[11px] text-amber-800">
                    Ao indicar o segmento personalizado, a IA e o estúdio sugerem templates genéricos compatíveis e adaptam o copywriting.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Estratégia e Briefing de Conteúdo */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle>Briefing Estratégico de Conversão</CardTitle>
                  <CardDescription>
                    Estes dados alimentarão o gerador de conteúdo e a estrutura da página
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                label="Objetivo Principal da Página"
                placeholder="Ex: Captar leads qualificados interessados em tratamentos ortodônticos através de agendamento de consulta gratuita."
                required
                error={errors.objective?.message}
                {...register('objective')}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea
                  label="Público-Alvo Principal"
                  placeholder="Ex: Jovens profissionais (25-45 anos) e famílias que valorizam tratamentos estéticos e conveniência geográfica."
                  required
                  error={errors.target_audience?.message}
                  {...register('target_audience')}
                />

                <Textarea
                  label="Dores e Necessidades dos Clientes"
                  placeholder="Ex: Medo de dor, tratamentos demorados, custos pouco transparentes, falta de horários flexíveis pós-laboral."
                  required
                  error={errors.customer_pains?.message}
                  {...register('customer_pains')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea
                  label="Serviços ou Produtos a Destacar"
                  placeholder="Ex: Alinhadores Invisíveis, Implantes Imediatos, Branqueamento Dentário a Laser."
                  required
                  error={errors.services_products?.message}
                  {...register('services_products')}
                />

                <Input
                  label="Call-to-Action Principal (CTA)"
                  placeholder="Ex: Agendar Avaliação Gratuita, Pedir Orçamento em 2 Minutos"
                  required
                  error={errors.main_cta?.message}
                  {...register('main_cta')}
                />
              </div>

              <Textarea
                label="Notas Adicionais / Requisitos Especiais"
                placeholder="Ex: Incluir testemunhos em vídeo, mapa com localização, integração com WhatsApp da agência."
                error={errors.additional_notes?.message}
                {...register('additional_notes')}
              />
            </CardContent>
          </Card>

          {/* Form action bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link to="/user">
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Guardar e Abrir Projeto
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
