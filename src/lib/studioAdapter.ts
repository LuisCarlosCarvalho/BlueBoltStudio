import { pageTreeSchema, type PageTree, type StudioNode } from '@/types/studio.types'

/**
 * Converte de forma determinística dados legados (projects.page_data) no schema estrito do Studio.
 * Regra de Não-Alucinação: Nunca inventa passos de processo, depoimentos ou FAQ fictícios.
 * Se os dados contiverem apenas títulos de secção sem itens reais, essas secções são omitidas
 * ou o projeto permanece no fallback de leitura legado sem corromper o Studio.
 */
export function legacyPageDataToPageTree(
  legacyData: any,
  selectedTemplateSchema?: any
): { success: boolean; pageTree?: PageTree; error?: string; isException?: boolean } {
  // 1. Se os dados legados forem nulos ou vazios, gera uma árvore padrão limpa
  if (!legacyData || Object.keys(legacyData).length === 0) {
    const defaultNodes = createDefaultNodesFromTemplate(selectedTemplateSchema)
    const defaultTree = { nodes: defaultNodes }
    const parse = pageTreeSchema.safeParse(defaultTree)
    if (parse.success) {
      return { success: true, pageTree: parse.data }
    }
    return { success: false, error: 'Falha ao criar nós padrão iniciais.' }
  }

  // 2. Tentar validação direta se já estiver no formato { nodes: [...] }
  if (Array.isArray(legacyData.nodes)) {
    const directParse = pageTreeSchema.safeParse(legacyData)
    if (directParse.success) {
      return { success: true, pageTree: directParse.data }
    }
  }

  // 3. Extrair secções legadas em formato Array ou Dicionário de Objeto
  let rawSections: any[] = []
  if (Array.isArray(legacyData.sections)) {
    rawSections = legacyData.sections
  } else if (legacyData.sections && typeof legacyData.sections === 'object') {
    rawSections = Object.entries(legacyData.sections).map(([key, val]) => {
      const type = key.split('_')[0]
      return { section_key: key, section_type: type, ...(val as any) }
    })
  }

  if (rawSections.length === 0) {
    // Caso o page_data não seja vazio mas tenha uma estrutura não suportada,
    // o projeto deve permanecer no fallback de leitura legado como exceção de migração.
    return {
      success: false,
      isException: true,
      error: 'Formato de secções legadas não reconhecido. Mantido no fallback de leitura legado.',
    }
  }

  try {
    const convertedNodes: StudioNode[] = []

    for (let i = 0; i < rawSections.length; i++) {
      const sec = rawSections[i]
      const node = convertLegacySectionToNode(sec, i)
      if (node) {
        convertedNodes.push(node)
      }
    }

    if (convertedNodes.length === 0) {
      return {
        success: false,
        isException: true,
        error: 'Nenhuma secção legada válida pôde ser convertida sem alucinação de conteúdo.',
      }
    }

    const convertedTree = { nodes: convertedNodes }
    const validation = pageTreeSchema.safeParse(convertedTree)

    if (validation.success) {
      return { success: true, pageTree: validation.data }
    } else {
      const issue = validation.error.issues[0]
      return {
        success: false,
        isException: true,
        error: `Validação Zod falhou na conversão: ${issue?.path.join('.')} - ${issue?.message}`,
      }
    }
  } catch (err: any) {
    return {
      success: false,
      isException: true,
      error: `Exceção durante a conversão dos dados legados: ${err?.message || err}`,
    }
  }
}

function convertLegacySectionToNode(sec: any, index: number): StudioNode | null {
  const type = (sec.section_type || sec.type || '').toLowerCase().trim()
  const id = sec.id || `node-${type}-${index + 1}`
  const fields = sec.editable_fields || sec.fields || sec

  switch (type) {
    case 'hero':
      return {
        id,
        type: 'HeroBlock',
        section_type: 'hero',
        properties: {
          headline: String(fields.headline || fields.title || 'Bem-vindo ao Blue Bolt Studio').slice(0, 200),
          subheadline: String(fields.subheadline || fields.subtitle || '').slice(0, 500),
          badge_text: String(fields.badge || fields.badge_text || '').slice(0, 100),
          cta_primary_text: String(fields.cta_primary_text || fields.cta_text || 'Saber Mais').slice(0, 100),
          cta_primary_url: fields.cta_url && String(fields.cta_url).startsWith('#') ? fields.cta_url : '#contact',
          cta_secondary_text: '',
          cta_secondary_url: '',
          bg_image_url: '',
        },
      } as StudioNode

    case 'benefits': {
      const rawItems = fields.items
      let itemsList: { id: string; title: string; description: string; icon_name?: string }[] = []

      if (typeof rawItems === 'string' && rawItems.trim() !== '') {
        itemsList = rawItems.split(';').map((s: string, idx: number) => ({
          id: `b-${idx + 1}`,
          title: s.trim().slice(0, 150),
          description: '',
          icon_name: 'Check',
        }))
      } else if (Array.isArray(rawItems) && rawItems.length > 0) {
        itemsList = rawItems.map((item: any, idx: number) => ({
          id: item.id || `b-${idx + 1}`,
          title: String(item.title || item.name || '').slice(0, 150),
          description: String(item.description || '').slice(0, 500),
          icon_name: String(item.icon_name || 'Check').slice(0, 50),
        }))
      }

      if (itemsList.length === 0) return null // Sem itens reais -> Omitir nó para evitar conteúdo inventado

      return {
        id,
        type: 'BenefitsBlock',
        section_type: 'benefits',
        properties: {
          title: String(fields.section_title || fields.title || 'Vantagens').slice(0, 200),
          subtitle: String(fields.subtitle || '').slice(0, 500),
          items: itemsList.slice(0, 10),
        },
      } as StudioNode
    }

    case 'services': {
      const rawServices = fields.services_list || fields.cards || fields.services
      let servicesList: { id: string; title: string; description: string; icon_name?: string }[] = []

      if (typeof rawServices === 'string' && rawServices.trim() !== '') {
        servicesList = rawServices.split(';').map((s: string, idx: number) => ({
          id: `s-${idx + 1}`,
          title: s.trim().slice(0, 150),
          description: '',
          icon_name: 'Star',
        }))
      } else if (Array.isArray(rawServices) && rawServices.length > 0) {
        servicesList = rawServices.map((c: any, idx: number) => ({
          id: c.id || `s-${idx + 1}`,
          title: String(c.title || c.name || '').slice(0, 150),
          description: String(c.description || '').slice(0, 500),
          icon_name: String(c.icon_name || 'Star').slice(0, 50),
        }))
      }

      if (servicesList.length === 0) return null // Sem serviços reais -> Omitir nó

      return {
        id,
        type: 'ServicesBlock',
        section_type: 'services',
        properties: {
          title: String(fields.section_title || fields.title || 'Nossos Serviços').slice(0, 200),
          subtitle: String(fields.subtitle || '').slice(0, 500),
          cards: servicesList.slice(0, 12),
        },
      } as StudioNode
    }

    case 'process': {
      const rawSteps = fields.steps
      let stepsList: { step_number: number; title: string; description: string }[] = []

      if (Array.isArray(rawSteps) && rawSteps.length > 0) {
        stepsList = rawSteps.map((st: any, idx: number) => ({
          step_number: Number(st.step_number || idx + 1),
          title: String(st.title || '').slice(0, 150),
          description: String(st.description || '').slice(0, 500),
        }))
      }

      if (stepsList.length === 0) return null // REGRA DE NÃO-ALUCINAÇÃO: Se não há passos na origem, omitir o nó!

      return {
        id,
        type: 'ProcessBlock',
        section_type: 'process',
        properties: {
          title: String(fields.section_title || fields.title || 'Como Funciona').slice(0, 200),
          subtitle: String(fields.subtitle || '').slice(0, 500),
          steps: stepsList.slice(0, 8),
        },
      } as StudioNode
    }

    case 'testimonials': {
      const rawTestimonials = fields.testimonials
      let testimonialsList: { id: string; author_name: string; role_company?: string; quote: string; avatar_url?: string; rating: number }[] = []

      if (Array.isArray(rawTestimonials) && rawTestimonials.length > 0) {
        testimonialsList = rawTestimonials.map((t: any, idx: number) => ({
          id: t.id || `t-${idx + 1}`,
          author_name: String(t.author_name || t.name || '').slice(0, 100),
          role_company: String(t.role_company || t.company || '').slice(0, 100),
          quote: String(t.quote || t.text || '').slice(0, 1000),
          avatar_url: t.avatar_url || '',
          rating: Number(t.rating || 5),
        }))
      }

      if (testimonialsList.length === 0) return null // REGRA DE NÃO-ALUCINAÇÃO: Se não há testemunhos, omitir o nó!

      return {
        id,
        type: 'TestimonialsBlock',
        section_type: 'testimonials',
        properties: {
          title: String(fields.section_title || fields.title || 'Depoimentos').slice(0, 200),
          subtitle: String(fields.subtitle || '').slice(0, 500),
          testimonials: testimonialsList.slice(0, 10),
        },
      } as StudioNode
    }

    case 'faq': {
      const rawItems = fields.items
      let faqList: { id: string; question: string; answer: string }[] = []

      if (Array.isArray(rawItems) && rawItems.length > 0) {
        faqList = rawItems.map((f: any, idx: number) => ({
          id: f.id || `faq-${idx + 1}`,
          question: String(f.question || f.q || '').slice(0, 300),
          answer: String(f.answer || f.a || '').slice(0, 1500),
        }))
      }

      if (faqList.length === 0) return null // REGRA DE NÃO-ALUCINAÇÃO: Se não há FAQ na origem, omitir o nó!

      return {
        id,
        type: 'FaqBlock',
        section_type: 'faq',
        properties: {
          title: String(fields.section_title || fields.title || 'Perguntas Frequentes').slice(0, 200),
          subtitle: String(fields.subtitle || '').slice(0, 500),
          items: faqList.slice(0, 15),
        },
      } as StudioNode
    }

    case 'contact':
      return {
        id,
        type: 'FormBlock',
        section_type: 'form',
        properties: {
          title: String(fields.form_title || fields.title || 'Entre em Contacto').slice(0, 200),
          subtitle: String(fields.form_subtitle || fields.subtitle || '').slice(0, 500),
          submit_button_text: String(fields.submit_label || 'Enviar Mensagem').slice(0, 100),
          fields: [
            { id: 'f-name', label: 'Nome Completo', type: 'text', required: true },
            { id: 'f-contact', label: 'Telefone ou E-mail', type: 'text', required: true },
          ],
        },
      } as StudioNode

    case 'footer':
      return {
        id,
        type: 'FooterBlock',
        section_type: 'footer',
        properties: {
          copyright_text: String(fields.copyright || fields.copyright_text || '© 2026 Blue Bolt Studio. Todos os direitos reservados.').slice(0, 200),
          contact_text: String(fields.contact_info || fields.contact_text || '').slice(0, 300),
          links: [],
        },
      } as StudioNode

    default:
      return null
  }
}

function createDefaultNodesFromTemplate(_schema?: any): StudioNode[] {
  return [
    {
      id: 'node-hero-1',
      type: 'HeroBlock',
      section_type: 'hero',
      properties: {
        headline: 'Transforme a Sua Presença Digital com o Blue Bolt Studio',
        subheadline: 'Criamos páginas de alta conversão adaptadas ao seu negócio.',
        cta_primary_text: 'Solicitar Proposta',
        cta_primary_url: '#contact',
        cta_secondary_text: 'Saber Mais',
        cta_secondary_url: '#services',
        badge_text: 'Blue Bolt Studio 2026',
        bg_image_url: '',
      },
    },
    {
      id: 'node-footer-1',
      type: 'FooterBlock',
      section_type: 'footer',
      properties: {
        copyright_text: '© 2026 Blue Bolt Studio. Todos os direitos reservados.',
        contact_text: '',
        links: [],
      },
    },
  ]
}
