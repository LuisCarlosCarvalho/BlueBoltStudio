import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'

const AUTH_COOKIE_NAME = 'bluebolt_session'

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

  const secret =
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    (dbUrl ? `derived_secret_${dbUrl.slice(0, 24)}` : 'bluebolt_session_secret')

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
  if (req.method !== 'PATCH' && req.method !== 'PUT' && req.method !== 'POST') {
    if (res.setHeader) res.setHeader('Allow', ['PATCH', 'PUT', 'POST'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  const { project_id, template_id, id } = req.body || {}
  const targetProjectId = project_id || id || req.query?.projectId || req.query?.id

  if (!targetProjectId || typeof targetProjectId !== 'string') {
    return res.status(400).json({ error: 'ID de projeto obrigatório.' })
  }

  if (!template_id || typeof template_id !== 'string') {
    return res.status(400).json({ error: 'ID de template obrigatório.' })
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

  const authUser = await getAuthUserFromRequest(req, dbUrl)
  if (!authUser) {
    return res.status(401).json({ error: 'Não autorizado. Inicie sessão para continuar.' })
  }

  const sql = neon(dbUrl)

  try {
    // 1. Verify project exists and user has authorization
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

    // 2. Verify template exists and is active
    const templateRows = await sql`
      SELECT id, name, slug, category, schema, status
      FROM public.templates
      WHERE id = ${template_id}
      LIMIT 1
    `

    if (templateRows.length === 0) {
      return res.status(404).json({ error: 'Template não encontrado.' })
    }

    const template = templateRows[0] as any
    if (template.status !== 'active') {
      return res.status(400).json({ error: 'O template selecionado não está ativo ou foi arquivado.' })
    }

    // Get latest version number
    const verRows = await sql`
      SELECT COALESCE(MAX(version), 1)::int as ver FROM public.template_versions WHERE template_id = ${template_id}
    `
    const latestVersion = (verRows[0] as any)?.ver || 1

    // Prepare updated brand_data with template traceability metadata without erasing existing fields
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

    // Update project with template selection (preserves page_data and briefing_data intact)
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
  } catch (err) {
    console.error('Error assigning template to project:', err)
    return res.status(500).json({ error: 'Erro ao associar o template ao projeto.' })
  }
}
