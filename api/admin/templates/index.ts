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
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.postgres_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    ''

  if (!dbUrl) {
    return res.status(500).json({ error: 'Base de dados não configurada.' })
  }

  const authUser = await getAuthUserFromRequest(req, dbUrl)
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso reservado exclusivamente a administradores.' })
  }

  const sql = neon(dbUrl)

  // GET: List all templates (active, draft, archived) with version counts
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT 
          t.*,
          COALESCE((SELECT COUNT(*)::int FROM public.template_versions tv WHERE tv.template_id = t.id), 1) as version_count
        FROM public.templates t
        ORDER BY t.created_at DESC
      `
      return res.status(200).json(rows)
    } catch {
      return res.status(500).json({ error: 'Erro ao listar templates de administração.' })
    }
  }

  // POST: Create a new template with validated JSON schema and version 1
  if (req.method === 'POST') {
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
      // Check unique slug
      const existing = await sql`SELECT id FROM public.templates WHERE slug = ${slug} LIMIT 1`
      if (existing.length > 0) {
        return res.status(409).json({ error: `Já existe um template registado com o slug '${slug}'.` })
      }

      const inserted = await sql`
        INSERT INTO public.templates (
          name,
          slug,
          category,
          description,
          preview_image_url,
          status,
          schema,
          created_by
        ) VALUES (
          ${name},
          ${slug},
          ${category},
          ${description || null},
          ${preview_image_url || null},
          ${status},
          ${JSON.stringify(schema)},
          ${authUser.id}
        )
        RETURNING *
      `

      const createdTemplate = inserted[0] as any

      // Create version 1 record
      await sql`
        INSERT INTO public.template_versions (
          template_id,
          version,
          schema,
          change_note,
          created_by
        ) VALUES (
          ${createdTemplate.id},
          1,
          ${JSON.stringify(schema)},
          'Versão inicial criada pelo administrador.',
          ${authUser.id}
        )
      `

      return res.status(201).json(createdTemplate)
    } catch {
      return res.status(500).json({ error: 'Erro ao registar o novo template no sistema.' })
    }
  }

  if (res.setHeader) res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Método não permitido.' })
}
