import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'

const AUTH_COOKIE_NAME = 'bluebolt_session'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    if (res.setHeader) res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

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

  if (!token) {
    return res.status(401).json({ error: 'Sessão não encontrada.' })
  }

  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.postgres_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    ''

  const secret =
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    (dbUrl ? `derived_secret_${dbUrl.slice(0, 24)}` : 'bluebolt_session_secret')

  let payload: any = null
  try {
    payload = jwt.verify(token, secret)
  } catch {
    return res.status(401).json({ error: 'Sessão expirada ou inválida.' })
  }

  if (!payload || !payload.userId || !dbUrl) {
    return res.status(401).json({ error: 'Sessão inválida.' })
  }

  try {
    const sql = neon(dbUrl)
    const rows = await sql`
      SELECT u.id, u.email, p.role, p.full_name, p.avatar_url
      FROM public.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE u.id = ${payload.userId}
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Utilizador não encontrado.' })
    }

    const row = rows[0] as any
    return res.status(200).json({
      user: {
        id: row.id,
        email: row.email,
      },
      profile: {
        id: row.id,
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        role: row.role || 'user',
      },
    })
  } catch {
    return res.status(500).json({ error: 'Erro ao validar sessão.' })
  }
}
