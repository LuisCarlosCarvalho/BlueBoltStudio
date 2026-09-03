import React from 'react'
import type { StudioNode } from '@/types/studio.types'
import {
  Sliders,
  Save,
  RotateCcw,
  CheckCircle2,
  Lock,
} from 'lucide-react'

interface StudioInspectorPanelProps {
  selectedNode: StudioNode | undefined
  isDirty: boolean
  isSaving: boolean
  onUpdateNodeProperties: (nodeId: string, newProperties: any) => void
  onDiscardChanges: () => void
  onSaveDraftRevision: () => void
}

export const StudioInspectorPanel: React.FC<StudioInspectorPanelProps> = ({
  selectedNode,
  isDirty,
  isSaving,
  onUpdateNodeProperties,
  onDiscardChanges,
  onSaveDraftRevision,
}) => {
  if (!selectedNode) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs space-y-2">
        <Sliders className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="font-semibold text-slate-300">Inspetor de Elementos</p>
        <p>Selecione um bloco no canvas para editar as suas propriedades em tempo real.</p>
      </div>
    )
  }

  const props = selectedNode.properties || {}

  const handleFieldChange = (key: string, value: any) => {
    const updated = { ...props, [key]: value }
    onUpdateNodeProperties(selectedNode.id, updated)
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* 1. INSPECTOR HEADER & ACTIONS */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 space-y-2 select-none">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block">
              {selectedNode.type}
            </span>
            <h2 className="text-xs font-bold text-white truncate">ID: {selectedNode.id}</h2>
          </div>
          {isDirty ? (
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-semibold animate-pulse">
              Alterações Pendentes
            </span>
          ) : (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Sincronizado
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onDiscardChanges}
            disabled={!isDirty || isSaving}
            className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
              isDirty && !isSaving
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed'
            }`}
            title="Descartar alterações locais não guardadas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Descartar</span>
          </button>

          <button
            onClick={onSaveDraftRevision}
            disabled={!isDirty || isSaving}
            className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-colors ${
              isDirty && !isSaving
                ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'
                : 'bg-blue-950/40 border-blue-900/30 text-blue-400/40 cursor-not-allowed'
            }`}
            title="Guardar nova revisão na base de dados"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'A guardar...' : 'Guardar Rascunho'}</span>
          </button>
        </div>
      </div>

      {/* 2. CONTROLLED FIELD EDITORS BASED ON NODE TYPE */}
      <div className="flex-1 p-3 overflow-y-auto space-y-4 text-xs">
        {selectedNode.type === 'HeroBlock' && (
          <HeroBlockInspector props={props} onChange={handleFieldChange} />
        )}
        {selectedNode.type === 'BenefitsBlock' && (
          <BenefitsBlockInspector props={props} onChange={handleFieldChange} />
        )}
        {selectedNode.type === 'ServicesBlock' && (
          <ServicesBlockInspector props={props} onChange={handleFieldChange} />
        )}
        {selectedNode.type === 'FormBlock' && (
          <FormBlockInspector props={props} onChange={handleFieldChange} />
        )}
        {selectedNode.type === 'FooterBlock' && (
          <FooterBlockInspector props={props} onChange={handleFieldChange} />
        )}
        {selectedNode.type === 'ProcessBlock' && (
          <ProcessBlockInspector props={props} onChange={handleFieldChange} />
        )}
        {selectedNode.type === 'TestimonialsBlock' && (
          <TestimonialsBlockInspector props={props} onChange={handleFieldChange} />
        )}
        {selectedNode.type === 'FaqBlock' && (
          <FaqBlockInspector props={props} onChange={handleFieldChange} />
        )}
      </div>
    </div>
  )
}

// --- NODE FIELD EDITORS ---

// 1. HeroBlock Inspector
const HeroBlockInspector: React.FC<{ props: any; onChange: (key: string, val: any) => void }> = ({
  props,
  onChange,
}) => {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-slate-300 font-semibold text-[11px]">
          Headline (Título Principal - máx 200 ch)
        </label>
        <textarea
          rows={2}
          value={props.headline || ''}
          onChange={(e) => onChange('headline', e.target.value)}
          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-slate-300 font-semibold text-[11px]">
          Subheadline (Subtítulo - máx 500 ch)
        </label>
        <textarea
          rows={3}
          value={props.subheadline || ''}
          onChange={(e) => onChange('subheadline', e.target.value)}
          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-slate-300 font-semibold text-[11px]">
          Badge Text (Distintivo de Topo)
        </label>
        <input
          type="text"
          value={props.badge_text || ''}
          onChange={(e) => onChange('badge_text', e.target.value)}
          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-slate-300 font-semibold text-[11px]">
          Texto do Botão Principal (CTA)
        </label>
        <input
          type="text"
          value={props.cta_primary_text || ''}
          onChange={(e) => onChange('cta_primary_text', e.target.value)}
          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-slate-300 font-semibold text-[11px]">
          URL do Botão Principal
        </label>
        <input
          type="text"
          value={props.cta_primary_url || ''}
          onChange={(e) => onChange('cta_primary_url', e.target.value)}
          placeholder="#contact"
          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none font-mono"
        />
      </div>

      {/* Read-Only Image URL Field */}
      <div className="space-y-1 pt-2 border-t border-slate-800">
        <label className="block text-slate-400 font-semibold text-[11px] flex items-center gap-1">
          <Lock className="w-3 h-3 text-amber-400" /> Imagem de Fundo (bg_image_url)
        </label>
        <input
          type="text"
          disabled
          value={props.bg_image_url || ''}
          placeholder="Nenhuma imagem de fundo"
          className="w-full px-2.5 py-1.5 bg-slate-950/60 border border-slate-900 rounded-lg text-slate-500 text-xs cursor-not-allowed font-mono"
        />
        <p className="text-[10px] text-amber-400/90 italic">
          Biblioteca de Imagens disponível no Lote 7.
        </p>
      </div>
    </div>
  )
}

// 2. BenefitsBlock Inspector
const BenefitsBlockInspector: React.FC<{ props: any; onChange: (key: string, val: any) => void }> = ({
  props,
  onChange,
}) => {
  const items = props.items || []

  const handleItemChange = (index: number, field: string, val: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: val }
    onChange('items', newItems)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-slate-300 font-semibold text-[11px]">Título da Secção</label>
        <input
          type="text"
          value={props.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-slate-300 font-semibold text-[11px]">Subtítulo</label>
        <input
          type="text"
          value={props.subtitle || ''}
          onChange={(e) => onChange('subtitle', e.target.value)}
          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-800">
        <p className="text-xs font-bold text-white uppercase tracking-wider">Itens de Vantagens ({items.length})</p>
        {items.map((item: any, idx: number) => (
          <div key={item.id || idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
            <span className="text-[10px] font-mono text-blue-400 font-semibold">Vantagem #{idx + 1}</span>
            <input
              type="text"
              value={item.title || ''}
              onChange={(e) => handleItemChange(idx, 'title', e.target.value)}
              placeholder="Título da vantagem"
              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// 3. ServicesBlock Inspector
const ServicesBlockInspector: React.FC<{ props: any; onChange: (key: string, val: any) => void }> = ({
  props,
  onChange,
}) => {
  const cards = props.cards || []

  const handleCardChange = (index: number, field: string, val: string) => {
    const newCards = [...cards]
    newCards[index] = { ...newCards[index], [field]: val }
    onChange('cards', newCards)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-slate-300 font-semibold text-[11px]">Título do Catálogo</label>
        <input
          type="text"
          value={props.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-800">
        <p className="text-xs font-bold text-white uppercase tracking-wider">Serviços ({cards.length})</p>
        {cards.map((card: any, idx: number) => (
          <div key={card.id || idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
            <span className="text-[10px] font-mono text-blue-400 font-semibold">Serviço #{idx + 1}</span>
            <input
              type="text"
              value={card.title || ''}
              onChange={(e) => handleCardChange(idx, 'title', e.target.value)}
              placeholder="Nome do serviço"
              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// 4. FormBlock Inspector
const FormBlockInspector: React.FC<{ props: any; onChange: (key: string, val: any) => void }> = ({
  props,
  onChange,
}) => {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-slate-300 font-semibold text-[11px]">Título do Formulário</label>
        <input
          type="text"
          value={props.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-slate-300 font-semibold text-[11px]">Subtítulo</label>
        <textarea
          rows={2}
          value={props.subtitle || ''}
          onChange={(e) => onChange('subtitle', e.target.value)}
          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-slate-300 font-semibold text-[11px]">Texto do Botão de Submissão</label>
        <input
          type="text"
          value={props.submit_button_text || ''}
          onChange={(e) => onChange('submit_button_text', e.target.value)}
          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  )
}

// 5. FooterBlock Inspector
const FooterBlockInspector: React.FC<{ props: any; onChange: (key: string, val: any) => void }> = ({
  props,
  onChange,
}) => {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-slate-300 font-semibold text-[11px]">Texto de Copyright</label>
        <input
          type="text"
          value={props.copyright_text || ''}
          onChange={(e) => onChange('copyright_text', e.target.value)}
          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-slate-300 font-semibold text-[11px]">
          Informação Semântica de Contacto (contact_text)
        </label>
        <textarea
          rows={2}
          value={props.contact_text || ''}
          onChange={(e) => onChange('contact_text', e.target.value)}
          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  )
}

// Auxiliary Inspectors
const ProcessBlockInspector: React.FC<{ props: any; onChange: (key: string, val: any) => void }> = ({ props, onChange }) => (
  <div className="space-y-2">
    <label className="block text-slate-300 font-semibold text-[11px]">Título do Processo</label>
    <input type="text" value={props.title || ''} onChange={(e) => onChange('title', e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
  </div>
)

const TestimonialsBlockInspector: React.FC<{ props: any; onChange: (key: string, val: any) => void }> = ({ props, onChange }) => (
  <div className="space-y-2">
    <label className="block text-slate-300 font-semibold text-[11px]">Título de Depoimentos</label>
    <input type="text" value={props.title || ''} onChange={(e) => onChange('title', e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
  </div>
)

const FaqBlockInspector: React.FC<{ props: any; onChange: (key: string, val: any) => void }> = ({ props, onChange }) => (
  <div className="space-y-2">
    <label className="block text-slate-300 font-semibold text-[11px]">Título de FAQ</label>
    <input type="text" value={props.title || ''} onChange={(e) => onChange('title', e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
  </div>
)
