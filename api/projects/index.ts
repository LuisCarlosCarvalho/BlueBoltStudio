import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_lib/db'
import { getAuthUser } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return res.status(401).json({ error: 'Não autorizado. Inicie sessão para continuar.' })
  }

  const sql = getDb()

  // GET: List projects with authorization checks
  if (req.method === 'GET') {
    try {
      let rows
      if (authUser.role === 'admin') {
        rows = await sql`
          SELECT p.*, prof.full_name as creator_name
          FROM projects p
          LEFT JOIN profiles prof ON prof.id = p.created_by
          ORDER BY p.created_at DESC
        `
      } else {
        rows = await sql`
          SELECT p.*, prof.full_name as creator_name
          FROM projects p
          LEFT JOIN profiles prof ON prof.id = p.created_by
          WHERE p.created_by = ${authUser.id}
             OR p.assigned_to = ${authUser.id}
             OR EXISTS (
                SELECT 1 FROM project_members pm
                WHERE pm.project_id = p.id AND pm.user_id = ${authUser.id}
             )
          ORDER BY p.created_at DESC
        `
      }

      return res.status(200).json(rows)
    } catch (err: unknown) {
      console.error('Error fetching projects:', err)
      const message = err instanceof Error ? err.message : 'Database error'
      return res.status(500).json({ error: 'Erro ao obter projetos: ' + message })
    }
  }

  // POST: Create a new project
  if (req.method === 'POST') {
    const { name, client_name, client_business, briefing_data, brand_data, page_data } = req.body || {}

    if (!name) {
      return res.status(400).json({ error: 'O nome do projeto é obrigatório.' })
    }

    try {
      const inserted = await sql`
        INSERT INTO projects (
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
    } catch (err: unknown) {
      console.error('Error creating project:', err)
      const message = err instanceof Error ? err.message : 'Database error'
      return res.status(500).json({ error: 'Erro ao criar projeto: ' + message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
