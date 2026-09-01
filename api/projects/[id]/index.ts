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
  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de projeto inválido.' })
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
    return res.status(401).json({ error: 'Não autorizado. Inicie sessão para continuar.' })
  }

  const sql = neon(dbUrl)

  // GET: Project details
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT p.*, prof.full_name as creator_name
        FROM public.projects p
        LEFT JOIN public.profiles prof ON prof.id = p.created_by
        WHERE p.id = ${id}
        LIMIT 1
      `

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado.' })
      }

      const project = rows[0] as any

      if (authUser.role !== 'admin' && project.created_by !== authUser.id && project.assigned_to !== authUser.id) {
        const memberCheck = await sql`
          SELECT 1 FROM public.project_members WHERE project_id = ${id} AND user_id = ${authUser.id} LIMIT 1
        `
        if (memberCheck.length === 0) {
          return res.status(403).json({ error: 'Não tem permissão para aceder a este projeto.' })
        }
      }

      return res.status(200).json(project)
    } catch {
      return res.status(500).json({ error: 'Erro ao obter projeto.' })
    }
  }

  // PATCH: Update project
  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const existing = await sql`SELECT * FROM public.projects WHERE id = ${id} LIMIT 1`
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado.' })
      }

      const current = existing[0] as any

      if (authUser.role !== 'admin' && current.created_by !== authUser.id && current.assigned_to !== authUser.id) {
        const memberCheck = await sql`
          SELECT 1 FROM public.project_members
          WHERE project_id = ${id} AND user_id = ${authUser.id} AND access_level IN ('owner', 'editor')
          LIMIT 1
        `
        if (memberCheck.length === 0) {
          return res.status(403).json({ error: 'Não tem permissão para editar este projeto.' })
        }
      }

      const {
        name,
        client_name,
        client_business,
        status,
        briefing_data,
        brand_data,
        page_data,
        assigned_to,
      } = req.body || {}

      const updatedName = name ?? current.name
      const updatedClientName = client_name !== undefined ? client_name : current.client_name
      const updatedClientBusiness = client_business !== undefined ? client_business : current.client_business
      const updatedStatus = status ?? current.status
      const updatedBriefing = briefing_data !== undefined ? JSON.stringify(briefing_data) : JSON.stringify(current.briefing_data)
      const updatedBrand = brand_data !== undefined ? JSON.stringify(brand_data) : JSON.stringify(current.brand_data)
      const updatedPage = page_data !== undefined ? JSON.stringify(page_data) : JSON.stringify(current.page_data)
      const updatedAssigned = assigned_to !== undefined ? assigned_to : current.assigned_to

      const updated = await sql`
        UPDATE public.projects
        SET
          name = ${updatedName},
          client_name = ${updatedClientName},
          client_business = ${updatedClientBusiness},
          status = ${updatedStatus},
          briefing_data = ${updatedBriefing},
          brand_data = ${updatedBrand},
          page_data = ${updatedPage},
          assigned_to = ${updatedAssigned},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `

      return res.status(200).json(updated[0])
    } catch {
      return res.status(500).json({ error: 'Erro ao atualizar o projeto.' })
    }
  }

  if (res.setHeader) res.setHeader('Allow', ['GET', 'PATCH', 'PUT'])
  return res.status(405).json({ error: 'Método não permitido.' })
}
