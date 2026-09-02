import { z } from 'zod'

export const aiSuggestedFieldSchema = z.object({
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

export const aiSuggestedSectionSchema = z.object({
  section_id: z.string().min(1),
  fields: z.array(aiSuggestedFieldSchema),
})

export const aiContentMappingResultSchema = z.object({
  summary: z.string().default('Sugestões geradas com base no conteúdo fornecido.'),
  warnings: z.array(z.string()).default([]),
  sections: z.array(aiSuggestedSectionSchema),
})

export type AiContentMappingResult = {
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

export interface GenerateAiMappingOptions {
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

export class MissingApiKeyError extends Error {
  constructor(message = 'A integração de IA ainda não está configurada. Contacte o administrador.') {
    super(message)
    this.name = 'MissingApiKeyError'
  }
}

export class GeminiServiceError extends Error {
  status: number
  constructor(message = 'A configuração da IA precisa de ser atualizada. Tente novamente dentro de instantes.', status = 500) {
    super(message)
    this.name = 'GeminiServiceError'
    this.status = status
  }
}

export interface AiDiagnosticResult {
  ok: boolean
  provider: 'gemini'
  model: string | null
  method: string | null
  httpStatus: number | null
  elapsedMs: number
  code: 'OK' | 'MODEL_UNAVAILABLE' | 'PROVIDER_ERROR' | 'TIMEOUT'
  error?: string | null
}

let confirmedWorkingModel: string | null = null

/**
 * Executes a single, fast diagnostic check of the Google Gemini AI integration.
 * Max timeout: 8 seconds.
 */
export async function runGeminiDiagnostic(apiKey?: string): Promise<AiDiagnosticResult> {
  const key = apiKey || process.env.GEMINI_API_KEY
  if (!key || key.trim() === '') {
    return {
      ok: false,
      provider: 'gemini',
      model: null,
      method: null,
      httpStatus: null,
      elapsedMs: 0,
      code: 'MODEL_UNAVAILABLE',
      error: 'GEMINI_API_KEY não configurada no servidor.',
    }
  }

  const startTime = Date.now()
  const diagnosticTimeoutMs = 8000

  try {
    // 1. Call ListModels once (timeout 4s)
    const listCtrl = new AbortController()
    const listTimer = setTimeout(() => listCtrl.abort(), 4000)
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      { signal: listCtrl.signal }
    )
    clearTimeout(listTimer)

    if (!listRes.ok) {
      const elapsedMs = Date.now() - startTime
      return {
        ok: false,
        provider: 'gemini',
        model: null,
        method: null,
        httpStatus: listRes.status,
        elapsedMs,
        code: 'PROVIDER_ERROR',
        error: `Falha ao listar modelos na Google API (HTTP ${listRes.status}).`,
      }
    }

    const data: any = await listRes.json()
    const modelsList = Array.isArray(data?.models) ? data.models : []
    const availableModels: string[] = modelsList
      .filter((m: any) => m && m.name && Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m: any) => String(m.name).replace(/^models\//, ''))

    if (availableModels.length === 0) {
      const elapsedMs = Date.now() - startTime
      return {
        ok: false,
        provider: 'gemini',
        model: null,
        method: null,
        httpStatus: 200,
        elapsedMs,
        code: 'MODEL_UNAVAILABLE',
        error: 'Nenhum modelo com suporte a generateContent encontrado para esta chave.',
      }
    }

    // Pick top candidate
    const selectedModel =
      availableModels.find((m: string) => m.includes('flash')) ||
      availableModels.find((m: string) => m.includes('pro')) ||
      availableModels[0]

    // 2. Perform ONE minimal test call (timeout 4s)
    const testCtrl = new AbortController()
    const testTimer = setTimeout(() => testCtrl.abort(), 4000)
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(key)}`

    const testRes = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Responde apenas com a palavra OK' }] }],
        generationConfig: { maxOutputTokens: 10, temperature: 0 },
      }),
      signal: testCtrl.signal,
    })
    clearTimeout(testTimer)
    const elapsedMs = Date.now() - startTime

    if (!testRes.ok) {
      return {
        ok: false,
        provider: 'gemini',
        model: selectedModel,
        method: 'generateContent',
        httpStatus: testRes.status,
        elapsedMs,
        code: 'PROVIDER_ERROR',
        error: `O modelo ${selectedModel} retornou status HTTP ${testRes.status}.`,
      }
    }

    const testData: any = await testRes.json()
    const textPart = testData?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textPart) {
      return {
        ok: false,
        provider: 'gemini',
        model: selectedModel,
        method: 'generateContent',
        httpStatus: testRes.status,
        elapsedMs,
        code: 'PROVIDER_ERROR',
        error: 'O modelo respondeu mas não gerou texto.',
      }
    }

    confirmedWorkingModel = selectedModel
    return {
      ok: true,
      provider: 'gemini',
      model: selectedModel,
      method: 'generateContent',
      httpStatus: testRes.status,
      elapsedMs,
      code: 'OK',
    }
  } catch (err: any) {
    const elapsedMs = Date.now() - startTime
    const isTimeout = err?.name === 'AbortError' || elapsedMs >= diagnosticTimeoutMs
    return {
      ok: false,
      provider: 'gemini',
      model: null,
      method: 'generateContent',
      httpStatus: null,
      elapsedMs,
      code: isTimeout ? 'TIMEOUT' : 'PROVIDER_ERROR',
      error: isTimeout ? 'O teste de diagnóstico excedeu o tempo limite (8s).' : (err?.message || 'Erro de comunicação'),
    }
  }
}

/**
 * Resolves a single confirmed model using ListModels.
 */
export async function getVerifiedGeminiModel(apiKey: string): Promise<string> {
  if (confirmedWorkingModel) {
    return confirmedWorkingModel
  }

  try {
    const listCtrl = new AbortController()
    const listTimer = setTimeout(() => listCtrl.abort(), 4000)
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { signal: listCtrl.signal }
    )
    clearTimeout(listTimer)

    if (listRes.ok) {
      const data: any = await listRes.json()
      const modelsList = Array.isArray(data?.models) ? data.models : []
      const availableModels: string[] = modelsList
        .filter((m: any) => m && m.name && Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => String(m.name).replace(/^models\//, ''))

      if (availableModels.length > 0) {
        const chosen =
          availableModels.find((m: string) => m.includes('flash')) ||
          availableModels.find((m: string) => m.includes('pro')) ||
          availableModels[0]
        confirmedWorkingModel = chosen
        return chosen
      }
    }
  } catch (err: any) {
    console.error('[AI_MODEL_DISCOVERY_ERR]', { code: err?.name || 'FETCH_FAIL' })
  }

  throw new GeminiServiceError('Nenhum modelo de IA compatível está disponível para esta chave.')
}

const MAX_SOURCE_TEXT_LENGTH = 10000
const AI_TIMEOUT_MS = 12000

/**
 * Generates AI structured suggestions for landing page editable fields.
 * Strictly performs EXACTLY ONE AI request with a maximum timeout of 12 seconds.
 */
export async function generateContentMappingWithGemini(
  options: GenerateAiMappingOptions
): Promise<{ mapping: AiContentMappingResult; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new MissingApiKeyError()
  }

  const model = await getVerifiedGeminiModel(apiKey)
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
      maxOutputTokens: 2200,
      responseMimeType: 'application/json',
    },
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
  const startTime = Date.now()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  let rawResponseText = ''

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const elapsedMs = Date.now() - startTime

    if (!response.ok) {
      console.error('[AI_SINGLE_CALL]', {
        model,
        elapsedMs,
        status: response.status,
        code: 'NON_200_RESPONSE',
      })
      throw new GeminiServiceError(
        'A configuração da IA precisa de ser atualizada. Tente novamente dentro de instantes.',
        response.status
      )
    }

    console.log('[AI_SINGLE_CALL]', {
      model,
      elapsedMs,
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

export const templateRecommendationSchema = z.object({
  recommended_template_id: z.string().nullable(),
  reason: z.string().default(''),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  warnings: z.array(z.string()).default([]),
})

export type TemplateRecommendationResult = z.infer<typeof templateRecommendationSchema>

export interface TemplateSummaryForAI {
  id: string
  name: string
  category: string
  industry_tags: string[]
  is_generic: boolean
  description: string | null
  section_labels: string[]
}

export interface RecommendTemplateOptions {
  industry_key: string
  industry_custom?: string
  clientName?: string | null
  clientBusiness?: string | null
  objective?: string
  services_products?: string
  availableTemplates: TemplateSummaryForAI[]
}

export async function recommendTemplateWithGemini(
  options: RecommendTemplateOptions
): Promise<{ recommendation: TemplateRecommendationResult; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new MissingApiKeyError()
  }

  const model = await getVerifiedGeminiModel(apiKey)

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
