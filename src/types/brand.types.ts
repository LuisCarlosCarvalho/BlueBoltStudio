import { z } from 'zod'

// Allowed font enums with strict fallbacks
export const ALLOWED_HEADING_FONTS = [
  'Inter',
  'Roboto',
  'Montserrat',
  'Poppins',
  'Outfit',
  'Playfair Display',
] as const

export const ALLOWED_BODY_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Plus Jakarta Sans',
] as const

export type HeadingFont = typeof ALLOWED_HEADING_FONTS[number]
export type BodyFont = typeof ALLOWED_BODY_FONTS[number]

export const ALLOWED_VISUAL_STYLES = [
  'clean_minimal',
  'modern_tech',
  'luxury_premium',
  'bold_creative',
  'warm_organic',
] as const

export const ALLOWED_VOICE_TONES = [
  'profissional',
  'acolhedor',
  'autoritario',
  'inovador',
  'descontraido',
] as const

// Helper to validate logo URL (Vercel Blob OR internal placeholder only)
const isSafeLogoUrl = (url?: string | null): boolean => {
  if (!url || url.trim() === '') return true
  const u = url.trim()
  if (u.startsWith('/') || u.startsWith('data:image/svg+xml')) return true
  try {
    const parsed = new URL(u)
    if (parsed.protocol !== 'https:') return false
    return (
      parsed.hostname.endsWith('.public.blob.vercel-storage.com') ||
      parsed.hostname === 'blob.vercel-storage.com'
    )
  } catch {
    return false
  }
}

// Hex color regex
const hexColorRegex = /^#([A-Fa-f0-9]{6})$/

// 1. Schema for Draft (partial fields allowed)
export const draftBrandKitSchema = z.object({
  brand_name: z.string().max(100, 'O nome da marca não pode ter mais de 100 caracteres.').optional().default(''),
  slogan: z.string().max(150, 'O slogan não pode ter mais de 150 caracteres.').optional().default(''),
  logo_url: z.string().refine(isSafeLogoUrl, {
    message: 'Apenas são permitidos URLs do Vercel Blob ou placeholders internos.',
  }).optional().default(''),
  logo_dark_url: z.string().refine(isSafeLogoUrl, {
    message: 'Apenas são permitidos URLs do Vercel Blob ou placeholders internos.',
  }).optional().default(''),
  primary_color: z.string().refine((val) => !val || hexColorRegex.test(val), {
    message: 'A cor primária deve ser um código hex válido (ex: #1463FF).',
  }).optional().default('#1463FF'),
  secondary_color: z.string().refine((val) => !val || hexColorRegex.test(val), {
    message: 'A cor secundária deve ser um código hex válido (ex: #05192D).',
  }).optional().default('#05192D'),
  accent_color: z.string().refine((val) => !val || hexColorRegex.test(val), {
    message: 'A cor de destaque deve ser um código hex válido (ex: #FF6B00).',
  }).optional().default('#FF6B00'),
  bg_color: z.string().refine((val) => !val || hexColorRegex.test(val), {
    message: 'A cor de fundo deve ser um código hex válido (ex: #FFFFFF).',
  }).optional().default('#FFFFFF'),
  text_color: z.string().refine((val) => !val || hexColorRegex.test(val), {
    message: 'A cor de texto deve ser um código hex válido (ex: #0F172A).',
  }).optional().default('#0F172A'),
  font_heading: z.enum(ALLOWED_HEADING_FONTS).optional().default('Inter'),
  font_body: z.enum(ALLOWED_BODY_FONTS).optional().default('Inter'),
  visual_style: z.enum(ALLOWED_VISUAL_STYLES).optional().default('clean_minimal'),
  voice_tone: z.enum(ALLOWED_VOICE_TONES).optional().default('profissional'),
  forbidden_elements: z.string().max(500, 'Os elementos proibidos não podem exceder 500 caracteres.').optional().default(''),
  reference_notes: z.string().max(1000, 'As notas de referência não podem exceder 1000 caracteres.').optional().default(''),
})

// 2. Schema for Apply (strict minimum required fields)
export const applyBrandKitSchema = z.object({
  brand_name: z.string().min(2, 'O nome da marca é obrigatório para aplicar a identidade visual.').max(100),
  slogan: z.string().max(150).optional().default(''),
  logo_url: z.string().refine(isSafeLogoUrl, {
    message: 'Logótipo inválido: use apenas Vercel Blob ou placeholder interno.',
  }).optional().default(''),
  logo_dark_url: z.string().refine(isSafeLogoUrl, {
    message: 'Logótipo escuro inválido: use apenas Vercel Blob ou placeholder interno.',
  }).optional().default(''),
  primary_color: z.string().regex(hexColorRegex, 'A cor primária é obrigatória e deve ser um código hex (ex: #1463FF).'),
  secondary_color: z.string().regex(hexColorRegex, 'A cor secundária é obrigatória e deve ser um código hex (ex: #05192D).'),
  accent_color: z.string().regex(hexColorRegex, 'A cor de destaque é obrigatória e deve ser um código hex (ex: #FF6B00).'),
  bg_color: z.string().regex(hexColorRegex, 'A cor de fundo é obrigatória e deve ser um código hex (ex: #FFFFFF).'),
  text_color: z.string().regex(hexColorRegex, 'A cor de texto é obrigatória e deve ser um código hex (ex: #0F172A).'),
  font_heading: z.enum(ALLOWED_HEADING_FONTS),
  font_body: z.enum(ALLOWED_BODY_FONTS),
  visual_style: z.enum(ALLOWED_VISUAL_STYLES),
  voice_tone: z.enum(ALLOWED_VOICE_TONES),
  forbidden_elements: z.string().max(500).optional().default(''),
  reference_notes: z.string().max(1000).optional().default(''),
})

export type BrandKitData = z.infer<typeof draftBrandKitSchema>

export interface ProjectBrandVersion {
  id: string
  project_id: string
  version: number
  status: 'draft' | 'applied'
  brand_data: BrandKitData
  change_summary: string | null
  created_by: string | null
  creator_name?: string | null
  created_at: string
}

export interface ProjectBrandKit {
  id: string
  project_id: string
  active_version: number
  status: 'draft' | 'applied'
  brand_data: BrandKitData
  updated_at: string
  created_at: string
}

export interface BrandResponse {
  currentKit: ProjectBrandKit | null
  latestVersion: ProjectBrandVersion | null
  versions: ProjectBrandVersion[]
}
