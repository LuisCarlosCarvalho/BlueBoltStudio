import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { z } from 'zod'

// ==============================================================================
// 1. Safe Gemini AI Helper Functions & Schemas (Standalone Vercel Serverless)
// ==============================================================================

const aiSuggestedFieldSchema = z.object({
  field_key: z.string().min(1).optional(),
  suggested_value: z.string().default('').optional(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  source_excerpt: z.string().default(''),
  rationale: z.string().default(''),
  needs_review: z.boolean().default(true),
  // Backward compatibility alias keys
  key: z.string().optional(),
  value: z.string().optional(),
  reason: z.string().optional(),
})

const aiSuggestedSectionSchema = z.object({
  section_id: z.string().min(1),
  fields: z.array(aiSuggestedFieldSchema),
})

const aiContentMappingResultSchema = z.object({
  summary: z.string(),
  warnings: z.array(z.string()).default([]),
  sections: z.array(aiSuggestedSectionSchema),
})

type AiContentMappingResult = {
  summary: string
  warnings: string[]
  sections: Array<{
    section_id: string
    fields: Array<{
      field_key: string
      suggested_value: string
      confidence: 'high' | 'medium' | 'low'
      source_excerpt: string
      rationale: string
      needs_review: boolean
      key?: string
      value?: string
      reason?: string
    }>
  }>
}

interface GenerateAiMappingOptions {
  projectName: string
  clientName?: string | null
  clientBusiness?: string | null
  industryKey?: string | null
  industryCustom?: string | null
  briefing: {
    objective?: string
    target_audience?: string
    customer_pains?: string
    services_products?: string
    main_cta?: string
    additional_notes?: string
  }
  sourceText: string
  templateSchema: {
    template_name?: string
    category?: string
    sections: Array<{
      id: string
      type: string
      label: string
      purpose: string
      required?: boolean
      editable_fields: Array<{
        key: string
        label: string
        field_type: string
        required?: boolean
        placeholder?: string
        ai_hint?: string
      }>
    }>
  }
}

class MissingApiKeyError extends Error {
  constructor(message = 'A integração de IA ainda não está configurada. Contacte o administrador.') {
    super(message)
    this.name = 'MissingApiKeyError'
  }
}

class GeminiServiceError extends Error {
  status: number
  constructor(message = 'A configuração da IA precisa de ser atualizada. Tente novamente dentro de instantes.', status = 500) {
    super(message)
    this.name = 'GeminiServiceError'
    this.status = status
  }
}

const DEFAULT_GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim()
const MAX_SOURCE_TEXT_LENGTH = 35000
const AI_TIMEOUT_MS = 40000

async function generateContentMappingWithGemini(
  options: GenerateAiMappingOptions
): Promise<{ mapping: AiContentMappingResult; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new MissingApiKeyError()
  }

  const model = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim()

  const sanitizedText = (options.sourceText || '').slice(0, MAX_SOURCE_TEXT_LENGTH).trim()

  const validSectionsSummary = options.templateSchema.sections.map((s) => ({
    section_id: s.id,
    label: s.label,
    purpose: s.purpose,
    required: s.required || false,
    fields: s.editable_fields.map((f) => ({
      field_key: f.key,
      label: f.label,
      field_type: f.field_type,
      required: f.required || false,
      ai_hint: f.ai_hint || '',
    })),
  }))

  const industryContext = options.industryKey
    ? `Segmento do Projeto: "${options.industryKey}"${options.industryCustom ? ` (${options.industryCustom})` : ''}`
    : `Segmento do Projeto: "${options.clientBusiness || 'Serviços'}"`

  const systemInstruction = `És o Assistente Estratégico de Copywriting e Estruturação de Landing Pages da Blue Bolt.
A tua função é sugerir conteúdos de alta conversão para os campos editáveis do template selecionado, baseando-te EXCLUSIVAMENTE nos factos e materiais fornecidos pelo cliente.

REGRAS DE OURO DE RIGOR E GROUNDING (FASE 3):
1. Idioma Obrigatório: Português de Portugal (pt-PT) culto, natural e persuasivo (ex: "contacto", "equipa", "otimização", "experiência").
2. Contexto do Segmento:
   - ${industryContext}.
   - Se o projeto for do nicho "${options.industryKey || 'geral'}", todas as sugestões DEVEM permanecer estritamente dentro deste contexto. Nunca mistures ramos não relacionados (ex: não geres conteúdos médicos ou imobiliários num projeto de Pet Shop).
3. Anti-Alucinação e Grounding Estrito:
   - NUNCA inventes preços, moradas, contactos telefónicos, certificações, testemunhos falsos, garantias financeiras ou estatísticas não fornecidas.
   - Para cada campo sugerido, inclui o trecho exato de onde retiraste a ideia em "source_excerpt".
   - Se os dados fornecidos forem insuficientes para preencher um campo, devolve "suggested_value": "", "source_excerpt": "", "rationale": "not_enough_information", "confidence": "low" e "needs_review": true.
4. Conformidade de Formato (Texto Puro):
   - Não uses tags HTML (<p>, <script>, <div>), Markdown de formatação (**, ##) ou código executável.
5. Contrato de Estrutura:
   - Usa estritamente a chave "field_key" (correspondente à chave do campo do template).
   - Apenas deves mapear secções ("section_id") e campos ("field_key") que existam na lista fornecida do template.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON estrito):
{
  "summary": "Resumo estratégico em 2-3 frases sobre o posicionamento e adequação do conteúdo ao template",
  "warnings": ["Lista de eventuais informações em falta ou pontos que requerem validação humana"],
  "sections": [
    {
      "section_id": "id_da_seccao",
      "fields": [
        {
          "field_key": "chave_do_campo",
          "suggested_value": "Texto sugerido para o campo",
          "confidence": "high" | "medium" | "low",
          "source_excerpt": "Citação direta ou referência do texto fornecido que fundamenta a sugestão",
          "rationale": "Justificação concisa da escolha do texto ou 'not_enough_information'",
          "needs_review": true
        }
      ]
    }
  ]
}`

  const userPrompt = `DADOS DO PROJETO E CLIENTE:
- Nome do Projeto: ${options.projectName}
- Nome do Cliente: ${options.clientName || 'N/D'}
- Ramo de Atividade: ${options.clientBusiness || 'N/D'}
- Segmento Confirmado: ${options.industryKey || 'N/D'} ${options.industryCustom ? `(${options.industryCustom})` : ''}
- Objetivo da Landing Page: ${options.briefing.objective || 'N/D'}
- Público-Alvo: ${options.briefing.target_audience || 'N/D'}
- Dores do Público: ${options.briefing.customer_pains || 'N/D'}
- Serviços/Produtos Oferecidos: ${options.briefing.services_products || 'N/D'}
- Call-To-Action Principal: ${options.briefing.main_cta || 'N/D'}
- Notas Adicionais: ${options.briefing.additional_notes || 'Nenhumas'}

ESTRUTURA DE SECÇÕES E CAMPOS DO TEMPLATE:
${JSON.stringify(validSectionsSummary, null, 2)}

TEXTO / MATERIAL FORNECIDO PELO CLIENTE:
"""
${sanitizedText}
"""

Gera as sugestões estruturadas em JSON estrito seguindo todas as regras de grounding e formato pt-PT.`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\n---\n\n${userPrompt}` }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2500,
      responseMimeType: 'application/json',
    },
  }

  let rawResponseText = ''
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      console.error('[AI_DIAGNOSTIC_ERR]', { status: response.status, code: 'AI_PROVIDER_HTTP_NON_OK' })
      throw new GeminiServiceError(
        'A configuração da IA precisa de ser atualizada. Tente novamente dentro de instantes.',
        response.status
      )
    }

    const data: any = await response.json()
    const candidatePart = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!candidatePart || typeof candidatePart !== 'string') {
      throw new GeminiServiceError('A inteligência artificial não devolveu uma resposta de conteúdo estruturada.')
    }

    rawResponseText = candidatePart.trim()
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[AI_DIAGNOSTIC_ERR]', { code: 'AI_TIMEOUT' })
      throw new GeminiServiceError('O pedido ao serviço de inteligência artificial excedeu o tempo limite. Tente novamente.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }

  let parsedJson: any
  try {
    const cleanedJson = rawResponseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    parsedJson = JSON.parse(cleanedJson)
  } catch (parseErr: any) {
    console.error('[AI Service] Failed to parse JSON from AI response:', parseErr.message)
    throw new Error('A resposta devolvida pela inteligência artificial não possui um formato JSON válido.')
  }

  const validation = aiContentMappingResultSchema.safeParse(parsedJson)
  if (!validation.success) {
    console.error('[AI Service] Zod schema validation failed for AI output:', validation.error.issues)
    throw new Error('A estrutura de dados devolvida pela IA não cumpre o contrato estrito de campos.')
  }

  const validatedResult = validation.data

  const allowedSectionsMap = new Map<string, Set<string>>()
  options.templateSchema.sections.forEach((sec) => {
    const fieldSet = new Set(sec.editable_fields.map((f) => f.key))
    allowedSectionsMap.set(sec.id, fieldSet)
  })

  const sanitizedSections = validatedResult.sections
    .filter((sec) => allowedSectionsMap.has(sec.section_id))
    .map((sec) => {
      const allowedFields = allowedSectionsMap.get(sec.section_id)!
      return {
        section_id: sec.section_id,
        fields: sec.fields
          .map((f) => {
            const rawKey = f.field_key || f.key || ''
            const rawValue = f.suggested_value !== undefined ? f.suggested_value : f.value || ''
            const rawReason = f.rationale || f.reason || ''
            return {
              field_key: rawKey,
              suggested_value: typeof rawValue === 'string' ? rawValue.trim() : String(rawValue || ''),
              confidence: (f.confidence || 'medium') as 'high' | 'medium' | 'low',
              source_excerpt: f.source_excerpt || '',
              rationale: rawReason,
              needs_review: typeof f.needs_review === 'boolean' ? f.needs_review : true,
              key: rawKey,
              value: typeof rawValue === 'string' ? rawValue.trim() : String(rawValue || ''),
              reason: rawReason,
            }
          })
          .filter((f) => allowedFields.has(f.field_key)),
      }
    })
    .filter((sec) => sec.fields.length > 0)

  const finalMapping: AiContentMappingResult = {
    summary: validatedResult.summary || 'Sugestões de conteúdo estruturadas para o template.',
    warnings: validatedResult.warnings || [],
    sections: sanitizedSections,
  }

  return {
    mapping: finalMapping,
    model,
  }
}

const templateRecommendationSchema = z.object({
  recommended_template_id: z.string().nullable(),
  reason: z.string().default(''),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  warnings: z.array(z.string()).default([]),
})

type TemplateRecommendationResult = z.infer<typeof templateRecommendationSchema>

interface TemplateSummaryForAI {
  id: string
  name: string
  category: string
  industry_tags: string[]
  is_generic: boolean
  description: string | null
  section_labels: string[]
}

interface RecommendTemplateOptions {
  industry_key: string
  industry_custom?: string
  clientName?: string | null
  clientBusiness?: string | null
  objective?: string
  services_products?: string
  availableTemplates: TemplateSummaryForAI[]
}

async function recommendTemplateWithGemini(
  options: RecommendTemplateOptions
): Promise<{ recommendation: TemplateRecommendationResult; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new MissingApiKeyError()
  }
  const model = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim()

  const candidateTemplates = options.availableTemplates.filter(
    (tpl) => (tpl.industry_tags && tpl.industry_tags.includes(options.industry_key)) || tpl.is_generic
  )

  if (candidateTemplates.length === 0) {
    return {
      recommendation: {
        recommended_template_id: null,
        reason: 'Ainda não existe um template específico para este segmento. Pode utilizar um template genérico ou criar um novo no painel administrativo.',
        confidence: 'low',
        warnings: ['Nenhum template ativo com tags correspondentes ao segmento ou de finalidade genérica.'],
      },
      model,
    }
  }

  const systemInstruction = `És o Assistente Estratégico de Landing Pages do "Blue Bolt Page Studio", especializado em seleção e recomendação de templates de alta conversão.
A tua tarefa é analisar o segmento confirmado do cliente, o seu nicho e briefing, e recomendar o template base MAIS ADEQUADO da lista fornecida.

REGRAS ESTRITAS DE RECOMENDAÇÃO:
1. Responde SEMPRE E EXCLUSIVAMENTE em Português de Portugal (pt-PT).
2. Deves escolher EXCLUSIVAMENTE um ID da lista de templates fornecida em "TEMPLATES DISPONÍVEIS".
3. Se houver um template cujo "industry_tags" inclua exatamente o segmento "${options.industry_key}", prioriza-o com confiança "high".
4. Se não houver template do segmento exato mas houver template genérico ("is_generic": true), recomenda o genérico com confiança "medium" ou "low".
5. NUNCA inventes IDs ou recomendes templates de nichos completamente diferentes (ex: não recomendes Pet Shop para Advocacia).
6. Se nenhum template fizer sentido, devolve "recommended_template_id": null.
7. A tua resposta DEVE ser um objeto JSON válido, sem texto exterior, com a estrutura:
{
  "recommended_template_id": "uuid-do-template ou null",
  "reason": "Explicação concisa e profissional em pt-PT do motivo da recomendação",
  "confidence": "high" | "medium" | "low",
  "warnings": ["avisos eventuais sobre secções a adaptar"]
}`

  const userPrompt = `DADOS DO CLIENTE E PROJETO:
- Segmento Confirmado: ${options.industry_key} ${options.industry_custom ? `(Especificação: ${options.industry_custom})` : ''}
- Nome do Cliente: ${options.clientName || 'Não especificado'}
- Ramo / Nicho: ${options.clientBusiness || 'Não especificado'}
- Objetivo da Página: ${options.objective || 'Captar clientes qualificados'}
- Serviços / Produtos a Destacar: ${options.services_products || 'Serviços especializados'}

TEMPLATES DISPONÍVEIS:
${JSON.stringify(candidateTemplates, null, 2)}

Analisa os dados e devolve a recomendação em formato JSON estrito.`

  const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    systemInstruction: {
      role: 'system',
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  let rawResponseText = ''
  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      console.error(`[AI Service Recommendation] Gemini API error (${response.status}):`, errorBody)
      throw new Error(`Falha no serviço de recomendação de templates (HTTP ${response.status}).`)
    }

    const responseJson: any = await response.json()
    const candidate = responseJson?.candidates?.[0]
    const textPart = candidate?.content?.parts?.[0]?.text

    if (!textPart) {
      throw new Error('A inteligência artificial não retornou conteúdo na resposta.')
    }

    rawResponseText = textPart.trim()
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[AI Service Recommendation] Gemini call timed out.')
      throw new Error('O pedido de recomendação excedeu o tempo limite.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }

  let parsedJson: any
  try {
    const cleanedJson = rawResponseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    parsedJson = JSON.parse(cleanedJson)
  } catch {
    throw new Error('A resposta de recomendação não possui formato JSON válido.')
  }

  const validation = templateRecommendationSchema.safeParse(parsedJson)
  if (!validation.success) {
    console.error('[AI Service Recommendation] Zod validation failed:', validation.error.issues)
    throw new Error('A estrutura da recomendação da IA é inválida.')
  }

  const result = validation.data

  if (result.recommended_template_id) {
    const existsInCandidates = candidateTemplates.some((t) => t.id === result.recommended_template_id)
    if (!existsInCandidates) {
      console.warn('[AI Service] AI recommended an ID outside candidates, setting null.')
      result.recommended_template_id = null
      result.confidence = 'low'
      result.reason = 'Template recomendado não encontrado na lista de templates ativos compatíveis.'
    }
  }

  return {
    recommendation: result,
    model,
  }
}

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
    const role = row.role || (row.email?.toLowerCase().startsWith('admin@') ? 'admin' : 'user')
    return {
      id: row.id,
      email: row.email,
      role,
      full_name: row.full_name || (role === 'admin' ? 'Administrador' : 'Colaborador'),
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
  const subPath = cleanUrl.replace(/^\/?(api\/)?projects\/?/, '').trim()

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

        // Rate limit check: at least 4 seconds between requests per project
        const recentMapping = await sql`
          SELECT created_at FROM public.project_ai_mappings
          WHERE project_id = ${project_id} AND created_at > NOW() - INTERVAL '4 seconds'
          LIMIT 1
        `
        if (recentMapping.length > 0) {
          return res.status(429).json({
            error: 'Por favor aguarde alguns segundos antes de gerar novas sugestões para este projeto.',
          })
        }

        const verRows = await sql`
          SELECT COALESCE(MAX(version), 1)::int as ver FROM public.template_versions WHERE template_id = ${template.id}
        `
        const templateVersion = (verRows[0] as any)?.ver || 1

        const briefingData = (project.briefing_data || {}) as any

        const aiResult = await generateContentMappingWithGemini({
          projectName: project.name,
          clientName: project.client_name,
          clientBusiness: project.client_business,
          industryKey: briefingData.industry_key || null,
          industryCustom: briefingData.industry_custom || null,
          briefing: briefingData,
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
        console.error('[AI_SERVICE_DIAGNOSTIC]', { code: 'AI_MAPPING_FAILURE', errorType: err?.name || 'Unknown' })
        const userMsg =
          err instanceof GeminiServiceError
            ? err.message
            : 'A configuração da IA precisa de ser atualizada. Tente novamente dentro de instantes.'
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
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subPath)
  if (isUuid) {
    const projectId = subPath

    // 4.1 GET /api/projects/:id
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
        return res.status(200).json(project)
      } catch (err: any) {
        console.error('[API /api/projects/:id GET] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível carregar o projeto.' })
      }
    }

    // 4.2 PATCH /api/projects/:id
    if (req.method === 'PATCH' || req.method === 'PUT') {
      try {
        const existing = await sql`SELECT * FROM public.projects WHERE id = ${projectId} LIMIT 1`
        if (existing.length === 0) {
          return res.status(404).json({ error: 'Projeto não encontrado.' })
        }

        const current = existing[0] as any

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

  // 5. /api/projects (list or create)
  if (!subPath || subPath === '' || subPath === 'projects') {
    // 5.1 GET /api/projects
    if (req.method === 'GET') {
      try {
        const rows = await sql`
          SELECT p.*, prof.full_name as creator_name
          FROM public.projects p
          LEFT JOIN public.profiles prof ON prof.id = p.created_by
          ORDER BY p.created_at DESC
        `

        return res.status(200).json(rows || [])
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
