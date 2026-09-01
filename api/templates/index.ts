import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'

const AUTH_COOKIE_NAME = 'bluebolt_session'

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
  if (req.method !== 'GET') {
    if (res.setHeader) res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Método não permitido.' })
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
  if (!authUser) {
    return res.status(401).json({ error: 'Não autorizado. Inicie sessão para aceder aos templates.' })
  }

  const { category, search } = req.query || {}

  try {
    const sql = neon(dbUrl)

    let rows
    const searchFilter = typeof search === 'string' && search.trim() ? `%${search.trim().toLowerCase()}%` : null
    const categoryFilter = typeof category === 'string' && category.trim() && category !== 'all' ? category.trim() : null

    if (searchFilter && categoryFilter) {
      rows = await sql`
        SELECT id, name, slug, category, description, preview_image_url, schema, status, created_at, updated_at
        FROM public.templates
        WHERE status = 'active'
          AND category = ${categoryFilter}
          AND (LOWER(name) LIKE ${searchFilter} OR LOWER(description) LIKE ${searchFilter})
        ORDER BY name ASC
      `
    } else if (searchFilter) {
      rows = await sql`
        SELECT id, name, slug, category, description, preview_image_url, schema, status, created_at, updated_at
        FROM public.templates
        WHERE status = 'active'
          AND (LOWER(name) LIKE ${searchFilter} OR LOWER(description) LIKE ${searchFilter} OR LOWER(category) LIKE ${searchFilter})
        ORDER BY name ASC
      `
    } else if (categoryFilter) {
      rows = await sql`
        SELECT id, name, slug, category, description, preview_image_url, schema, status, created_at, updated_at
        FROM public.templates
        WHERE status = 'active'
          AND category = ${categoryFilter}
        ORDER BY name ASC
      `
    } else {
      rows = await sql`
        SELECT id, name, slug, category, description, preview_image_url, schema, status, created_at, updated_at
        FROM public.templates
        WHERE status = 'active'
        ORDER BY name ASC
      `
    }

    return res.status(200).json(rows)
  } catch {
    return res.status(500).json({ error: 'Erro ao listar templates.' })
  }
}
