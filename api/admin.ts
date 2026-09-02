import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'
import { z } from 'zod'

const AUTH_COOKIE_NAME = 'bluebolt_session'

const templateEditableFieldSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  field_type: z.enum([
    'text',
    'textarea',
    'rich_text',
    'image_url',
    'url',
    'cta',
    'metric',
    'list',
    'faq_list',
    'card_list',
    'form_fields',
  ]),
  required: z.boolean().default(false),
  max_length: z.number().int().positive().optional(),
  placeholder: z.string().optional(),
  ai_hint: z.string().optional(),
})

const templateSectionSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum([
    'hero',
    'services',
    'benefits',
    'process',
    'about',
    'team',
    'testimonials',
    'faq',
    'contact',
    'form',
    'footer',
  ]),
  label: z.string().min(1).max(100),
  purpose: z.string().min(1).max(300),
  required: z.boolean().default(false),
  editable_fields: z.array(templateEditableFieldSchema).min(1),
})

const templateDesignTokensSchema = z.object({
  colors: z.record(z.string(), z.string()).default({}),
  typography: z.record(z.string(), z.string()).default({}),
  spacing: z.record(z.string(), z.string()).optional(),
})

const templateSchemaValidator = z.object({
  schema_version: z.string().min(1).max(20).default('1.0.0'),
  template_name: z.string().min(2).max(120),
  category: z.string().min(2).max(60),
  design_tokens: templateDesignTokensSchema.default({ colors: {}, typography: {} }),
  sections: z.array(templateSectionSchema).min(1),
})

const templateCreateSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens.'),
  category: z.string().min(2).max(60),
  industry_tags: z.array(z.string()).default([]),
  is_generic: z.boolean().default(false),
  description: z.string().max(500).optional().nullable(),
  preview_image_url: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  schema: templateSchemaValidator,
})

const templateUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
  category: z.string().min(2).max(60).optional(),
  industry_tags: z.array(z.string()).optional(),
  is_generic: z.boolean().optional(),
  description: z.string().max(500).optional().nullable(),
  preview_image_url: z.string().url().optional().nullable().or(z.literal('')),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  schema: templateSchemaValidator.optional(),
  change_note: z.string().max(300).optional(),
})

// ==============================================================================
// Safe Elementor JSON Converter & Sanitizer (Authoritative Server-side)
// ==============================================================================

const FORBIDDEN_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /\bon\w+\s*=/gi,
]

function sanitizeString(val: string): string {
  if (typeof val !== 'string') return ''
  return val
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '') // Strip control chars
    .trim()
}

function scanObjectForThreats(obj: unknown, depth = 0): void {
  if (depth > 40) {
    throw new Error('A estrutura do ficheiro JSON excede a profundidade máxima permitida (40 níveis).')
  }

  if (typeof obj === 'string') {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(obj)) {
        throw new Error('O ficheiro foi rejeitado por conter scripts ou tags HTML potencialmente inseguras.')
      }
    }
    return
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      scanObjectForThreats(item, depth + 1)
    }
    return
  }

  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Error('Chave de objeto não permitida no JSON.')
      }
      scanObjectForThreats((obj as Record<string, unknown>)[key], depth + 1)
    }
  }
}

function countStructuralNodes(el: any, depth = 0): number {
  if (!el || typeof el !== 'object' || depth > 40) return 0

  let count = 0
  const elType = el.elType || ''
  const widgetType = el.widgetType || ''

  if (elType === 'section' || elType === 'container' || elType === 'column' || elType === 'widget' || widgetType) {
    count += 1
  }

  const children = Array.isArray(el.elements) ? el.elements : Array.isArray(el.content) ? el.content : []
  for (const child of children) {
    count += countStructuralNodes(child, depth + 1)
  }

  return count
}

function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

interface DetectedWidget {
  widgetType: string
  title?: string
  text?: string
  hasButton?: boolean
  hasImage?: boolean
  hasForm?: boolean
  hasAccordion?: boolean
  hasTestimonial?: boolean
  hasCounter?: boolean
}

interface DetectedSection {
  index: number
  inferredType: 'hero' | 'services' | 'benefits' | 'process' | 'about' | 'team' | 'testimonials' | 'faq' | 'contact' | 'form' | 'footer'
  label: string
  purpose: string
  widgets: DetectedWidget[]
  textSnippets: string[]
}

function collectWidgetsFromElement(el: any, widgets: DetectedWidget[], textSnippets: string[], depth = 0, maxWidgets = 300): void {
  if (!el || typeof el !== 'object' || depth > 30 || widgets.length >= maxWidgets) return

  const elType = el.elType || ''
  const widgetType = el.widgetType || ''
  const settings = el.settings || {}

  if (elType === 'widget' || widgetType) {
    const wTitle = sanitizeString(settings.title || settings.title_text || settings.heading || '')
    const wText = sanitizeString(settings.editor || settings.description || settings.description_text || '')
    const wBtn = sanitizeString(settings.text || settings.button_text || '')

    if (wTitle) textSnippets.push(wTitle)
    if (wText) textSnippets.push(wText.slice(0, 200))
    if (wBtn) textSnippets.push(wBtn)

    widgets.push({
      widgetType: widgetType || elType,
      title: wTitle,
      text: wText,
      hasButton: Boolean(wBtn || widgetType === 'button'),
      hasImage: Boolean(settings.image || widgetType === 'image' || widgetType === 'image-box'),
      hasForm: widgetType === 'form' || widgetType === 'login' || Boolean(settings.form_fields),
      hasAccordion: widgetType === 'accordion' || widgetType === 'toggle' || Boolean(settings.tabs),
      hasTestimonial: widgetType === 'testimonial' || widgetType === 'testimonial-carousel' || widgetType === 'reviews',
      hasCounter: widgetType === 'counter' || widgetType === 'progress',
    })
  }

  const children = Array.isArray(el.elements) ? el.elements : Array.isArray(el.content) ? el.content : []
  for (const child of children) {
    collectWidgetsFromElement(child, widgets, textSnippets, depth + 1, maxWidgets)
  }
}

function convertElementorToBlueBolt(rawJson: unknown, fileName?: string): {
  candidate: z.infer<typeof templateCreateSchema>
  warnings: string[]
  stats: { detected_sections_count: number; detected_widgets_count: number; structural_nodes_count: number }
} {
  scanObjectForThreats(rawJson)

  const rawObj = rawJson as any

  let totalStructuralNodes = 0
  if (Array.isArray(rawObj)) {
    for (const item of rawObj) {
      totalStructuralNodes += countStructuralNodes(item)
    }
  } else if (rawObj && typeof rawObj === 'object') {
    totalStructuralNodes = countStructuralNodes(rawObj)
  }

  const MAX_STRUCTURAL_NODES = 15000
  if (totalStructuralNodes > MAX_STRUCTURAL_NODES) {
    throw new Error(
      `Este ficheiro possui ${totalStructuralNodes} elementos estruturais. O limite seguro é de ${MAX_STRUCTURAL_NODES} elementos.`
    )
  }

  const warnings: string[] = []
  warnings.push('Imagens, URLs e conteúdos originais de terceiros foram neutralizados por segurança.')

  const rawTitle = sanitizeString(rawObj?.title || '')

  // Extract base title
  let cleanName = rawTitle
  if (!cleanName && fileName) {
    cleanName = fileName.replace(/\.json$/i, '').replace(/[_-]+/g, ' ')
  }
  cleanName = cleanName ? cleanName.replace(/^\d+[\s.-]*/, '').trim() : 'Template Elementor'
  cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
  if (cleanName.length < 3) cleanName = 'Template Elementor Importado'

  const baseSlug = slugify(cleanName) || 'template-elementor-importado'

  // Identify top-level sections / containers
  let rawSections: any[] = []
  if (Array.isArray(rawObj?.content)) {
    rawSections = rawObj.content
  } else if (Array.isArray(rawObj?.elements)) {
    rawSections = rawObj.elements
  } else if (Array.isArray(rawObj)) {
    rawSections = rawObj
  } else if (rawObj?.content?.elements && Array.isArray(rawObj.content.elements)) {
    rawSections = rawObj.content.elements
  } else {
    rawSections = [rawObj]
  }

  // Filter valid section objects (up to 250 main sections)
  const validRawSections = rawSections.filter((s) => s && typeof s === 'object').slice(0, 250)
  if (validRawSections.length === 0) {
    throw new Error('Não foram detetadas secções válidas na estrutura do ficheiro Elementor.')
  }

  const detectedSections: DetectedSection[] = []
  let totalWidgetsCount = 0
  const allPageSnippets: string[] = []

  validRawSections.forEach((secObj, idx) => {
    const widgets: DetectedWidget[] = []
    const textSnippets: string[] = []
    collectWidgetsFromElement(secObj, widgets, textSnippets)
    totalWidgetsCount += widgets.length
    allPageSnippets.push(...textSnippets)

    const allSecText = textSnippets.join(' ').toLowerCase()

    // Determine section type
    let inferredType: DetectedSection['inferredType'] = 'services'
    let label = `Secção ${idx + 1}`
    let purpose = 'Secção de conteúdo estruturado.'

    const hasAccordion = widgets.some((w) => w.hasAccordion)
    const hasTestimonial = widgets.some((w) => w.hasTestimonial)
    const hasForm = widgets.some((w) => w.hasForm)
    const hasCounter = widgets.some((w) => w.hasCounter)

    if (idx === 0) {
      inferredType = 'hero'
      label = 'Apresentação Principal (Hero)'
      purpose = 'Apresentar a proposta de valor principal e o apelo à ação imediato.'
    } else if (hasAccordion || /perguntas|faq|dúvidas|frequentes|duvidas/.test(allSecText)) {
      inferredType = 'faq'
      label = 'Perguntas Frequentes (FAQ)'
      purpose = 'Esclarecer as principais dúvidas e objeções dos clientes.'
    } else if (hasTestimonial || /depoiment|avaliaç|testemunh|clientes|resultados|provas/.test(allSecText)) {
      inferredType = 'testimonials'
      label = 'Depoimentos & Avaliações'
      purpose = 'Apresentar prova social autêntica e relatos de clientes.'
    } else if (hasForm || /contac|agend|formulario|orçamento|fale connosco|marque/.test(allSecText)) {
      inferredType = 'contact'
      label = 'Contacto & Agendamento'
      purpose = 'Facilitar o contacto direto e a conversão do lead.'
    } else if (hasCounter || /benefício|vantagen|diferencia|porquê|motivos|garantia/.test(allSecText)) {
      inferredType = 'benefits'
      label = 'Vantagens & Diferenciais'
      purpose = 'Destacar os pontos fortes e os benefícios exclusivos da oferta.'
    } else if (/sobre|quem sou|história|equipa|perfil|especialista|minha história/.test(allSecText)) {
      inferredType = 'about'
      label = 'Sobre Nós / Especialista'
      purpose = 'Apresentar a autoridade, experiência e valores do negócio.'
    } else if (/como funciona|processo|etapas|passos|metodologia/.test(allSecText)) {
      inferredType = 'process'
      label = 'Como Funciona / Processo'
      purpose = 'Explicar de forma simples e transparente as etapas do serviço.'
    } else if (idx === validRawSections.length - 1 && /direitos|copyright|rodap|política/.test(allSecText)) {
      inferredType = 'footer'
      label = 'Rodapé Institucional'
      purpose = 'Informações de encerramento, direitos reservados e termos legais.'
    } else if (/serviço|tratamento|procedimento|especialidade|cursos|consultoria/.test(allSecText)) {
      inferredType = 'services'
      label = 'Serviços & Especialidades'
      purpose = 'Exibir o portfólio de serviços ou produtos disponíveis.'
    } else {
      inferredType = idx === validRawSections.length - 1 ? 'footer' : 'about'
      label = `Conteúdo Estruturado (${idx + 1})`
      purpose = 'Bloco de conteúdo de apoio e detalhamento.'
    }

    detectedSections.push({
      index: idx,
      inferredType,
      label,
      purpose,
      widgets,
      textSnippets,
    })
  })

  // Build final Blue Bolt sections with editable fields
  const finalSections = detectedSections.map((ds, sIdx) => {
    const secId = `sec_${ds.inferredType}_${sIdx + 1}`
    const fields: Array<z.infer<typeof templateEditableFieldSchema>> = []

    switch (ds.inferredType) {
      case 'hero':
        fields.push(
          {
            key: 'headline',
            label: 'Título Principal (Headline)',
            field_type: 'text',
            required: true,
            placeholder: 'Transforme o seu visual com serviços de excelência',
            ai_hint: 'Título de alto impacto com foco no benefício principal',
          },
          {
            key: 'subheadline',
            label: 'Subtítulo Persuasivo',
            field_type: 'textarea',
            required: true,
            placeholder: 'Atendimento exclusivo, técnicas avançadas e resultados personalizados.',
            ai_hint: 'Descrição complementar curta que gera confiança imediata',
          },
          {
            key: 'cta_text',
            label: 'Botão de Ação Principal',
            field_type: 'cta',
            required: true,
            placeholder: 'Agendar Atendimento',
            ai_hint: 'Ação de conversão clara',
          },
          {
            key: 'hero_image',
            label: 'Imagem de Destaque',
            field_type: 'image_url',
            required: false,
            placeholder: '',
            ai_hint: 'Fotografia profissional representativa (substituir ativo do cliente)',
          }
        )
        break

      case 'services':
        fields.push(
          {
            key: 'section_title',
            label: 'Título dos Serviços',
            field_type: 'text',
            required: true,
            placeholder: 'Os Nossos Serviços & Tratamentos',
            ai_hint: 'Título que introduz as soluções disponíveis',
          },
          {
            key: 'services_list',
            label: 'Lista de Serviços',
            field_type: 'card_list',
            required: true,
            placeholder: 'Lista com título, descrição e benefícios para cada serviço',
            ai_hint: 'Detalhes dos serviços ou pacotes oferecidos',
          }
        )
        break

      case 'about':
        fields.push(
          {
            key: 'about_title',
            label: 'Título da Apresentação',
            field_type: 'text',
            required: true,
            placeholder: 'Conheça a Nossa História e Experiência',
            ai_hint: 'Apresentação de autoridade e confiança',
          },
          {
            key: 'bio_text',
            label: 'Texto de Apresentação',
            field_type: 'textarea',
            required: true,
            placeholder: 'Trajetória profissional, formação técnica e paixão pela excelência no atendimento.',
            ai_hint: 'História inspiradora e credenciais',
          },
          {
            key: 'about_image',
            label: 'Fotografia da Especialista / Equipa',
            field_type: 'image_url',
            required: false,
            placeholder: '',
            ai_hint: 'Fotografia profissional da especialista ou equipa',
          }
        )
        break

      case 'benefits':
        fields.push(
          {
            key: 'benefits_title',
            label: 'Título dos Diferenciais',
            field_type: 'text',
            required: true,
            placeholder: 'Porquê Escolher os Nossos Serviços',
            ai_hint: 'Introdução das vantagens exclusivas',
          },
          {
            key: 'items',
            label: 'Lista de Vantagens',
            field_type: 'card_list',
            required: true,
            placeholder: 'Lista com 3 a 4 benefícios claros e comprovados',
            ai_hint: 'Diferenciais de mercado e garantias',
          }
        )
        break

      case 'testimonials':
        fields.push(
          {
            key: 'testimonials_title',
            label: 'Título dos Depoimentos',
            field_type: 'text',
            required: true,
            placeholder: 'O Que Dizem os Nossos Clientes',
            ai_hint: 'Chamada para os relatos e avaliações',
          },
          {
            key: 'items',
            label: 'Depoimentos de Clientes',
            field_type: 'card_list',
            required: true,
            placeholder: 'Avaliações reais com nome e experiência do cliente',
            ai_hint: 'Prova social que reforça a autoridade',
          }
        )
        break

      case 'faq':
        fields.push(
          {
            key: 'faq_title',
            label: 'Título das Perguntas Frequentes',
            field_type: 'text',
            required: true,
            placeholder: 'Perguntas Frequentes',
            ai_hint: 'Título da secção de dúvidas',
          },
          {
            key: 'questions',
            label: 'Lista de Dúvidas & Respostas',
            field_type: 'faq_list',
            required: true,
            placeholder: 'Perguntas frequentes com respostas objetivas',
            ai_hint: 'Resolução das dúvidas mais comuns dos clientes',
          }
        )
        break

      case 'contact':
      case 'form':
        fields.push(
          {
            key: 'contact_title',
            label: 'Título de Contacto',
            field_type: 'text',
            required: true,
            placeholder: 'Pronto para Agendar o Seu Atendimento?',
            ai_hint: 'Chamada persuasiva para contacto',
          },
          {
            key: 'cta_text',
            label: 'Texto do Botão de Envio',
            field_type: 'cta',
            required: true,
            placeholder: 'Falar pelo WhatsApp / Enviar Mensagem',
            ai_hint: 'Ação direta de contacto',
          },
          {
            key: 'contact_info',
            label: 'Informações de Contacto',
            field_type: 'textarea',
            required: false,
            placeholder: 'Morada, telefone, horário de funcionamento e redes sociais',
            ai_hint: 'Dados úteis para localização e contacto',
          }
        )
        break

      case 'process':
        fields.push(
          {
            key: 'process_title',
            label: 'Título do Processo',
            field_type: 'text',
            required: true,
            placeholder: 'Como Funciona o Nosso Atendimento',
            ai_hint: 'Apresentação das etapas',
          },
          {
            key: 'steps',
            label: 'Etapas do Processo',
            field_type: 'card_list',
            required: true,
            placeholder: 'Passo a passo simplificado para o cliente',
            ai_hint: 'Etapas claras desde o agendamento à conclusão',
          }
        )
        break

      case 'footer':
      default:
        fields.push(
          {
            key: 'copyright',
            label: 'Texto de Direitos Reservados',
            field_type: 'text',
            required: true,
            placeholder: `© ${new Date().getFullYear()} ${cleanName}. Todos os direitos reservados.`,
            ai_hint: 'Informação legal e institucional de rodapé',
          }
        )
        break
    }

    return {
      id: secId,
      type: ds.inferredType,
      label: ds.label,
      purpose: ds.purpose,
      required: ds.inferredType === 'hero',
      editable_fields: fields,
    }
  })

  // Infer industry tags & category based on text snippets
  const allTextCombined = `${cleanName} ${allPageSnippets.join(' ')}`.toLowerCase()
  let suggestedIndustryTags: string[] = ['professional_services']
  let suggestedCategory = 'Serviços Profissionais'

  if (/maquiad|make|beleza|estétic|sobrancelh|cabelo|estetic|pentead|noiva|skincare/.test(allTextCombined)) {
    suggestedIndustryTags = ['beauty_clinic', 'beauty_salon']
    suggestedCategory = 'Estética e Beleza'
  } else if (/pet|cão|gato|veterinár|banho e tosa|animal/.test(allTextCombined)) {
    suggestedIndustryTags = ['pet_shop']
    suggestedCategory = 'Pet Shop'
  } else if (/restaurante|gastronomia|culinária|pizzaria|hambúrguer|menu/.test(allTextCombined)) {
    suggestedIndustryTags = ['restaurant']
    suggestedCategory = 'Gastronomia'
  } else if (/imobili|imóvel|apartamento|corretor|casa/.test(allTextCombined)) {
    suggestedIndustryTags = ['real_estate']
    suggestedCategory = 'Imobiliária'
  } else if (/advoc|jurídic|direito|advogado|processo/.test(allTextCombined)) {
    suggestedIndustryTags = ['law_firm']
    suggestedCategory = 'Advocacia'
  } else if (/saúde|médic|clínica|doutor|paciente/.test(allTextCombined)) {
    suggestedIndustryTags = ['healthcare']
    suggestedCategory = 'Saúde e Medicina'
  } else if (/dente|dentista|odontol|sorriso/.test(allTextCombined)) {
    suggestedIndustryTags = ['dental_clinic']
    suggestedCategory = 'Clínica Dentária'
  } else if (/ginásio|fitness|treino|musculação|personal/.test(allTextCombined)) {
    suggestedIndustryTags = ['gym']
    suggestedCategory = 'Fitness e Ginásio'
  }

  const candidate: z.infer<typeof templateCreateSchema> = {
    name: cleanName,
    slug: baseSlug,
    category: suggestedCategory,
    industry_tags: suggestedIndustryTags,
    is_generic: false,
    description: `Template estruturado de alta conversão para ${suggestedCategory.toLowerCase()}, importado e convertido de modelo de referência Elementor.`,
    preview_image_url: '',
    status: 'draft', // MUST always be draft on import
    schema: {
      schema_version: '1.0.0',
      template_name: cleanName,
      category: suggestedCategory,
      design_tokens: {
        colors: {
          primary: '#064B88',
          accent: '#1463FF',
          background: '#F8FAFC',
          text: '#0F172A',
        },
        typography: {
          heading_font: 'Inter',
          body_font: 'Inter',
        },
        spacing: {
          section_padding: 'py-20',
          container_max_width: 'max-w-7xl',
        },
      },
      sections: finalSections,
    },
  }

  return {
    candidate,
    warnings,
    stats: {
      detected_sections_count: finalSections.length,
      detected_widgets_count: totalWidgetsCount,
      structural_nodes_count: totalStructuralNodes,
    },
  }
}

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
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso reservado exclusivamente a administradores.' })
  }

  const sql = neon(dbUrl)

  const url = req.url || ''
  const cleanUrl = url.split('?')[0]
  const subPath = cleanUrl.replace(/^\/api\/admin\/?/, '')

  // 1. GET /api/admin/stats
  if (subPath === 'stats' || subPath === 'stats/') {
    try {
      const stats = await sql`
        SELECT
          COUNT(*)::int as total_projects,
          COUNT(*) FILTER (WHERE status = 'briefing')::int as briefing_projects,
          COUNT(*) FILTER (WHERE status = 'building')::int as building_projects,
          COUNT(*) FILTER (WHERE status IN ('internal_review', 'client_review'))::int as review_projects,
          COUNT(*) FILTER (WHERE status = 'approved')::int as approved_projects,
          COUNT(*) FILTER (WHERE status = 'delivered')::int as delivered_projects,
          COUNT(*) FILTER (WHERE status = 'changes_requested')::int as changes_requested_projects
        FROM public.projects
      `

      const recentProjects = await sql`
        SELECT p.*, prof.full_name as creator_name
        FROM public.projects p
        LEFT JOIN public.profiles prof ON prof.id = p.created_by
        ORDER BY p.created_at DESC
        LIMIT 10
      `

      const row = stats[0] as any
      return res.status(200).json({
        stats: {
          totalProjects: row.total_projects || 0,
          briefingProjects: row.briefing_projects || 0,
          buildingProjects: row.building_projects || 0,
          reviewProjects: row.review_projects || 0,
          approvedProjects: row.approved_projects || 0,
          deliveredProjects: row.delivered_projects || 0,
          changesRequestedProjects: row.changes_requested_projects || 0,
        },
        recentProjects: recentProjects || [],
      })
    } catch (err: any) {
      console.error('[API /api/admin/stats] Database query error:', err?.message || err)
      return res.status(500).json({ error: 'Não foi possível carregar as estatísticas do painel.' })
    }
  }

  // 2. /api/admin/templates or /api/admin/templates/:id
  if (subPath.startsWith('templates')) {
    const templateId = subPath.replace(/^templates\/?/, '').trim()

    // 2.0 POST /api/admin/templates/import-elementor
    if (templateId === 'import-elementor') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido.' })
      }

      const { elementor_json, file_name } = req.body || {}
      if (!elementor_json) {
        return res.status(400).json({ error: 'O ficheiro ou conteúdo JSON do Elementor é obrigatório.' })
      }

      try {
        let parsedData = elementor_json
        if (typeof elementor_json === 'string') {
          if (elementor_json.length > 2 * 1024 * 1024) {
            return res.status(413).json({ error: 'O ficheiro JSON excede o tamanho máximo permitido de 2 MB.' })
          }
          parsedData = JSON.parse(elementor_json)
        }

        const result = convertElementorToBlueBolt(parsedData, file_name)
        return res.status(200).json({
          success: true,
          candidate: result.candidate,
          warnings: result.warnings,
          stats: result.stats,
        })
      } catch (err: any) {
        console.error('[API /api/admin/templates/import-elementor] Conversion error:', err?.message || err)
        return res.status(400).json({
          error: err?.message || 'Falha ao processar e converter o ficheiro Elementor.',
        })
      }
    }

    // 2.1 GET /api/admin/templates (list all)
    if (!templateId && req.method === 'GET') {
      try {
        const rows = await sql`
          SELECT 
            t.*,
            COALESCE((SELECT COUNT(*)::int FROM public.template_versions tv WHERE tv.template_id = t.id), 1) as version_count
          FROM public.templates t
          ORDER BY t.created_at DESC
        `
        return res.status(200).json(rows)
      } catch (err: any) {
        console.error('[API /api/admin/templates GET] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível listar os templates de administração.' })
      }
    }

    // 2.2 POST /api/admin/templates (create template)
    if (!templateId && req.method === 'POST') {
      const parseResult = templateCreateSchema.safeParse(req.body)
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ')
        return res.status(400).json({
          error: `Estrutura de template JSON inválida: ${issues}`,
          details: parseResult.error.issues,
        })
      }

      const { name, slug, category, industry_tags, is_generic, description, preview_image_url, status, schema } = parseResult.data

      try {
        const existing = await sql`SELECT id FROM public.templates WHERE slug = ${slug} LIMIT 1`
        if (existing.length > 0) {
          return res.status(409).json({ error: `Já existe um template registado com o slug '${slug}'.` })
        }

        const inserted = await sql`
          INSERT INTO public.templates (
            name, slug, category, industry_tags, is_generic, description, preview_image_url, status, schema, created_by
          ) VALUES (
            ${name}, ${slug}, ${category}, ${industry_tags || []}, ${is_generic || false}, ${description || null}, ${preview_image_url || null}, ${status}, ${JSON.stringify(schema)}, ${authUser.id}
          )
          RETURNING *
        `

        const createdTemplate = inserted[0] as any

        await sql`
          INSERT INTO public.template_versions (
            template_id, version, schema, change_note, created_by
          ) VALUES (
            ${createdTemplate.id}, 1, ${JSON.stringify(schema)}, 'Versão inicial criada pelo administrador.', ${authUser.id}
          )
        `

        return res.status(201).json(createdTemplate)
      } catch (err: any) {
        console.error('[API /api/admin/templates POST] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível registar o novo template no sistema.' })
      }
    }

    // 2.3 GET /api/admin/templates/:id (details & versions)
    if (templateId && req.method === 'GET') {
      try {
        const templateRows = await sql`SELECT * FROM public.templates WHERE id = ${templateId} LIMIT 1`
        if (templateRows.length === 0) {
          return res.status(404).json({ error: 'Template não encontrado.' })
        }

        const versionRows = await sql`
          SELECT * FROM public.template_versions WHERE template_id = ${templateId} ORDER BY version DESC
        `

        return res.status(200).json({
          template: templateRows[0],
          versions: versionRows,
        })
      } catch (err: any) {
        console.error('[API /api/admin/templates/:id GET] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível carregar os detalhes do template.' })
      }
    }

    // 2.4 PATCH /api/admin/templates/:id (update & version increment)
    if (templateId && (req.method === 'PATCH' || req.method === 'PUT')) {
      const parseResult = templateUpdateSchema.safeParse(req.body)
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ')
        return res.status(400).json({
          error: `Dados de atualização inválidos: ${issues}`,
          details: parseResult.error.issues,
        })
      }

      const { name, slug, category, industry_tags, is_generic, description, preview_image_url, status, schema, change_note } = parseResult.data

      try {
        const existing = await sql`SELECT * FROM public.templates WHERE id = ${templateId} LIMIT 1`
        if (existing.length === 0) {
          return res.status(404).json({ error: 'Template não encontrado.' })
        }

        const current = existing[0] as any

        if (slug && slug !== current.slug) {
          const slugCheck = await sql`SELECT id FROM public.templates WHERE slug = ${slug} AND id != ${templateId} LIMIT 1`
          if (slugCheck.length > 0) {
            return res.status(409).json({ error: `O slug '${slug}' já está a ser utilizado por outro template.` })
          }
        }

        const updatedName = name ?? current.name
        const updatedSlug = slug ?? current.slug
        const updatedCategory = category ?? current.category
        const updatedIndustryTags = industry_tags !== undefined ? industry_tags : current.industry_tags || []
        const updatedIsGeneric = is_generic !== undefined ? is_generic : current.is_generic || false
        const updatedDescription = description !== undefined ? description : current.description
        const updatedPreview = preview_image_url !== undefined ? preview_image_url : current.preview_image_url
        const updatedStatus = status ?? current.status
        const isSchemaChanged = schema && JSON.stringify(schema) !== JSON.stringify(current.schema)
        const updatedSchema = schema ? JSON.stringify(schema) : JSON.stringify(current.schema)

        const updated = await sql`
          UPDATE public.templates
          SET
            name = ${updatedName},
            slug = ${updatedSlug},
            category = ${updatedCategory},
            industry_tags = ${updatedIndustryTags},
            is_generic = ${updatedIsGeneric},
            description = ${updatedDescription},
            preview_image_url = ${updatedPreview},
            status = ${updatedStatus},
            schema = ${updatedSchema}::jsonb,
            updated_at = NOW()
          WHERE id = ${templateId}
          RETURNING *
        `

        if (isSchemaChanged) {
          const maxVerResult = await sql`
            SELECT COALESCE(MAX(version), 1)::int as max_ver FROM public.template_versions WHERE template_id = ${templateId}
          `
          const nextVersion = ((maxVerResult[0] as any)?.max_ver || 1) + 1

          await sql`
            INSERT INTO public.template_versions (
              template_id, version, schema, change_note, created_by
            ) VALUES (
              ${templateId}, ${nextVersion}, ${updatedSchema}::jsonb, ${change_note || 'Atualização de esquema pelo administrador.'}, ${authUser.id}
            )
          `
        }

        return res.status(200).json(updated[0])
      } catch (err: any) {
        console.error('[API /api/admin/templates/:id PATCH] Database query error:', err?.message || err)
        return res.status(500).json({ error: 'Não foi possível atualizar o template.' })
      }
    }
  }

  return res.status(404).json({ error: 'Recurso administrativo não encontrado.' })
}
