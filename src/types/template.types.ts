import { z } from 'zod'

export type TemplateStatus = 'draft' | 'active' | 'archived'

export type TemplateFieldType =
  | 'text'
  | 'textarea'
  | 'rich_text'
  | 'image_url'
  | 'url'
  | 'cta'
  | 'metric'
  | 'list'
  | 'faq_list'
  | 'card_list'
  | 'form_fields'

export type TemplateSectionType =
  | 'hero'
  | 'services'
  | 'benefits'
  | 'process'
  | 'about'
  | 'team'
  | 'testimonials'
  | 'faq'
  | 'contact'
  | 'form'
  | 'footer'

export const templateEditableFieldSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  field_type: z.enum([
    'text',
    'textarea',
    'rich_text',
    'image_url',
    'url',
    'cta',
    'metric',
    'list',
    'faq_list',
    'card_list',
    'form_fields',
  ]),
  required: z.boolean().default(false),
  max_length: z.number().int().positive().optional(),
  placeholder: z.string().optional(),
  ai_hint: z.string().optional(),
})

export const templateSectionSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum([
    'hero',
    'services',
    'benefits',
    'process',
    'about',
    'team',
    'testimonials',
    'faq',
    'contact',
    'form',
    'footer',
  ]),
  label: z.string().min(1).max(100),
  purpose: z.string().min(1).max(300),
  required: z.boolean().default(false),
  editable_fields: z.array(templateEditableFieldSchema).min(1),
})

export const templateDesignTokensSchema = z.object({
  colors: z.record(z.string(), z.string()).default({}),
  typography: z.record(z.string(), z.string()).default({}),
  spacing: z.record(z.string(), z.string()).optional(),
})

export const templateSchemaValidator = z.object({
  schema_version: z.string().min(1).max(20).default('1.0.0'),
  template_name: z.string().min(2).max(120),
  category: z.string().min(2).max(60),
  design_tokens: templateDesignTokensSchema.default({ colors: {}, typography: {} }),
  sections: z.array(templateSectionSchema).min(1),
})

export const templateCreateSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens.'),
  category: z.string().min(2).max(60),
  industry_tags: z.array(z.string()).default([]),
  is_generic: z.boolean().default(false),
  description: z.string().max(500).optional().nullable(),
  preview_image_url: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  schema: templateSchemaValidator,
})

export const templateUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
  category: z.string().min(2).max(60).optional(),
  industry_tags: z.array(z.string()).optional(),
  is_generic: z.boolean().optional(),
  description: z.string().max(500).optional().nullable(),
  preview_image_url: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  schema: templateSchemaValidator.optional(),
  change_note: z.string().max(300).optional(),
})

export type TemplateEditableField = z.infer<typeof templateEditableFieldSchema>
export type TemplateSection = z.infer<typeof templateSectionSchema>
export type TemplateDesignTokens = z.infer<typeof templateDesignTokensSchema>
export type TemplateSchemaDefinition = z.infer<typeof templateSchemaValidator>
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>

export interface Template {
  id: string
  name: string
  slug: string
  category: string
  industry_tags?: string[]
  is_generic?: boolean
  description: string | null
  preview_image_url: string | null
  schema: TemplateSchemaDefinition
  status: TemplateStatus
  created_by: string | null
  created_at: string
  updated_at: string
  version_count?: number
}

export interface TemplateVersion {
  id: string
  template_id: string
  version: number
  schema: TemplateSchemaDefinition
  change_note: string | null
  created_by: string | null
  created_at: string
}

export type ContentSourceType = 'pasted_text' | 'txt_file' | 'docx_file' | 'pdf_file'

export interface ProjectContentSource {
  id: string
  project_id: string
  source_type: ContentSourceType
  original_filename: string | null
  extracted_text: string
  created_by: string | null
  created_at: string
}

export interface ElementorImportResponse {
  success: boolean
  candidate: TemplateCreateInput
  warnings: string[]
  stats: {
    detected_sections_count: number
    detected_widgets_count: number
  }
}
