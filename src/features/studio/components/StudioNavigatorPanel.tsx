import React, { useState } from 'react'
import type { StudioNode } from '@/types/studio.types'
import {
  PlusSquare,
  Download,
  FileText,
  ListTree,
  Image as ImageIcon,
  ShoppingBag,
  Type,
  Video,
  Sparkles,
  BarChart3,
  FormInput,
  MapPin,
  Box,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  CheckCircle2,
  Lock,
  Check,
  ChevronUp,
  ChevronsDown,
  Copy,
  Trash2,
  Plus,
} from 'lucide-react'

export type NavigatorModule = 'structure' | 'add' | 'import' | 'pages' | 'library' | 'marketplace'

type AddableBlockType = 'HeroBlock' | 'BenefitsBlock' | 'ServicesBlock' | 'FormBlock' | 'FooterBlock'

interface StudioNavigatorPanelProps {
  nodes: StudioNode[]
  selectedNodeId: string | null
  onSelectNode: (nodeId: string) => void
  onMoveUp: (nodeId: string) => void
  onMoveDown: (nodeId: string) => void
  onDuplicate: (nodeId: string) => void
  onRemoveRequest: (nodeId: string) => void
  onAddBlockRequest: (blockType: AddableBlockType) => void
}

export const StudioNavigatorPanel: React.FC<StudioNavigatorPanelProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemoveRequest,
  onAddBlockRequest,
}) => {
  const [activeModule, setActiveModule] = useState<NavigatorModule>('structure')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* 1. MODULE TOOLBAR */}
      <div className="grid grid-cols-6 border-b border-slate-800 bg-slate-950/60 p-1 gap-1 select-none">
        {[
          { id: 'structure', icon: <ListTree className="w-4 h-4" />, label: 'Estrutura', title: 'Estrutura de Nós' },
          { id: 'add', icon: <PlusSquare className="w-4 h-4" />, label: 'Adicionar', title: 'Adicionar Módulo' },
          { id: 'pages', icon: <FileText className="w-4 h-4" />, label: 'Páginas', title: 'Gestão de Páginas' },
          { id: 'import', icon: <Download className="w-4 h-4" />, label: 'Importar', title: 'Importar Conteúdo' },
          { id: 'library', icon: <ImageIcon className="w-4 h-4" />, label: 'Imagens', title: 'Biblioteca de Imagens' },
          { id: 'marketplace', icon: <ShoppingBag className="w-4 h-4" />, label: 'Loja', title: 'Marketplace de Blocos' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveModule(tab.id as NavigatorModule)}
            className={`py-2 flex flex-col items-center justify-center rounded transition-colors ${
              activeModule === tab.id
                ? 'bg-blue-600 text-white font-semibold shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={tab.title}
          >
            {tab.icon}
            <span className="text-[9px] mt-1 font-mono">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 2. MODULE CONTENT */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">

        {/* MODULE: STRUCTURE */}
        {activeModule === 'structure' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ListTree className="w-3.5 h-3.5 text-blue-400" /> Estrutura da Página
              </h3>
              <span className="text-[10px] bg-slate-800 text-blue-300 font-mono px-2 py-0.5 rounded">
                {nodes.length} blocos
              </span>
            </div>

            {nodes.length > 0 ? (
              <div className="space-y-1.5">
                {nodes.map((node, index) => {
                  const isSelected = selectedNodeId === node.id
                  const friendly = getFriendlyNodeLabel(node.type)
                  const isFirst = index === 0
                  const isLast = index === nodes.length - 1
                  const isOnly = nodes.length === 1

                  return (
                    <div
                      key={node.id}
                      className={`rounded-lg border text-xs transition-all select-none ${
                        isSelected
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                          : 'bg-slate-950/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      {/* Click row: select node */}
                      <div
                        className="p-2.5 flex items-center justify-between cursor-pointer"
                        onClick={() => onSelectNode(node.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono shrink-0 ${
                              isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <div className="truncate">
                            <p className="font-semibold text-xs leading-tight truncate">{friendly.title}</p>
                            <p className={`text-[10px] font-mono ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                              {node.type}
                            </p>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-1" />}
                      </div>

                      {/* Action row — always visible (touch accessible) */}
                      <div className={`flex items-center gap-1 px-2 pb-2 pt-0 border-t ${isSelected ? 'border-blue-500/40' : 'border-slate-800/60'}`}>
                        <button
                          onClick={e => { e.stopPropagation(); onMoveUp(node.id) }}
                          disabled={isFirst}
                          title="Mover para cima"
                          aria-label="Mover bloco para cima"
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-colors ${
                            isFirst
                              ? 'text-slate-700 cursor-not-allowed'
                              : isSelected
                              ? 'text-blue-200 hover:bg-blue-700 active:bg-blue-800'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white active:bg-slate-700'
                          }`}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>

                        <button
                          onClick={e => { e.stopPropagation(); onMoveDown(node.id) }}
                          disabled={isLast}
                          title="Mover para baixo"
                          aria-label="Mover bloco para baixo"
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-colors ${
                            isLast
                              ? 'text-slate-700 cursor-not-allowed'
                              : isSelected
                              ? 'text-blue-200 hover:bg-blue-700 active:bg-blue-800'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white active:bg-slate-700'
                          }`}
                        >
                          <ChevronsDown className="w-3 h-3" />
                        </button>

                        <button
                          onClick={e => { e.stopPropagation(); onDuplicate(node.id) }}
                          title="Duplicar bloco"
                          aria-label="Duplicar bloco"
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-colors ${
                            isSelected
                              ? 'text-blue-200 hover:bg-blue-700 active:bg-blue-800'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white active:bg-slate-700'
                          }`}
                        >
                          <Copy className="w-3 h-3" />
                        </button>

                        <button
                          onClick={e => { e.stopPropagation(); onRemoveRequest(node.id) }}
                          disabled={isOnly}
                          title={isOnly ? 'Não é possível remover o único bloco' : 'Remover bloco'}
                          aria-label="Remover bloco"
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-colors ${
                            isOnly
                              ? 'text-slate-700 cursor-not-allowed'
                              : 'text-red-400/80 hover:bg-red-950/60 hover:text-red-300 active:bg-red-950'
                          }`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Action labels below icons */}
                      <div className="flex items-center px-2 pb-2 gap-1">
                        <span className={`flex-1 text-center text-[9px] font-mono ${isFirst ? 'text-slate-700' : isSelected ? 'text-blue-300' : 'text-slate-500'}`}>Acima</span>
                        <span className={`flex-1 text-center text-[9px] font-mono ${isLast ? 'text-slate-700' : isSelected ? 'text-blue-300' : 'text-slate-500'}`}>Abaixo</span>
                        <span className={`flex-1 text-center text-[9px] font-mono ${isSelected ? 'text-blue-300' : 'text-slate-500'}`}>Duplic.</span>
                        <span className={`flex-1 text-center text-[9px] font-mono ${isOnly ? 'text-slate-700' : 'text-red-400/60'}`}>Remover</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-center text-xs text-slate-400">
                Nenhum bloco declarado nesta página.
              </div>
            )}
          </div>
        )}

        {/* MODULE: ADD */}
        {activeModule === 'add' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <PlusSquare className="w-3.5 h-3.5 text-blue-400" /> Catálogo de Blocos
              </h3>
            </div>

            {/* ADDABLE: 5 blocks with renderer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Blocos com Renderer Ativo (5)
                </span>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-mono">
                  Inserção ativa
                </span>
              </div>
              <div className="space-y-1">
                {ADDABLE_NODES.map(node => (
                  <div
                    key={node.type}
                    className="p-2 bg-slate-950 border border-emerald-900/40 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-200 text-xs">{node.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{node.type}</p>
                    </div>
                    <button
                      onClick={() => onAddBlockRequest(node.type as AddableBlockType)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-[10px] font-semibold rounded-lg transition-colors shrink-0 ml-2"
                      title={`Adicionar ${node.name}`}
                      aria-label={`Adicionar ${node.name}`}
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* REGISTRY-ONLY: 6 blocks with schema but no renderer */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-blue-400" /> Registo Ativo — Sem Renderer (6)
                </span>
              </div>
              <div className="p-2 bg-blue-950/20 border border-blue-900/30 rounded-lg text-[10.5px] text-blue-300 space-y-0.5">
                <p className="font-semibold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-400" /> Schema Zod ativo — renderer em desenvolvimento
                </p>
                <p className="text-[10px] text-blue-300/70">
                  Estes blocos têm schema controlado mas ainda não têm renderer ativo no canvas neste lote.
                </p>
              </div>
              <div className="space-y-1">
                {REGISTRY_ONLY_NODES.map(node => (
                  <div
                    key={node.type}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-400 text-xs">{node.name}</p>
                      <p className="text-[10px] text-slate-600 font-mono">{node.type}</p>
                    </div>
                    <span className="text-[9px] bg-slate-900 text-blue-400/70 border border-blue-800/40 px-1.5 py-0.5 rounded font-mono shrink-0 ml-1">
                      Schema Ativo · Sem renderer
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* PLANNED: future blocks */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400" /> Blocos Planeados (Em Desenvolvimento)
                </span>
              </div>
              <div className="p-2 bg-amber-950/20 border border-amber-900/40 rounded-lg text-[10.5px] text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-400" /> Planeado — ainda não suportado pelo Studio
                </p>
                <p className="text-[10px] text-amber-300/80">
                  Os blocos abaixo pertencem a famílias futuras e serão ativados nos próximos lotes.
                </p>
              </div>
              <div className="space-y-1.5">
                {PLANNED_CATEGORIES.map(cat => {
                  const isExpanded = expandedCategory === cat.id
                  return (
                    <div key={cat.id} className="border border-slate-800 rounded-lg bg-slate-950/40 overflow-hidden opacity-75">
                      <button
                        onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-300 flex items-center justify-between hover:bg-slate-800/60 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          {cat.icon}
                          <span>{cat.label}</span>
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="p-2 bg-slate-900 border-t border-slate-800 space-y-1 text-xs">
                          {cat.blocks.map(block => (
                            <div
                              key={block.type}
                              className="p-2 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 cursor-not-allowed select-none"
                            >
                              <div className="min-w-0">
                                <span className="font-medium block text-slate-400 truncate">{block.name}</span>
                                <span className="text-[9px] text-slate-600 font-mono block">{block.type}</span>
                              </div>
                              <span className="text-[9px] bg-slate-900 text-amber-400/90 border border-amber-900/40 px-1.5 py-0.5 rounded font-mono shrink-0 ml-1">
                                Planeado — ainda não suportado
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* MODULE: PAGES (HONEST) */}
        {activeModule === 'pages' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" /> Gestão de Páginas
              </h3>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-white">Multi-Páginas do Projeto</p>
              <p className="text-[11px] text-slate-400">
                Disponível no próximo lote. Criação e alternância de páginas adicionais do site.
              </p>
            </div>
          </div>
        )}

        {/* MODULE: IMPORT (HONEST) */}
        {activeModule === 'import' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-blue-400" /> Importar Conteúdo
              </h3>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-2">
              <Download className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-white">Importação Externa &amp; Ficheiros</p>
              <p className="text-[11px] text-slate-400">
                Disponível no próximo lote. Importação de dados por ficheiro ou URL externo.
              </p>
            </div>
          </div>
        )}

        {/* MODULE: IMAGE LIBRARY (HONEST) */}
        {activeModule === 'library' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> Biblioteca de Imagens
              </h3>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-2">
              <ImageIcon className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-white">Gestor de Assets &amp; Mídia</p>
              <p className="text-[11px] text-slate-400">
                Disponível no próximo lote. Upload e integração com biblioteca de imagens.
              </p>
            </div>
          </div>
        )}

        {/* MODULE: MARKETPLACE (HONEST) */}
        {activeModule === 'marketplace' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-blue-400" /> Marketplace de Blocos
              </h3>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-2">
              <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-white">Loja de Componentes &amp; Templates</p>
              <p className="text-[11px] text-slate-400">
                Disponível no próximo lote. Catálogo com 750 templates e módulos avançados.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function getFriendlyNodeLabel(type: string): { title: string } {
  switch (type) {
    case 'HeroBlock': return { title: 'Hero / Cabeçalho Principal' }
    case 'BenefitsBlock': return { title: 'Grelha de Vantagens' }
    case 'ServicesBlock': return { title: 'Catálogo de Serviços' }
    case 'FormBlock': return { title: 'Formulário de Contacto' }
    case 'FooterBlock': return { title: 'Rodapé Institucional' }
    case 'ProcessBlock': return { title: 'Cronograma de Processo' }
    case 'AboutBlock': return { title: 'Sobre a Empresa' }
    case 'TeamBlock': return { title: 'Membros da Equipa' }
    case 'TestimonialsBlock': return { title: 'Depoimentos de Clientes' }
    case 'FaqBlock': return { title: 'Perguntas Frequentes' }
    case 'ContactBlock': return { title: 'Bloco de Contacto Direto' }
    default: return { title: type }
  }
}

const ADDABLE_NODES = [
  { name: 'Hero Block Principal', type: 'HeroBlock' },
  { name: 'Grelha de Benefícios', type: 'BenefitsBlock' },
  { name: 'Catálogo de Serviços', type: 'ServicesBlock' },
  { name: 'Formulário de Leads', type: 'FormBlock' },
  { name: 'Rodapé Institucional', type: 'FooterBlock' },
]

const REGISTRY_ONLY_NODES = [
  { name: 'Cronograma de Processo', type: 'ProcessBlock' },
  { name: 'Sobre a Empresa', type: 'AboutBlock' },
  { name: 'Membros da Equipa', type: 'TeamBlock' },
  { name: 'Depoimentos de Clientes', type: 'TestimonialsBlock' },
  { name: 'Perguntas Frequentes (FAQ)', type: 'FaqBlock' },
  { name: 'Contacto Direto', type: 'ContactBlock' },
]

const PLANNED_CATEGORIES = [
  {
    id: 'typography',
    label: 'Tipografia (Planeado)',
    icon: <Type className="w-3.5 h-3.5 text-slate-400" />,
    blocks: [
      { name: 'Título &amp; Subtítulo Isolado', type: 'HeaderBlock' },
      { name: 'Parágrafo de Texto Enriquecido', type: 'TextBlock' },
    ],
  },
  {
    id: 'media',
    label: 'Multimédia (Planeado)',
    icon: <Video className="w-3.5 h-3.5 text-slate-400" />,
    blocks: [
      { name: 'Galeria de Fotos', type: 'GalleryBlock' },
      { name: 'Leitor de Vídeo VSL', type: 'VslVideoBlock' },
    ],
  },
  {
    id: 'animations',
    label: 'Animações (Planeado)',
    icon: <Sparkles className="w-3.5 h-3.5 text-slate-400" />,
    blocks: [{ name: 'Carrossel Animado', type: 'CarouselBlock' }],
  },
  {
    id: 'data',
    label: 'Dados &amp; Preços (Planeado)',
    icon: <BarChart3 className="w-3.5 h-3.5 text-slate-400" />,
    blocks: [
      { name: 'Tabela de Preços SaaS', type: 'PricingBlock' },
      { name: 'Estatísticas &amp; Números', type: 'StatsBlock' },
    ],
  },
  {
    id: 'forms',
    label: 'Formulários Avançados (Planeado)',
    icon: <FormInput className="w-3.5 h-3.5 text-slate-400" />,
    blocks: [{ name: 'Calculadora de Orçamento Interativa', type: 'CalculatorBlock' }],
  },
  {
    id: 'location',
    label: 'Localização (Planeado)',
    icon: <MapPin className="w-3.5 h-3.5 text-slate-400" />,
    blocks: [{ name: 'Mapa Interativo Google Maps', type: 'MapBlock' }],
  },
  {
    id: 'radix',
    label: 'Componentes Radix (Planeado)',
    icon: <Layers className="w-3.5 h-3.5 text-slate-400" />,
    blocks: [{ name: 'Modal de AVISO / Popup', type: 'DialogBlock' }],
  },
  {
    id: 'other',
    label: 'Outros (Planeado)',
    icon: <Box className="w-3.5 h-3.5 text-slate-400" />,
    blocks: [{ name: 'Separador Personalizado', type: 'DividerBlock' }],
  },
]
