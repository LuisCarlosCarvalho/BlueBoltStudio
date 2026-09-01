import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './_lib/db'
import { hashPassword } from './_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sql = getDb()

    // 1. Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `

    // 2. Create profiles table
    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT,
        avatar_url TEXT,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `

    // 3. Create projects table
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
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
        created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
        assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
        selected_template_id UUID,
        brand_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        briefing_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        page_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `

    // 4. Create project_members table
    await sql`
      CREATE TABLE IF NOT EXISTS project_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        access_level TEXT NOT NULL DEFAULT 'editor' CHECK (access_level IN ('owner', 'editor', 'viewer')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
      );
    `

    // 5. Create performance indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);`
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_assigned_to ON projects(assigned_to);`
    await sql`CREATE INDEX IF NOT EXISTS idx_project_members_lookup ON project_members(project_id, user_id);`
    await sql`CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);`

    // Check if an initial admin user exists, if not create default admin
    const existingAdmins = await sql`
      SELECT u.id FROM users u
      JOIN profiles p ON p.id = u.id
      WHERE p.role = 'admin'
      LIMIT 1
    `

    let initialAdminCreated = false
    if (existingAdmins.length === 0) {
      const defaultAdminEmail = 'admin@bluebolt.pt'
      const defaultPassword = 'BlueBoltAdmin2026!'
      const hashedPassword = await hashPassword(defaultPassword)

      const insertedUsers = await sql`
        INSERT INTO users (email, password_hash)
        VALUES (${defaultAdminEmail}, ${hashedPassword})
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
        RETURNING id
      `

      if (insertedUsers.length > 0) {
        const adminId = insertedUsers[0].id
        await sql`
          INSERT INTO profiles (id, full_name, role)
          VALUES (${adminId}, 'Administrador Blue Bolt', 'admin')
          ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = EXCLUDED.full_name
        `
        initialAdminCreated = true
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Base de dados Neon inicializada com sucesso!',
      initialAdminCreated,
      defaultAdminEmail: initialAdminCreated ? 'admin@bluebolt.pt' : undefined,
    })
  } catch (err: unknown) {
    console.error('Error initializing database schema:', err)
    const message = err instanceof Error ? err.message : 'Unknown database error'
    return res.status(500).json({
      success: false,
      error: 'Erro ao inicializar base de dados Neon: ' + message,
    })
  }
}
