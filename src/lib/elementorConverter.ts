import { z } from 'zod'
import {
  templateCreateSchema,
  templateEditableFieldSchema,
  type TemplateCreateInput,
  type TemplateSection,
} from '@/types'

export interface ElementorConversionResult {
  candidate: TemplateCreateInput
  warnings: string[]
  stats: {
    file_size_bytes?: number
    detected_sections_count: number
    detected_widgets_count: number
    structural_nodes_count: number
  }
}

const FORBIDDEN_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /\bon\w+\s*=/gi,
]

export function sanitizeString(val: unknown): string {
  if (typeof val !== 'string') return ''
  return val
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '') // Strip control chars
    .trim()
}

export function slugify(text: string): string {
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

/**
 * Scan strings in JSON for security threats with deep recursion guard (max depth 40).
 */
export function scanForSecurityThreats(obj: unknown, depth = 0): void {
  if (depth > 40) {
    throw new Error('A estrutura do ficheiro JSON excede a profundidade máxima permitida (40 níveis).')
  }

  if (typeof obj === 'string') {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(obj)) {
        throw new Error('O ficheiro foi rejeitado por conter scripts ou tags HTML inseguras.')
      }
    }
    return
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      scanForSecurityThreats(item, depth + 1)
    }
    return
  }

  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Error('Chave de objeto não permitida no JSON.')
      }
      scanForSecurityThreats((obj as Record<string, unknown>)[key], depth + 1)
    }
  }
}

/**
 * Count only relevant structural nodes (sections, containers, columns, widgets).
 */
export function countStructuralNodes(el: any, depth = 0): number {
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
  inferredType:
    | 'hero'
    | 'services'
    | 'benefits'
    | 'process'
    | 'about'
    | 'team'
    | 'testimonials'
    | 'faq'
    | 'contact'
    | 'form'
    | 'footer'
  label: string
  purpose: string
  widgets: DetectedWidget[]
  textSnippets: string[]
}

function collectWidgetsFromElement(
  el: any,
  widgets: DetectedWidget[],
  textSnippets: string[],
  depth = 0,
  maxWidgets = 300
): void {
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
      hasTestimonial:
        widgetType === 'testimonial' || widgetType === 'testimonial-carousel' || widgetType === 'reviews',
      hasCounter: widgetType === 'counter' || widgetType === 'progress',
    })
  }

  const children = Array.isArray(el.elements) ? el.elements : Array.isArray(el.content) ? el.content : []
  for (const child of children) {
    collectWidgetsFromElement(child, widgets, textSnippets, depth + 1, maxWidgets)
  }
}

/**
 * Universal, high-performance, and safe Elementor JSON converter.
 */
export function convertElementorJson(
  rawJson: unknown,
  fileName?: string,
  fileSizeBytes?: number
): ElementorConversionResult {
  // 1. Security scan
  scanForSecurityThreats(rawJson)

  const rawObj = rawJson as any

  // 2. Count structural nodes accurately
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

  // 3. Extract title and slug
  let cleanName = rawTitle
  if (!cleanName && fileName) {
    cleanName = fileName.replace(/\.json$/i, '').replace(/[_-]+/g, ' ')
  }
  cleanName = cleanName ? cleanName.replace(/^\d+[\s.-]*/, '').trim() : 'Template Elementor'
  cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
  if (cleanName.length < 3) cleanName = 'Template Elementor Importado'

  const baseSlug = slugify(cleanName) || 'template-elementor-importado'

  // 4. Identify top-level sections / containers
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

  const MAX_MAIN_SECTIONS = 250
  const validRawSections = rawSections.filter((s) => s && typeof s === 'object').slice(0, MAX_MAIN_SECTIONS)

  if (validRawSections.length === 0) {
    throw new Error('Não foram detetadas secções estruturais válidas na exportação do Elementor.')
  }

  const detectedSections: DetectedSection[] = []
  let totalWidgetsCount = 0
  const allPageSnippets: string[] = []

  validRawSections.forEach((secObj, idx) => {
    const widgets: DetectedWidget[] = []
    const textSnippets: string[] = []
    collectWidgetsFromElement(secObj, widgets, textSnippets, 0, 300)
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

  // 5. Build final Blue Bolt sections with clean neutral editable fields
  const finalSections: TemplateSection[] = detectedSections.map((ds, sIdx) => {
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
        fields.push({
          key: 'copyright',
          label: 'Texto de Direitos Reservados',
          field_type: 'text',
          required: true,
          placeholder: `© ${new Date().getFullYear()} ${cleanName}. Todos os direitos reservados.`,
          ai_hint: 'Informação legal e institucional de rodapé',
        })
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

  // 6. Infer industry tags & category with strict word boundaries
  const allTextCombined = `${cleanName} ${allPageSnippets.join(' ')}`.toLowerCase()
  let suggestedIndustryTags: string[] = ['professional_services']
  let suggestedCategory = 'Serviços Profissionais'

  if (/\b(funcional|treino|treinos|muscula[cç][aã]o|fitness|gin[aá]sio|crossfit|personal|academia|exerc[ií]cio|condicionamento)\b/i.test(allTextCombined)) {
    suggestedIndustryTags = ['gym']
    suggestedCategory = 'Fitness e Ginásio'
  } else if (/\b(maquiad[a-z]*|make|makeup|beleza|est[eé]tic[a-z]*|sobrancelh[a-z]*|cabelo|pentead[a-z]*|noiva|noivas|skincare|manicure|pedicure)\b/i.test(allTextCombined)) {
    suggestedIndustryTags = ['beauty_clinic', 'beauty_salon']
    suggestedCategory = 'Estética e Beleza'
  } else if (/\b(pet|pets|petshop|veterin[aá]ri[ao]|banho e tosa|c[aã]o|c[aã]es|gato|gatos|canil)\b/i.test(allTextCombined)) {
    suggestedIndustryTags = ['pet_shop']
    suggestedCategory = 'Pet Shop'
  } else if (/\b(restaurante|gastronomia|culin[aá]ria|pizzaria|hamb[uú]rguer|menu|card[aá]pio|bistro)\b/i.test(allTextCombined)) {
    suggestedIndustryTags = ['restaurant']
    suggestedCategory = 'Gastronomia'
  } else if (/\b(imobili[aá]ri[ao]|im[oó]vel|im[oó]veis|apartamento|apartamentos|corretor|corretora)\b/i.test(allTextCombined)) {
    suggestedIndustryTags = ['real_estate']
    suggestedCategory = 'Imobiliária'
  } else if (/\b(advocacia|jur[ií]dic[ao]|direito|advogado|advogada|processo|oab)\b/i.test(allTextCombined)) {
    suggestedIndustryTags = ['law_firm']
    suggestedCategory = 'Advocacia'
  } else if (/\b(sa[uú]de|m[eé]dic[ao]|cl[ií]nica|doutor|doutora|paciente|medicina)\b/i.test(allTextCombined)) {
    suggestedIndustryTags = ['healthcare']
    suggestedCategory = 'Saúde e Medicina'
  } else if (/\b(dente|dentista|odontol[a-z]*|sorriso|ortodontia|implante)\b/i.test(allTextCombined)) {
    suggestedIndustryTags = ['dental_clinic']
    suggestedCategory = 'Clínica Dentária'
  } else if (/\b(contab[a-z]*|contabilidade|fiscal|tribut[aá]ri[ao]|impostos|balanço)\b/i.test(allTextCombined)) {
    suggestedIndustryTags = ['accounting']
    suggestedCategory = 'Contabilidade'
  }

  const cleanDescription = `Template importado do Elementor. Estrutura convertida para revisão e adaptação no Blue Bolt.`

  const candidate: TemplateCreateInput = {
    name: cleanName,
    slug: baseSlug,
    category: suggestedCategory,
    industry_tags: suggestedIndustryTags,
    is_generic: false,
    description: cleanDescription,
    preview_image_url: null,
    status: 'draft', // MUST always be draft
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

  // Strictly validate candidate
  const validation = templateCreateSchema.safeParse(candidate)
  if (!validation.success) {
    const issues = validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Estrutura gerada não cumpre o contrato do Blue Bolt: ${issues}`)
  }

  return {
    candidate,
    warnings,
    stats: {
      file_size_bytes: fileSizeBytes,
      detected_sections_count: finalSections.length,
      detected_widgets_count: totalWidgetsCount,
      structural_nodes_count: totalStructuralNodes,
    },
  }
}
