import React, { useState, useCallback } from 'react'
import { X, Plus, Trash2, AlertCircle, PlusSquare } from 'lucide-react'
import { studioNodeSchema } from '@/types/studio.types'
import type { StudioNode } from '@/types/studio.types'
import { z } from 'zod'

type AddableBlockType = 'HeroBlock' | 'BenefitsBlock' | 'ServicesBlock' | 'FormBlock' | 'FooterBlock'

interface StudioAddBlockModalProps {
  blockType: AddableBlockType
  onConfirm: (newNode: StudioNode) => void
  onCancel: () => void
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `node-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function blockLabel(type: AddableBlockType): string {
  switch (type) {
    case 'HeroBlock': return 'Hero / Cabeçalho Principal'
    case 'BenefitsBlock': return 'Grelha de Vantagens'
    case 'ServicesBlock': return 'Catálogo de Serviços'
    case 'FormBlock': return 'Formulário de Contacto'
    case 'FooterBlock': return 'Rodapé Institucional'
  }
}

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}

const Field: React.FC<FieldProps> = ({ label, required, error, hint, children }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1">
      {label}
      {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-[10px] text-slate-500">{hint}</p>}
    {error && (
      <p className="text-[10px] text-red-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3 shrink-0" />
        {error}
      </p>
    )}
  </div>
)

const inputCls =
  'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors'
const textareaCls = inputCls + ' resize-y min-h-[64px]'

// ── Hero Form ──────────────────────────────────────────────────────────────
interface HeroFormState {
  headline: string; subheadline: string; cta_primary_text: string; cta_primary_url: string
  cta_secondary_text: string; cta_secondary_url: string; badge_text: string; bg_image_url: string
}
const emptyHero = (): HeroFormState => ({
  headline: '', subheadline: '', cta_primary_text: '', cta_primary_url: '',
  cta_secondary_text: '', cta_secondary_url: '', badge_text: '', bg_image_url: '',
})
const HeroForm: React.FC<{ value: HeroFormState; onChange: (v: HeroFormState) => void; errors: Record<string, string> }> = ({ value, onChange, errors }) => {
  const s = (k: keyof HeroFormState) => (v: string) => onChange({ ...value, [k]: v })
  return (
    <div className="space-y-3">
      <Field label="Headline Principal" required error={errors.headline} hint="Máximo 200 caracteres">
        <input className={inputCls} value={value.headline} onChange={e => s('headline')(e.target.value)} placeholder="Ex: O seu site pronto em 24 horas" maxLength={200} />
      </Field>
      <Field label="Subheadline" error={errors.subheadline} hint="Opcional · Máximo 500 caracteres">
        <textarea className={textareaCls} value={value.subheadline} onChange={e => s('subheadline')(e.target.value)} placeholder="Descrição complementar (opcional)" maxLength={500} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CTA Principal — Texto" error={errors.cta_primary_text} hint="Opcional · Máx 100">
          <input className={inputCls} value={value.cta_primary_text} onChange={e => s('cta_primary_text')(e.target.value)} placeholder="Ex: Começar agora" maxLength={100} />
        </Field>
        <Field label="CTA Principal — URL" error={errors.cta_primary_url} hint="Opcional · / ou https://…">
          <input className={inputCls} value={value.cta_primary_url} onChange={e => s('cta_primary_url')(e.target.value)} placeholder="/contacto" />
        </Field>
        <Field label="CTA Secundário — Texto" error={errors.cta_secondary_text} hint="Opcional · Máx 100">
          <input className={inputCls} value={value.cta_secondary_text} onChange={e => s('cta_secondary_text')(e.target.value)} placeholder="Ex: Ver portfólio" maxLength={100} />
        </Field>
        <Field label="CTA Secundário — URL" error={errors.cta_secondary_url} hint="Opcional · / ou https://…">
          <input className={inputCls} value={value.cta_secondary_url} onChange={e => s('cta_secondary_url')(e.target.value)} placeholder="/portfolio" />
        </Field>
      </div>
      <Field label="Badge / Etiqueta" error={errors.badge_text} hint="Opcional · Máx 100">
        <input className={inputCls} value={value.badge_text} onChange={e => s('badge_text')(e.target.value)} placeholder="Ex: #1 em Portugal" maxLength={100} />
      </Field>
      <Field label="URL de Imagem de Fundo" error={errors.bg_image_url} hint="Opcional · HTTPS Vercel Blob">
        <input className={inputCls} value={value.bg_image_url} onChange={e => s('bg_image_url')(e.target.value)} placeholder="https://…public.blob.vercel-storage.com/…" />
      </Field>
    </div>
  )
}

// ── Benefits Form ──────────────────────────────────────────────────────────
interface BenefitItem { id: string; title: string; description: string; icon_name: string }
interface BenefitsFormState { title: string; subtitle: string; items: BenefitItem[] }
const emptyBenefits = (): BenefitsFormState => ({
  title: '', subtitle: '',
  items: [{ id: newId(), title: '', description: '', icon_name: '' }],
})
const BenefitsForm: React.FC<{ value: BenefitsFormState; onChange: (v: BenefitsFormState) => void; errors: Record<string, string> }> = ({ value, onChange, errors }) => {
  const updateItem = (idx: number, k: keyof BenefitItem, v: string) => {
    const items = value.items.map((it, i) => i === idx ? { ...it, [k]: v } : it)
    onChange({ ...value, items })
  }
  const addItem = () => {
    if (value.items.length >= 10) return
    onChange({ ...value, items: [...value.items, { id: newId(), title: '', description: '', icon_name: '' }] })
  }
  const removeItem = (idx: number) => {
    if (value.items.length <= 1) return
    onChange({ ...value, items: value.items.filter((_, i) => i !== idx) })
  }
  return (
    <div className="space-y-3">
      <Field label="Título da Secção" required error={errors.title} hint="Máximo 200 caracteres">
        <input className={inputCls} value={value.title} onChange={e => onChange({ ...value, title: e.target.value })} placeholder="Ex: As nossas vantagens" maxLength={200} />
      </Field>
      <Field label="Subtítulo" error={errors.subtitle} hint="Opcional · Máximo 500 caracteres">
        <textarea className={textareaCls} value={value.subtitle} onChange={e => onChange({ ...value, subtitle: e.target.value })} placeholder="Descrição complementar (opcional)" maxLength={500} />
      </Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            Vantagens <span className="text-red-400">*</span>
            <span className="text-slate-500 ml-1 normal-case">(mín. 1, máx. 10)</span>
          </label>
          <button type="button" onClick={addItem} disabled={value.items.length >= 10}
            className="flex items-center gap-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors">
            <Plus className="w-3 h-3" /> Adicionar vantagem
          </button>
        </div>
        {errors.items && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.items}</p>}
        {value.items.map((item, idx) => (
          <div key={item.id} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-slate-500">Vantagem #{idx + 1}</span>
              {value.items.length > 1 && (
                <button type="button" onClick={() => removeItem(idx)} className="text-red-400/70 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Título" required error={errors[`items.${idx}.title`]} hint="Máx 150">
                <input className={inputCls} value={item.title} onChange={e => updateItem(idx, 'title', e.target.value)} placeholder="Ex: Rapidez" maxLength={150} />
              </Field>
              <Field label="Ícone (nome)" hint="Opcional · Ex: Zap">
                <input className={inputCls} value={item.icon_name} onChange={e => updateItem(idx, 'icon_name', e.target.value)} placeholder="Zap" maxLength={50} />
              </Field>
            </div>
            <Field label="Descrição" required error={errors[`items.${idx}.description`]} hint="Máx 500">
              <textarea className={textareaCls} value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Descreva esta vantagem" maxLength={500} />
            </Field>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Services Form ──────────────────────────────────────────────────────────
interface ServiceCard { id: string; title: string; description: string; icon_name: string }
interface ServicesFormState { title: string; subtitle: string; cards: ServiceCard[] }
const emptyServices = (): ServicesFormState => ({
  title: '', subtitle: '',
  cards: [{ id: newId(), title: '', description: '', icon_name: '' }],
})
const ServicesForm: React.FC<{ value: ServicesFormState; onChange: (v: ServicesFormState) => void; errors: Record<string, string> }> = ({ value, onChange, errors }) => {
  const updateCard = (idx: number, k: keyof ServiceCard, v: string) => {
    const cards = value.cards.map((c, i) => i === idx ? { ...c, [k]: v } : c)
    onChange({ ...value, cards })
  }
  const addCard = () => {
    if (value.cards.length >= 12) return
    onChange({ ...value, cards: [...value.cards, { id: newId(), title: '', description: '', icon_name: '' }] })
  }
  const removeCard = (idx: number) => {
    if (value.cards.length <= 1) return
    onChange({ ...value, cards: value.cards.filter((_, i) => i !== idx) })
  }
  return (
    <div className="space-y-3">
      <Field label="Título da Secção" required error={errors.title} hint="Máximo 200 caracteres">
        <input className={inputCls} value={value.title} onChange={e => onChange({ ...value, title: e.target.value })} placeholder="Ex: Os nossos serviços" maxLength={200} />
      </Field>
      <Field label="Subtítulo" error={errors.subtitle} hint="Opcional · Máximo 500 caracteres">
        <textarea className={textareaCls} value={value.subtitle} onChange={e => onChange({ ...value, subtitle: e.target.value })} placeholder="Descrição complementar (opcional)" maxLength={500} />
      </Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            Serviços <span className="text-red-400">*</span>
            <span className="text-slate-500 ml-1 normal-case">(mín. 1, máx. 12)</span>
          </label>
          <button type="button" onClick={addCard} disabled={value.cards.length >= 12}
            className="flex items-center gap-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors">
            <Plus className="w-3 h-3" /> Adicionar serviço
          </button>
        </div>
        {errors.cards && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.cards}</p>}
        {value.cards.map((card, idx) => (
          <div key={card.id} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-slate-500">Serviço #{idx + 1}</span>
              {value.cards.length > 1 && (
                <button type="button" onClick={() => removeCard(idx)} className="text-red-400/70 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Título" required error={errors[`cards.${idx}.title`]} hint="Máx 150">
                <input className={inputCls} value={card.title} onChange={e => updateCard(idx, 'title', e.target.value)} placeholder="Ex: Design Gráfico" maxLength={150} />
              </Field>
              <Field label="Ícone (nome)" hint="Opcional · Ex: Palette">
                <input className={inputCls} value={card.icon_name} onChange={e => updateCard(idx, 'icon_name', e.target.value)} placeholder="Palette" maxLength={50} />
              </Field>
            </div>
            <Field label="Descrição" required error={errors[`cards.${idx}.description`]} hint="Máx 500">
              <textarea className={textareaCls} value={card.description} onChange={e => updateCard(idx, 'description', e.target.value)} placeholder="Descreva este serviço" maxLength={500} />
            </Field>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Form Block Form ────────────────────────────────────────────────────────
type FormFieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select'
interface FormFieldDef { id: string; label: string; type: FormFieldType; required: boolean }
interface FormBlockFormState { title: string; subtitle: string; submit_button_text: string; fields: FormFieldDef[] }
const emptyFormBlock = (): FormBlockFormState => ({
  title: '', subtitle: '',
  submit_button_text: 'Enviar Mensagem',
  fields: [{ id: newId(), label: '', type: 'text', required: true }],
})
const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'textarea', label: 'Área de texto' },
  { value: 'select', label: 'Seleção (dropdown)' },
]
const FormBlockForm: React.FC<{ value: FormBlockFormState; onChange: (v: FormBlockFormState) => void; errors: Record<string, string> }> = ({ value, onChange, errors }) => {
  const updateField = (idx: number, k: keyof FormFieldDef, v: string | boolean) => {
    const fields = value.fields.map((f, i) => i === idx ? { ...f, [k]: v } : f)
    onChange({ ...value, fields })
  }
  const addField = () => {
    if (value.fields.length >= 10) return
    onChange({ ...value, fields: [...value.fields, { id: newId(), label: '', type: 'text', required: true }] })
  }
  const removeField = (idx: number) => {
    if (value.fields.length <= 1) return
    onChange({ ...value, fields: value.fields.filter((_, i) => i !== idx) })
  }
  return (
    <div className="space-y-3">
      <Field label="Título do Formulário" required error={errors.title} hint="Máximo 200 caracteres">
        <input className={inputCls} value={value.title} onChange={e => onChange({ ...value, title: e.target.value })} placeholder="Ex: Fale connosco" maxLength={200} />
      </Field>
      <Field label="Subtítulo" error={errors.subtitle} hint="Opcional · Máximo 500 caracteres">
        <textarea className={textareaCls} value={value.subtitle} onChange={e => onChange({ ...value, subtitle: e.target.value })} placeholder="Texto complementar (opcional)" maxLength={500} />
      </Field>
      <Field label="Texto do Botão de Submissão" required error={errors.submit_button_text} hint="Máximo 100 caracteres">
        <input className={inputCls} value={value.submit_button_text} onChange={e => onChange({ ...value, submit_button_text: e.target.value })} maxLength={100} />
      </Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            Campos do Formulário <span className="text-red-400">*</span>
            <span className="text-slate-500 ml-1 normal-case">(mín. 1, máx. 10)</span>
          </label>
          <button type="button" onClick={addField} disabled={value.fields.length >= 10}
            className="flex items-center gap-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors">
            <Plus className="w-3 h-3" /> Adicionar campo
          </button>
        </div>
        {errors.fields && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.fields}</p>}
        {value.fields.map((field, idx) => (
          <div key={field.id} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-slate-500">Campo #{idx + 1}</span>
              {value.fields.length > 1 && (
                <button type="button" onClick={() => removeField(idx)} className="text-red-400/70 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Etiqueta do Campo" required error={errors[`fields.${idx}.label`]} hint="Máx 100">
                <input className={inputCls} value={field.label} onChange={e => updateField(idx, 'label', e.target.value)} placeholder="Ex: Nome completo" maxLength={100} />
              </Field>
              <Field label="Tipo de Campo" required>
                <select className={inputCls} value={field.type} onChange={e => updateField(idx, 'type', e.target.value as FormFieldType)}>
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer select-none">
              <input type="checkbox" checked={field.required} onChange={e => updateField(idx, 'required', e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-600 accent-blue-500" />
              Campo obrigatório no formulário
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Footer Form ────────────────────────────────────────────────────────────
interface FooterLink { label: string; url: string }
interface FooterFormState { copyright_text: string; contact_text: string; links: FooterLink[] }
const emptyFooter = (): FooterFormState => ({ copyright_text: '', contact_text: '', links: [] })
const FooterForm: React.FC<{ value: FooterFormState; onChange: (v: FooterFormState) => void; errors: Record<string, string> }> = ({ value, onChange, errors }) => {
  const updateLink = (idx: number, k: keyof FooterLink, v: string) => {
    const links = value.links.map((l, i) => i === idx ? { ...l, [k]: v } : l)
    onChange({ ...value, links })
  }
  const addLink = () => {
    if (value.links.length >= 10) return
    onChange({ ...value, links: [...value.links, { label: '', url: '' }] })
  }
  const removeLink = (idx: number) => {
    onChange({ ...value, links: value.links.filter((_, i) => i !== idx) })
  }
  return (
    <div className="space-y-3">
      <Field label="Texto de Copyright" required error={errors.copyright_text} hint="Máximo 200 caracteres">
        <input className={inputCls} value={value.copyright_text} onChange={e => onChange({ ...value, copyright_text: e.target.value })} placeholder="© 2026 A sua empresa, Lda." maxLength={200} />
      </Field>
      <Field label="Texto de Contacto" error={errors.contact_text} hint="Opcional · Máximo 300 caracteres">
        <textarea className={textareaCls} value={value.contact_text} onChange={e => onChange({ ...value, contact_text: e.target.value })} placeholder="Contactos, morada ou outro texto (opcional)" maxLength={300} />
      </Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            Links de Navegação
            <span className="text-slate-500 ml-1 normal-case">(opcional · máx. 10)</span>
          </label>
          <button type="button" onClick={addLink} disabled={value.links.length >= 10}
            className="flex items-center gap-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors">
            <Plus className="w-3 h-3" /> Adicionar link
          </button>
        </div>
        {value.links.map((link, idx) => (
          <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-slate-500">Link #{idx + 1}</span>
              <button type="button" onClick={() => removeLink(idx)} className="text-red-400/70 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Etiqueta" required error={errors[`links.${idx}.label`]} hint="Máx 100">
                <input className={inputCls} value={link.label} onChange={e => updateLink(idx, 'label', e.target.value)} placeholder="Ex: Política de Privacidade" maxLength={100} />
              </Field>
              <Field label="URL" required error={errors[`links.${idx}.url`]} hint="# ou / ou https://…">
                <input className={inputCls} value={link.url} onChange={e => updateLink(idx, 'url', e.target.value)} placeholder="/privacidade" />
              </Field>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────────────────
export const StudioAddBlockModal: React.FC<StudioAddBlockModalProps> = ({
  blockType, onConfirm, onCancel,
}) => {
  const [heroState, setHeroState] = useState<HeroFormState>(emptyHero)
  const [benefitsState, setBenefitsState] = useState<BenefitsFormState>(emptyBenefits)
  const [servicesState, setServicesState] = useState<ServicesFormState>(emptyServices)
  const [formBlockState, setFormBlockState] = useState<FormBlockFormState>(emptyFormBlock)
  const [footerState, setFooterState] = useState<FooterFormState>(emptyFooter)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const flattenZodErrors = (issues: z.ZodIssue[]): Record<string, string> => {
    const map: Record<string, string> = {}
    for (const issue_ of issues) {
      const pathParts = issue_.path.slice(1) // strip 'properties'
      const key = pathParts.join('.')
      if (key && !map[key]) map[key] = issue_.message
    }
    return map
  }

  const handleSubmit = useCallback(() => {
    setSubmitError(null)
    setErrors({})

    let rawNode: unknown

    if (blockType === 'HeroBlock') {
      rawNode = {
        id: newId(), type: 'HeroBlock', section_type: 'hero',
        properties: {
          headline: heroState.headline,
          subheadline: heroState.subheadline || '',
          cta_primary_text: heroState.cta_primary_text || '',
          cta_primary_url: heroState.cta_primary_url || '',
          cta_secondary_text: heroState.cta_secondary_text || '',
          cta_secondary_url: heroState.cta_secondary_url || '',
          badge_text: heroState.badge_text || '',
          bg_image_url: heroState.bg_image_url || '',
        },
      }
    } else if (blockType === 'BenefitsBlock') {
      rawNode = {
        id: newId(), type: 'BenefitsBlock', section_type: 'benefits',
        properties: {
          title: benefitsState.title,
          subtitle: benefitsState.subtitle || '',
          items: benefitsState.items.map(it => ({
            id: it.id, title: it.title, description: it.description,
            ...(it.icon_name ? { icon_name: it.icon_name } : {}),
          })),
        },
      }
    } else if (blockType === 'ServicesBlock') {
      rawNode = {
        id: newId(), type: 'ServicesBlock', section_type: 'services',
        properties: {
          title: servicesState.title,
          subtitle: servicesState.subtitle || '',
          cards: servicesState.cards.map(c => ({
            id: c.id, title: c.title, description: c.description,
            ...(c.icon_name ? { icon_name: c.icon_name } : {}),
          })),
        },
      }
    } else if (blockType === 'FormBlock') {
      rawNode = {
        id: newId(), type: 'FormBlock', section_type: 'form',
        properties: {
          title: formBlockState.title,
          subtitle: formBlockState.subtitle || '',
          submit_button_text: formBlockState.submit_button_text,
          fields: formBlockState.fields.map(f => ({
            id: f.id, label: f.label, type: f.type, required: f.required,
          })),
        },
      }
    } else {
      rawNode = {
        id: newId(), type: 'FooterBlock', section_type: 'footer',
        properties: {
          copyright_text: footerState.copyright_text,
          contact_text: footerState.contact_text || '',
          ...(footerState.links.length > 0
            ? { links: footerState.links.map(l => ({ label: l.label, url: l.url })) }
            : {}),
        },
      }
    }

    const result = studioNodeSchema.safeParse(rawNode)
    if (!result.success) {
      setErrors(flattenZodErrors(result.error.issues))
      setSubmitError('Existem erros de validação nos campos abaixo. Corrija-os antes de continuar.')
      return
    }

    onConfirm(result.data as StudioNode)
  }, [blockType, heroState, benefitsState, servicesState, formBlockState, footerState, onConfirm])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <PlusSquare className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm font-bold text-white">Adicionar Bloco</p>
              <p className="text-[10px] font-mono text-slate-400">{blockType} · Schema Zod Ativo</p>
            </div>
          </div>
          <button onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cancelar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 pt-4 pb-1 shrink-0">
          <p className="text-xs font-semibold text-slate-200">{blockLabel(blockType)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Campos com <span className="text-red-400">*</span> são obrigatórios pelo schema Zod. Os opcionais podem ficar em branco. Nenhum conteúdo é gerado automaticamente.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {blockType === 'HeroBlock' && <HeroForm value={heroState} onChange={setHeroState} errors={errors} />}
          {blockType === 'BenefitsBlock' && <BenefitsForm value={benefitsState} onChange={setBenefitsState} errors={errors} />}
          {blockType === 'ServicesBlock' && <ServicesForm value={servicesState} onChange={setServicesState} errors={errors} />}
          {blockType === 'FormBlock' && <FormBlockForm value={formBlockState} onChange={setFormBlockState} errors={errors} />}
          {blockType === 'FooterBlock' && <FooterForm value={footerState} onChange={setFooterState} errors={errors} />}
        </div>
        {submitError && (
          <div className="mx-5 mb-3 p-2.5 bg-red-950/50 border border-red-800 rounded-lg text-[11px] text-red-300 flex items-start gap-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
            <span>{submitError}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800 shrink-0 gap-3">
          <p className="text-[10px] text-slate-500 flex-1">
            Inserção local apenas. Nenhum dado é guardado na BD até clicar <strong className="text-slate-300">Guardar Rascunho</strong>.
          </p>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Adicionar ao Rascunho
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
