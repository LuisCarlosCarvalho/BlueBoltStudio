import { pageTreeSchema, type PageTree, type StudioNode } from '@/types/studio.types'

/**
 * Converte de forma determinística dados legados (projects.page_data) no schema estrito de nós do Studio.
 * Se os dados forem inválidos ou contiverem secções não suportadas, retorna success: false
 * para que o projeto permaneça no fallback de leitura legado sem corromper o Studio.
 */
export function legacyPageDataToPageTree(
  legacyData: any,
  selectedTemplateSchema?: any
): { success: boolean; pageTree?: PageTree; error?: string } {
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

  // 3. Mapear secções legadas (formatos { sections: [...] }) para nós discriminados estritos
  const rawSections = Array.isArray(legacyData.sections)
    ? legacyData.sections
    : Array.isArray(legacyData?.page?.sections)
      ? legacyData.page.sections
      : null

  if (rawSections) {
    try {
      const convertedNodes: StudioNode[] = []

      for (let i = 0; i < rawSections.length; i++) {
        const sec = rawSections[i]
        const node = convertLegacySectionToNode(sec, i)
        if (!node) {
          return {
            success: false,
            error: `Secção legada tipo '${sec.type || sec.section_type}' não suportada no registo inicial dos 11 nós.`,
          }
        }
        convertedNodes.push(node)
      }

      const convertedTree = { nodes: convertedNodes }
      const validation = pageTreeSchema.safeParse(convertedTree)
      if (validation.success) {
        return { success: true, pageTree: validation.data }
      } else {
        const issue = validation.error.issues[0]
        return {
          success: false,
          error: `Validação Zod falhou na conversão: ${issue?.path.join('.')} - ${issue?.message}`,
        }
      }
    } catch (err: any) {
      return {
        success: false,
        error: `Exceção durante a conversão dos dados legados: ${err?.message || err}`,
      }
    }
  }

  return { success: false, error: 'Formato de dados legado incompatível ou não reconhecido.' }
}

function convertLegacySectionToNode(sec: any, index: number): StudioNode | null {
  const type = (sec.type || sec.section_type || '').toLowerCase().trim()
  const id = sec.id || `node-${type}-${index + 1}`
  const fields = sec.editable_fields || sec.fields || {}

  switch (type) {
    case 'hero':
      return {
        id,
        type: 'HeroBlock',
        section_type: 'hero',
        properties: {
          headline: String(fields.headline || sec.title || 'Bem-vindo ao Blue Bolt Studio').slice(0, 200),
          subheadline: String(fields.subheadline || sec.subtitle || '').slice(0, 500),
          cta_primary_text: String(fields.cta_primary_text || fields.cta_text || 'Saber Mais').slice(0, 100),
          cta_primary_url: fields.cta_primary_url && String(fields.cta_primary_url).startsWith('https://') ? fields.cta_primary_url : '#contact',
          cta_secondary_text: '',
          cta_secondary_url: '',
          badge_text: String(fields.badge_text || '').slice(0, 100),
          bg_image_url: '',
        },
      } as StudioNode

    case 'services':
      return {
        id,
        type: 'ServicesBlock',
        section_type: 'services',
        properties: {
          title: String(sec.title || fields.title || 'Nossos Serviços').slice(0, 200),
          subtitle: String(sec.subtitle || fields.subtitle || '').slice(0, 500),
          cards: Array.isArray(fields.cards || sec.cards)
            ? (fields.cards || sec.cards).slice(0, 12).map((c: any, idx: number) => ({
                id: c.id || `card-${idx + 1}`,
                title: String(c.title || `Serviço ${idx + 1}`).slice(0, 150),
                description: String(c.description || '').slice(0, 500),
                icon_name: String(c.icon_name || 'Check').slice(0, 50),
              }))
            : [
                { id: 'card-1', title: 'Serviço Principal', description: 'Descrição do serviço oferecido.', icon_name: 'Check' },
              ],
        },
      } as StudioNode

    case 'benefits':
      return {
        id,
        type: 'BenefitsBlock',
        section_type: 'benefits',
        properties: {
          title: String(sec.title || fields.title || 'Principais Vantagens').slice(0, 200),
          subtitle: String(sec.subtitle || fields.subtitle || '').slice(0, 500),
          items: Array.isArray(fields.items || sec.items)
            ? (fields.items || sec.items).slice(0, 10).map((item: any, idx: number) => ({
                id: item.id || `item-${idx + 1}`,
                title: String(item.title || `Vantagem ${idx + 1}`).slice(0, 150),
                description: String(item.description || '').slice(0, 500),
                icon_name: String(item.icon_name || 'Star').slice(0, 50),
              }))
            : [
                { id: 'item-1', title: 'Qualidade Garantida', description: 'Excelência em cada detalhe.', icon_name: 'Star' },
              ],
        },
      } as StudioNode

    case 'process':
      return {
        id,
        type: 'ProcessBlock',
        section_type: 'process',
        properties: {
          title: String(sec.title || fields.title || 'Como Funciona').slice(0, 200),
          subtitle: String(sec.subtitle || fields.subtitle || '').slice(0, 500),
          steps: Array.isArray(fields.steps || sec.steps)
            ? (fields.steps || sec.steps).slice(0, 8).map((st: any, idx: number) => ({
                step_number: Number(st.step_number || idx + 1),
                title: String(st.title || `Passo ${idx + 1}`).slice(0, 150),
                description: String(st.description || '').slice(0, 500),
              }))
            : [
                { step_number: 1, title: 'Contacto Inicial', description: 'Entramos em contacto para alinhar necessidades.' },
              ],
        },
      } as StudioNode

    case 'about':
      return {
        id,
        type: 'AboutBlock',
        section_type: 'about',
        properties: {
          title: String(sec.title || fields.title || 'Sobre Nós').slice(0, 200),
          story_text: String(fields.story_text || sec.story_text || 'Nossa história e missão de mercado.').slice(0, 2000),
          image_url: '',
          stat_number: String(fields.stat_number || '10+').slice(0, 50),
          stat_label: String(fields.stat_label || 'Anos de Experiência').slice(0, 100),
        },
      } as StudioNode

    case 'team':
      return {
        id,
        type: 'TeamBlock',
        section_type: 'team',
        properties: {
          title: String(sec.title || fields.title || 'Nossa Equipa').slice(0, 200),
          subtitle: String(sec.subtitle || fields.subtitle || '').slice(0, 500),
          members: Array.isArray(fields.members || sec.members)
            ? (fields.members || sec.members).slice(0, 12).map((m: any, idx: number) => ({
                id: m.id || `member-${idx + 1}`,
                name: String(m.name || `Especialista ${idx + 1}`).slice(0, 100),
                role: String(m.role || 'Profissional').slice(0, 100),
                bio: String(m.bio || '').slice(0, 300),
              }))
            : [
                { id: 'member-1', name: 'Dr. João Silva', role: 'Diretor Técnico', bio: 'Especialista sénior.' },
              ],
        },
      } as StudioNode

    case 'testimonials':
      return {
        id,
        type: 'TestimonialsBlock',
        section_type: 'testimonials',
        properties: {
          title: String(sec.title || fields.title || 'O Que Dizem os Nossos Clientes').slice(0, 200),
          subtitle: String(sec.subtitle || fields.subtitle || '').slice(0, 500),
          testimonials: Array.isArray(fields.testimonials || sec.testimonials)
            ? (fields.testimonials || sec.testimonials).slice(0, 10).map((t: any, idx: number) => ({
                id: t.id || `test-${idx + 1}`,
                author_name: String(t.author_name || t.name || `Cliente ${idx + 1}`).slice(0, 100),
                role_company: String(t.role_company || t.company || 'Cliente Satisfeito').slice(0, 100),
                quote: String(t.quote || t.text || 'Excelente serviço e atendimento primoroso.').slice(0, 1000),
                rating: Number(t.rating || 5),
              }))
            : [
                { id: 'test-1', author_name: 'Maria Santos', role_company: 'Cliente', quote: 'Recomendo totalmente os serviços.', rating: 5 },
              ],
        },
      } as StudioNode

    case 'faq':
      return {
        id,
        type: 'FaqBlock',
        section_type: 'faq',
        properties: {
          title: String(sec.title || fields.title || 'Perguntas Frequentes').slice(0, 200),
          subtitle: String(sec.subtitle || fields.subtitle || '').slice(0, 500),
          items: Array.isArray(fields.items || sec.items)
            ? (fields.items || sec.items).slice(0, 15).map((f: any, idx: number) => ({
                id: f.id || `faq-${idx + 1}`,
                question: String(f.question || f.q || `Dúvida ${idx + 1}?`).slice(0, 300),
                answer: String(f.answer || f.a || 'Resposta esclarecedora sobre o serviço.').slice(0, 1500),
              }))
            : [
                { id: 'faq-1', question: 'Como agendar uma consulta?', answer: 'Pode agendar diretamente através do formulário abaixo ou por telefone.' },
              ],
        },
      } as StudioNode

    case 'contact':
      return {
        id,
        type: 'ContactBlock',
        section_type: 'contact',
        properties: {
          title: String(sec.title || fields.title || 'Entre em Contacto').slice(0, 200),
          email: fields.email && String(fields.email).includes('@') ? fields.email : 'contacto@exemplo.pt',
          phone: String(fields.phone || '+351 900 000 000').slice(0, 50),
          address: String(fields.address || 'Lisboa, Portugal').slice(0, 200),
        },
      } as StudioNode

    case 'form':
      return {
        id,
        type: 'FormBlock',
        section_type: 'form',
        properties: {
          title: String(sec.title || fields.title || 'Solicite a Sua Proposta').slice(0, 200),
          subtitle: String(sec.subtitle || fields.subtitle || '').slice(0, 500),
          submit_button_text: String(fields.submit_button_text || 'Enviar Mensagem').slice(0, 100),
          fields: [
            { id: 'f-name', label: 'Nome Completo', type: 'text', required: true },
            { id: 'f-email', label: 'E-mail Profissional', type: 'email', required: true },
            { id: 'f-phone', label: 'Telefone', type: 'phone', required: false },
          ],
        },
      } as StudioNode

    case 'footer':
      return {
        id,
        type: 'FooterBlock',
        section_type: 'footer',
        properties: {
          copyright_text: String(fields.copyright_text || '© 2026 Blue Bolt Studio. Todos os direitos reservados.').slice(0, 200),
          links: [
            { label: 'Termos de Serviço', url: '#terms' },
            { label: 'Política de Privacidade', url: '#privacy' },
          ],
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
      id: 'node-services-1',
      type: 'ServicesBlock',
      section_type: 'services',
      properties: {
        title: 'Nossos Serviços Especializados',
        subtitle: 'Soluções sob medida desenvolvidas para gerar resultados.',
        cards: [
          { id: 'c-1', title: 'Consultoria Estratégica', description: 'Análise de mercado e posicionamento de marca.', icon_name: 'Check' },
          { id: 'c-2', title: 'Design & Desenvolvimento', description: 'Páginas rápidas, seguras e responsivas.', icon_name: 'Code' },
          { id: 'c-3', title: 'Otimização de Conversão', description: 'Foco no aumento de leads e vendas.', icon_name: 'TrendingUp' },
        ],
      },
    },
    {
      id: 'node-contact-1',
      type: 'ContactBlock',
      section_type: 'contact',
      properties: {
        title: 'Entre em Contacto',
        email: 'contacto@bluebolt.pt',
        phone: '+351 910 000 000',
        address: 'Lisboa, Portugal',
      },
    },
    {
      id: 'node-footer-1',
      type: 'FooterBlock',
      section_type: 'footer',
      properties: {
        copyright_text: '© 2026 Blue Bolt Studio. Todos os direitos reservados.',
        links: [
          { label: 'Privacidade', url: '#privacy' },
          { label: 'Termos', url: '#terms' },
        ],
      },
    },
  ]
}
