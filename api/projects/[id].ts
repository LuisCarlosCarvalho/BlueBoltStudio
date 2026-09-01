import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_lib/db'
import { getAuthUser } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return res.status(401).json({ error: 'Não autorizado. Inicie sessão para continuar.' })
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID de projeto inválido.' })
  }

  const sql = getDb()

  // GET: Fetch project detail
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT p.*, prof.full_name as creator_name
        FROM projects p
        LEFT JOIN profiles prof ON prof.id = p.created_by
        WHERE p.id = ${id}
        LIMIT 1
      `

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado.' })
      }

      const project = rows[0]

      // Permission check: admin or associated member
      if (authUser.role !== 'admin' && project.created_by !== authUser.id && project.assigned_to !== authUser.id) {
        const memberCheck = await sql`
          SELECT 1 FROM project_members WHERE project_id = ${id} AND user_id = ${authUser.id} LIMIT 1
        `
        if (memberCheck.length === 0) {
          return res.status(403).json({ error: 'Não tem permissão para aceder a este projeto.' })
        }
      }

      return res.status(200).json(project)
    } catch (err: unknown) {
      console.error('Error fetching project detail:', err)
      const message = err instanceof Error ? err.message : 'Database error'
      return res.status(500).json({ error: 'Erro ao obter detalhes do projeto: ' + message })
    }
  }

  // PATCH: Update project
  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const existing = await sql`SELECT * FROM projects WHERE id = ${id} LIMIT 1`
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado.' })
      }

      const current = existing[0]

      // Permission check
      if (authUser.role !== 'admin' && current.created_by !== authUser.id && current.assigned_to !== authUser.id) {
        const memberCheck = await sql`
          SELECT 1 FROM project_members
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
        UPDATE projects
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
    } catch (err: unknown) {
      console.error('Error updating project:', err)
      const message = err instanceof Error ? err.message : 'Database error'
      return res.status(500).json({ error: 'Erro ao atualizar projeto: ' + message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
