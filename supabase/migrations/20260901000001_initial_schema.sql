-- ==============================================================================
-- Blue Bolt Page Studio - Database Schema & Row Level Security (RLS)
-- Migration: 20260901000001_initial_schema.sql
-- ==============================================================================

-- 1. Helper function: updated_at auto-updater
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for profiles.updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. Security Definer Helper: Check if a user is an administrator
-- Using SECURITY DEFINER prevents infinite RLS recursion loops during policy evaluation.
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = user_id
          AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Table: projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client_name TEXT,
    client_business TEXT,
    status TEXT NOT NULL DEFAULT 'briefing' CHECK (
        status IN (
            'briefing',
            'building',
            'internal_review',
            'client_review',
            'approved',
            'changes_requested',
            'delivered'
        )
    ),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    selected_template_id UUID,
    brand_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    briefing_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    page_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for projects.updated_at
DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Table: project_members
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    access_level TEXT NOT NULL DEFAULT 'editor' CHECK (access_level IN ('owner', 'editor', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);

-- 6. Trigger to automatically create profile entry when a new auth.user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        'user' -- Always default to 'user'; admin promotion must be done manually/securely
    )
    ON CONFLICT (id) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------

-- Admins have full access to view, insert, update, and delete profiles
CREATE POLICY "admins_manage_all_profiles"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Users can view their own profile
CREATE POLICY "users_view_own_profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Users can view profiles of teammates on mutual projects
CREATE POLICY "users_view_collaborator_profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE (p.created_by = auth.uid() OR p.assigned_to = auth.uid())
              AND (profiles.id = p.created_by OR profiles.id = p.assigned_to)
        )
        OR EXISTS (
            SELECT 1
            FROM public.project_members pm1
            JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
            WHERE pm1.user_id = auth.uid()
              AND pm2.user_id = profiles.id
        )
    );

-- Users can update their own profile, but cannot elevate their role to admin
CREATE POLICY "users_update_own_profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    );

-- ------------------------------------------------------------------------------
-- PROJECTS POLICIES
-- ------------------------------------------------------------------------------

-- Admins can manage all projects
CREATE POLICY "admins_manage_all_projects"
    ON public.projects
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Users can view projects they created, are assigned to, or are members of
CREATE POLICY "users_view_assigned_projects"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = projects.id
              AND user_id = auth.uid()
        )
    );

-- Users can create new projects where they are the creator
CREATE POLICY "users_insert_own_projects"
    ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

-- Users can update projects they created, are assigned to, or are editors/owners of
CREATE POLICY "users_update_assigned_projects"
    ON public.projects
    FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = projects.id
              AND user_id = auth.uid()
              AND access_level IN ('owner', 'editor')
        )
    )
    WITH CHECK (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.project_members
            WHERE project_id = projects.id
              AND user_id = auth.uid()
              AND access_level IN ('owner', 'editor')
        )
    );

-- Users can delete only projects they created
CREATE POLICY "users_delete_own_projects"
    ON public.projects
    FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());

-- ------------------------------------------------------------------------------
-- PROJECT_MEMBERS POLICIES
-- ------------------------------------------------------------------------------

-- Admins can manage all project members
CREATE POLICY "admins_manage_all_members"
    ON public.project_members
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Members can view team membership for projects they have access to
CREATE POLICY "users_view_project_members"
    ON public.project_members
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id
              AND (p.created_by = auth.uid() OR p.assigned_to = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id
              AND pm.user_id = auth.uid()
        )
    );

-- Project owners can manage members in their projects
CREATE POLICY "owners_manage_project_members"
    ON public.project_members
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id
              AND p.created_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id
              AND pm.user_id = auth.uid()
              AND pm.access_level = 'owner'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id
              AND p.created_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id
              AND pm.user_id = auth.uid()
              AND pm.access_level = 'owner'
        )
    );
