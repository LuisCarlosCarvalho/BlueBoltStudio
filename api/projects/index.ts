import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getDb } from '../_lib/db'
import { getAuthUser, validateCsrf } from '../_lib/auth'

const createProjectSchema = z.object({
  name: z.string().min(3).max(100),
  client_name: z.string().min(2).max(100).optional().nullable(),
  client_business: z.string().min(2).max(100).optional().nullable(),
  briefing_data: z.record(z.string(), z.unknown()).default({}),
  brand_data: z.record(z.string(), z.unknown()).default({}),
  page_data: z.record(z.string(), z.unknown()).default({}),
})

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

  // POST: Create a new project
  if (req.method === 'POST') {
    if (!validateCsrf(req)) {
      return res.status(403).json({ error: 'Origem da requisição inválida.' })
    }

    const parseResult = createProjectSchema.safeParse(req.body)
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Dados do projeto inválidos.' })
    }

    const { name, client_name, client_business, briefing_data, brand_data, page_data } = parseResult.data

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
          ${JSON.stringify(briefing_data)},
          ${JSON.stringify(brand_data)},
          ${JSON.stringify(page_data)}
        )
        RETURNING *
      `

      return res.status(201).json(inserted[0])
    } catch {
      return res.status(500).json({ error: 'Erro ao guardar o projeto.' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Método não permitido.' })
}
