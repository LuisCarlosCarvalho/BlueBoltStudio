import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { generateContentMappingWithGemini, recommendTemplateWithGemini, MissingApiKeyError, type TemplateSummaryForAI } from './_lib/ai/gemini'

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

  // 3. /api/projects/recommend-template (AI & Segment-based Template Recommendation)
  if (subPath.startsWith('recommend-template')) {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({ error: 'Método não permitido.' })
    }

    const targetProjectId = req.body?.project_id || req.body?.projectId || req.query?.projectId || req.query?.id
    if (!targetProjectId) {
      return res.status(400).json({ error: 'ID de projeto obrigatório.' })
    }

    try {
      const projectRows = await sql`SELECT * FROM public.projects WHERE id = ${targetProjectId} LIMIT 1`
      if (projectRows.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado.' })
      }
      const project = projectRows[0] as any
      const briefing = (project.briefing_data || {}) as any
      const industryKey = briefing.industry_key || ''
      const industryCustom = briefing.industry_custom || ''

      const activeTemplates = await sql`
        SELECT id, name, category, description, preview_image_url, schema,
               COALESCE(industry_tags, '{}') AS industry_tags,
               COALESCE(is_generic, false) AS is_generic
        FROM public.templates
        WHERE status = 'active'
        ORDER BY is_generic ASC, name ASC
      `

      // Format for AI
      const summaries: TemplateSummaryForAI[] = activeTemplates.map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        industry_tags: t.industry_tags || [],
        is_generic: Boolean(t.is_generic),
        description: t.description || null,
        section_labels: Array.isArray(t.schema?.sections)
          ? t.schema.sections.map((s: any) => s.label || s.id)
          : [],
      }))

      // Try AI recommendation if Gemini API key exists
      const apiKey = process.env.GEMINI_API_KEY
      if (apiKey && industryKey) {
        try {
          const aiRes = await recommendTemplateWithGemini({
            industry_key: industryKey,
            industry_custom: industryCustom,
            clientName: project.client_name,
            clientBusiness: project.client_business,
            objective: briefing.objective,
            services_products: briefing.services_products,
            availableTemplates: summaries,
          })

          return res.status(200).json({
            ...aiRes.recommendation,
            ai_powered: true,
            model: aiRes.model,
          })
        } catch (aiErr: any) {
          console.warn('[Template Recommendation] AI recommendation fallback to deterministic rule:', aiErr?.message)
        }
      }

      // Fallback deterministic rule
      const directMatch = summaries.find((t) => t.industry_tags.includes(industryKey))
      if (directMatch) {
        return res.status(200).json({
          recommended_template_id: directMatch.id,
          reason: `Template especializado para o segmento "${directMatch.category}" com estrutura e secções dedicadas.`,
          confidence: 'high',
          warnings: [],
          ai_powered: false,
        })
      }

      const genericMatch = summaries.find((t) => t.is_generic)
      if (genericMatch) {
        return res.status(200).json({
          recommended_template_id: genericMatch.id,
          reason: `Template estruturado de base genérica de alta conversão, flexível para o nicho de "${project.client_business || 'serviços'}".`,
          confidence: 'medium',
          warnings: ['Ainda não existe um template especializado para este nicho exato.'],
          ai_powered: false,
        })
      }

      return res.status(200).json({
        recommended_template_id: null,
        reason: 'Ainda não existe um template específico para este segmento. Pode usar um template genérico ou criar um novo.',
        confidence: 'low',
        warnings: ['Nenhum template ativo disponível.'],
        ai_powered: false,
      })
    } catch (err: any) {
      console.error('[API /api/projects/recommend-template] Error:', err?.message || err)
      return res.status(500).json({ error: 'Não foi possível gerar a recomendação de template.' })
    }
  }

  // 4. /api/projects/ai-mappings
  if (subPath.startsWith('ai-mappings')) {
    const aiSub = subPath.replace(/^ai-mappings\/?/, '').trim()

    // 3.1 POST /api/projects/ai-mappings (generate AI mapping)
    if (!aiSub && req.method === 'POST') {
      const { project_id, content_source_id } = req.body || {}
      if (!project_id || !content_source_id) {
        return res.status(400).json({ error: 'ID do projeto e ID da fonte de conteúdo são obrigatórios.' })
      }

      try {
        const projectRows = await sql`SELECT * FROM public.projects WHERE id = ${project_id} LIMIT 1`
        if (projectRows.length === 0) {
          return res.status(404).json({ error: 'Projeto não encontrado.' })
        }

        const project = projectRows[0] as any
        if (authUser.role !== 'admin' && project.created_by !== authUser.id && project.assigned_to !== authUser.id) {
          const memberCheck = await sql`
            SELECT 1 FROM public.project_members
            WHERE project_id = ${project_id} AND user_id = ${authUser.id} AND access_level IN ('owner', 'editor')
            LIMIT 1
          `
          if (memberCheck.length === 0) {
            return res.status(403).json({ error: 'Não tem permissão para gerar sugestões de IA neste projeto.' })
          }
        }

        if (!project.selected_template_id) {
          return res.status(400).json({ error: 'O projeto não possui um template base ativo selecionado.' })
        }

        const templateRows = await sql`SELECT * FROM public.templates WHERE id = ${project.selected_template_id} LIMIT 1`
        if (templateRows.length === 0) {
          return res.status(400).json({ error: 'O template associado ao projeto não foi encontrado.' })
        }

        const template = templateRows[0] as any
        if (template.status !== 'active') {
          return res.status(400).json({ error: 'O template selecionado não está ativo no sistema.' })
        }

        const sourceRows = await sql`
          SELECT * FROM public.project_content_sources
          WHERE id = ${content_source_id} AND project_id = ${project_id}
          LIMIT 1
        `
        if (sourceRows.length === 0) {
          return res.status(404).json({ error: 'Fonte de conteúdo não encontrada no projeto selecionado.' })
        }

        const contentSource = sourceRows[0] as any
        if (!contentSource.extracted_text || contentSource.extracted_text.trim().length === 0) {
          return res.status(400).json({ error: 'A fonte de conteúdo selecionada não contém texto para análise.' })
        }

        const verRows = await sql`
          SELECT COALESCE(MAX(version), 1)::int as ver FROM public.template_versions WHERE template_id = ${template.id}
        `
        const templateVersion = (verRows[0] as any)?.ver || 1

        const aiResult = await generateContentMappingWithGemini({
          projectName: project.name,
          clientName: project.client_name,
          clientBusiness: project.client_business,
          briefing: (project.briefing_data || {}) as any,
          sourceText: contentSource.extracted_text,
          templateSchema: template.schema,
        })

        const inserted = await sql`
          INSERT INTO public.project_ai_mappings (
            project_id, content_source_id, template_id, template_version, status, mapping, model, created_by
          ) VALUES (
            ${project_id}, ${content_source_id}, ${template.id}, ${templateVersion}, 'draft', ${JSON.stringify(aiResult.mapping)}::jsonb, ${aiResult.model}, ${authUser.id}
          )
          RETURNING *
        `

        return res.status(201).json({
          mapping: inserted[0],
          message: 'Sugestões de conteúdo geradas com sucesso pela Inteligência Artificial.',
        })
      } catch (err: any) {
        if (err instanceof MissingApiKeyError || err?.name === 'MissingApiKeyError') {
          return res.status(503).json({ error: 'A integração de IA ainda não está configurada. Contacte o administrador.' })
        }
        console.error('[API /api/projects/ai-mappings POST] Error generating mapping:', err?.message || err)
        const userMsg =
          err?.message &&
          !err.message.includes('GEMINI') &&
          !err.message.includes('API') &&
          !err.message.includes('fetch') &&
          !err.message.includes('HTTP')
            ? err.message
            : 'Não foi possível gerar as sugestões com a IA neste momento. Tente novamente mais tarde.'
        return res.status(500).json({ error: userMsg })
      }
    }

    // 3.2 GET /api/projects/ai-mappings?projectId=<uuid>
    if (!aiSub && req.method === 'GET') {
      const targetProjectId = req.query?.projectId || req.query?.project_id || req.query?.id
      if (!targetProjectId) {
        return res.status(400).json({ error: 'ID de projeto obrigatório.' })
      }

      try {
        const projectRows = await sql`SELECT * FROM public.projects WHERE id = ${targetProjectId} LIMIT 1`
        if (projectRows.length === 0) {
          return res.status(404).json({ error: 'Projeto não encontrado.' })
        }

        const project = projectRows[0] as any
        if (authUser.role !== 'admin' && project.created_by !== authUser.id && project.assigned_to !== authUser.id) {
          const memberCheck = await sql`
            SELECT 1 FROM public.project_members WHERE project_id = ${targetProjectId} AND user_id = ${authUser.id} LIMIT 1
          `
          if (memberCheck.length === 0) {
            return res.status(403).json({ error: 'Não tem permissão para consultar o histórico deste projeto.' })
          }
        }

        const mappings = await sql`
          SELECT 
            pam.*,
            prof.full_name as creator_name,
            app_prof.full_name as applier_name,
            pcs.original_filename as source_filename,
            pcs.source_type as source_type
          FROM public.project_ai_mappings pam
          LEFT JOIN public.profiles prof ON prof.id = pam.created_by
          LEFT JOIN public.profiles app_prof ON app_prof.id = pam.applied_by
          LEFT JOIN public.project_content_sources pcs ON pcs.id = pam.content_source_id
          WHERE pam.project_id = ${targetProjectId}
          ORDER BY pam.created_at DESC
        `

        return res.status(200).json(mappings)
      } catch (err: any) {
        console.error('[API /api/projects/ai-mappings GET] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível listar as sugestões de IA.' })
      }
    }

    // 3.3 POST /api/projects/ai-mappings/:id/apply
    if (aiSub.endsWith('/apply') && (req.method === 'POST' || req.method === 'PATCH')) {
      const mappingId = aiSub.replace(/\/apply\/?$/, '').trim()
      const { applied_fields } = req.body || {}

      if (!mappingId) {
        return res.status(400).json({ error: 'ID de mapeamento obrigatório.' })
      }

      try {
        const mappingRows = await sql`SELECT * FROM public.project_ai_mappings WHERE id = ${mappingId} LIMIT 1`
        if (mappingRows.length === 0) {
          return res.status(404).json({ error: 'Sugestão de IA não encontrada.' })
        }

        const mapping = mappingRows[0] as any
        const projectRows = await sql`SELECT * FROM public.projects WHERE id = ${mapping.project_id} LIMIT 1`
        if (projectRows.length === 0) {
          return res.status(404).json({ error: 'Projeto associado não encontrado.' })
        }

        const project = projectRows[0] as any
        if (authUser.role !== 'admin' && project.created_by !== authUser.id && project.assigned_to !== authUser.id) {
          const memberCheck = await sql`
            SELECT 1 FROM public.project_members
            WHERE project_id = ${mapping.project_id} AND user_id = ${authUser.id} AND access_level IN ('owner', 'editor')
            LIMIT 1
          `
          if (memberCheck.length === 0) {
            return res.status(403).json({ error: 'Não tem permissão para aplicar alterações a este projeto.' })
          }
        }

        // Merge applied fields into project.page_data
        const currentPageData = (project.page_data || {}) as Record<string, any>
        const currentSections = (currentPageData.sections || {}) as Record<string, any>
        const updatedSections = { ...currentSections }

        if (applied_fields && typeof applied_fields === 'object') {
          for (const [sectionId, fields] of Object.entries(applied_fields)) {
            if (fields && typeof fields === 'object') {
              updatedSections[sectionId] = {
                ...(updatedSections[sectionId] || {}),
                ...(fields as Record<string, any>),
              }
            }
          }
        }

        const updatedPageData = {
          ...currentPageData,
          sections: updatedSections,
          last_ai_applied_at: new Date().toISOString(),
          last_ai_mapping_id: mapping.id,
        }

        const updatedProjectRows = await sql`
          UPDATE public.projects
          SET
            page_data = ${JSON.stringify(updatedPageData)}::jsonb,
            updated_at = NOW()
          WHERE id = ${mapping.project_id}
          RETURNING *
        `

        const updatedMappingRows = await sql`
          UPDATE public.project_ai_mappings
          SET
            status = 'applied',
            applied_at = NOW(),
            applied_by = ${authUser.id}
          WHERE id = ${mappingId}
          RETURNING *
        `

        return res.status(200).json({
          project: updatedProjectRows[0],
          mapping: updatedMappingRows[0],
          message: 'Sugestões selecionadas da IA aplicadas com sucesso à página do projeto.',
        })
      } catch (err: any) {
        console.error('[API /api/projects/ai-mappings/:id/apply] Database error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível aplicar as sugestões da IA ao projeto.' })
      }
    }

    // 3.4 POST /api/projects/ai-mappings/:id/discard
    if (aiSub.endsWith('/discard') && (req.method === 'POST' || req.method === 'PATCH')) {
      const mappingId = aiSub.replace(/\/discard\/?$/, '').trim()
      if (!mappingId) {
        return res.status(400).json({ error: 'ID de mapeamento obrigatório.' })
      }

      try {
        const mappingRows = await sql`SELECT * FROM public.project_ai_mappings WHERE id = ${mappingId} LIMIT 1`
        if (mappingRows.length === 0) {
          return res.status(404).json({ error: 'Sugestão de IA não encontrada.' })
        }

        const mapping = mappingRows[0] as any
        const projectRows = await sql`SELECT * FROM public.projects WHERE id = ${mapping.project_id} LIMIT 1`
        if (projectRows.length === 0) {
          return res.status(404).json({ error: 'Projeto associado não encontrado.' })
        }

        const project = projectRows[0] as any
        if (authUser.role !== 'admin' && project.created_by !== authUser.id && project.assigned_to !== authUser.id) {
          const memberCheck = await sql`
            SELECT 1 FROM public.project_members
            WHERE project_id = ${mapping.project_id} AND user_id = ${authUser.id} AND access_level IN ('owner', 'editor')
            LIMIT 1
          `
          if (memberCheck.length === 0) {
            return res.status(403).json({ error: 'Não tem permissão para descartar sugestões deste projeto.' })
          }
        }

        const updatedMappingRows = await sql`
          UPDATE public.project_ai_mappings
          SET status = 'discarded'
          WHERE id = ${mappingId}
          RETURNING *
        `

        return res.status(200).json({
          mapping: updatedMappingRows[0],
          message: 'Sugestão da IA descartada.',
        })
      } catch (err: any) {
        console.error('[API /api/projects/ai-mappings/:id/discard] Database error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível descartar a sugestão de IA.' })
      }
    }
  }

  // 4. /api/projects/:id (details or update)
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
