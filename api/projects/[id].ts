import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getDb } from '../_lib/db'
import { getAuthUser, validateCsrf } from '../_lib/auth'

const uuidSchema = z.string().uuid()

const updateProjectSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  client_name: z.string().min(2).max(100).optional().nullable(),
  client_business: z.string().min(2).max(100).optional().nullable(),
  status: z
    .enum([
      'briefing',
      'building',
      'internal_review',
      'client_review',
      'approved',
      'changes_requested',
      'delivered',
    ])
    .optional(),
  briefing_data: z.record(z.string(), z.unknown()).optional(),
  brand_data: z.record(z.string(), z.unknown()).optional(),
  page_data: z.record(z.string(), z.unknown()).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return res.status(401).json({ error: 'Não autorizado. Inicie sessão para continuar.' })
  }

  const { id } = req.query
  const idValidation = uuidSchema.safeParse(id)
  if (!idValidation.success) {
    return res.status(400).json({ error: 'Identificador de projeto inválido.' })
  }

  const projectId = idValidation.data
  const sql = getDb()

  // GET: Fetch project detail
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT p.*, prof.full_name as creator_name
        FROM public.projects p
        LEFT JOIN public.profiles prof ON prof.id = p.created_by
        WHERE p.id = ${projectId}
        LIMIT 1
      `

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado.' })
      }

      const project = rows[0]

      // Permission check: admin or associated member
      if (authUser.role !== 'admin' && project.created_by !== authUser.id && project.assigned_to !== authUser.id) {
        const memberCheck = await sql`
          SELECT 1 FROM public.project_members WHERE project_id = ${projectId} AND user_id = ${authUser.id} LIMIT 1
        `
        if (memberCheck.length === 0) {
          return res.status(403).json({ error: 'Não tem permissão para aceder a este projeto.' })
        }
      }

      return res.status(200).json(project)
    } catch {
      return res.status(500).json({ error: 'Erro ao obter detalhes do projeto.' })
    }
  }

  // PATCH: Update project
  if (req.method === 'PATCH' || req.method === 'PUT') {
    if (!validateCsrf(req)) {
      return res.status(403).json({ error: 'Origem da requisição inválida.' })
    }

    const parseResult = updateProjectSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Dados de atualização inválidos.' })
    }

    try {
      const existing = await sql`SELECT * FROM public.projects WHERE id = ${projectId} LIMIT 1`
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado.' })
      }

      const current = existing[0]

      // Permission check
      if (authUser.role !== 'admin' && current.created_by !== authUser.id && current.assigned_to !== authUser.id) {
        const memberCheck = await sql`
          SELECT 1 FROM public.project_members
          WHERE project_id = ${projectId} AND user_id = ${authUser.id} AND access_level IN ('owner', 'editor')
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
      } = parseResult.data

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
        WHERE id = ${projectId}
        RETURNING *
      `

      return res.status(200).json(updated[0])
    } catch {
      return res.status(500).json({ error: 'Erro ao atualizar o projeto.' })
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'PUT'])
  return res.status(405).json({ error: 'Método não permitido.' })
}
