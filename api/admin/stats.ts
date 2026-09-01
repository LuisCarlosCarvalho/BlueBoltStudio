import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_lib/db'
import { getAuthUser } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  const authUser = await getAuthUser(req)
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso reservado exclusivamente a administradores.' })
  }

  try {
    const sql = getDb()

    // 1. Total users
    const usersResult = await sql`SELECT COUNT(*)::int as count FROM public.profiles`
    const totalUsers = usersResult[0]?.count || 0

    // 2. Total projects
    const projectsResult = await sql`SELECT COUNT(*)::int as count FROM public.projects`
    const totalProjects = projectsResult[0]?.count || 0

    // 3. Approved projects
    const approvedResult = await sql`
      SELECT COUNT(*)::int as count FROM public.projects WHERE status IN ('approved', 'delivered')
    `
    const approvedProjects = approvedResult[0]?.count || 0

    return res.status(200).json({
      totalUsers,
      totalProjects,
      approvedProjects,
    })
  } catch {
    return res.status(500).json({ error: 'Erro ao calcular métricas de administração.' })
  }
}
