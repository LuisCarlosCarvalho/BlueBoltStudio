import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { z } from 'zod'

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

interface TemplateSummaryForAI {
  id: string
  name: string
  category: string
  industry_tags: string[]
  is_generic: boolean
  description: string | null
  section_labels: string[]
}

const aiSuggestedFieldSchema = z.object({
  field_key: z.string().min(1).optional(),
  suggested_value: z.string().default('').optional(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  source_excerpt: z.string().default(''),
  rationale: z.string().default(''),
  needs_review: z.boolean().default(true),
  key: z.string().optional(),
  value: z.string().optional(),
  reason: z.string().optional(),
})

const aiSuggestedSectionSchema = z.object({
  section_id: z.string().min(1),
  fields: z.array(aiSuggestedFieldSchema),
})

const aiContentMappingResultSchema = z.object({
  summary: z.string().default('Sugestões geradas com base no conteúdo fornecido.'),
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

const isSafeLogoUrl = (url?: string | null): boolean => {
  if (!url || url.trim() === '') return true
  const u = url.trim()
  if (u.startsWith('/') || u.startsWith('data:image/svg+xml')) return true
  try {
    const parsed = new URL(u)
    if (parsed.protocol !== 'https:') return false
    return (
      parsed.hostname.endsWith('.public.blob.vercel-storage.com') ||
      parsed.hostname === 'blob.vercel-storage.com'
    )
  } catch {
    return false
  }
}

const hexColorRegex = /^#([A-Fa-f0-9]{6})$/
const ALLOWED_HEADING_FONTS = ['Inter', 'Roboto', 'Montserrat', 'Poppins', 'Outfit', 'Playfair Display'] as const
const ALLOWED_BODY_FONTS = ['Inter', 'Roboto', 'Open Sans', 'Plus Jakarta Sans'] as const
const ALLOWED_VISUAL_STYLES = ['clean_minimal', 'modern_tech', 'luxury_premium', 'bold_creative', 'warm_organic'] as const
const ALLOWED_VOICE_TONES = ['profissional', 'acolhedor', 'autoritario', 'inovador', 'descontraido'] as const

const draftBrandKitSchema = z.object({
  brand_name: z.string().max(100).optional().default(''),
  slogan: z.string().max(150).optional().default(''),
  logo_url: z.string().refine(isSafeLogoUrl, { message: 'Apenas Vercel Blob ou placeholders internos.' }).optional().default(''),
  logo_dark_url: z.string().refine(isSafeLogoUrl, { message: 'Apenas Vercel Blob ou placeholders internos.' }).optional().default(''),
  primary_color: z.string().refine((v) => !v || hexColorRegex.test(v), { message: 'Hex válido (ex: #1463FF)' }).optional().default('#1463FF'),
  secondary_color: z.string().refine((v) => !v || hexColorRegex.test(v), { message: 'Hex válido (ex: #05192D)' }).optional().default('#05192D'),
  accent_color: z.string().refine((v) => !v || hexColorRegex.test(v), { message: 'Hex válido (ex: #FF6B00)' }).optional().default('#FF6B00'),
  bg_color: z.string().refine((v) => !v || hexColorRegex.test(v), { message: 'Hex válido (ex: #FFFFFF)' }).optional().default('#FFFFFF'),
  text_color: z.string().refine((v) => !v || hexColorRegex.test(v), { message: 'Hex válido (ex: #0F172A)' }).optional().default('#0F172A'),
  font_heading: z.enum(ALLOWED_HEADING_FONTS).optional().default('Inter'),
  font_body: z.enum(ALLOWED_BODY_FONTS).optional().default('Inter'),
  visual_style: z.enum(ALLOWED_VISUAL_STYLES).optional().default('clean_minimal'),
  voice_tone: z.enum(ALLOWED_VOICE_TONES).optional().default('profissional'),
  forbidden_elements: z.string().max(500).optional().default(''),
  reference_notes: z.string().max(1000).optional().default(''),
})

const applyBrandKitSchema = z.object({
  brand_name: z.string().min(2, 'O nome da marca é obrigatório para aplicar a identidade.').max(100),
  slogan: z.string().max(150).optional().default(''),
  logo_url: z.string().refine(isSafeLogoUrl, { message: 'Logótipo inválido: use apenas Vercel Blob ou placeholder.' }).optional().default(''),
  logo_dark_url: z.string().refine(isSafeLogoUrl, { message: 'Logótipo escuro inválido: use apenas Vercel Blob ou placeholder.' }).optional().default(''),
  primary_color: z.string().regex(hexColorRegex, 'A cor primária é obrigatória (ex: #1463FF).'),
  secondary_color: z.string().regex(hexColorRegex, 'A cor secundária é obrigatória (ex: #05192D).'),
  accent_color: z.string().regex(hexColorRegex, 'A cor de destaque é obrigatória (ex: #FF6B00).'),
  bg_color: z.string().regex(hexColorRegex, 'A cor de fundo é obrigatória (ex: #FFFFFF).'),
  text_color: z.string().regex(hexColorRegex, 'A cor de texto é obrigatória (ex: #0F172A).'),
  font_heading: z.enum(ALLOWED_HEADING_FONTS),
  font_body: z.enum(ALLOWED_BODY_FONTS),
  visual_style: z.enum(ALLOWED_VISUAL_STYLES),
  voice_tone: z.enum(ALLOWED_VOICE_TONES),
  forbidden_elements: z.string().max(500).optional().default(''),
  reference_notes: z.string().max(1000).optional().default(''),
})

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

async function getApprovedGeminiModel(sql: any): Promise<string> {
  try {
    const rows = await sql`
      SELECT value FROM public.system_settings 
      WHERE key = 'approved_copywriting_model' 
      LIMIT 1
    `
    if (rows && rows.length > 0 && rows[0].value) {
      return String(rows[0].value).trim()
    }
  } catch (err: any) {
    console.error('[AI_MODEL_FETCH_ERR]', err?.message || err)
  }

  throw new GeminiServiceError(
    'Nenhum modelo de IA aprovado para copywriting foi configurado. O administrador deve testar e aprovar um modelo no painel de diagnóstico antes de utilizar a IA.'
  )
}

const MAX_SOURCE_TEXT_LENGTH = 10000
const AI_TIMEOUT_MS = 12000

async function generateContentMappingWithGemini(
  options: GenerateAiMappingOptions,
  sql: any
): Promise<{ mapping: AiContentMappingResult; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new MissingApiKeyError()
  }

  const model = await getApprovedGeminiModel(sql)
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

REGRAS DE OURO DE RIGOR E GROUNDING:
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

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\n---\n\n${userPrompt}` }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          warnings: { type: 'array', items: { type: 'string' } },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                section_id: { type: 'string' },
                fields: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field_key: { type: 'string' },
                      suggested_value: { type: 'string' },
                      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                      source_excerpt: { type: 'string' },
                      rationale: { type: 'string' },
                      needs_review: { type: 'boolean' },
                    },
                    required: ['field_key', 'suggested_value', 'confidence'],
                  },
                },
              },
              required: ['section_id', 'fields'],
            },
          },
        },
        required: ['summary', 'sections'],
      },
    },
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
  const startTime = Date.now()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  let rawResponseText = ''
  let elapsedMsFetch = 0

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    elapsedMsFetch = Date.now() - startTime

    if (!response.ok) {
      let rawErrorBody = ''
      try {
        rawErrorBody = await response.text()
      } catch {}
      const sanitizedErrorBody = rawErrorBody.replace(new RegExp(apiKey, 'g'), '[REDACTED]')
      console.error('[AI_SINGLE_CALL]', {
        model,
        elapsedMs: elapsedMsFetch,
        status: response.status,
        code: 'NON_200_RESPONSE',
        errorBody: sanitizedErrorBody,
      })
      throw new GeminiServiceError(
        `O modelo ${model} retornou status HTTP ${response.status}. Detalhes: ${sanitizedErrorBody}`,
        response.status
      )
    }

    console.log('[AI_SINGLE_CALL]', {
      model,
      elapsedMs: elapsedMsFetch,
      status: response.status,
    })

    const data: any = await response.json()
    const candidatePart = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!candidatePart || typeof candidatePart !== 'string') {
      throw new GeminiServiceError('A inteligência artificial não devolveu uma resposta de conteúdo estruturada.')
    }

    rawResponseText = candidatePart.trim()
  } catch (err: any) {
    const elapsedMs = Date.now() - startTime
    if (err.name === 'AbortError') {
      console.error('[AI_SINGLE_CALL]', {
        model,
        elapsedMs,
        timeoutMs: AI_TIMEOUT_MS,
        code: 'AI_TIMEOUT',
      })
      throw new GeminiServiceError('O pedido ao serviço de inteligência artificial excedeu o tempo limite (12s). Tente novamente.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }

  let parsedJson: any
  try {
    // Sem limpeza de markdown — responseMimeType: 'application/json' garante JSON puro.
    // JSON truncado ou inválido nunca é reparado; falha de forma explícita e registada.
    parsedJson = JSON.parse(rawResponseText)
  } catch (parseErr: any) {
    console.error('[AI_INVALID_STRUCTURED_OUTPUT]', {
      model,
      elapsedMs: elapsedMsFetch,
      code: 'AI_INVALID_STRUCTURED_OUTPUT',
      parseError: parseErr.message,
      rawSnippet: rawResponseText.slice(0, 200),
    })
    throw new GeminiServiceError(
      'A resposta da IA não é JSON válido (possivelmente truncada). Clique em "Regenerar sugestões" para tentar novamente.',
      422
    )
  }

  const validation = aiContentMappingResultSchema.safeParse(parsedJson)
  if (!validation.success) {
    console.error('[AI_INVALID_STRUCTURED_OUTPUT]', {
      model,
      elapsedMs: elapsedMsFetch,
      code: 'AI_INVALID_STRUCTURED_OUTPUT',
      zodIssues: validation.error.issues.slice(0, 5),
    })
    throw new GeminiServiceError(
      'A estrutura JSON devolvida pela IA não cumpre o contrato de campos obrigatórios. Clique em "Regenerar sugestões".',
      422
    )
  }

  const validatedResult = validation.data
  const sanitizedSections = validatedResult.sections
    .map((sec) => {
      const validTplSection = options.templateSchema.sections.find((s) => s.id === sec.section_id)
      if (!validTplSection) return null

      const validFields = sec.fields
        .filter((f) => validTplSection.editable_fields.some((ef) => ef.key === (f.field_key || f.key)))
        .map((f) => ({
          field_key: f.field_key || f.key || '',
          suggested_value: f.suggested_value || f.value || '',
          confidence: f.confidence || 'medium',
          source_excerpt: f.source_excerpt || '',
          rationale: f.rationale || f.reason || '',
          needs_review: typeof f.needs_review === 'boolean' ? f.needs_review : true,
        }))

      return {
        section_id: sec.section_id,
        fields: validFields,
      }
    })
    .filter((sec): sec is NonNullable<typeof sec> => sec !== null)
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
  options: RecommendTemplateOptions,
  sql: any
): Promise<{ recommendation: TemplateRecommendationResult; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new MissingApiKeyError()
  }

  const model = await getApprovedGeminiModel(sql)

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

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\n---\n\n${userPrompt}` }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`

  let rawResponseText = ''
  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Falha no serviço de recomendação de templates (HTTP ${response.status}).`)
    }

    const responseJson: any = await response.json()
    const textPart = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textPart) {
      throw new Error('A inteligência artificial não retornou conteúdo na resposta.')
    }

    rawResponseText = textPart.trim()
  } catch (err: any) {
    if (err.name === 'AbortError') {
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

  // 0. /api/projects/brand
  if (subPath === 'brand' || subPath.startsWith('brand') || subPath.endsWith('/brand') || subPath.includes('/brand/')) {
    const brandSub = subPath.replace(/^brand\/?/, '').trim()

    // Ensure database tables for brand identity exist on Neon
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS public.project_brand_kits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
          active_version INT NOT NULL DEFAULT 1,
          status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'applied')),
          brand_data JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
      await sql`
        CREATE TABLE IF NOT EXISTS public.project_brand_versions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
          version INT NOT NULL,
          status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'applied')),
          brand_data JSONB NOT NULL,
          change_summary TEXT,
          created_by UUID REFERENCES public.profiles(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT unique_project_brand_version UNIQUE (project_id, version)
        );
      `
      await sql`CREATE INDEX IF NOT EXISTS idx_brand_kits_project ON public.project_brand_kits(project_id);`
      await sql`CREATE INDEX IF NOT EXISTS idx_brand_versions_project ON public.project_brand_versions(project_id);`
      await sql`CREATE INDEX IF NOT EXISTS idx_brand_versions_lookup ON public.project_brand_versions(project_id, version DESC);`
    } catch (migErr: any) {
      console.warn('[DB BRAND MIGRATION NOTICE]', migErr?.message || migErr)
    }

    // 0.1 POST /api/projects/brand/restore (Restaurar como Rascunho)
    if (brandSub === 'restore' || brandSub.endsWith('/restore')) {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' })
      }

      const { project_id, version_id, id } = req.body || {}
      const targetProjectId = project_id || id || req.query?.projectId || req.query?.id

      if (!targetProjectId || !version_id) {
        return res.status(400).json({ error: 'ID de projeto e ID de versão são obrigatórios.' })
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(targetProjectId) || !uuidRegex.test(version_id)) {
        return res.status(400).json({ error: 'Identificadores de projeto e versão inválidos.' })
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
            return res.status(403).json({ error: 'Não tem permissão para alterar a identidade deste projeto.' })
          }
        }

        const verRows = await sql`
          SELECT * FROM public.project_brand_versions
          WHERE id = ${version_id} AND project_id = ${targetProjectId}
          LIMIT 1
        `
        if (verRows.length === 0) {
          return res.status(404).json({ error: 'Versão de identidade visual não encontrada neste projeto.' })
        }

        const targetVer = verRows[0] as any

        await sql`BEGIN`
        try {
          await sql`SELECT id FROM public.projects WHERE id = ${targetProjectId} FOR UPDATE`

          const maxRows = await sql`
            SELECT COALESCE(MAX(version), 0)::int as max_ver
            FROM public.project_brand_versions
            WHERE project_id = ${targetProjectId}
          `
          const nextVersion = ((maxRows[0] as any)?.max_ver || 0) + 1
          const changeSummary = `Restaurado como rascunho a partir da Versão ${targetVer.version}`

          const newVerRows = await sql`
            INSERT INTO public.project_brand_versions (
              project_id, version, status, brand_data, change_summary, created_by
            )
            VALUES (
              ${targetProjectId}, ${nextVersion}, 'draft', ${JSON.stringify(targetVer.brand_data)}::jsonb, ${changeSummary}, ${authUser.id}
            )
            RETURNING *
          `

          await sql`COMMIT`

          const allVersions = await sql`
            SELECT pbv.*, prof.full_name as creator_name
            FROM public.project_brand_versions pbv
            LEFT JOIN public.profiles prof ON prof.id = pbv.created_by
            WHERE pbv.project_id = ${targetProjectId}
            ORDER BY pbv.version DESC
          `

          const currentKitRows = await sql`
            SELECT * FROM public.project_brand_kits WHERE project_id = ${targetProjectId} LIMIT 1
          `

          return res.status(200).json({
            message: `Versão ${targetVer.version} restaurada com sucesso como novo Rascunho (Versão ${nextVersion}).`,
            newVersion: newVerRows[0],
            currentKit: currentKitRows[0] || null,
            versions: allVersions,
          })
        } catch (txErr) {
          await sql`ROLLBACK`
          throw txErr
        }
      } catch (err: any) {
        console.error('[API /api/projects/brand/restore] Error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível restaurar a versão de identidade visual.' })
      }
    }

    // 0.2 GET /api/projects/brand
    if (req.method === 'GET') {
      const targetProjectId = req.query?.projectId || req.query?.project_id || req.query?.id
      if (!targetProjectId) {
        return res.status(400).json({ error: 'ID de projeto obrigatório.' })
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(targetProjectId)) {
        return res.status(400).json({ error: 'ID de projeto inválido.' })
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
            WHERE project_id = ${targetProjectId} AND user_id = ${authUser.id}
            LIMIT 1
          `
          if (memberCheck.length === 0) {
            return res.status(403).json({ error: 'Não tem acesso a este projeto.' })
          }
        }

        const kitRows = await sql`
          SELECT * FROM public.project_brand_kits WHERE project_id = ${targetProjectId} LIMIT 1
        `
        const versions = await sql`
          SELECT pbv.*, prof.full_name as creator_name
          FROM public.project_brand_versions pbv
          LEFT JOIN public.profiles prof ON prof.id = pbv.created_by
          WHERE pbv.project_id = ${targetProjectId}
          ORDER BY pbv.version DESC
        `

        return res.status(200).json({
          currentKit: kitRows[0] || null,
          latestVersion: versions[0] || null,
          versions,
        })
      } catch (err: any) {
        console.error('[API /api/projects/brand GET] Error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível carregar a identidade visual do projeto.' })
      }
    }

    // 0.3 PUT/POST /api/projects/brand (Save Draft or Apply)
    if (req.method === 'PUT' || req.method === 'POST') {
      const { project_id, id, action = 'save_draft', brand_data, change_summary } = req.body || {}
      const targetProjectId = project_id || id || req.query?.projectId || req.query?.id

      if (!targetProjectId) {
        return res.status(400).json({ error: 'ID de projeto é obrigatório.' })
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(targetProjectId)) {
        return res.status(400).json({ error: 'ID de projeto inválido.' })
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
            return res.status(403).json({ error: 'Não tem permissão para alterar a identidade visual deste projeto.' })
          }
        }

        const isApply = action === 'apply'
        const schema = isApply ? applyBrandKitSchema : draftBrandKitSchema
        const validation = schema.safeParse(brand_data || {})

        if (!validation.success) {
          const firstErr = validation.error.issues[0]?.message || 'Dados de identidade visual inválidos.'
          return res.status(422).json({
            error: firstErr,
            details: validation.error.issues,
          })
        }

        const validatedData = validation.data
        const targetStatus = isApply ? 'applied' : 'draft'

        await sql`BEGIN`
        let newVerRow: any
        let updatedKitRow: any
        try {
          await sql`SELECT id FROM public.projects WHERE id = ${targetProjectId} FOR UPDATE`

          const maxRows = await sql`
            SELECT COALESCE(MAX(version), 0)::int as max_ver
            FROM public.project_brand_versions
            WHERE project_id = ${targetProjectId}
          `
          const nextVersion = ((maxRows[0] as any)?.max_ver || 0) + 1
          const summaryText = change_summary || (isApply ? 'Identidade visual aplicada ao projeto' : 'Rascunho de identidade guardado')

          const verInsert = await sql`
            INSERT INTO public.project_brand_versions (
              project_id, version, status, brand_data, change_summary, created_by
            )
            VALUES (
              ${targetProjectId}, ${nextVersion}, ${targetStatus}, ${JSON.stringify(validatedData)}::jsonb, ${summaryText}, ${authUser.id}
            )
            RETURNING *
          `
          newVerRow = verInsert[0]

          if (isApply) {
            const kitUpsert = await sql`
              INSERT INTO public.project_brand_kits (
                project_id, active_version, status, brand_data, updated_at
              )
              VALUES (
                ${targetProjectId}, ${nextVersion}, 'applied', ${JSON.stringify(validatedData)}::jsonb, NOW()
              )
              ON CONFLICT (project_id) DO UPDATE SET
                active_version = EXCLUDED.active_version,
                status = EXCLUDED.status,
                brand_data = EXCLUDED.brand_data,
                updated_at = NOW()
              RETURNING *
            `
            updatedKitRow = kitUpsert[0]
          } else {
            const existingKit = await sql`
              SELECT * FROM public.project_brand_kits WHERE project_id = ${targetProjectId} LIMIT 1
            `
            updatedKitRow = existingKit[0] || null
          }

          await sql`COMMIT`
        } catch (txErr) {
          await sql`ROLLBACK`
          throw txErr
        }

        const allVersions = await sql`
          SELECT pbv.*, prof.full_name as creator_name
          FROM public.project_brand_versions pbv
          LEFT JOIN public.profiles prof ON prof.id = pbv.created_by
          WHERE pbv.project_id = ${targetProjectId}
          ORDER BY pbv.version DESC
        `

        return res.status(200).json({
          message: isApply
            ? 'Identidade visual aplicada com sucesso ao projeto!'
            : 'Rascunho de identidade visual guardado com sucesso.',
          version: newVerRow,
          currentKit: updatedKitRow,
          versions: allVersions,
        })
      } catch (err: any) {
        console.error('[API /api/projects/brand PUT] Error:', err?.message || err)
      }
    }

    return res.status(405).json({ error: 'Método não permitido.' })
  }

  // 0.5 Pages & Revisions Endpoints (/api/projects/:projectId/pages, /api/projects/pages)
    if (subPath === 'pages' || subPath.includes('/pages') || subPath.startsWith('pages')) {
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS public.project_pages (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
              name VARCHAR(100) NOT NULL,
              slug VARCHAR(100) NOT NULL,
              is_home BOOLEAN DEFAULT FALSE,
              page_tree JSONB NOT NULL DEFAULT '{"nodes": []}'::jsonb,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW(),
              CONSTRAINT unique_project_page_slug UNIQUE (project_id, slug)
          );
        `
        await sql`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_project_home_page 
          ON public.project_pages (project_id) 
          WHERE is_home = true;
        `
        await sql`
          CREATE TABLE IF NOT EXISTS public.project_page_revisions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
              page_id UUID NOT NULL REFERENCES public.project_pages(id) ON DELETE CASCADE,
              revision_number INT NOT NULL,
              status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'published')),
              page_tree JSONB NOT NULL,
              change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('initial_import', 'migration_correction', 'inspector_edit', 'ai_patch_apply', 'node_reorder', 'version_restore', 'publish')),
              change_summary TEXT,
              created_by UUID REFERENCES public.profiles(id),
              created_at TIMESTAMPTZ DEFAULT NOW(),
              CONSTRAINT unique_page_revision_number UNIQUE (page_id, revision_number)
          );
        `
        await sql`ALTER TABLE public.project_page_revisions DROP CONSTRAINT IF EXISTS project_page_revisions_change_type_check;`
        await sql`ALTER TABLE public.project_page_revisions ADD CONSTRAINT project_page_revisions_change_type_check CHECK (change_type IN ('initial_import', 'migration_correction', 'inspector_edit', 'ai_patch_apply', 'node_reorder', 'version_restore', 'publish'));`
        await sql`CREATE INDEX IF NOT EXISTS idx_project_pages_project ON public.project_pages(project_id);`
        await sql`CREATE INDEX IF NOT EXISTS idx_page_revisions_lookup ON public.project_page_revisions(page_id, revision_number DESC);`
      } catch (migErr: any) {
        console.warn('[DB PAGES MIGRATION NOTICE]', migErr?.message || migErr)
      }

      const parts = subPath.split('/')
      let targetProjectId = req.query?.projectId || req.query?.project_id || req.query?.id || req.body?.project_id || req.body?.projectId
      let targetPageId = req.query?.pageId || req.query?.page_id || req.body?.page_id || req.body?.pageId

      if (!targetProjectId) {
        if (parts.length >= 2 && parts[1] === 'pages') {
          targetProjectId = parts[0]
        }
        if (parts.length >= 3 && parts[1] === 'pages') {
          targetProjectId = parts[0]
          targetPageId = parts[2]
        }
      }

      if (!targetProjectId) {
        return res.status(400).json({ error: 'ID de projeto obrigatório.' })
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(targetProjectId)) {
        return res.status(400).json({ error: 'ID de projeto inválido.' })
      }

      const projectRows = await sql`SELECT * FROM public.projects WHERE id = ${targetProjectId} LIMIT 1`
      if (projectRows.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado.' })
      }

      const project = projectRows[0] as any
      if (authUser.role !== 'admin' && project.created_by !== authUser.id && project.assigned_to !== authUser.id) {
        const memberCheck = await sql`
          SELECT 1 FROM public.project_members
          WHERE project_id = ${targetProjectId} AND user_id = ${authUser.id}
          LIMIT 1
        `
        if (memberCheck.length === 0) {
          return res.status(403).json({ error: 'Não tem permissão para aceder às páginas deste projeto.' })
        }
      }

      const existingPages = await sql`
        SELECT * FROM public.project_pages
        WHERE project_id = ${targetProjectId}
        ORDER BY is_home DESC, created_at ASC
      `

      if (existingPages.length === 0) {
        try {
          const defaultNodes = [
            { id: 'node-hero-1', type: 'HeroBlock', section_type: 'hero', properties: { headline: project.name || 'Blue Bolt Studio', subheadline: 'Página Inicial do Projeto', cta_primary_text: 'Contacto', cta_primary_url: '#contact', cta_secondary_text: '', cta_secondary_url: '', badge_text: '', bg_image_url: '' } },
            { id: 'node-footer-1', type: 'FooterBlock', section_type: 'footer', properties: { copyright_text: '© 2026 Blue Bolt Studio', links: [{ label: 'Termos', url: '#terms' }] } }
          ]
          const pageTree = project.page_data && Array.isArray((project.page_data as any).nodes)
            ? project.page_data
            : { nodes: defaultNodes }

          const initialStatus = (project.status === 'approved' || project.status === 'delivered') ? 'published' : 'draft'
          
          const insPage = await sql`
            INSERT INTO public.project_pages (project_id, name, slug, is_home, page_tree, created_at, updated_at)
            VALUES (${targetProjectId}, 'Página Principal', 'home', true, ${JSON.stringify(pageTree)}, ${project.created_at || new Date().toISOString()}, NOW())
            RETURNING *
          `
          const newPage = insPage[0]

          await sql`
            INSERT INTO public.project_page_revisions (
              project_id, page_id, revision_number, status, page_tree, change_type, change_summary, created_by, created_at
            ) VALUES (
              ${targetProjectId}, ${newPage.id}, 1, ${initialStatus}, ${JSON.stringify(pageTree)}, 'initial_import', 'Migração automática do conteúdo do projeto', ${authUser.id}, NOW()
            )
          `
          existingPages.push(newPage)
        } catch (autoErr) {
          console.error('[AUTO BACKFILL ERROR]', autoErr)
        }
      }

      if (req.method === 'GET' && !targetPageId) {
        return res.status(200).json(existingPages)
      }

      if (req.method === 'POST' && !targetPageId) {
        const { name, slug, is_home } = req.body || {}
        if (!name || !slug) {
          return res.status(400).json({ error: 'Nome e slug são obrigatórios.' })
        }

        const slugRegex = /^[a-z0-9-]+$/
        if (!slugRegex.test(slug)) {
          return res.status(400).json({ error: 'O slug deve conter apenas letras minúsculas, números e hífens.' })
        }

        const dupSlug = await sql`
          SELECT id FROM public.project_pages
          WHERE project_id = ${targetProjectId} AND slug = ${slug}
          LIMIT 1
        `
        if (dupSlug.length > 0) {
          return res.status(409).json({ error: 'Já existe uma página com este slug neste projeto.' })
        }

        const defaultTree = {
          nodes: [
            { id: 'node-hero-1', type: 'HeroBlock', section_type: 'hero', properties: { headline: name, subheadline: '', cta_primary_text: 'Saber Mais', cta_primary_url: '#contact', cta_secondary_text: '', cta_secondary_url: '', badge_text: '', bg_image_url: '' } },
            { id: 'node-footer-1', type: 'FooterBlock', section_type: 'footer', properties: { copyright_text: '© 2026 Blue Bolt Studio', links: [] } }
          ]
        }

        const newPageRows = await sql`
          INSERT INTO public.project_pages (project_id, name, slug, is_home, page_tree, created_at, updated_at)
          VALUES (${targetProjectId}, ${name}, ${slug}, ${Boolean(is_home)}, ${JSON.stringify(defaultTree)}, NOW(), NOW())
          RETURNING *
        `
        const createdPage = newPageRows[0]

        const revRows = await sql`
          INSERT INTO public.project_page_revisions (
            project_id, page_id, revision_number, status, page_tree, change_type, change_summary, created_by, created_at
          ) VALUES (
            ${targetProjectId}, ${createdPage.id}, 1, 'draft', ${JSON.stringify(defaultTree)}, 'initial_import', 'Página criada', ${authUser.id}, NOW()
          )
          RETURNING *
        `

        return res.status(201).json({
          page: createdPage,
          initialRevision: revRows[0],
        })
      }

      if (targetPageId) {
        const pageRows = await sql`
          SELECT * FROM public.project_pages
          WHERE id = ${targetPageId} AND project_id = ${targetProjectId}
          LIMIT 1
        `
        if (pageRows.length === 0) {
          return res.status(404).json({ error: 'Página não encontrada neste projeto.' })
        }
        const targetPage = pageRows[0]

        if (req.method === 'GET') {
          const revs = await sql`
            SELECT * FROM public.project_page_revisions
            WHERE page_id = ${targetPageId}
            ORDER BY revision_number DESC
            LIMIT 1
          `
          return res.status(200).json({
            page: targetPage,
            currentRevision: revs[0] || null,
          })
        }

        if (req.method === 'PUT' && (subPath.endsWith('/revisions') || subPath.includes('/revisions'))) {
          const { page_tree, expected_revision, change_summary } = req.body || {}
          if (!page_tree || expected_revision === undefined || expected_revision === null) {
            return res.status(400).json({ error: 'Árvore de página (page_tree) e número de revisão esperado (expected_revision) são obrigatórios.' })
          }

          await sql`BEGIN`
          try {
            await sql`SELECT id FROM public.project_pages WHERE id = ${targetPageId} FOR UPDATE`

            const maxRows = await sql`
              SELECT COALESCE(MAX(revision_number), 0)::int as current_rev
              FROM public.project_page_revisions
              WHERE page_id = ${targetPageId}
            `
            const currentRev = ((maxRows[0] as any)?.current_rev || 0)

            if (Number(expected_revision) !== currentRev) {
              await sql`ROLLBACK`
              return res.status(409).json({
                error: 'Conflito de edição detetado. A página foi alterada por outro utilizador.',
                code: 'VERSION_CONFLICT',
                serverRevision: currentRev,
                latestTree: targetPage.page_tree,
              })
            }

            const nextRev = currentRev + 1

            const insRev = await sql`
              INSERT INTO public.project_page_revisions (
                project_id, page_id, revision_number, status, page_tree, change_type, change_summary, created_by, created_at
              ) VALUES (
                ${targetProjectId}, ${targetPageId}, ${nextRev}, 'draft', ${JSON.stringify(page_tree)}, 'inspector_edit', ${change_summary || 'Edição no Studio'}, ${authUser.id}, NOW()
              )
              RETURNING *
            `

            const updPage = await sql`
              UPDATE public.project_pages
              SET page_tree = ${JSON.stringify(page_tree)}, updated_at = NOW()
              WHERE id = ${targetPageId}
              RETURNING *
            `

            await sql`COMMIT`

            return res.status(200).json({
              message: `Revisão ${nextRev} guardada com sucesso.`,
              revision: insRev[0],
              page: updPage[0],
            })
          } catch (txErr) {
            await sql`ROLLBACK`
            throw txErr
          }
        }

        if (req.method === 'POST' && subPath.endsWith('/restore')) {
          const { revision_id } = req.body || {}
          if (!revision_id) {
            return res.status(400).json({ error: 'ID da revisão a restaurar é obrigatório.' })
          }

          const targetRevRows = await sql`
            SELECT * FROM public.project_page_revisions
            WHERE id = ${revision_id} AND page_id = ${targetPageId}
            LIMIT 1
          `
          if (targetRevRows.length === 0) {
            return res.status(404).json({ error: 'Revisão não encontrada.' })
          }

          const targetRev = targetRevRows[0]

          await sql`BEGIN`
          try {
            await sql`SELECT id FROM public.project_pages WHERE id = ${targetPageId} FOR UPDATE`

            const maxRows = await sql`
              SELECT COALESCE(MAX(revision_number), 0)::int as current_rev
              FROM public.project_page_revisions
              WHERE page_id = ${targetPageId}
            `
            const nextRev = ((maxRows[0] as any)?.current_rev || 0) + 1

            const insRev = await sql`
              INSERT INTO public.project_page_revisions (
                project_id, page_id, revision_number, status, page_tree, change_type, change_summary, created_by, created_at
              ) VALUES (
                ${targetProjectId}, ${targetPageId}, ${nextRev}, 'draft', ${JSON.stringify(targetRev.page_tree)}, 'version_restore', ${`Restaurado a partir da Revisão ${targetRev.revision_number}`}, ${authUser.id}, NOW()
              )
              RETURNING *
            `

            const updPage = await sql`
              UPDATE public.project_pages
              SET page_tree = ${JSON.stringify(targetRev.page_tree)}, updated_at = NOW()
              WHERE id = ${targetPageId}
              RETURNING *
            `

            await sql`COMMIT`

            return res.status(200).json({
              message: `Revisão ${targetRev.revision_number} restaurada com sucesso como nova Revisão ${nextRev} (Rascunho).`,
              newRevision: insRev[0],
              page: updPage[0],
            })
          } catch (txErr) {
            await sql`ROLLBACK`
            throw txErr
          }
        }
      }

      return res.status(405).json({ error: 'Método não permitido.' })
    }

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
          const aiRes = await recommendTemplateWithGemini(
            {
              industry_key: industryKey,
              industry_custom: industryCustom,
              clientName: project.client_name,
              clientBusiness: project.client_business,
              objective: briefing.objective,
              services_products: briefing.services_products,
              availableTemplates: summaries,
            },
            sql
          )

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

        const aiResult = await generateContentMappingWithGemini(
          {
            projectName: project.name,
            clientName: project.client_name,
            clientBusiness: project.client_business,
            industryKey: briefingData.industry_key || null,
            industryCustom: briefingData.industry_custom || null,
            briefing: briefingData,
            sourceText: contentSource.extracted_text,
            templateSchema: template.schema,
          },
          sql
        )

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
