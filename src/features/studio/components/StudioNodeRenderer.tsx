import React from 'react'
import type { StudioNode } from '@/types/studio.types'
import type { BrandKitData } from '@/types'
import { Check, Star, Send, Phone, Mail, MapPin, Users, Info, HelpCircle } from 'lucide-react'

interface StudioNodeRendererProps {
  node: StudioNode
  isSelected: boolean
  onSelect: (nodeId: string) => void
  brandKit?: BrandKitData
}

export const StudioNodeRenderer: React.FC<StudioNodeRendererProps> = ({
  node,
  isSelected,
  onSelect,
  brandKit,
}) => {
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
      {renderNodeContent(node, brandKit)}
    </div>
  )
}

function renderNodeContent(node: StudioNode, brandKit?: BrandKitData) {
  switch (node.type) {
    case 'HeroBlock':
      return <HeroBlockRenderer properties={node.properties} brandKit={brandKit} />
    case 'BenefitsBlock':
      return <BenefitsBlockRenderer properties={node.properties} brandKit={brandKit} />
    case 'ServicesBlock':
      return <ServicesBlockRenderer properties={node.properties} brandKit={brandKit} />
    case 'ProcessBlock':
      return <ProcessBlockRenderer properties={node.properties} brandKit={brandKit} />
    case 'AboutBlock':
      return <AboutBlockRenderer properties={node.properties} brandKit={brandKit} />
    case 'TeamBlock':
      return <TeamBlockRenderer properties={node.properties} brandKit={brandKit} />
    case 'TestimonialsBlock':
      return <TestimonialsBlockRenderer properties={node.properties} brandKit={brandKit} />
    case 'FaqBlock':
      return <FaqBlockRenderer properties={node.properties} brandKit={brandKit} />
    case 'ContactBlock':
      return <ContactBlockRenderer properties={node.properties} brandKit={brandKit} />
    case 'FormBlock':
      return <FormBlockRenderer properties={node.properties} brandKit={brandKit} />
    case 'FooterBlock':
      return <FooterBlockRenderer properties={node.properties} brandKit={brandKit} />
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
const HeroBlockRenderer: React.FC<{ properties: any; brandKit?: BrandKitData }> = ({
  properties,
  brandKit,
}) => {
  const primaryColor = brandKit?.primary_color || '#1463FF'
  const fontHeading = brandKit?.font_heading || 'Inter'
  const fontBody = brandKit?.font_body || 'Inter'

  return (
    <section className="relative bg-slate-900 text-white py-16 px-6 sm:px-12 overflow-hidden border border-slate-800/80 rounded-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 -z-10" />
      <div className="max-w-3xl mx-auto text-center space-y-6">
        {properties.badge_text && (
          <span
            className="inline-block px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider border"
            style={{
              color: primaryColor,
              borderColor: `${primaryColor}40`,
              backgroundColor: `${primaryColor}15`,
              fontFamily: fontBody,
            }}
          >
            {properties.badge_text}
          </span>
        )}
        <h1
          className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight"
          style={{ fontFamily: fontHeading }}
        >
          {properties.headline}
        </h1>
        {properties.subheadline && (
          <p
            className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed"
            style={{ fontFamily: fontBody }}
          >
            {properties.subheadline}
          </p>
        )}
        {properties.cta_primary_text && (
          <div className="pt-4 flex justify-center">
            <a
              href={properties.cta_primary_url || '#contact'}
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center justify-center px-6 py-3 font-medium text-sm rounded-lg shadow-lg transition-all duration-150 text-white"
              style={{
                backgroundColor: primaryColor,
                fontFamily: fontBody,
              }}
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
const BenefitsBlockRenderer: React.FC<{ properties: any; brandKit?: BrandKitData }> = ({
  properties,
  brandKit,
}) => {
  const primaryColor = brandKit?.primary_color || '#16A34A'
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
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
              >
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
const ServicesBlockRenderer: React.FC<{ properties: any; brandKit?: BrandKitData }> = ({
  properties,
}) => {
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

// 4. ProcessBlock Renderer
const ProcessBlockRenderer: React.FC<{ properties: any; brandKit?: BrandKitData }> = ({
  properties,
  brandKit,
}) => {
  const primaryColor = brandKit?.primary_color || '#1463FF'
  const steps = properties.steps || []

  return (
    <section className="bg-white text-slate-900 py-12 px-6 sm:px-12 border border-slate-200 rounded-xl">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{properties.title}</h2>
          {properties.subtitle && <p className="text-sm text-slate-600 mt-2">{properties.subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((st: any, idx: number) => (
            <div key={st.step_number || idx} className="p-5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <span
                className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                {st.step_number || idx + 1}
              </span>
              <h3 className="text-base font-semibold text-slate-900">{st.title}</h3>
              {st.description && <p className="text-xs text-slate-600">{st.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 5. AboutBlock Renderer
const AboutBlockRenderer: React.FC<{ properties: any; brandKit?: BrandKitData }> = ({
  properties,
}) => {
  return (
    <section className="bg-slate-900 text-white py-12 px-6 sm:px-12 border border-slate-800 rounded-xl">
      <div className="max-w-3xl mx-auto space-y-4 text-center">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
          <Info className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold">{properties.title}</h2>
        <p className="text-sm text-slate-300 leading-relaxed">{properties.story}</p>
      </div>
    </section>
  )
}

// 6. TeamBlock Renderer
const TeamBlockRenderer: React.FC<{ properties: any; brandKit?: BrandKitData }> = ({
  properties,
}) => {
  const members = properties.members || []
  return (
    <section className="bg-white text-slate-900 py-12 px-6 sm:px-12 border border-slate-200 rounded-xl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">{properties.title}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {members.map((m: any, idx: number) => (
            <div key={m.name || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto font-bold text-sm">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold">{m.name}</h3>
              <p className="text-xs text-slate-500">{m.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 7. TestimonialsBlock Renderer
const TestimonialsBlockRenderer: React.FC<{ properties: any; brandKit?: BrandKitData }> = ({
  properties,
}) => {
  const testimonials = properties.testimonials || []
  return (
    <section className="bg-slate-50 text-slate-900 py-12 px-6 sm:px-12 border border-slate-200 rounded-xl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">{properties.title}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {testimonials.map((t: any, idx: number) => (
            <div key={t.id || idx} className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
              <p className="text-xs italic text-slate-600">"{t.quote}"</p>
              <div className="text-xs font-semibold text-slate-900">
                {t.author_name} <span className="text-slate-400 font-normal">({t.role_company})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 8. FaqBlock Renderer
const FaqBlockRenderer: React.FC<{ properties: any; brandKit?: BrandKitData }> = ({
  properties,
}) => {
  const items = properties.items || []
  return (
    <section className="bg-white text-slate-900 py-12 px-6 sm:px-12 border border-slate-200 rounded-xl">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <HelpCircle className="w-6 h-6 text-blue-600" /> {properties.title}
          </h2>
        </div>
        <div className="space-y-3">
          {items.map((item: any, idx: number) => (
            <div key={item.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <h3 className="text-xs font-bold text-slate-900">{item.question}</h3>
              <p className="text-xs text-slate-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 9. ContactBlock Renderer
const ContactBlockRenderer: React.FC<{ properties: any; brandKit?: BrandKitData }> = ({
  properties,
}) => {
  return (
    <section className="bg-slate-900 text-white py-12 px-6 sm:px-12 border border-slate-800 rounded-xl">
      <div className="max-w-3xl mx-auto space-y-4 text-center">
        <h2 className="text-2xl font-bold">{properties.title}</h2>
        <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-300 pt-2">
          {properties.email && <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-blue-400" /> {properties.email}</span>}
          {properties.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-blue-400" /> {properties.phone}</span>}
          {properties.address && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-blue-400" /> {properties.address}</span>}
        </div>
      </div>
    </section>
  )
}

// 10. FormBlock Renderer
const FormBlockRenderer: React.FC<{ properties: any; brandKit?: BrandKitData }> = ({
  properties,
  brandKit,
}) => {
  const primaryColor = brandKit?.primary_color || '#1463FF'
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
              className="w-full py-2.5 text-white font-medium text-xs rounded-lg shadow cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
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

// 11. FooterBlock Renderer
const FooterBlockRenderer: React.FC<{ properties: any; brandKit?: BrandKitData }> = ({
  properties,
}) => {
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
