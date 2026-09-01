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
  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de template inválido.' })
  }

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

  // GET: Admin template details with versions history
  if (req.method === 'GET') {
    try {
      const templateRows = await sql`
        SELECT * FROM public.templates WHERE id = ${id} LIMIT 1
      `
      if (templateRows.length === 0) {
        return res.status(404).json({ error: 'Template não encontrado.' })
      }

      const versionRows = await sql`
        SELECT * FROM public.template_versions
        WHERE template_id = ${id}
        ORDER BY version DESC
      `

      return res.status(200).json({
        template: templateRows[0],
        versions: versionRows,
      })
    } catch {
      return res.status(500).json({ error: 'Erro ao carregar detalhes do template.' })
    }
  }

  // PATCH: Update template metadata and/or schema
  if (req.method === 'PATCH' || req.method === 'PUT') {
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
      const existing = await sql`SELECT * FROM public.templates WHERE id = ${id} LIMIT 1`
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Template não encontrado.' })
      }

      const current = existing[0] as any

      if (slug && slug !== current.slug) {
        const slugCheck = await sql`SELECT id FROM public.templates WHERE slug = ${slug} AND id != ${id} LIMIT 1`
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
        WHERE id = ${id}
        RETURNING *
      `

      // If schema changed, record a new immutable version
      if (isSchemaChanged) {
        const maxVerResult = await sql`
          SELECT COALESCE(MAX(version), 1)::int as max_ver FROM public.template_versions WHERE template_id = ${id}
        `
        const nextVersion = ((maxVerResult[0] as any)?.max_ver || 1) + 1

        await sql`
          INSERT INTO public.template_versions (
            template_id,
            version,
            schema,
            change_note,
            created_by
          ) VALUES (
            ${id},
            ${nextVersion},
            ${updatedSchema}::jsonb,
            ${change_note || 'Atualização de esquema pelo administrador.'},
            ${authUser.id}
          )
        `
      }

      return res.status(200).json(updated[0])
    } catch {
      return res.status(500).json({ error: 'Erro ao atualizar o template.' })
    }
  }

  if (res.setHeader) res.setHeader('Allow', ['GET', 'PATCH', 'PUT'])
  return res.status(405).json({ error: 'Método não permitido.' })
}
