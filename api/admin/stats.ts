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
    return res.status(401).json({ error: 'Não autorizado.' })
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

  const secret =
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    (dbUrl ? `derived_secret_${dbUrl.slice(0, 24)}` : 'bluebolt_session_secret')

  try {
    const payload = jwt.verify(token, secret) as any
    if (!payload || payload.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso reservado exclusivamente a administradores.' })
    }

    const sql = neon(dbUrl)

    const usersResult = await sql`SELECT COUNT(*)::int as count FROM public.profiles`
    const totalUsers = (usersResult[0] as any)?.count || 0

    const projectsResult = await sql`SELECT COUNT(*)::int as count FROM public.projects`
    const totalProjects = (projectsResult[0] as any)?.count || 0

    const approvedResult = await sql`
      SELECT COUNT(*)::int as count FROM public.projects WHERE status IN ('approved', 'delivered')
    `
    const approvedProjects = (approvedResult[0] as any)?.count || 0

    return res.status(200).json({
      totalUsers,
      totalProjects,
      approvedProjects,
    })
  } catch {
    return res.status(500).json({ error: 'Erro ao calcular métricas de administração.' })
  }
}
