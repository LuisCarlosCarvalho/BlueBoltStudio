import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Sparkles,
  Monitor,
  Smartphone,
  Tablet,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Project, BrandKitData } from '@/types'
import type { ProjectPage, PageTree } from '@/types/studio.types'
import { StudioNodeRenderer } from '@/features/studio/components/StudioNodeRenderer'
import { StudioBrandIdentityPanel } from '@/features/studio/components/StudioBrandIdentityPanel'

export const ProjectBrandPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [pageTree, setPageTree] = useState<PageTree | null>(null)

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Brand Kit State
  const [savedBrandKit, setSavedBrandKit] = useState<BrandKitData>({
    brand_name: 'Casa Pet',
    slogan: '',
    logo_url: '',
    logo_dark_url: '',
    primary_color: '#16A34A',
    secondary_color: '#A7F3D0',
    accent_color: '#1463FF',
    bg_color: '#F8FAFC',
    text_color: '#0F172A',
    font_heading: 'Inter',
    font_body: 'Inter',
    visual_style: 'clean_minimal',
    voice_tone: 'profissional',
    forbidden_elements: '',
    reference_notes: '',
  })

  const [liveBrandKit, setLiveBrandKit] = useState<BrandKitData>(savedBrandKit)
  const [isSavingBrand, setIsSavingBrand] = useState<boolean>(false)
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false)

  const loadBrandData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)

    try {
      // 1. Load project details
      const proj = await api.getProject(projectId)
      setProject(proj)

      // 2. Load Brand Kit data (Protected Brand API)
      const brandRes = await api.getProjectBrand(projectId)
      const activeKit = brandRes.currentKit?.brand_data || brandRes.latestVersion?.brand_data
      if (activeKit) {
        const kitData: BrandKitData = {
          ...activeKit,
          brand_name: activeKit.brand_name || proj.name || 'Casa Pet',
          primary_color: activeKit.primary_color || '#16A34A',
          secondary_color: activeKit.secondary_color || '#A7F3D0',
          accent_color: activeKit.accent_color || '#1463FF',
          bg_color: activeKit.bg_color || '#F8FAFC',
          text_color: activeKit.text_color || '#0F172A',
        }
        setSavedBrandKit(kitData)
        setLiveBrandKit(kitData)
      }

      // 3. Load actual project pages (Casa Pet Home Page) to render SINGLE SOURCE OF TRUTH
      const pagesRes = await fetch(`/api/projects/${projectId}/pages`)
      if (pagesRes.ok) {
        const pages: ProjectPage[] = await pagesRes.json()
        if (Array.isArray(pages) && pages.length > 0) {
          const home = pages.find((p) => p.is_home) || pages[0]
          setPageTree(home.page_tree || { nodes: [] })
        }
      }
    } catch (err: any) {
      console.error('[PROJECT BRAND PAGE FETCH ERROR]', err)
      setError(err?.message || 'Não foi possível carregar os dados de marca do projeto.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadBrandData()
  }, [loadBrandData])

  const handleSaveBrandKit = async (brandData: BrandKitData, action: 'save_draft' | 'apply') => {
    if (!projectId || isSavingBrand) return

    setIsSavingBrand(true)
    setActionSuccess(null)
    setActionError(null)

    try {
      const res = await api.updateProjectBrand(
        projectId,
        brandData,
        action,
        'Atualização da Identidade Visual via Rota /brand'
      )

      if (res && res.currentKit) {
        const updatedKit: BrandKitData = res.currentKit.brand_data || brandData
        setSavedBrandKit(updatedKit)
        setLiveBrandKit(updatedKit)
        setActionSuccess('Identidade visual guardada e aplicada com sucesso ao projeto!')
      }
    } catch (err: any) {
      console.error('[SAVE BRAND KIT ERROR]', err)
      setActionError(err?.message || 'Erro ao guardar a identidade visual.')
    } finally {
      setIsSavingBrand(false)
    }
  }

  const getViewportWidthClass = () => {
    switch (device) {
      case 'mobile':
        return 'w-[375px]'
      case 'tablet':
        return 'w-[768px]'
      case 'desktop':
      default:
        return 'w-full max-w-4xl'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
          <p className="text-slate-400 text-sm">Carregando Identidade Visual do Projeto...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold">Erro ao carregar projeto</h2>
          <p className="text-xs text-slate-400">{error || 'Projeto não encontrado.'}</p>
          <Link
            to="/user"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar aos Projetos
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans space-y-6">
      {/* 1. TOP HEADER BAR (UNIFIED DARK WORKSPACE THEME) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${projectId}`}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Voltar ao Projeto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400">
                IDENTIDADE VISUAL DA MARCA
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {project.name}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Design System & Guia de Estilo
            </h1>
          </div>
        </div>

        {/* Studio Shortcut Action */}
        <Link
          to={`/projects/${projectId}/studio`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all"
        >
          <Sparkles className="w-4 h-4 fill-current text-amber-300" />
          <span>Abrir no Studio</span>
        </Link>
      </div>

      {/* ACTION ALERT BANNERS */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center justify-between font-semibold">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {actionSuccess}
          </span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:underline text-[11px]">
            Fechar
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-950 border border-red-800 text-red-200 text-xs rounded-xl flex items-center justify-between font-semibold">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" /> {actionError}
          </span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:underline text-[11px]">
            Fechar
          </button>
        </div>
      )}

      {/* 2. UNIFIED WORKSPACE GRID (LEFT PANEL CONTROLS vs RIGHT LIVE CANVAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Shared StudioBrandIdentityPanel */}
        <div
          className={`${
            isPanelCollapsed ? 'hidden' : 'lg:col-span-5'
          } bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl h-[750px] flex flex-col transition-all duration-300`}
        >
          <StudioBrandIdentityPanel
            savedBrandKit={savedBrandKit}
            isSavingBrand={isSavingBrand}
            onSaveBrandKit={handleSaveBrandKit}
            onBrandDataChange={(updated) => setLiveBrandKit(updated)}
          />
        </div>

        {/* Right Column (7 cols or 12 cols when collapsed): Single Source of Truth Live Casa Pet Canvas */}
        <div className={`${isPanelCollapsed ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-4 transition-all duration-300`}>
          {/* Viewport Control Bar */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs select-none">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPanelCollapsed((prev) => !prev)}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors"
                title={isPanelCollapsed ? 'Mostrar painel de identidade' : 'Ocultar painel (Maximizar canvas)'}
              >
                {isPanelCollapsed ? (
                  <>
                    <ChevronRight className="w-4 h-4 text-blue-400" />
                    <span className="hidden sm:inline">Mostrar Painel</span>
                  </>
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                    <span className="hidden sm:inline">Ocultar Painel</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 font-mono text-slate-300">
                <Eye className="w-4 h-4 text-blue-400" />
                <span>Pré-visualização em tempo real ({project.name})</span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setDevice('desktop')}
                className={`p-1.5 rounded transition-colors ${
                  device === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Desktop"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDevice('tablet')}
                className={`p-1.5 rounded transition-colors ${
                  device === 'tablet' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Tablet"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDevice('mobile')}
                className={`p-1.5 rounded transition-colors ${
                  device === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Mobile"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actual Project Canvas Frame */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 min-h-[680px] flex justify-center overflow-y-auto shadow-2xl">
            <div className={`transition-all duration-300 ${getViewportWidthClass()} space-y-3`}>
              {pageTree && pageTree.nodes?.length > 0 ? (
                pageTree.nodes.map((node) => (
                  <StudioNodeRenderer
                    key={node.id}
                    node={node}
                    isSelected={false}
                    onSelect={() => {}}
                    brandKit={liveBrandKit}
                  />
                ))
              ) : (
                <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                  <p className="text-sm font-semibold text-white">Carregando estrutura da página...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
