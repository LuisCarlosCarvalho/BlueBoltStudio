import { z } from 'zod'

// 1. Strict URL Validators
export const safeImageUrlSchema = z.string().superRefine((val, ctx) => {
  if (!val || val === '') return
  if (val.startsWith('/') && !val.startsWith('//')) return // Authorized local relative asset
  try {
    const parsed = new URL(val)
    if (parsed.protocol !== 'https:') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Apenas URLs com protocolo HTTPS seguro são permitidas.' })
      return
    }
    if (!parsed.hostname.endsWith('.public.blob.vercel-storage.com')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Imagens externas devem pertencer ao Vercel Blob autorizado.' })
    }
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'URL de imagem inválida.' })
  }
})

export const safeNavLinkSchema = z.string().superRefine((val, ctx) => {
  if (!val || val === '') return
  if (val.startsWith('#') || (val.startsWith('/') && !val.startsWith('//'))) return // Anchor or relative route
  try {
    const parsed = new URL(val)
    if (parsed.protocol !== 'https:') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Links externos devem utilizar protocolo HTTPS.' })
    }
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'URL de navegação inválida.' })
  }
})

export const safeGoogleMapsUrlSchema = z.string().superRefine((val, ctx) => {
  if (!val || val === '') return
  try {
    const parsed = new URL(val)
    if (parsed.protocol !== 'https:') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'O link do mapa deve utilizar protocolo HTTPS.' })
      return
    }
    const allowedHosts = ['maps.google.com', 'www.google.com', 'google.com']
    if (!allowedHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Apenas links oficiais do Google Maps são permitidos.' })
    }
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'URL de Google Maps inválida.' })
  }
})

// 2. Controlled Block Property Schemas (.strict())

// HeroBlock (hero)
export const heroPropertiesSchema = z
  .object({
    headline: z.string().max(200, 'Headline deve ter no máximo 200 caracteres.'),
    subheadline: z.string().max(500).optional().default(''),
    cta_primary_text: z.string().max(100).optional().default(''),
    cta_primary_url: safeNavLinkSchema.optional().default(''),
    cta_secondary_text: z.string().max(100).optional().default(''),
    cta_secondary_url: safeNavLinkSchema.optional().default(''),
    badge_text: z.string().max(100).optional().default(''),
    bg_image_url: safeImageUrlSchema.optional().default(''),
  })
  .strict()

// ServicesBlock (services)
export const servicesPropertiesSchema = z
  .object({
    title: z.string().max(200),
    subtitle: z.string().max(500).optional().default(''),
    cards: z
      .array(
        z
          .object({
            id: z.string(),
            title: z.string().max(150),
            description: z.string().max(500),
            icon_name: z.string().max(50).optional(),
          })
          .strict()
      )
      .max(12),
  })
  .strict()

// BenefitsBlock (benefits)
export const benefitsPropertiesSchema = z
  .object({
    title: z.string().max(200),
    subtitle: z.string().max(500).optional().default(''),
    items: z
      .array(
        z
          .object({
            id: z.string(),
            title: z.string().max(150),
            description: z.string().max(500),
            icon_name: z.string().max(50).optional(),
          })
          .strict()
      )
      .max(10),
  })
  .strict()

// ProcessBlock (process)
export const processPropertiesSchema = z
  .object({
    title: z.string().max(200),
    subtitle: z.string().max(500).optional().default(''),
    steps: z
      .array(
        z
          .object({
            step_number: z.number().int().positive(),
            title: z.string().max(150),
            description: z.string().max(500),
          })
          .strict()
      )
      .max(8),
  })
  .strict()

// AboutBlock (about)
export const aboutPropertiesSchema = z
  .object({
    title: z.string().max(200),
    story_text: z.string().max(2000),
    image_url: safeImageUrlSchema.optional().default(''),
    stat_number: z.string().max(50).optional().default(''),
    stat_label: z.string().max(100).optional().default(''),
  })
  .strict()

// TeamBlock (team)
export const teamPropertiesSchema = z
  .object({
    title: z.string().max(200),
    subtitle: z.string().max(500).optional().default(''),
    members: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string().max(100),
            role: z.string().max(100),
            photo_url: safeImageUrlSchema.optional(),
            bio: z.string().max(300).optional(),
          })
          .strict()
      )
      .max(12),
  })
  .strict()

// TestimonialsBlock (testimonials)
export const testimonialsPropertiesSchema = z
  .object({
    title: z.string().max(200),
    subtitle: z.string().max(500).optional().default(''),
    testimonials: z
      .array(
        z
          .object({
            id: z.string(),
            author_name: z.string().max(100),
            role_company: z.string().max(100).optional(),
            quote: z.string().max(1000),
            avatar_url: safeImageUrlSchema.optional(),
            rating: z.number().min(1).max(5).default(5),
          })
          .strict()
      )
      .max(10),
  })
  .strict()

// FaqBlock (faq)
export const faqPropertiesSchema = z
  .object({
    title: z.string().max(200),
    subtitle: z.string().max(500).optional().default(''),
    items: z
      .array(
        z
          .object({
            id: z.string(),
            question: z.string().max(300),
            answer: z.string().max(1500),
          })
          .strict()
      )
      .max(15),
  })
  .strict()

// ContactBlock (contact)
export const contactPropertiesSchema = z
  .object({
    title: z.string().max(200),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
    address: z.string().max(200).optional(),
    google_maps_url: safeGoogleMapsUrlSchema.optional(),
  })
  .strict()

// FormBlock (form)
export const formPropertiesSchema = z
  .object({
    title: z.string().max(200),
    subtitle: z.string().max(500).optional().default(''),
    submit_button_text: z.string().max(100).default('Enviar Mensagem'),
    fields: z
      .array(
        z
          .object({
            id: z.string(),
            label: z.string().max(100),
            type: z.enum(['text', 'email', 'phone', 'textarea', 'select']),
            required: z.boolean().default(true),
          })
          .strict()
      )
      .max(10),
  })
  .strict()

// FooterBlock (footer)
export const footerPropertiesSchema = z
  .object({
    copyright_text: z.string().max(200),
    contact_text: z.string().max(300).optional().default(''),
    links: z
      .array(
        z
          .object({
            label: z.string().max(100),
            url: safeNavLinkSchema,
          })
          .strict()
      )
      .max(10)
      .optional(),
  })
  .strict()

// 3. Discriminated Union of 11 Controlled Studio Nodes
export const studioNodeSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string(), type: z.literal('HeroBlock'), section_type: z.literal('hero'), properties: heroPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('ServicesBlock'), section_type: z.literal('services'), properties: servicesPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('BenefitsBlock'), section_type: z.literal('benefits'), properties: benefitsPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('ProcessBlock'), section_type: z.literal('process'), properties: processPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('AboutBlock'), section_type: z.literal('about'), properties: aboutPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('TeamBlock'), section_type: z.literal('team'), properties: teamPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('TestimonialsBlock'), section_type: z.literal('testimonials'), properties: testimonialsPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('FaqBlock'), section_type: z.literal('faq'), properties: faqPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('ContactBlock'), section_type: z.literal('contact'), properties: contactPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('FormBlock'), section_type: z.literal('form'), properties: formPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('FooterBlock'), section_type: z.literal('footer'), properties: footerPropertiesSchema }).strict(),
])

export const pageTreeSchema = z
  .object({
    nodes: z.array(studioNodeSchema),
  })
  .strict()

// 4. API Request & Response Zod Schemas (.strict())

export const savePageRevisionRequestSchema = z
  .object({
    page_tree: pageTreeSchema,
    expected_revision: z.number().int().positive('O número de revisão esperado é obrigatório.'),
    change_summary: z.string().max(250).optional(),
  })
  .strict()

export const createPageRequestSchema = z
  .object({
    name: z.string().min(2, 'O nome da página deve ter no mínimo 2 caracteres.').max(100),
    slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'O slug deve conter apenas letras minúsculas, números e hífens.'),
    is_home: z.boolean().default(false),
  })
  .strict()

export const updatePageRequestSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  })
  .strict()

export const restoreRevisionRequestSchema = z
  .object({
    revision_id: z.string().uuid('ID de revisão inválido.'),
  })
  .strict()

export const publishPageRequestSchema = z
  .object({
    revision_id: z.string().uuid().optional(),
  })
  .strict()

export const duplicatePageRequestSchema = z
  .object({
    new_name: z.string().min(2).max(100),
    new_slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  })
  .strict()

// TypeScript Inferred Types
export type StudioNode = z.infer<typeof studioNodeSchema>
export type PageTree = z.infer<typeof pageTreeSchema>
export type SavePageRevisionInput = z.infer<typeof savePageRevisionRequestSchema>
export type CreatePageInput = z.infer<typeof createPageRequestSchema>

export interface ProjectPage {
  id: string
  project_id: string
  name: string
  slug: string
  is_home: boolean
  page_tree: PageTree
  created_at: string
  updated_at: string
}

export interface ProjectPageRevision {
  id: string
  project_id: string
  page_id: string
  revision_number: number
  status: 'draft' | 'published'
  page_tree: PageTree
  change_type: 'initial_import' | 'inspector_edit' | 'ai_patch_apply' | 'node_reorder' | 'version_restore' | 'publish'
  change_summary: string | null
  created_by: string | null
  created_at: string
}
