-- Migration 007: Páginas do Projeto, Histórico de Revisões Imutáveis e Garantia de Home Única

CREATE TABLE IF NOT EXISTS public.project_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    is_home BOOLEAN DEFAULT FALSE,
    page_tree JSONB NOT NULL DEFAULT '{"nodes": []}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_project_page_slug UNIQUE (project_id, slug)
);

-- Garantia na base de dados: No máximo 1 página Home por projeto
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_project_home_page 
ON public.project_pages (project_id) 
WHERE is_home = true;

-- Tabela de Histórico de Revisões Imutáveis
CREATE TABLE IF NOT EXISTS public.project_page_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES public.project_pages(id) ON DELETE CASCADE,
    revision_number INT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'published')),
    page_tree JSONB NOT NULL,
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('initial_import', 'inspector_edit', 'ai_patch_apply', 'node_reorder', 'version_restore', 'publish')),
    change_summary TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_page_revision_number UNIQUE (page_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_project_pages_project ON public.project_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_page_revisions_lookup ON public.project_page_revisions(page_id, revision_number DESC);
