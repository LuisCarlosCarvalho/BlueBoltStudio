-- Migration 006: Project Brand Identity & Versioning
-- Created for Blue Bolt Page Studio (Phase 4)

-- 1. Table for current active brand identity per project
CREATE TABLE IF NOT EXISTS public.project_brand_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
    active_version INT NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'applied')),
    brand_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table for immutable version history per project
CREATE TABLE IF NOT EXISTS public.project_brand_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    version INT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'applied')),
    brand_data JSONB NOT NULL,
    change_summary TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_project_brand_version UNIQUE (project_id, version)
);

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_brand_kits_project ON public.project_brand_kits(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_versions_project ON public.project_brand_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_versions_lookup ON public.project_brand_versions(project_id, version DESC);
