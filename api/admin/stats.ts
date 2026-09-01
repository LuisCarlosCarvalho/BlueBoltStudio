import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_lib/db'
import { getAuthUser } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authUser = await getAuthUser(req)
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso reservado exclusivamente a administradores.' })
  }

  try {
    const sql = getDb()

    // 1. Total users
    const usersResult = await sql`SELECT COUNT(*)::int as count FROM profiles`
    const totalUsers = usersResult[0]?.count || 0

    // 2. Total projects
    const projectsResult = await sql`SELECT COUNT(*)::int as count FROM projects`
    const totalProjects = projectsResult[0]?.count || 0

    // 3. Approved projects
    const approvedResult = await sql`
      SELECT COUNT(*)::int as count FROM projects WHERE status IN ('approved', 'delivered')
    `
    const approvedProjects = approvedResult[0]?.count || 0

    return res.status(200).json({
      totalUsers,
      totalProjects,
      approvedProjects,
    })
  } catch (err: unknown) {
    console.error('Error fetching admin statistics:', err)
    const message = err instanceof Error ? err.message : 'Database error'
    return res.status(500).json({ error: 'Erro ao calcular métricas: ' + message })
  }
}
