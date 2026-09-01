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

  // GET: List content sources history
  if (req.method === 'GET') {
    const targetProjectId = req.query?.projectId || req.query?.project_id || req.query?.id
    if (!targetProjectId || typeof targetProjectId !== 'string') {
      return res.status(400).json({ error: 'ID de projeto obrigatório.' })
    }

    try {
      const sources = await sql`
        SELECT 
          pcs.*,
          prof.full_name as author_name,
          prof.role as author_role
        FROM public.project_content_sources pcs
        LEFT JOIN public.profiles prof ON prof.id = pcs.created_by
        WHERE pcs.project_id = ${targetProjectId}
        ORDER BY pcs.created_at DESC
      `
      return res.status(200).json(sources)
    } catch {
      return res.status(500).json({ error: 'Erro ao listar fontes de conteúdo.' })
    }
  }

  // POST: Store pasted text source (max 50,000 characters)
  if (req.method === 'POST') {
    const { project_id, id, text, source_type = 'pasted_text', original_filename } = req.body || {}
    const targetProjectId = project_id || id || req.query?.projectId || req.query?.id

    if (!targetProjectId || typeof targetProjectId !== 'string') {
      return res.status(400).json({ error: 'ID de projeto obrigatório.' })
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'O texto do conteúdo do cliente é obrigatório.' })
    }

    if (text.length > 50000) {
      return res.status(400).json({
        error: 'O texto excede o limite máximo permitido de 50.000 caracteres nesta fase.',
      })
    }

    try {
      const inserted = await sql`
        INSERT INTO public.project_content_sources (
          project_id,
          source_type,
          original_filename,
          extracted_text,
          created_by
        ) VALUES (
          ${targetProjectId},
          ${source_type},
          ${original_filename || null},
          ${text.trim()},
          ${authUser.id}
        )
        RETURNING *
      `

      return res.status(201).json({
        source: inserted[0],
        message: 'Conteúdo do cliente guardado com sucesso no projeto.',
      })
    } catch {
      return res.status(500).json({ error: 'Erro ao guardar fonte de conteúdo.' })
    }
  }

  if (res.setHeader) res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Método não permitido.' })
}
