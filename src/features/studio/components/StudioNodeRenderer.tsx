import React from 'react'
import type { StudioNode } from '@/types/studio.types'
import { Check, Star, Send } from 'lucide-react'

interface StudioNodeRendererProps {
  node: StudioNode
  isSelected: boolean
  onSelect: (nodeId: string) => void
}

export const StudioNodeRenderer: React.FC<StudioNodeRendererProps> = ({ node, isSelected, onSelect }) => {
  const selectionClasses = isSelected
    ? 'ring-2 ring-blue-500 shadow-xl relative z-10'
    : 'hover:ring-1 hover:ring-blue-400/50 cursor-pointer'

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(node.id)
  }

  return (
    <div
      onClick={handleClick}
      className={`transition-all duration-200 rounded-lg overflow-hidden my-3 ${selectionClasses}`}
    >
      {renderNodeContent(node)}
    </div>
  )
}

function renderNodeContent(node: StudioNode) {
  switch (node.type) {
    case 'HeroBlock':
      return <HeroBlockRenderer properties={node.properties} />
    case 'BenefitsBlock':
      return <BenefitsBlockRenderer properties={node.properties} />
    case 'ServicesBlock':
      return <ServicesBlockRenderer properties={node.properties} />
    case 'FormBlock':
      return <FormBlockRenderer properties={node.properties} />
    case 'FooterBlock':
      return <FooterBlockRenderer properties={node.properties} />
    default:
      return (
        <div className="p-6 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg">
          <p className="font-medium">Bloco Controlado: {(node as any).type}</p>
          <p className="text-xs text-slate-400 mt-1">Renderização segura ativa.</p>
        </div>
      )
  }
}

// 1. HeroBlock Renderer
const HeroBlockRenderer: React.FC<{ properties: any }> = ({ properties }) => {
  return (
    <section className="relative bg-slate-900 text-white py-16 px-6 sm:px-12 overflow-hidden border border-slate-800/80 rounded-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-slate-900 to-slate-950 -z-10" />
      <div className="max-w-3xl mx-auto text-center space-y-6">
        {properties.badge_text && (
          <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-full uppercase tracking-wider">
            {properties.badge_text}
          </span>
        )}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          {properties.headline}
        </h1>
        {properties.subheadline && (
          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            {properties.subheadline}
          </p>
        )}
        {properties.cta_primary_text && (
          <div className="pt-4 flex justify-center">
            <a
              href={properties.cta_primary_url || '#contact'}
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-blue-600/30 transition-all duration-150"
            >
              {properties.cta_primary_text}
            </a>
          </div>
        )}
      </div>
    </section>
  )
}

// 2. BenefitsBlock Renderer
const BenefitsBlockRenderer: React.FC<{ properties: any }> = ({ properties }) => {
  const items = properties.items || []
  return (
    <section className="bg-white text-slate-900 py-12 px-6 sm:px-12 border border-slate-200 rounded-xl">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{properties.title}</h2>
          {properties.subtitle && <p className="text-sm text-slate-600 mt-2">{properties.subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {items.map((item: any, idx: number) => (
            <div key={item.id || idx} className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              {item.description && <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 3. ServicesBlock Renderer
const ServicesBlockRenderer: React.FC<{ properties: any }> = ({ properties }) => {
  const cards = properties.cards || []
  return (
    <section className="bg-slate-50 text-slate-900 py-12 px-6 sm:px-12 border border-slate-200 rounded-xl">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{properties.title}</h2>
          {properties.subtitle && <p className="text-sm text-slate-600 mt-2">{properties.subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {cards.map((card: any, idx: number) => (
            <div key={card.id || idx} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
              {card.description && <p className="text-xs text-slate-600 leading-relaxed">{card.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 4. FormBlock Renderer
const FormBlockRenderer: React.FC<{ properties: any }> = ({ properties }) => {
  const fields = properties.fields || []
  return (
    <section className="bg-white text-slate-900 py-12 px-6 sm:px-12 border border-slate-200 rounded-xl">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{properties.title}</h2>
          {properties.subtitle && <p className="text-sm text-slate-600 mt-2">{properties.subtitle}</p>}
        </div>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
          {fields.map((field: any, idx: number) => (
            <div key={field.id || idx} className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                disabled
                placeholder={`Introduza ${field.label.toLowerCase()}`}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>
          ))}
          <div className="pt-2">
            <button
              type="button"
              disabled
              className="w-full py-2.5 bg-blue-600 text-white font-medium text-xs rounded-lg shadow cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              {properties.submit_button_text || 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

// 5. FooterBlock Renderer
const FooterBlockRenderer: React.FC<{ properties: any }> = ({ properties }) => {
  return (
    <footer className="bg-slate-950 text-slate-400 py-10 px-6 sm:px-12 border border-slate-900 rounded-xl space-y-4">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <p className="font-medium text-slate-300">{properties.copyright_text}</p>
        {properties.contact_text && (
          <p className="text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-md border border-slate-800">
            {properties.contact_text}
          </p>
        )}
      </div>
    </footer>
  )
}
