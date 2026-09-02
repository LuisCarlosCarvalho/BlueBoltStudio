import { z } from 'zod'

export type AiConfidence = 'high' | 'medium' | 'low'
export type AiMappingStatus = 'draft' | 'applied' | 'discarded'

export const aiSuggestedFieldSchema = z.object({
  field_key: z.string().min(1).optional(),
  suggested_value: z.string().default('').optional(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  source_excerpt: z.string().default(''),
  rationale: z.string().default(''),
  needs_review: z.boolean().default(true),
  // Backward compatibility alias keys
  key: z.string().optional(),
  value: z.string().optional(),
  reason: z.string().optional(),
})

export const aiSuggestedSectionSchema = z.object({
  section_id: z.string().min(1),
  fields: z.array(aiSuggestedFieldSchema),
})

export const aiContentMappingResultSchema = z.object({
  summary: z.string(),
  warnings: z.array(z.string()).default([]),
  sections: z.array(aiSuggestedSectionSchema),
})

export type AiSuggestedField = {
  field_key: string
  suggested_value: string
  confidence: AiConfidence
  source_excerpt: string
  rationale: string
  needs_review: boolean
  // Aliases
  key?: string
  value?: string
  reason?: string
}

export type AiSuggestedSection = {
  section_id: string
  fields: AiSuggestedField[]
}

export type AiContentMappingResult = {
  summary: string
  warnings: string[]
  sections: AiSuggestedSection[]
}

export interface ProjectAiMapping {
  id: string
  project_id: string
  content_source_id: string
  template_id: string
  template_version: number | null
  status: AiMappingStatus
  mapping: AiContentMappingResult
  model: string | null
  created_by: string | null
  created_at: string
  applied_at: string | null
  applied_by: string | null
  creator_name?: string | null
  applier_name?: string | null
  source_filename?: string | null
  source_type?: string | null
}

export interface ApplyAiMappingInput {
  applied_fields: Record<string, Record<string, string>>
}
