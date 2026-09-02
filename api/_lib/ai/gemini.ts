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
  summary: z.string(),
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

let confirmedModel: string | null = null

async function getCandidateModels(apiKey: string): Promise<string[]> {
  if (confirmedModel) {
    return [confirmedModel]
  }

  try {
    const listCtrl = new AbortController()
    const listTimer = setTimeout(() => listCtrl.abort(), 4500)
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { signal: listCtrl.signal }
    )
    clearTimeout(listTimer)

    if (listRes.ok) {
      const data: any = await listRes.json()
      const modelsList = Array.isArray(data?.models) ? data.models : []

      const candidates: string[] = modelsList
        .filter((m: any) => m && m.name && Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => String(m.name).replace(/^models\//, ''))

      console.log('[AI_SAFE_DISCOVERY]', {
        totalAvailable: candidates.length,
        models: candidates.slice(0, 10),
      })

      if (candidates.length > 0) {
        const flashModels = candidates.filter((c: string) => c.includes('flash'))
        const proModels = candidates.filter((c: string) => c.includes('pro'))
        const otherModels = candidates.filter((c: string) => !c.includes('flash') && !c.includes('pro'))

        return [...flashModels, ...proModels, ...otherModels]
      }
    }
  } catch (err: any) {
    console.error('[AI_DISCOVERY_ERROR]', { code: err?.name || 'FETCH_FAIL' })
  }

  return []
}

const MAX_SOURCE_TEXT_LENGTH = 15000
const AI_TIMEOUT_MS = 20000

export async function generateContentMappingWithGemini(
  options: GenerateAiMappingOptions
): Promise<{ mapping: AiContentMappingResult; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new MissingApiKeyError()
  }

  const candidates = await getCandidateModels(apiKey)
  if (candidates.length === 0) {
    throw new GeminiServiceError('A configuração da IA precisa de ser atualizada. Tente novamente dentro de instantes.')
  }

  // 1. Sanitize & prepare prompt payload
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
  let usedModel = ''

  for (const candidate of candidates) {
    console.log(`[AI_MODEL_CANDIDATE] model=${candidate} method=generateContent`)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
    const startTime = Date.now()

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:generateContent?key=${encodeURIComponent(apiKey)}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      const elapsedMs = Date.now() - startTime

      if (!response.ok) {
        console.log(`[AI_MODEL_REJECTED] model=${candidate} status=${response.status}`)
        console.error('[AI_SAFE_TIMING]', {
          model: candidate,
          endpointFamily: 'v1beta/generateContent',
          elapsedMs,
          status: response.status,
          code: 'NON_200_RESPONSE',
        })
        continue
      }

      const data: any = await response.json()
      const candidatePart = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!candidatePart || typeof candidatePart !== 'string') {
        console.log(`[AI_MODEL_REJECTED] model=${candidate} status=EMPTY_OUTPUT`)
        continue
      }

      console.log(`[AI_MODEL_CONFIRMED] model=${candidate} method=generateContent`)
      console.log('[AI_SAFE_TIMING]', {
        model: candidate,
        endpointFamily: 'v1beta/generateContent',
        elapsedMs,
        status: response.status,
      })

      confirmedModel = candidate
      usedModel = candidate
      rawResponseText = candidatePart.trim()
      break
    } catch (err: any) {
      const elapsedMs = Date.now() - startTime
      console.log(`[AI_MODEL_REJECTED] model=${candidate} status=${err?.name || 'TIMEOUT'}`)
      console.error('[AI_SAFE_TIMING]', {
        model: candidate,
        endpointFamily: 'v1beta/generateContent',
        elapsedMs,
        timeoutMs: AI_TIMEOUT_MS,
        code: err?.name === 'AbortError' ? 'AI_TIMEOUT' : 'FETCH_ERR',
      })
      continue
    } finally {
      clearTimeout(timeout)
    }
  }

  if (!rawResponseText) {
    throw new GeminiServiceError(
      'A configuração da IA precisa de ser atualizada. Tente novamente dentro de instantes.'
    )
  }

  // 3. Parse and strictly validate response JSON
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

  // 4. Schema guard: filter out any invalid section_ids or field keys not present in template
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
              // Aliases for seamless UI rendering
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
    model: usedModel,
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
  const candidates = await getCandidateModels(apiKey)
  if (candidates.length === 0) {
    throw new Error('Não foi encontrado nenhum modelo compatível para recomendação.')
  }

  // Pre-filter candidate templates: must contain industry_key or is_generic
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
      model: candidates[0],
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

  let rawResponseText = ''
  let usedModel = ''

  for (const candidate of candidates) {
    console.log(`[AI_MODEL_CANDIDATE] model=${candidate} method=generateContent`)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      candidate
    )}:generateContent?key=${encodeURIComponent(apiKey)}`

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok) {
        console.log(`[AI_MODEL_REJECTED] model=${candidate} status=${response.status}`)
        continue
      }

      const responseJson: any = await response.json()
      const textPart = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!textPart) {
        console.log(`[AI_MODEL_REJECTED] model=${candidate} status=EMPTY_OUTPUT`)
        continue
      }

      console.log(`[AI_MODEL_CONFIRMED] model=${candidate} method=generateContent`)
      confirmedModel = candidate
      usedModel = candidate
      rawResponseText = textPart.trim()
      break
    } catch (err: any) {
      console.log(`[AI_MODEL_REJECTED] model=${candidate} status=${err?.name || 'ERR'}`)
      continue
    } finally {
      clearTimeout(timeout)
    }
  }

  if (!rawResponseText) {
    throw new Error('Falha no serviço de recomendação de templates.')
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

  // Guard: ensure the recommended_template_id exists in candidates
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
    model: usedModel,
  }
}
