import React, { useState, useEffect } from 'react'
import type { BrandKitData } from '@/types'
import {
  ALLOWED_HEADING_FONTS,
  ALLOWED_BODY_FONTS,
  ALLOWED_VISUAL_STYLES,
} from '@/types'
import {
  Palette,
  Type,
  Save,
  RotateCcw,
  CheckCircle2,
  Pencil,
} from 'lucide-react'

interface StudioBrandIdentityPanelProps {
  savedBrandKit: BrandKitData
  isSavingBrand: boolean
  onSaveBrandKit: (brandData: BrandKitData, action: 'save_draft' | 'apply') => void
  onBrandDataChange: (updatedBrandKit: BrandKitData) => void
}

export const StudioBrandIdentityPanel: React.FC<StudioBrandIdentityPanelProps> = ({
  savedBrandKit,
  isSavingBrand,
  onSaveBrandKit,
  onBrandDataChange,
}) => {
  const [localKit, setLocalKit] = useState<BrandKitData>(savedBrandKit)

  useEffect(() => {
    setLocalKit(savedBrandKit)
  }, [savedBrandKit])

  const isDirty = JSON.stringify(localKit) !== JSON.stringify(savedBrandKit)

  const handleFieldChange = (key: keyof BrandKitData, val: any) => {
    const updated = { ...localKit, [key]: val }
    setLocalKit(updated)
    onBrandDataChange(updated)
  }

  const handleDiscard = () => {
    setLocalKit(savedBrandKit)
    onBrandDataChange(savedBrandKit)
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* 1. PANEL HEADER & ACTIONS */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60 space-y-2 select-none">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block">
              IDENTIDADE VISUAL
            </span>
            <h2 className="text-xs font-bold text-white truncate">Marca & Estilos do Projeto</h2>
          </div>
          {isDirty ? (
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-semibold animate-pulse">
              Alterações Pendentes
            </span>
          ) : (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Aplicada ao Canvas
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleDiscard}
            disabled={!isDirty || isSavingBrand}
            className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
              isDirty && !isSavingBrand
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed'
            }`}
            title="Descartar alterações locais da identidade visual"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Descartar</span>
          </button>

          <button
            onClick={() => onSaveBrandKit(localKit, 'apply')}
            disabled={!isDirty || isSavingBrand}
            className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-colors ${
              isDirty && !isSavingBrand
                ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'
                : 'bg-blue-950/40 border-blue-900/30 text-blue-400/40 cursor-not-allowed'
            }`}
            title="Aplicar e guardar a identidade visual no projeto"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSavingBrand ? 'A aplicar...' : 'Aplicar ao projeto'}</span>
          </button>
        </div>
      </div>

      {/* 2. FORM FIELDS */}
      <div className="flex-1 p-3 overflow-y-auto space-y-4 text-xs">
        {/* BRAND NAME */}
        <div className="space-y-1">
          <label className="block text-slate-300 font-semibold text-[11px]">Nome da marca</label>
          <input
            type="text"
            value={localKit.brand_name || ''}
            onChange={(e) => handleFieldChange('brand_name', e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* LOGO PREVIEW & EDIT */}
        <div className="space-y-1.5">
          <label className="block text-slate-300 font-semibold text-[11px]">Logótipo</label>
          <div className="p-3 bg-slate-950 border border-dashed border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              {localKit.logo_url ? (
                <img
                  src={localKit.logo_url}
                  alt={localKit.brand_name}
                  className="h-10 w-auto max-w-[120px] object-contain rounded"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  {localKit.brand_name?.charAt(0) || 'M'}
                </div>
              )}
              <div>
                <p className="font-bold text-white text-xs">{localKit.brand_name || 'Marca'}</p>
                <p className="text-[10px] text-slate-500">Asset Vetorial da Marca</p>
              </div>
            </div>
            <button
              onClick={() => {
                const newUrl = prompt('URL do logótipo da marca:', localKit.logo_url || '')
                if (newUrl !== null) handleFieldChange('logo_url', newUrl)
              }}
              className="p-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Editar URL do logótipo"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* BRAND COLORS MATRIX (5 COLORS) */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <label className="block text-slate-300 font-semibold text-[11px] flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-blue-400" /> Cores da marca
          </label>

          <div className="grid grid-cols-5 gap-1.5">
            {/* 1. Primária */}
            <div className="space-y-1 text-center">
              <span className="text-[9px] text-slate-400 font-medium block truncate">Primária</span>
              <div className="relative group">
                <input
                  type="color"
                  value={localKit.primary_color || '#1463FF'}
                  onChange={(e) => handleFieldChange('primary_color', e.target.value)}
                  className="w-full h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500 block truncate">
                {localKit.primary_color}
              </span>
            </div>

            {/* 2. Secundária */}
            <div className="space-y-1 text-center">
              <span className="text-[9px] text-slate-400 font-medium block truncate">Secundária</span>
              <div className="relative group">
                <input
                  type="color"
                  value={localKit.secondary_color || '#05192D'}
                  onChange={(e) => handleFieldChange('secondary_color', e.target.value)}
                  className="w-full h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500 block truncate">
                {localKit.secondary_color}
              </span>
            </div>

            {/* 3. Destaque */}
            <div className="space-y-1 text-center">
              <span className="text-[9px] text-slate-400 font-medium block truncate">Destaque</span>
              <div className="relative group">
                <input
                  type="color"
                  value={localKit.accent_color || '#FF6B00'}
                  onChange={(e) => handleFieldChange('accent_color', e.target.value)}
                  className="w-full h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500 block truncate">
                {localKit.accent_color}
              </span>
            </div>

            {/* 4. Fundo */}
            <div className="space-y-1 text-center">
              <span className="text-[9px] text-slate-400 font-medium block truncate">Fundo</span>
              <div className="relative group">
                <input
                  type="color"
                  value={localKit.bg_color || '#FFFFFF'}
                  onChange={(e) => handleFieldChange('bg_color', e.target.value)}
                  className="w-full h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500 block truncate">
                {localKit.bg_color}
              </span>
            </div>

            {/* 5. Texto */}
            <div className="space-y-1 text-center">
              <span className="text-[9px] text-slate-400 font-medium block truncate">Texto</span>
              <div className="relative group">
                <input
                  type="color"
                  value={localKit.text_color || '#0F172A'}
                  onChange={(e) => handleFieldChange('text_color', e.target.value)}
                  className="w-full h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500 block truncate">
                {localKit.text_color}
              </span>
            </div>
          </div>
        </div>

        {/* TYPOGRAPHY */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <label className="block text-slate-300 font-semibold text-[11px] flex items-center gap-1">
            <Type className="w-3.5 h-3.5 text-blue-400" /> Tipografia
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400">Título</label>
              <select
                value={localKit.font_heading || 'Inter'}
                onChange={(e) => handleFieldChange('font_heading', e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
              >
                {ALLOWED_HEADING_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400">Corpo</label>
              <select
                value={localKit.font_body || 'Inter'}
                onChange={(e) => handleFieldChange('font_body', e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
              >
                {ALLOWED_BODY_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* VISUAL STYLE */}
        <div className="space-y-1 pt-1 border-t border-slate-800">
          <label className="block text-slate-300 font-semibold text-[11px]">Estilo visual</label>
          <select
            value={localKit.visual_style || 'amigavel_profissional'}
            onChange={(e) => handleFieldChange('visual_style', e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:border-blue-500 focus:outline-none"
          >
            {ALLOWED_VISUAL_STYLES.map((style) => (
              <option key={style} value={style}>
                {getFriendlyVisualStyleLabel(style)}
              </option>
            ))}
          </select>
        </div>

        {/* STATUS CARD (MATCHING REFERENCE EXACTLY) */}
        <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs space-y-1 select-none">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Aplicada ao canvas</span>
          </div>
          <p className="text-[11px] text-emerald-200/80">
            A identidade visual está ativa neste projeto e sincronizada com a pré-visualização em tempo real.
          </p>
        </div>
      </div>
    </div>
  )
}

function getFriendlyVisualStyleLabel(style: string): string {
  switch (style) {
    case 'clean_minimal':
      return 'Clean e Minimalista'
    case 'modern_bold':
      return 'Moderno e Arrojado'
    case 'corporate_trust':
      return 'Corporativo e De Confiança'
    case 'warm_welcoming':
      return 'Acolhedor e Humano'
    case 'elegant_luxury':
      return 'Elegante e Luxuoso'
    case 'vibrant_creative':
      return 'Vibrante e Criativo'
    case 'amigavel_profissional':
    default:
      return 'Amigável e Profissional'
  }
}
