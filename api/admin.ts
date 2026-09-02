import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { z } from 'zod'

const AUTH_COOKIE_NAME = 'bluebolt_session'

const templateEditableFieldSchema = z.object({
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

const templateSectionSchema = z.object({
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

const templateDesignTokensSchema = z.object({
  colors: z.record(z.string(), z.string()).default({}),
  typography: z.record(z.string(), z.string()).default({}),
  spacing: z.record(z.string(), z.string()).optional(),
})

const templateSchemaValidator = z.object({
  schema_version: z.string().min(1).max(20).default('1.0.0'),
  template_name: z.string().min(2).max(120),
  category: z.string().min(2).max(60),
  design_tokens: templateDesignTokensSchema.default({ colors: {}, typography: {} }),
  sections: z.array(templateSectionSchema).min(1),
})

const templateCreateSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens.'),
  category: z.string().min(2).max(60),
  description: z.string().max(500).optional().nullable(),
  preview_image_url: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  schema: templateSchemaValidator,
})

const templateUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
  category: z.string().min(2).max(60).optional(),
  description: z.string().max(500).optional().nullable(),
  preview_image_url: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  schema: templateSchemaValidator.optional(),
  change_note: z.string().max(300).optional(),
})

const getDbUrl = (): string => {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.postgres_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  )
}

const getAuthUserFromRequest = async (req: any, dbUrl: string) => {
  const cookieHeader = req.headers['cookie']
  let token: string | null = null

  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map((c: string) => c.trim())
      .find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
    if (match) {
      token = match.substring(AUTH_COOKIE_NAME.length + 1)
    }
  }

  if (!token) {
    const authHeader = req.headers['authorization']
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim()
    }
  }

  if (!token) return null

  const secret =
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    (dbUrl ? `derived_secret_${dbUrl.slice(0, 24)}` : 'bluebolt_session_secret')

  try {
    const payload = jwt.verify(token, secret) as any
    if (!payload || !payload.userId) return null

    const sql = neon(dbUrl)
    const rows = await sql`
      SELECT u.id, u.email, p.role, p.full_name, p.avatar_url
      FROM public.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE u.id = ${payload.userId}
      LIMIT 1
    `

    if (!rows || rows.length === 0) return null
    const row = rows[0] as any
    return {
      id: row.id,
      email: row.email,
      role: row.role || 'user',
      full_name: row.full_name,
      avatar_url: row.avatar_url,
    }
  } catch {
    return null
  }
}

export default async function handler(req: any, res: any) {
  const dbUrl = getDbUrl()
  if (!dbUrl) {
    return res.status(500).json({ error: 'Base de dados não configurada.' })
  }

  const authUser = await getAuthUserFromRequest(req, dbUrl)
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso reservado exclusivamente a administradores.' })
  }

  const sql = neon(dbUrl)

  const url = req.url || ''
  const cleanUrl = url.split('?')[0]
  const subPath = cleanUrl.replace(/^\/api\/admin\/?/, '')

  // 1. GET /api/admin/stats
  if (subPath === 'stats' || subPath === 'stats/') {
    try {
      const stats = await sql`
        SELECT
          COUNT(*)::int as total_projects,
          COUNT(*) FILTER (WHERE status = 'briefing')::int as briefing_projects,
          COUNT(*) FILTER (WHERE status = 'building')::int as building_projects,
          COUNT(*) FILTER (WHERE status IN ('internal_review', 'client_review'))::int as review_projects,
          COUNT(*) FILTER (WHERE status = 'approved')::int as approved_projects,
          COUNT(*) FILTER (WHERE status = 'delivered')::int as delivered_projects,
          COUNT(*) FILTER (WHERE status = 'changes_requested')::int as changes_requested_projects
        FROM public.projects
      `

      const recentProjects = await sql`
        SELECT p.*, prof.full_name as creator_name
        FROM public.projects p
        LEFT JOIN public.profiles prof ON prof.id = p.created_by
        ORDER BY p.created_at DESC
        LIMIT 10
      `

      const row = stats[0] as any
      return res.status(200).json({
        stats: {
          totalProjects: row.total_projects || 0,
          briefingProjects: row.briefing_projects || 0,
          buildingProjects: row.building_projects || 0,
          reviewProjects: row.review_projects || 0,
          approvedProjects: row.approved_projects || 0,
          deliveredProjects: row.delivered_projects || 0,
          changesRequestedProjects: row.changes_requested_projects || 0,
        },
        recentProjects: recentProjects || [],
      })
    } catch (err: any) {
      console.error('[API /api/admin/stats] Database query error:', err?.message || err)
      return res.status(500).json({ error: 'Não foi possível carregar as estatísticas do painel.' })
    }
  }

  // 2. /api/admin/templates or /api/admin/templates/:id
  if (subPath.startsWith('templates')) {
    const templateId = subPath.replace(/^templates\/?/, '').trim()

    // 2.1 GET /api/admin/templates (list all)
    if (!templateId && req.method === 'GET') {
      try {
        const rows = await sql`
          SELECT 
            t.*,
            COALESCE((SELECT COUNT(*)::int FROM public.template_versions tv WHERE tv.template_id = t.id), 1) as version_count
          FROM public.templates t
          ORDER BY t.created_at DESC
        `
        return res.status(200).json(rows)
      } catch (err: any) {
        console.error('[API /api/admin/templates GET] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível listar os templates de administração.' })
      }
    }

    // 2.2 POST /api/admin/templates (create template)
    if (!templateId && req.method === 'POST') {
      const parseResult = templateCreateSchema.safeParse(req.body)
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ')
        return res.status(400).json({
          error: `Estrutura de template JSON inválida: ${issues}`,
          details: parseResult.error.issues,
        })
      }

      const { name, slug, category, description, preview_image_url, status, schema } = parseResult.data

      try {
        const existing = await sql`SELECT id FROM public.templates WHERE slug = ${slug} LIMIT 1`
        if (existing.length > 0) {
          return res.status(409).json({ error: `Já existe um template registado com o slug '${slug}'.` })
        }

        const inserted = await sql`
          INSERT INTO public.templates (
            name, slug, category, description, preview_image_url, status, schema, created_by
          ) VALUES (
            ${name}, ${slug}, ${category}, ${description || null}, ${preview_image_url || null}, ${status}, ${JSON.stringify(schema)}, ${authUser.id}
          )
          RETURNING *
        `

        const createdTemplate = inserted[0] as any

        await sql`
          INSERT INTO public.template_versions (
            template_id, version, schema, change_note, created_by
          ) VALUES (
            ${createdTemplate.id}, 1, ${JSON.stringify(schema)}, 'Versão inicial criada pelo administrador.', ${authUser.id}
          )
        `

        return res.status(201).json(createdTemplate)
      } catch (err: any) {
        console.error('[API /api/admin/templates POST] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível registar o novo template no sistema.' })
      }
    }

    // 2.3 GET /api/admin/templates/:id (details & versions)
    if (templateId && req.method === 'GET') {
      try {
        const templateRows = await sql`SELECT * FROM public.templates WHERE id = ${templateId} LIMIT 1`
        if (templateRows.length === 0) {
          return res.status(404).json({ error: 'Template não encontrado.' })
        }

        const versionRows = await sql`
          SELECT * FROM public.template_versions WHERE template_id = ${templateId} ORDER BY version DESC
        `

        return res.status(200).json({
          template: templateRows[0],
          versions: versionRows,
        })
      } catch (err: any) {
        console.error('[API /api/admin/templates/:id GET] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível carregar os detalhes do template.' })
      }
    }

    // 2.4 PATCH /api/admin/templates/:id (update & version increment)
    if (templateId && (req.method === 'PATCH' || req.method === 'PUT')) {
      const parseResult = templateUpdateSchema.safeParse(req.body)
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ')
        return res.status(400).json({
          error: `Dados de atualização inválidos: ${issues}`,
          details: parseResult.error.issues,
        })
      }

      const { name, slug, category, description, preview_image_url, status, schema, change_note } = parseResult.data

      try {
        const existing = await sql`SELECT * FROM public.templates WHERE id = ${templateId} LIMIT 1`
        if (existing.length === 0) {
          return res.status(404).json({ error: 'Template não encontrado.' })
        }

        const current = existing[0] as any

        if (slug && slug !== current.slug) {
          const slugCheck = await sql`SELECT id FROM public.templates WHERE slug = ${slug} AND id != ${templateId} LIMIT 1`
          if (slugCheck.length > 0) {
            return res.status(409).json({ error: `O slug '${slug}' já está a ser utilizado por outro template.` })
          }
        }

        const updatedName = name ?? current.name
        const updatedSlug = slug ?? current.slug
        const updatedCategory = category ?? current.category
        const updatedDescription = description !== undefined ? description : current.description
        const updatedPreview = preview_image_url !== undefined ? preview_image_url : current.preview_image_url
        const updatedStatus = status ?? current.status
        const isSchemaChanged = schema && JSON.stringify(schema) !== JSON.stringify(current.schema)
        const updatedSchema = schema ? JSON.stringify(schema) : JSON.stringify(current.schema)

        const updated = await sql`
          UPDATE public.templates
          SET
            name = ${updatedName},
            slug = ${updatedSlug},
            category = ${updatedCategory},
            description = ${updatedDescription},
            preview_image_url = ${updatedPreview},
            status = ${updatedStatus},
            schema = ${updatedSchema}::jsonb,
            updated_at = NOW()
          WHERE id = ${templateId}
          RETURNING *
        `

        if (isSchemaChanged) {
          const maxVerResult = await sql`
            SELECT COALESCE(MAX(version), 1)::int as max_ver FROM public.template_versions WHERE template_id = ${templateId}
          `
          const nextVersion = ((maxVerResult[0] as any)?.max_ver || 1) + 1

          await sql`
            INSERT INTO public.template_versions (
              template_id, version, schema, change_note, created_by
            ) VALUES (
              ${templateId}, ${nextVersion}, ${updatedSchema}::jsonb, ${change_note || 'Atualização de esquema pelo administrador.'}, ${authUser.id}
            )
          `
        }

        return res.status(200).json(updated[0])
      } catch (err: any) {
        console.error('[API /api/admin/templates/:id PATCH] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível atualizar o template.' })
      }
    }
  }

  return res.status(404).json({ error: 'Recurso administrativo não encontrado.' })
}
