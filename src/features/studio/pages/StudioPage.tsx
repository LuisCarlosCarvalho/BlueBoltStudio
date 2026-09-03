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
  Undo2,
  Redo2,
  Globe,
  Sparkles,
  Layers,
  Sliders,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import type { ProjectPage, StudioNode } from '@/types/studio.types'
import { StudioNodeRenderer } from '../components/StudioNodeRenderer'
import { StudioNavigatorPanel } from '../components/StudioNavigatorPanel'

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
  const [activeTab, setActiveTab] = useState<'ai' | 'navigator' | 'inspector'>('navigator')
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false)

  // Fetch page data from protected endpoint GET /api/projects/:projectId/pages
  const fetchStudioPageData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)

    try {
      // 1. Fetch project details
      const projRes = await fetch(`/api/projects?id=${projectId}`)
      if (projRes.ok) {
        const projData = await projRes.json()
        if (projData && projData.name) {
          setProjectName(projData.name)
        }
      }

      // 2. Fetch project pages
      const res = await fetch(`/api/projects/${projectId}/pages`)
      if (!res.ok) {
        if (res.status === 401) {
          navigate('/login')
          return
        }
        throw new Error('Não foi possível carregar as páginas do projeto.')
      }

      const pages: ProjectPage[] = await res.json()
      if (Array.isArray(pages) && pages.length > 0) {
        const homePage = pages.find((p) => p.is_home) || pages[0]
        setPage(homePage)
        if (homePage.page_tree?.nodes?.length > 0) {
          setSelectedNodeId(homePage.page_tree.nodes[0].id)
        }
      } else {
        setPage(null)
      }
    } catch (err: any) {
      console.error('[STUDIO FETCH ERROR]', err)
      setError(err?.message || 'Erro ao carregar o Studio.')
    } finally {
      setLoading(false)
    }
  }, [projectId, navigate])

  useEffect(() => {
    fetchStudioPageData()
  }, [fetchStudioPageData])

  // Selected node details
  const selectedNode: StudioNode | undefined = page?.page_tree?.nodes?.find(
    (n) => n.id === selectedNodeId
  )

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
      {/* 1. TOP BAR */}
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
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="font-semibold text-sm text-white tracking-wide truncate max-w-[200px] sm:max-w-[300px]">
              {projectName}
            </h1>
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              / {page?.name || 'Home'}
            </span>
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

        {/* Right: Actions & State */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo (Visibly Disabled with Tooltip) */}
          <div className="hidden lg:flex items-center gap-1 opacity-50 cursor-not-allowed">
            <button
              disabled
              className="p-1.5 text-slate-400 rounded hover:bg-slate-800"
              title="Desfazer (Em breve)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              disabled
              className="p-1.5 text-slate-400 rounded hover:bg-slate-800"
              title="Refazer (Em breve)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Preview */}
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Pré-visualização</span>
          </button>

          {/* Publish (Disabled) */}
          <div className="relative group">
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/30 text-blue-300/50 text-xs font-semibold rounded-lg border border-blue-500/20 cursor-not-allowed"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Publicar</span>
              <span className="ml-1 text-[10px] bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                Em breve
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. STUDIO BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL / SIDEBAR (IA, Navegador, Inspetor) */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
          {/* Panel Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40">
            <button
              onClick={() => setActiveTab('inspector')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'inspector'
                  ? 'border-blue-500 text-blue-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Inspetor
            </button>
            <button
              onClick={() => setActiveTab('navigator')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'navigator'
                  ? 'border-blue-500 text-blue-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Navegador
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'ai'
                  ? 'border-blue-500 text-blue-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> IA
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {activeTab === 'inspector' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Inspetor de Elementos
                  </h3>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    Somente Leitura
                  </span>
                </div>

                {selectedNode ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <p className="text-xs font-semibold text-blue-400">{selectedNode.type}</p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        ID: {selectedNode.id}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-300">Propriedades Ativas:</p>
                      <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-60">
                        {JSON.stringify(selectedNode.properties, null, 2)}
                      </pre>
                    </div>

                    <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg text-xs text-blue-300 space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Leitura Validada
                      </p>
                      <p className="text-[11px] text-blue-400/80">
                        Edição de propriedades pelo inspetor disponível no próximo lote.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-center text-xs text-slate-400">
                    Clique num bloco do canvas para inspecionar as suas propriedades.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'navigator' && (
              <div className="h-full -m-4">
                <StudioNavigatorPanel
                  nodes={page?.page_tree?.nodes || []}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={(id) => setSelectedNodeId(id)}
                />
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4">
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
          </div>
        </aside>

        {/* MAIN RENDERING CANVAS */}
        <main className="flex-1 bg-slate-950 flex flex-col items-center justify-start p-6 overflow-y-auto">
          {/* Device Container Frame */}
          <div
            className={`transition-all duration-300 ease-in-out ${getViewportWidthClass()}`}
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {/* Device Header Bar Label */}
            <div className="bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2 rounded-t-xl text-xs flex items-center justify-between font-mono">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 text-slate-300">{projectName} — Preview ({device})</span>
              </span>
              <span>{device === 'mobile' ? '375px' : device === 'tablet' ? '768px' : '100%'}</span>
            </div>

            {/* Canvas Inner Content */}
            <div className="bg-slate-900 border-x border-b border-slate-800 p-4 rounded-b-xl min-h-[600px] shadow-2xl space-y-3">
              {page && page.page_tree?.nodes?.length > 0 ? (
                page.page_tree.nodes.map((node) => (
                  <StudioNodeRenderer
                    key={node.id}
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    onSelect={(id) => setSelectedNodeId(id)}
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
            {page?.page_tree?.nodes?.map((node) => (
              <StudioNodeRenderer key={node.id} node={node} isSelected={false} onSelect={() => {}} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
