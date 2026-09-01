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
    return res.status(401).json({ error: 'Não autorizado. Inicie sessão para continuar.' })
  }

  const sql = neon(dbUrl)

  // GET: List projects
  if (req.method === 'GET') {
    try {
      let rows
      if (authUser.role === 'admin') {
        rows = await sql`
          SELECT p.*, prof.full_name as creator_name
          FROM public.projects p
          LEFT JOIN public.profiles prof ON prof.id = p.created_by
          ORDER BY p.created_at DESC
        `
      } else {
        rows = await sql`
          SELECT p.*, prof.full_name as creator_name
          FROM public.projects p
          LEFT JOIN public.profiles prof ON prof.id = p.created_by
          WHERE p.created_by = ${authUser.id}
             OR p.assigned_to = ${authUser.id}
             OR EXISTS (
                SELECT 1 FROM public.project_members pm
                WHERE pm.project_id = p.id AND pm.user_id = ${authUser.id}
             )
          ORDER BY p.created_at DESC
        `
      }

      return res.status(200).json(rows)
    } catch {
      return res.status(500).json({ error: 'Erro ao obter projetos.' })
    }
  }

  // POST: Create project
  if (req.method === 'POST') {
    const { name, client_name, client_business, briefing_data, brand_data, page_data } = req.body || {}

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'O nome do projeto é obrigatório.' })
    }

    try {
      const inserted = await sql`
        INSERT INTO public.projects (
          name,
          client_name,
          client_business,
          status,
          created_by,
          briefing_data,
          brand_data,
          page_data
        ) VALUES (
          ${name},
          ${client_name || null},
          ${client_business || null},
          'briefing',
          ${authUser.id},
          ${JSON.stringify(briefing_data || {})},
          ${JSON.stringify(brand_data || {})},
          ${JSON.stringify(page_data || {})}
        )
        RETURNING *
      `

      return res.status(201).json(inserted[0])
    } catch {
      return res.status(500).json({ error: 'Erro ao guardar o projeto.' })
    }
  }

  if (res.setHeader) res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Método não permitido.' })
}
