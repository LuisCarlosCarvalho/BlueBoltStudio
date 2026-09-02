import { z } from 'zod'

export type AiConfidence = 'high' | 'medium' | 'low'
export type AiMappingStatus = 'draft' | 'applied' | 'discarded'

export const aiSuggestedFieldSchema = z.object({
  key: z.string().min(1),
  value: z.string().default(''),
  confidence: z.enum(['high', 'medium', 'low']),
  reason: z.string().default(''),
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

export type AiSuggestedField = z.infer<typeof aiSuggestedFieldSchema>
export type AiSuggestedSection = z.infer<typeof aiSuggestedSectionSchema>
export type AiContentMappingResult = z.infer<typeof aiContentMappingResultSchema>

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
