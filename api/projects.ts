import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'

const AUTH_COOKIE_NAME = 'bluebolt_session'

const getDbUrl = (): string => {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.postgres_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  )
}

const getJwtSecret = (dbUrl: string): string => {
  return (
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    (dbUrl ? `derived_secret_${dbUrl.slice(0, 24)}` : 'bluebolt_session_secret')
  )
}

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

  const secret = getJwtSecret(dbUrl)

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
  const dbUrl = getDbUrl()
  if (!dbUrl) {
    return res.status(500).json({ error: 'Base de dados não configurada.' })
  }

  const authUser = await getAuthUserFromRequest(req, dbUrl)
  if (!authUser) {
    return res.status(401).json({ error: 'Não autorizado. Inicie sessão para continuar.' })
  }

  const sql = neon(dbUrl)

  const url = req.url || ''
  const cleanUrl = url.split('?')[0]
  const subPath = cleanUrl.replace(/^\/api\/projects\/?/, '').trim()

  // 1. /api/projects/template (assign template)
  if (subPath === 'template' || subPath.endsWith('/template')) {
    if (req.method !== 'PATCH' && req.method !== 'PUT' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido.' })
    }

    const { project_id, template_id, id } = req.body || {}
    const targetProjectId = project_id || id || req.query?.projectId || req.query?.id

    if (!targetProjectId || !template_id) {
      return res.status(400).json({ error: 'ID de projeto e ID de template são obrigatórios.' })
    }

    try {
      const projectRows = await sql`SELECT * FROM public.projects WHERE id = ${targetProjectId} LIMIT 1`
      if (projectRows.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado.' })
      }

      const project = projectRows[0] as any
      if (authUser.role !== 'admin' && project.created_by !== authUser.id && project.assigned_to !== authUser.id) {
        const memberCheck = await sql`
          SELECT 1 FROM public.project_members
          WHERE project_id = ${targetProjectId} AND user_id = ${authUser.id} AND access_level IN ('owner', 'editor')
          LIMIT 1
        `
        if (memberCheck.length === 0) {
          return res.status(403).json({ error: 'Não tem permissão para alterar o template deste projeto.' })
        }
      }

      const templateRows = await sql`SELECT * FROM public.templates WHERE id = ${template_id} LIMIT 1`
      if (templateRows.length === 0) {
        return res.status(404).json({ error: 'Template não encontrado.' })
      }

      const template = templateRows[0] as any
      if (template.status !== 'active') {
        return res.status(400).json({ error: 'O template selecionado não se encontra ativo.' })
      }

      const verRows = await sql`
        SELECT COALESCE(MAX(version), 1)::int as ver FROM public.template_versions WHERE template_id = ${template_id}
      `
      const latestVersion = (verRows[0] as any)?.ver || 1

      const currentBrandData = project.brand_data || {}
      const updatedBrandData = {
        ...currentBrandData,
        selected_template_id: template.id,
        selected_template_name: template.name,
        selected_template_slug: template.slug,
        selected_template_category: template.category,
        selected_template_version: latestVersion,
        template_assigned_at: new Date().toISOString(),
        template_assigned_by: authUser.id,
      }

      const updatedRows = await sql`
        UPDATE public.projects
        SET
          selected_template_id = ${template.id},
          brand_data = ${JSON.stringify(updatedBrandData)}::jsonb,
          updated_at = NOW()
        WHERE id = ${targetProjectId}
        RETURNING *
      `

      return res.status(200).json({
        project: updatedRows[0],
        template,
        message: `Template '${template.name}' associado com sucesso ao projeto.`,
      })
    } catch (err: any) {
      console.error('[API /api/projects/template] Database query error:', err?.message || err)
      return res.status(500).json({ error: 'Não foi possível associar o template ao projeto.' })
    }
  }

  // 2. /api/projects/content-sources
  if (subPath === 'content-sources' || subPath.endsWith('/content-sources')) {
    if (req.method === 'GET') {
      const targetProjectId = req.query?.projectId || req.query?.project_id || req.query?.id
      if (!targetProjectId) {
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
      } catch (err: any) {
        console.error('[API /api/projects/content-sources GET] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível listar as fontes de conteúdo.' })
      }
    }

    if (req.method === 'POST') {
      const { project_id, id, text, source_type = 'pasted_text', original_filename } = req.body || {}
      const targetProjectId = project_id || id || req.query?.projectId || req.query?.id

      if (!targetProjectId || !text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'ID de projeto e texto são obrigatórios.' })
      }

      if (text.length > 50000) {
        return res.status(400).json({ error: 'O texto excede o limite máximo permitido de 50.000 caracteres.' })
      }

      try {
        const inserted = await sql`
          INSERT INTO public.project_content_sources (
            project_id, source_type, original_filename, extracted_text, created_by
          ) VALUES (
            ${targetProjectId}, ${source_type}, ${original_filename || null}, ${text.trim()}, ${authUser.id}
          )
          RETURNING *
        `

        return res.status(201).json({
          source: inserted[0],
          message: 'Conteúdo do cliente guardado com sucesso no projeto.',
        })
      } catch (err: any) {
        console.error('[API /api/projects/content-sources POST] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível guardar a fonte de conteúdo.' })
      }
    }
  }

  // 3. /api/projects/:id (details or update)
  if (subPath && subPath !== '') {
    const projectId = subPath

    // 3.1 GET /api/projects/:id
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

        const project = rows[0] as any

        if (authUser.role !== 'admin' && project.created_by !== authUser.id && project.assigned_to !== authUser.id) {
          const memberCheck = await sql`
            SELECT 1 FROM public.project_members WHERE project_id = ${projectId} AND user_id = ${authUser.id} LIMIT 1
          `
          if (memberCheck.length === 0) {
            return res.status(403).json({ error: 'Não tem permissão para aceder a este projeto.' })
          }
        }

        return res.status(200).json(project)
      } catch (err: any) {
        console.error('[API /api/projects/:id GET] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível carregar o projeto.' })
      }
    }

    // 3.2 PATCH /api/projects/:id
    if (req.method === 'PATCH' || req.method === 'PUT') {
      try {
        const existing = await sql`SELECT * FROM public.projects WHERE id = ${projectId} LIMIT 1`
        if (existing.length === 0) {
          return res.status(404).json({ error: 'Projeto não encontrado.' })
        }

        const current = existing[0] as any

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
          WHERE id = ${projectId}
          RETURNING *
        `

        return res.status(200).json(updated[0])
      } catch (err: any) {
        console.error('[API /api/projects/:id PATCH] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível atualizar o projeto.' })
      }
    }
  }

  // 4. /api/projects (list or create)
  if (!subPath || subPath === '') {
    // 4.1 GET /api/projects
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
      } catch (err: any) {
        console.error('[API /api/projects GET] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível listar os projetos.' })
      }
    }

    // 4.2 POST /api/projects
    if (req.method === 'POST') {
      const { name, client_name, client_business, briefing_data, brand_data, page_data } = req.body || {}

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'O nome do projeto é obrigatório.' })
      }

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
            ${JSON.stringify(briefing_data || {})},
            ${JSON.stringify(brand_data || {})},
            ${JSON.stringify(page_data || {})}
          )
          RETURNING *
        `

        return res.status(201).json(inserted[0])
      } catch (err: any) {
        console.error('[API /api/projects POST] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível registar o projeto.' })
      }
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' })
}
