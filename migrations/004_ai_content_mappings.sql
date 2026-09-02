-- Migration 004: AI Content Mappings (Phase 3)
-- Armazena o histórico e as sugestões de mapeamento geradas por Inteligência Artificial
-- para as secções e campos estruturados dos templates de landing page.

CREATE TABLE IF NOT EXISTS public.project_ai_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content_source_id UUID NOT NULL REFERENCES public.project_content_sources(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates(id),
  template_version INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'discarded')),
  mapping JSONB NOT NULL,
  model TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Índices de consulta otimizada
CREATE INDEX IF NOT EXISTS idx_project_ai_mappings_project ON public.project_ai_mappings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_ai_mappings_content_source ON public.project_ai_mappings(content_source_id);
CREATE INDEX IF NOT EXISTS idx_project_ai_mappings_status ON public.project_ai_mappings(status);
