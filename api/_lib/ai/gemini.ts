import { z } from 'zod'

export const aiSuggestedFieldSchema = z.object({
  key: z.string().min(1),
  value: z.string().default(''),
  confidence: z.enum(['high', 'medium', 'low']),
  reason: z.string().default(''),
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

export type AiContentMappingResult = z.infer<typeof aiContentMappingResultSchema>

export interface GenerateAiMappingOptions {
  projectName: string
  clientName?: string | null
  clientBusiness?: string | null
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

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
const MAX_SOURCE_TEXT_LENGTH = 35000
const AI_TIMEOUT_MS = 40000

export async function generateContentMappingWithGemini(
  options: GenerateAiMappingOptions
): Promise<{ mapping: AiContentMappingResult; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new MissingApiKeyError()
  }

  const model = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim()

  // 1. Sanitize & prepare prompt payload
  const sanitizedText = (options.sourceText || '').slice(0, MAX_SOURCE_TEXT_LENGTH).trim()

  const validSectionsSummary = options.templateSchema.sections.map((s) => ({
    section_id: s.id,
    label: s.label,
    purpose: s.purpose,
    required: s.required || false,
    fields: s.editable_fields.map((f) => ({
      key: f.key,
      label: f.label,
      field_type: f.field_type,
      required: f.required || false,
      ai_hint: f.ai_hint || '',
    })),
  }))

  const systemInstruction = `És o Assistente Estratégico de Copywriting e Estruturação de Landing Pages da agência digital Blue Bolt.
A tua missão é analisar o texto do cliente e o briefing do projeto, extraindo e mapeando conteúdos para os campos editáveis do template de landing page selecionado.

DIRETRIZES FUNDAMENTAIS:
1. Idioma Obrigatório: Português de Portugal (pt-PT). Utiliza ortografia e vocabulário natural de Portugal (ex: "contacto", "equipa", "otimização", "experiência").
2. Estilo: Profissional, comercial, conciso, de alta conversão, focado nos benefícios reais para o cliente.
3. Rigor e Ética:
   - NUNCA inventes preços, contactos, moradas, testemunhos falsos, garantias financeiras ou certificações não mencionadas no texto.
   - Se faltar informação para um campo específico, deixa o valor vazio ("") e adiciona um aviso informativo em 'warnings'.
4. Estrutura do Esquema:
   - Apenas deves incluir 'section_id' que existam na lista de secções do template.
   - Para cada secção, apenas deves mapear chaves 'key' que existam explicitamente na lista de campos dessa secção.
   - NUNCA adiciones tags HTML arbitrárias, scripts ou links externos não fornecidos.
5. Formato de Saída Obrigatório:
   - Deves responder estritamente num documento JSON válido de acordo com o esquema requerido:
   {
     "summary": "Resumo estratégico curto em 2-3 frases sobre o posicionamento e adequação do conteúdo ao template",
     "warnings": ["Lista de eventuais informações em falta ou pontos que requerem validação humana com o cliente"],
     "sections": [
       {
         "section_id": "id_da_seccao",
         "fields": [
           {
             "key": "chave_do_campo",
             "value": "Texto sugerido para o campo",
             "confidence": "high" | "medium" | "low",
             "reason": "Justificação concisa da escolha do texto"
           }
         ]
       }
     ]
   }`

  const userPrompt = `DADOS DO PROJETO E CLIENTE:
- Nome do Projeto: ${options.projectName}
- Nome do Cliente: ${options.clientName || 'N/D'}
- Ramo de Atividade: ${options.clientBusiness || 'N/D'}
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

Por favor, gera as sugestões estruturadas em JSON rigoroso.`

  // 2. Execute Gemini REST API request with timeout
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
      temperature: 0.2,
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
      const errorBody = await response.text().catch(() => '')
      console.error(`[AI Service] Gemini API returned HTTP status ${response.status}:`, errorBody.slice(0, 300))
      throw new Error(`Erro na comunicação com o serviço de inteligência artificial (HTTP ${response.status}).`)
    }

    const data: any = await response.json()
    const candidatePart = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!candidatePart || typeof candidatePart !== 'string') {
      throw new Error('A inteligência artificial não devolveu uma resposta de conteúdo estruturada.')
    }

    rawResponseText = candidatePart.trim()
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[AI Service] Gemini API call timed out.')
      throw new Error('O pedido ao serviço de inteligência artificial excedeu o tempo limite. Tente novamente.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }

  // 3. Parse and strictly validate response JSON
  let parsedJson: any
  try {
    // Strip markdown code fences if model enclosed in ```json ... ```
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
          .filter((f) => allowedFields.has(f.key))
          .map((f) => ({
            key: f.key,
            value: typeof f.value === 'string' ? f.value.trim() : String(f.value || ''),
            confidence: f.confidence || 'medium',
            reason: f.reason || '',
          })),
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
  const model = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim()

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
    model,
  }
}
