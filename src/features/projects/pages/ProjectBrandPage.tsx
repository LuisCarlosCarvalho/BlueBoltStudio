import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Palette,
  Save,
  CheckCircle2,
  Eye,
  RotateCcw,
  Sparkles,
  Monitor,
  Smartphone,
  AlertCircle,
  History,
  FileText,
  ShieldAlert,
} from 'lucide-react'
import { api } from '@/lib/api'
import type {
  Project,
  BrandKitData,
  ProjectBrandKit,
  ProjectBrandVersion,
  HeadingFont,
  BodyFont,
} from '@/types'
import {
  ALLOWED_HEADING_FONTS,
  ALLOWED_BODY_FONTS,
  ALLOWED_VISUAL_STYLES,
  ALLOWED_VOICE_TONES,
} from '@/types'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { BrandPreviewFrame } from '../components/BrandPreviewFrame'

export const ProjectBrandPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [currentKit, setCurrentKit] = useState<ProjectBrandKit | null>(null)
  const [versions, setVersions] = useState<ProjectBrandVersion[]>([])

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Form State
  const [brandName, setBrandName] = useState<string>('')
  const [slogan, setSlogan] = useState<string>('')
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [logoDarkUrl, setLogoDarkUrl] = useState<string>('')
  const [primaryColor, setPrimaryColor] = useState<string>('#1463FF')
  const [secondaryColor, setSecondaryColor] = useState<string>('#05192D')
  const [accentColor, setAccentColor] = useState<string>('#FF6B00')
  const [bgColor, setBgColor] = useState<string>('#FFFFFF')
  const [textColor, setTextColor] = useState<string>('#0F172A')
  const [fontHeading, setFontHeading] = useState<HeadingFont>('Inter')
  const [fontBody, setFontBody] = useState<BodyFont>('Inter')
  const [visualStyle, setVisualStyle] = useState<typeof ALLOWED_VISUAL_STYLES[number]>('clean_minimal')
  const [voiceTone, setVoiceTone] = useState<typeof ALLOWED_VOICE_TONES[number]>('profissional')
  const [forbiddenElements, setForbiddenElements] = useState<string>('')
  const [referenceNotes, setReferenceNotes] = useState<string>('')

  // Preview & Device State
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [previewData, setPreviewData] = useState<BrandKitData>({
    brand_name: 'Sua Marca',
    slogan: '',
    logo_url: '',
    logo_dark_url: '',
    primary_color: '#1463FF',
    secondary_color: '#05192D',
    accent_color: '#FF6B00',
    bg_color: '#FFFFFF',
    text_color: '#0F172A',
    font_heading: 'Inter',
    font_body: 'Inter',
    visual_style: 'clean_minimal',
    voice_tone: 'profissional',
    forbidden_elements: '',
    reference_notes: '',
  })

  // Action Pending States
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false)
  const [isApplying, setIsApplying] = useState<boolean>(false)
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null)

  const populateForm = useCallback((data: BrandKitData, projName?: string) => {
    setBrandName(data.brand_name || projName || '')
    setSlogan(data.slogan || '')
    setLogoUrl(data.logo_url || '')
    setLogoDarkUrl(data.logo_dark_url || '')
    setPrimaryColor(data.primary_color || '#1463FF')
    setSecondaryColor(data.secondary_color || '#05192D')
    setAccentColor(data.accent_color || '#FF6B00')
    setBgColor(data.bg_color || '#FFFFFF')
    setTextColor(data.text_color || '#0F172A')
    setFontHeading(data.font_heading || 'Inter')
    setFontBody(data.font_body || 'Inter')
    setVisualStyle(data.visual_style || 'clean_minimal')
    setVoiceTone(data.voice_tone || 'profissional')
    setForbiddenElements(data.forbidden_elements || '')
    setReferenceNotes(data.reference_notes || '')

    // Also update preview
    setPreviewData({
      ...data,
      brand_name: data.brand_name || projName || 'Sua Marca',
    })
  }, [])

  const loadBrandData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)

    try {
      const proj = await api.getProject(projectId)
      setProject(proj)

      const brandRes = await api.getProjectBrand(projectId)
      setCurrentKit(brandRes.currentKit)
      setVersions(brandRes.versions || [])

      if (brandRes.currentKit?.brand_data) {
        populateForm(brandRes.currentKit.brand_data, proj.name)
      } else if (brandRes.latestVersion?.brand_data) {
        populateForm(brandRes.latestVersion.brand_data, proj.name)
      } else {
        // Default initial kit
        populateForm(
          {
            brand_name: proj.name || 'Nova Marca',
            slogan: '',
            logo_url: '',
            logo_dark_url: '',
            primary_color: '#1463FF',
            secondary_color: '#05192D',
            accent_color: '#FF6B00',
            bg_color: '#FFFFFF',
            text_color: '#0F172A',
            font_heading: 'Inter',
            font_body: 'Inter',
            visual_style: 'clean_minimal',
            voice_tone: 'profissional',
            forbidden_elements: '',
            reference_notes: '',
          },
          proj.name
        )
      }
    } catch (err: any) {
      console.error('Error loading project brand:', err)
      setError(err?.message || 'Não foi possível carregar os dados do projeto.')
    } finally {
      setLoading(false)
    }
  }, [projectId, populateForm])

  useEffect(() => {
    loadBrandData()
  }, [loadBrandData])

  const getCurrentFormData = (): BrandKitData => ({
    brand_name: brandName,
    slogan,
    logo_url: logoUrl,
    logo_dark_url: logoDarkUrl,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    accent_color: accentColor,
    bg_color: bgColor,
    text_color: textColor,
    font_heading: fontHeading,
    font_body: fontBody,
    visual_style: visualStyle,
    voice_tone: voiceTone,
    forbidden_elements: forbiddenElements,
    reference_notes: referenceNotes,
  })

  // Action 1: Pré-visualizar alterações (Local, sem persistência)
  const handleLocalPreview = () => {
    setActionSuccess(null)
    setActionError(null)
    setPreviewData(getCurrentFormData())
  }

  // Action 2: Guardar Rascunho
  const handleSaveDraft = async () => {
    if (!projectId) return
    setIsSavingDraft(true)
    setActionSuccess(null)
    setActionError(null)

    try {
      const formData = getCurrentFormData()
      const res = await api.updateProjectBrand(projectId, formData, 'save_draft')
      setVersions(res.versions)
      if (res.currentKit) setCurrentKit(res.currentKit)
      setActionSuccess(res.message || 'Rascunho de identidade guardado com sucesso.')
      setPreviewData(formData)
    } catch (err: any) {
      setActionError(err?.message || 'Erro ao guardar o rascunho da identidade visual.')
    } finally {
      setIsSavingDraft(false)
    }
  }

  // Action 3: Aplicar Identidade ao Projeto
  const handleApply = async () => {
    if (!projectId) return
    setIsApplying(true)
    setActionSuccess(null)
    setActionError(null)

    try {
      const formData = getCurrentFormData()
      const res = await api.updateProjectBrand(projectId, formData, 'apply')
      setCurrentKit(res.currentKit)
      setVersions(res.versions)
      setActionSuccess(res.message || 'Identidade visual aplicada com sucesso ao projeto!')
      setPreviewData(formData)
    } catch (err: any) {
      setActionError(err?.message || 'Não foi possível aplicar a identidade ao projeto.')
    } finally {
      setIsApplying(false)
    }
  }

  // Action 4: Restaurar Versão como Rascunho
  const handleRestoreVersion = async (versionId: string) => {
    if (!projectId) return
    setRestoringVersionId(versionId)
    setActionSuccess(null)
    setActionError(null)

    try {
      const res = await api.restoreProjectBrandVersion(projectId, versionId)
      setVersions(res.versions)
      if (res.newVersion?.brand_data) {
        populateForm(res.newVersion.brand_data, project?.name)
      }
      setActionSuccess(res.message || 'Versão restaurada como novo Rascunho com sucesso.')
    } catch (err: any) {
      setActionError(err?.message || 'Erro ao restaurar a versão.')
    } finally {
      setRestoringVersionId(null)
    }
  }

  if (loading) {
    return <LoadingState message="A carregar Identidade Visual do Projeto..." fullPage />
  }

  if (error || !project) {
    return <ErrorState message={error || 'Projeto não encontrado.'} onRetry={loadBrandData} />
  }

  const isApplied = currentKit?.status === 'applied'

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Breadcrumbs & Page Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to={`/projects/${project.id}`}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-sm"
              title="Voltar aos Detalhes do Projeto"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Identidade Visual por Projeto
                </h1>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isApplied
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {isApplied ? '● Aplicado ao Projeto' : '○ Rascunho Em Edição'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Projeto: <span className="font-semibold text-slate-700">{project.name}</span> • Cliente: {project.client_name || 'N/D'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLocalPreview}
              title="Atualiza a pré-visualização local sem guardar na base de dados"
            >
              <Eye className="w-4 h-4 mr-1.5" />
              <span>Pré-visualizar</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={isSavingDraft}
              onClick={handleSaveDraft}
            >
              <Save className="w-4 h-4 mr-1.5" />
              <span>Guardar Rascunho</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isApplying}
              onClick={handleApply}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              <span>Aplicar ao Projeto</span>
            </Button>
          </div>
        </div>

        {/* Action Alert Banner */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-xs text-emerald-700 hover:underline"
            >
              Fechar
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-xs text-rose-700 hover:underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Main Grid: Form Sections (Left) vs Responsive Preview (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Columns (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section 1: Marca & Logótipos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1463FF]" />
                  <span>1. Marca & Logótipos</span>
                </CardTitle>
                <CardDescription>Nome oficial da marca, slogan e URLs de logotipo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nome da Marca *"
                    placeholder="Ex: Casa Pet"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                  />
                  <Input
                    label="Slogan da Marca"
                    placeholder="Ex: A sua loja de confiança"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Logo Principal (URL Vercel Blob ou Placeholder)"
                    placeholder="https://...public.blob.vercel-storage.com/... ou /logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                  <Input
                    label="Logo para Fundo Escuro (URL Vercel Blob ou Placeholder)"
                    placeholder="https://...public.blob.vercel-storage.com/... ou /logo.png"
                    value={logoDarkUrl}
                    onChange={(e) => setLogoDarkUrl(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Paleta de Cores */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#1463FF]" />
                  <span>2. Paleta de Cores (Códigos HEX)</span>
                </CardTitle>
                <CardDescription>Defina os tons da marca para botões, fundos, texto e destaques</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'Primária *', state: primaryColor, setter: setPrimaryColor },
                    { label: 'Secundária *', state: secondaryColor, setter: setSecondaryColor },
                    { label: 'Destaque *', state: accentColor, setter: setAccentColor },
                    { label: 'Fundo *', state: bgColor, setter: setBgColor },
                    { label: 'Texto *', state: textColor, setter: setTextColor },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        {item.label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={item.state.startsWith('#') ? item.state : '#1463FF'}
                          onChange={(e) => item.setter(e.target.value.toUpperCase())}
                          className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          maxLength={7}
                          value={item.state}
                          onChange={(e) => item.setter(e.target.value.toUpperCase())}
                          className="w-full text-xs font-mono font-bold uppercase rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1463FF]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Color Presets */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Presets rápidos de cores:</span>
                  <div className="flex items-center gap-2">
                    {[
                      { name: 'Blue Bolt Tech', primary: '#1463FF', secondary: '#05192D', accent: '#FF6B00', bg: '#FFFFFF', text: '#0F172A' },
                      { name: 'Warm Pet', primary: '#EA580C', secondary: '#451A03', accent: '#F59E0B', bg: '#FFFBEB', text: '#1C1917' },
                      { name: 'Luxury Premium', primary: '#D97706', secondary: '#18181B', accent: '#10B981', bg: '#09090B', text: '#FAFAFA' },
                    ].map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setPrimaryColor(preset.primary)
                          setSecondaryColor(preset.secondary)
                          setAccentColor(preset.accent)
                          setBgColor(preset.bg)
                          setTextColor(preset.text)
                        }}
                        className="text-[11px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Tipografia */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1463FF]" />
                  <span>3. Tipografia Controlada</span>
                </CardTitle>
                <CardDescription>Fontes aprovadas para títulos e corpo do texto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Fonte para Títulos (Headings)
                    </label>
                    <select
                      value={fontHeading}
                      onChange={(e) => setFontHeading(e.target.value as HeadingFont)}
                      className="w-full rounded-[10px] border border-slate-200 text-sm text-slate-900 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
                    >
                      {ALLOWED_HEADING_FONTS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Fonte para Corpo de Texto (Body)
                    </label>
                    <select
                      value={fontBody}
                      onChange={(e) => setFontBody(e.target.value as BodyFont)}
                      className="w-full rounded-[10px] border border-slate-200 text-sm text-slate-900 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
                    >
                      {ALLOWED_BODY_FONTS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Direção Criativa & Restrições */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#1463FF]" />
                  <span>4. Direção Criativa & Regras da Marca</span>
                </CardTitle>
                <CardDescription>Estilo visual, tom de voz e diretrizes de marca</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Estilo Visual Dominante
                    </label>
                    <select
                      value={visualStyle}
                      onChange={(e) => setVisualStyle(e.target.value as any)}
                      className="w-full rounded-[10px] border border-slate-200 text-sm text-slate-900 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
                    >
                      <option value="clean_minimal">Clean & Minimalista</option>
                      <option value="modern_tech">Moderno & Tecnológico</option>
                      <option value="luxury_premium">Luxo & Premium</option>
                      <option value="bold_creative">Bold & Criativo</option>
                      <option value="warm_organic">Acolhedor & Orgânico</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Tom de Voz Preferencial
                    </label>
                    <select
                      value={voiceTone}
                      onChange={(e) => setVoiceTone(e.target.value as any)}
                      className="w-full rounded-[10px] border border-slate-200 text-sm text-slate-900 bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1463FF]/20 focus:border-[#1463FF]"
                    >
                      <option value="profissional">Profissional & Directo</option>
                      <option value="acolhedor">Acolhedor & Humano</option>
                      <option value="autoritario">Autoritário & Especialista</option>
                      <option value="inovador">Inovador & Entusiasta</option>
                      <option value="descontraido">Descontraído & Próximo</option>
                    </select>
                  </div>
                </div>

                <Textarea
                  label="Elementos Proibidos ou A Evitar"
                  placeholder="Ex: Não usar expressões em inglês, evitar a cor vermelha em CTAs, não mencionar preços..."
                  value={forbiddenElements}
                  onChange={(e) => setForbiddenElements(e.target.value)}
                  rows={2}
                />

                <Textarea
                  label="Notas de Referência e Inspiração"
                  placeholder="Ex: Referência de landing page da Apple, estética da Nike, tom de voz da Nubank..."
                  value={referenceNotes}
                  onChange={(e) => setReferenceNotes(e.target.value)}
                  rows={2}
                />
              </CardContent>
            </Card>

            {/* Version History Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="w-4 h-4 text-[#1463FF]" />
                  <span>Histórico de Versões da Identidade Visual</span>
                </CardTitle>
                <CardDescription>
                  Registo imutável de rascunhos e versões aplicadas no projeto ({versions.length} versões salvas)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {versions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Nenhuma versão gravada ainda.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {versions.map((ver) => (
                      <div key={ver.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-xs flex items-center justify-center text-slate-700">
                            v{ver.version}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                                  ver.status === 'applied'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {ver.status === 'applied' ? 'APLICADO' : 'RASCUNHO'}
                              </span>
                              <span className="text-xs font-medium text-slate-800">
                                {ver.change_summary || 'Sem nota de alteração'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Por: {ver.creator_name || 'Autor'}</span>
                              <span>•</span>
                              <span>
                                {new Date(ver.created_at).toLocaleDateString('pt-PT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={restoringVersionId === ver.id}
                          onClick={() => handleRestoreVersion(ver.id)}
                          className="text-xs font-semibold text-[#1463FF] hover:underline flex items-center gap-1 shrink-0"
                          title="Restaurar esta versão como novo rascunho"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{restoringVersionId === ver.id ? 'A restaurar...' : 'Restaurar Rascunho'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Live Responsive Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24 self-start">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-[#1463FF]" />
                    <span>Amostra Visual em Tempo Real</span>
                  </CardTitle>

                  {/* Device Toggle */}
                  <div className="flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setDevice('desktop')}
                      className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                        device === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Modo Desktop"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Desktop</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDevice('mobile')}
                      className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                        device === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Modo Mobile (375px)"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Mobile</span>
                    </button>
                  </div>
                </div>
                <CardDescription>
                  Demonstração segura com componentes Blue Bolt (Hero, CTA, Cards, Contacto)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-4 bg-slate-900/5 rounded-b-xl border-t border-slate-100 max-h-[750px] overflow-y-auto">
                <BrandPreviewFrame brandData={previewData} device={device} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
