import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  Eye,
  Sparkles,
  Layers,
  Sliders,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Palette,
  Save,
  Zap,
} from 'lucide-react'
import type { ProjectPage, StudioNode, PageTree } from '@/types/studio.types'
import type { BrandKitData } from '@/types'
import { api } from '@/lib/api'
import { StudioNodeRenderer } from '../components/StudioNodeRenderer'
import { StudioNavigatorPanel } from '../components/StudioNavigatorPanel'
import { StudioInspectorPanel } from '../components/StudioInspectorPanel'
import { StudioBrandIdentityPanel } from '../components/StudioBrandIdentityPanel'

type DeviceViewport = 'desktop' | 'tablet' | 'mobile'

export const StudioPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  // State
  const [page, setPage] = useState<ProjectPage | null>(null)
  const [projectName, setProjectName] = useState<string>('Carregando...')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [device, setDevice] = useState<DeviceViewport>('desktop')
  const [zoom, setZoom] = useState<number>(100)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'inspector' | 'navigator' | 'ai' | 'brand'>('brand')
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false)

  // Lot 5 State: Draft Page Tree & Revisions
  const [savedPageTree, setSavedPageTree] = useState<PageTree | null>(null)
  const [draftPageTree, setDraftPageTree] = useState<PageTree | null>(null)
  const [currentRevisionNumber, setCurrentRevisionNumber] = useState<number>(1)
  const [isSavingPage, setIsSavingPage] = useState<boolean>(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)
  const [conflictData, setConflictData] = useState<{ serverRevision: number; message: string } | null>(null)

  // Lot 6 State: Brand Kit Integration
  const [savedBrandKit, setSavedBrandKit] = useState<BrandKitData>({
    brand_name: 'Nova Marca',
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

  // Fetch page and brand data
  const fetchStudioData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    setSaveSuccessMessage(null)
    setSaveErrorMessage(null)

    try {
      // 1. Fetch project details
      const proj = await api.getProject(projectId)
      if (proj && proj.name) {
        setProjectName(proj.name)
      }

      // 2. Fetch Brand Kit data (Protected Brand API)
      try {
        const brandRes = await api.getProjectBrand(projectId)
        const activeKit = brandRes.currentKit?.brand_data || brandRes.latestVersion?.brand_data
        if (activeKit) {
          const kitData: BrandKitData = {
            ...activeKit,
            brand_name: activeKit.brand_name || proj.name || 'Nova Marca',
            primary_color: activeKit.primary_color || '#16A34A',
            secondary_color: activeKit.secondary_color || '#A7F3D0',
            accent_color: activeKit.accent_color || '#1463FF',
            bg_color: activeKit.bg_color || '#F8FAFC',
            text_color: activeKit.text_color || '#0F172A',
          }
          setSavedBrandKit(kitData)
          setLiveBrandKit(kitData)
        }
      } catch (brandErr) {
        console.warn('[BRAND KIT LOAD WARNING]', brandErr)
      }

      // 3. Fetch project pages
      const pagesRes = await fetch(`/api/projects/${projectId}/pages`)
      if (!pagesRes.ok) {
        if (pagesRes.status === 401) {
          navigate('/login')
          return
        }
        throw new Error('Não foi possível carregar as páginas do projeto.')
      }

      const pages: ProjectPage[] = await pagesRes.json()
      if (Array.isArray(pages) && pages.length > 0) {
        const homePage = pages.find((p) => p.is_home) || pages[0]
        setPage(homePage)

        const singleRes = await fetch(`/api/projects/${projectId}/pages/${homePage.id}`)
        if (singleRes.ok) {
          const singleData = await singleRes.json()
          if (singleData.currentRevision) {
            setCurrentRevisionNumber(singleData.currentRevision.revision_number)
          }
        }

        const tree = homePage.page_tree || { nodes: [] }
        setSavedPageTree(JSON.parse(JSON.stringify(tree)))
        setDraftPageTree(JSON.parse(JSON.stringify(tree)))

        if (tree.nodes?.length > 0) {
          setSelectedNodeId(tree.nodes[0].id)
        }
      }
    } catch (err: any) {
      console.error('[STUDIO FETCH ERROR]', err)
      setError(err?.message || 'Erro ao carregar o Studio.')
    } finally {
      setLoading(false)
    }
  }, [projectId, navigate])

  useEffect(() => {
    fetchStudioData()
  }, [fetchStudioData])

  // Check unsaved dirty states
  const isPageDirty =
    Boolean(savedPageTree && draftPageTree) &&
    JSON.stringify(savedPageTree) !== JSON.stringify(draftPageTree)

  const isBrandDirty = JSON.stringify(liveBrandKit) !== JSON.stringify(savedBrandKit)

  // Selected node details
  const selectedNode: StudioNode | undefined = draftPageTree?.nodes?.find(
    (n) => n.id === selectedNodeId
  )

  // Update node properties locally
  const handleUpdateNodeProperties = (nodeId: string, newProperties: any) => {
    if (!draftPageTree) return
    const newNodes = draftPageTree.nodes.map((node) => {
      if (node.id === nodeId) {
        return { ...node, properties: newProperties }
      }
      return node
    })
    setDraftPageTree({ ...draftPageTree, nodes: newNodes })
  }

  // Discard page changes (0 DB calls)
  const handleDiscardPageChanges = () => {
    if (!savedPageTree) return
    setDraftPageTree(JSON.parse(JSON.stringify(savedPageTree)))
    setSaveSuccessMessage(null)
    setSaveErrorMessage(null)
  }

  // Save Page Draft Revision (Protected Page Revision API)
  const handleSaveDraftRevision = async () => {
    if (!projectId || !page || !draftPageTree || isSavingPage) return

    setIsSavingPage(true)
    setSaveSuccessMessage(null)
    setSaveErrorMessage(null)
    setConflictData(null)

    try {
      const summary = selectedNode
        ? `Edição das propriedades do nó ${selectedNode.type}`
        : 'Edição no Studio'

      const res = await fetch(`/api/projects/${projectId}/pages/${page.id}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_tree: draftPageTree,
          expected_revision: currentRevisionNumber,
          change_summary: summary,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        const updatedRevisionNum = data.revision?.revision_number || currentRevisionNumber + 1
        setCurrentRevisionNumber(updatedRevisionNum)
        setSavedPageTree(JSON.parse(JSON.stringify(draftPageTree)))
        setSaveSuccessMessage(`Revisão #${updatedRevisionNum} guardada com sucesso como rascunho!`)
      } else if (res.status === 409) {
        setConflictData({
          serverRevision: data.serverRevision || currentRevisionNumber,
          message: data.error || 'Conflito de edição detetado. A página foi alterada por outro utilizador.',
        })
      } else {
        setSaveErrorMessage(data.error || 'Erro ao guardar a revisão rascunho.')
      }
    } catch (err: any) {
      console.error('[SAVE REVISION ERROR]', err)
      setSaveErrorMessage(err?.message || 'Erro de rede ao guardar a revisão.')
    } finally {
      setIsSavingPage(false)
    }
  }

  // Save Brand Kit (Protected Brand API - Creates 0 page revisions!)
  const handleSaveBrandKit = async (brandData: BrandKitData, action: 'save_draft' | 'apply') => {
    if (!projectId || isSavingBrand) return

    setIsSavingBrand(true)
    setSaveSuccessMessage(null)
    setSaveErrorMessage(null)

    try {
      const res = await api.updateProjectBrand(
        projectId,
        brandData,
        action,
        'Atualização da Identidade Visual via Studio'
      )

      if (res && res.currentKit) {
        const updatedKit: BrandKitData = res.currentKit.brand_data || brandData
        setSavedBrandKit(updatedKit)
        setLiveBrandKit(updatedKit)
        setSaveSuccessMessage('Identidade visual aplicada e guardada no projeto com sucesso!')
      }
    } catch (err: any) {
      console.error('[SAVE BRAND KIT ERROR]', err)
      setSaveErrorMessage(err?.message || 'Erro ao guardar a identidade visual.')
    } finally {
      setIsSavingBrand(false)
    }
  }

  // Viewport width styling
  const getViewportWidthClass = () => {
    switch (device) {
      case 'mobile':
        return 'w-[375px]'
      case 'tablet':
        return 'w-[768px]'
      case 'desktop':
      default:
        return 'w-full max-w-5xl'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
          <p className="text-slate-400 text-sm font-medium">A abrir o Blue Bolt Studio...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Erro de Carregamento</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <div className="pt-2">
            <Link
              to={`/projects/${projectId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Detalhe do Projeto
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* 1. TOP BAR (MATCHING REFERENCE EXACTLY) */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between z-20 select-none">
        {/* Left: Back & Project Info */}
        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${projectId}`}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Voltar ao Projeto"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-sm text-white tracking-wide truncate max-w-[200px] sm:max-w-[260px]">
              {projectName}
            </h1>
            {isPageDirty || isBrandDirty ? (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono animate-pulse">
                Com alterações
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Guardado
              </span>
            )}
          </div>
        </div>

        {/* Center: Device Controls & Zoom */}
        <div className="hidden md:flex items-center gap-4 bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-800">
          {/* Device Selection */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md">
            <button
              onClick={() => setDevice('desktop')}
              className={`p-1.5 rounded text-xs transition-colors ${
                device === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Ambiente de Trabalho (Desktop)"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={`p-1.5 rounded text-xs transition-colors ${
                device === 'tablet' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Tablet (768px)"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`p-1.5 rounded text-xs transition-colors ${
                device === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Telemóvel (375px)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Zoom Control */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 25))}
              className="p-1 hover:text-white transition-colors"
              title="Reduzir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-300 w-10 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(125, z + 25))}
              className="p-1 hover:text-white transition-colors"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Actions (Matching Reference Image Buttons) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Pré-visualizar</span>
          </button>

          <button
            onClick={handleSaveDraftRevision}
            disabled={!isPageDirty || isSavingPage}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              isPageDirty && !isSavingPage
                ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSavingPage ? 'Guardando...' : 'Guardar rascunho'}</span>
          </button>

          <button
            onClick={() => handleSaveBrandKit(liveBrandKit, 'apply')}
            disabled={!isBrandDirty || isSavingBrand}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-md transition-all ${
              isBrandDirty && !isSavingBrand
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                : 'bg-blue-600 text-white opacity-90'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{isSavingBrand ? 'A aplicar...' : 'Aplicar ao projeto'}</span>
          </button>
        </div>
      </header>

      {/* NOTIFICATION BANNERS */}
      {saveSuccessMessage && (
        <div className="bg-emerald-950 border-b border-emerald-800 px-4 py-2 text-xs text-emerald-200 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {saveSuccessMessage}
          </span>
          <button onClick={() => setSaveSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            Fechar
          </button>
        </div>
      )}

      {saveErrorMessage && (
        <div className="bg-red-950 border-b border-red-800 px-4 py-2 text-xs text-red-200 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold">
            <XCircle className="w-4 h-4 text-red-400" /> {saveErrorMessage}
          </span>
          <button onClick={() => setSaveErrorMessage(null)} className="text-red-400 hover:text-white">
            Fechar
          </button>
        </div>
      )}

      {conflictData && (
        <div className="bg-amber-950 border-b border-amber-800 px-4 py-2 text-xs text-amber-200 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-400" /> [VERSION_CONFLICT] {conflictData.message} (Revisão Servidor: #{conflictData.serverRevision})
          </span>
          <button onClick={fetchStudioData} className="px-2 py-1 bg-amber-800 hover:bg-amber-700 text-white rounded text-[11px] font-bold">
            Recarregar Servidor
          </button>
        </div>
      )}

      {/* 2. STUDIO BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL / SIDEBAR (4 TABS: Inspetor, Navegador, IA, Identidade visual) */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
          {/* Panel Tabs */}
          <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/40 select-none">
            <button
              onClick={() => setActiveTab('inspector')}
              className={`py-3 text-[11px] font-semibold flex flex-col items-center justify-center border-b-2 transition-colors ${
                activeTab === 'inspector'
                  ? 'border-blue-500 text-blue-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Inspetor
            </button>
            <button
              onClick={() => setActiveTab('navigator')}
              className={`py-3 text-[11px] font-semibold flex flex-col items-center justify-center border-b-2 transition-colors ${
                activeTab === 'navigator'
                  ? 'border-blue-500 text-blue-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Navegador
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-3 text-[11px] font-semibold flex flex-col items-center justify-center border-b-2 transition-colors ${
                activeTab === 'ai'
                  ? 'border-blue-500 text-blue-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> IA ✨
            </button>
            <button
              onClick={() => setActiveTab('brand')}
              className={`py-3 text-[10px] font-semibold flex flex-col items-center justify-center border-b-2 transition-colors ${
                activeTab === 'brand'
                  ? 'border-blue-500 text-blue-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-emerald-400" /> Identidade
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'inspector' && (
              <StudioInspectorPanel
                selectedNode={selectedNode}
                isDirty={isPageDirty}
                isSaving={isSavingPage}
                onUpdateNodeProperties={handleUpdateNodeProperties}
                onDiscardChanges={handleDiscardPageChanges}
                onSaveDraftRevision={handleSaveDraftRevision}
              />
            )}

            {activeTab === 'navigator' && (
              <StudioNavigatorPanel
                nodes={draftPageTree?.nodes || []}
                selectedNodeId={selectedNodeId}
                onSelectNode={(id) => setSelectedNodeId(id)}
              />
            )}

            {activeTab === 'ai' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Assistente de IA Gemini
                  </h3>
                </div>
                <div className="p-4 bg-slate-950 border border-amber-500/20 rounded-lg text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs font-semibold text-white">Assistente de Copys & Layout</p>
                  <p className="text-[11px] text-slate-400">
                    Disponível no próximo lote com sugestões de patch validadas por schema Zod estrito.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'brand' && (
              <StudioBrandIdentityPanel
                savedBrandKit={savedBrandKit}
                isSavingBrand={isSavingBrand}
                onSaveBrandKit={handleSaveBrandKit}
                onBrandDataChange={(updated) => setLiveBrandKit(updated)}
              />
            )}
          </div>
        </aside>

        {/* MAIN RENDERING CANVAS (CANVAS TIED TO BRAND KIT TOKENS) */}
        <main className="flex-1 bg-slate-950 flex flex-col items-center justify-start p-6 overflow-y-auto">
          {/* Device Container Frame */}
          <div
            className={`transition-all duration-300 ease-in-out ${getViewportWidthClass()}`}
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {/* Device Header Bar Label (MATCHING REFERENCE REAL-TIME BADGE) */}
            <div className="bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2 rounded-t-xl text-xs flex items-center justify-between font-mono select-none">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 text-slate-300">{projectName} — Studio Canvas ({device})</span>
              </span>

              <span className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Preview em tempo real
                </span>
                <span>{device === 'mobile' ? '375px' : device === 'tablet' ? '768px' : '100%'}</span>
              </span>
            </div>

            {/* Canvas Inner Content */}
            <div className="bg-slate-900 border-x border-b border-slate-800 p-4 rounded-b-xl min-h-[600px] shadow-2xl space-y-3">
              {draftPageTree && draftPageTree.nodes?.length > 0 ? (
                draftPageTree.nodes.map((node) => (
                  <StudioNodeRenderer
                    key={node.id}
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    onSelect={(id) => setSelectedNodeId(id)}
                    brandKit={liveBrandKit}
                  />
                ))
              ) : (
                <div className="p-12 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-400 space-y-3 my-6">
                  <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                  <h3 className="text-base font-bold text-white">Nenhum Bloco Encontrado</h3>
                  <p className="text-xs">
                    Esta página ainda não possui nós declarados no Studio.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col p-6">
          <div className="flex items-center justify-between mb-4 text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-400" /> Pré-visualização do Studio
            </h2>
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg font-medium"
            >
              Fechar
            </button>
          </div>
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-4">
            {draftPageTree?.nodes?.map((node) => (
              <StudioNodeRenderer
                key={node.id}
                node={node}
                isSelected={false}
                onSelect={() => {}}
                brandKit={liveBrandKit}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
