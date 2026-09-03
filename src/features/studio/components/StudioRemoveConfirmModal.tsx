import React from 'react'
import { AlertTriangle, X, Trash2 } from 'lucide-react'
import type { StudioNode } from '@/types/studio.types'

interface StudioRemoveConfirmModalProps {
  node: StudioNode
  totalNodes: number
  onConfirm: () => void
  onCancel: () => void
}

function blockLabel(type: string): string {
  switch (type) {
    case 'HeroBlock': return 'Hero / Cabeçalho Principal'
    case 'BenefitsBlock': return 'Grelha de Vantagens'
    case 'ServicesBlock': return 'Catálogo de Serviços'
    case 'FormBlock': return 'Formulário de Contacto'
    case 'FooterBlock': return 'Rodapé Institucional'
    case 'ProcessBlock': return 'Cronograma de Processo'
    case 'AboutBlock': return 'Sobre a Empresa'
    case 'TeamBlock': return 'Membros da Equipa'
    case 'TestimonialsBlock': return 'Depoimentos de Clientes'
    case 'FaqBlock': return 'Perguntas Frequentes'
    case 'ContactBlock': return 'Bloco de Contacto Direto'
    default: return type
  }
}

export const StudioRemoveConfirmModal: React.FC<StudioRemoveConfirmModalProps> = ({
  node,
  totalNodes,
  onConfirm,
  onCancel,
}) => {
  const isLastBlock = totalNodes <= 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar remoção de bloco"
    >
      <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-950 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-sm font-bold text-white">Remover Bloco</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cancelar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-0.5">
            <p className="text-xs font-semibold text-slate-200">{blockLabel(node.type)}</p>
            <p className="text-[10px] font-mono text-slate-500">{node.type} · ID: {node.id.slice(0, 8)}…</p>
          </div>

          {isLastBlock ? (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold text-red-300">Remoção impossível</p>
                <p className="text-[10px] text-red-400/80">
                  Uma página deve ter pelo menos um bloco. Não é possível remover o único bloco restante.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold text-amber-300">Ação local e reversível</p>
                <p className="text-[10px] text-amber-400/80">
                  Este bloco será removido apenas do rascunho local. Use <strong>Descartar Alterações</strong> para restaurar o conteúdo guardado, ou <strong>Guardar Rascunho</strong> para confirmar permanentemente.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={isLastBlock ? undefined : onConfirm}
            disabled={isLastBlock}
            className="flex-1 px-4 py-2.5 bg-red-700 hover:bg-red-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remover Bloco
          </button>
        </div>
      </div>
    </div>
  )
}
