import type { Json } from './database.types'

export type ContentSourceType =
  | 'pasted_text'
  | 'txt_file'
  | 'docx_file'
  | 'pdf_file'
  | 'briefing'

export type TemplateSectionType =
  | 'hero'
  | 'value_proposition'
  | 'services'
  | 'process'
  | 'about'
  | 'team'
  | 'testimonials'
  | 'faq'
  | 'contact'
  | 'form'
  | 'custom'

export type ProposalReviewStatus = 'pending' | 'accepted' | 'edited' | 'skipped'

export interface ContentSourceDocument {
  id: string
  source_type: ContentSourceType
  file_name?: string
  raw_content: string
  file_size_bytes?: number
  created_at: string
  created_by?: string
}

export interface SectionFieldLimit {
  max_characters?: number
  max_items?: number
  min_items?: number
}

export interface TemplateSectionDefinition {
  section_id: string
  section_type: TemplateSectionType
  label: string
  purpose: string
  accepted_fields: string[]
  required_fields: string[]
  limits?: Record<string, SectionFieldLimit>
  default_content?: Record<string, Json>
}

export interface TemplateSchemaDefinition {
  template_id: string
  name: string
  niche: string
  version: string
  sections: TemplateSectionDefinition[]
}

export interface ProposedSectionContent {
  section_id: string
  section_type: TemplateSectionType
  original_content: Record<string, Json>
  proposed_content: Record<string, Json>
  source_excerpt: string
  source_field_origin?: string
  confidence_score: number // 0.0 to 1.0
  status: ProposalReviewStatus
  user_notes?: string
}

export interface ContentMappingReviewSession {
  session_id: string
  project_id: string
  template_id: string
  source_document_id?: string
  mapping_proposals: ProposedSectionContent[]
  is_applied: boolean
  created_at: string
  applied_at?: string
}
