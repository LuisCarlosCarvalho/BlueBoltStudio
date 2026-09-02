import type { Template } from '@/types'

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Generates a clean, deterministic 1200x630 SVG showing Desktop + Mobile mockups of a template schema.
 */
export function generateTemplateThumbnailSvg(template: Partial<Template>): string {
  const schema = (template.schema as any) || {}
  const sections: any[] = schema.sections || []
  const designTokens = schema.design_tokens || {}
  const primaryColor = designTokens.colors?.primary || '#064B88'
  const accentColor = designTokens.colors?.accent || '#1463FF'
  const bgLight = designTokens.colors?.background || '#F8FAFC'
  const textColor = designTokens.colors?.text || '#0F172A'

  const templateName = escapeXml(template.name || 'Template Blue Bolt')
  const category = escapeXml(template.category || 'Serviços')
  const sectionCount = sections.length || 8

  const servicesSection = sections.find((s) => s.type === 'services' || s.type === 'benefits') || sections[1]
  const servicesTitle = escapeXml(servicesSection?.label || 'Serviços em Destaque')

  return `
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background studio gradient -->
    <linearGradient id="bg_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#05192D" />
      <stop offset="60%" stop-color="#0A2540" />
      <stop offset="100%" stop-color="#0F3356" />
    </linearGradient>

    <!-- Desktop window glow & shadow -->
    <filter id="desk_shadow" x="30" y="45" width="760" height="530" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000000" flood-opacity="0.55" />
    </filter>

    <!-- Mobile phone glow & shadow -->
    <filter id="mob_shadow" x="780" y="80" width="370" height="530" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.65" />
    </filter>

    <linearGradient id="primary_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accentColor}" />
      <stop offset="100%" stop-color="${primaryColor}" />
    </linearGradient>

    <linearGradient id="card_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F1F5F9" />
    </linearGradient>

    <clipPath id="desktop_clip">
      <rect x="60" y="75" width="700" height="470" rx="14" />
    </clipPath>

    <clipPath id="mobile_clip">
      <rect x="815" y="105" width="300" height="475" rx="32" />
    </clipPath>
  </defs>

  <!-- Canvas Background -->
  <rect width="1200" height="630" fill="url(#bg_grad)" />

  <!-- Background subtle grid -->
  <g opacity="0.07">
    <path d="M0 63H1200M0 126H1200M0 189H1200M0 252H1200M0 315H1200M0 378H1200M0 441H1200M0 504H1200M0 567H1200" stroke="#FFFFFF" stroke-width="1"/>
    <path d="M120 0V630M240 0V630M360 0V630M480 0V630M600 0V630M720 0V630M840 0V630M960 0V630M1080 0V630" stroke="#FFFFFF" stroke-width="1"/>
  </g>

  <!-- Ambient Brand Aura -->
  <circle cx="280" cy="180" r="220" fill="${accentColor}" opacity="0.18" filter="blur(60px)" />
  <circle cx="960" cy="380" r="180" fill="${primaryColor}" opacity="0.22" filter="blur(60px)" />

  <!-- Top Studio Header Badge -->
  <g transform="translate(60, 32)">
    <rect width="180" height="28" rx="14" fill="#FFFFFF" fill-opacity="0.1" stroke="#FFFFFF" stroke-opacity="0.15" />
    <circle cx="16" cy="14" r="5" fill="${accentColor}" />
    <text x="28" y="18" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="0.5">BLUE BOLT STUDIO</text>
    <rect x="190" y="0" width="130" height="28" rx="14" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-opacity="0.3" />
    <text x="202" y="18" fill="#93C5FD" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="600">${category}</text>
  </g>

  <!-- ========================================================================= -->
  <!-- 1. DESKTOP MOCKUP (LEFT) -->
  <!-- ========================================================================= -->
  <g filter="url(#desk_shadow)">
    <!-- Browser Window Outer Shell -->
    <rect x="60" y="75" width="700" height="470" rx="14" fill="#0F172A" stroke="#334155" stroke-width="1.5" />

    <!-- Browser Window Content -->
    <g clip-path="url(#desktop_clip)">
      <!-- Browser Top Bar -->
      <rect x="60" y="75" width="700" height="34" fill="#1E293B" />
      <circle cx="82" cy="92" r="5" fill="#EF4444" />
      <circle cx="98" cy="92" r="5" fill="#F59E0B" />
      <circle cx="114" cy="92" r="5" fill="#10B981" />

      <!-- URL Pill -->
      <rect x="140" y="82" width="340" height="20" rx="6" fill="#0F172A" stroke="#334155" stroke-width="1" />
      <text x="152" y="96" fill="#94A3B8" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="500">https://seusite.pt/${template.slug || 'template'}</text>

      <!-- Desktop Body Canvas -->
      <rect x="60" y="109" width="700" height="436" fill="${bgLight}" />

      <!-- Hero Section Container -->
      <rect x="60" y="109" width="700" height="175" fill="#FFFFFF" />
      <path d="M60 109L760 109L760 284L60 284Z" fill="url(#primary_grad)" fill-opacity="0.05" />

      <!-- Hero Category Tag -->
      <rect x="90" y="130" width="110" height="18" rx="9" fill="${accentColor}" fill-opacity="0.12" />
      <text x="100" y="143" fill="${primaryColor}" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="700">${category}</text>

      <!-- Hero Headline -->
      <text x="90" y="172" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="800">${templateName}</text>
      <text x="90" y="194" fill="#64748B" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="500">Estrutura de alta conversão adaptada para ${category.toLowerCase()}.</text>

      <!-- Hero CTA Button -->
      <rect x="90" y="212" width="140" height="32" rx="8" fill="url(#primary_grad)" />
      <text x="110" y="232" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="700">Agendar Atendimento</text>

      <!-- Hero Visual Card / Media Box -->
      <rect x="490" y="130" width="240" height="125" rx="12" fill="url(#card_grad)" stroke="#E2E8F0" stroke-width="1" />
      <circle cx="610" cy="180" r="22" fill="${primaryColor}" fill-opacity="0.15" />
      <path d="M604 180L616 180M610 174L610 186" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" />
      <text x="560" y="215" fill="#64748B" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="600">Ativo Principal de Conversão</text>

      <!-- Services & Benefits Grid Header -->
      <text x="90" y="315" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="700">${servicesTitle}</text>
      <rect x="90" y="324" width="40" height="3" rx="1.5" fill="${accentColor}" />

      <!-- 3 Feature Cards in Desktop -->
      <g transform="translate(90, 340)">
        <!-- Card 1 -->
        <rect x="0" y="0" width="190" height="110" rx="10" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1" />
        <rect x="14" y="14" width="28" height="28" rx="8" fill="${accentColor}" fill-opacity="0.12" />
        <text x="24" y="32" fill="${primaryColor}" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="800">01</text>
        <text x="14" y="60" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="700">Diferencial 01</text>
        <text x="14" y="78" fill="#64748B" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="400">Entrega de valor e</text>
        <text x="14" y="90" fill="#64748B" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="400">experiência qualificada.</text>

        <!-- Card 2 -->
        <rect x="205" y="0" width="190" height="110" rx="10" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1" />
        <rect x="219" y="14" width="28" height="28" rx="8" fill="${primaryColor}" fill-opacity="0.12" />
        <text x="229" y="32" fill="${primaryColor}" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="800">02</text>
        <text x="219" y="60" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="700">Diferencial 02</text>
        <text x="219" y="78" fill="#64748B" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="400">Metodologia comprovada</text>
        <text x="219" y="90" fill="#64748B" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="400">e suporte contínuo.</text>

        <!-- Card 3 -->
        <rect x="410" y="0" width="190" height="110" rx="10" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1" />
        <rect x="424" y="14" width="28" height="28" rx="8" fill="#10B981" fill-opacity="0.12" />
        <text x="434" y="32" fill="#059669" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="800">03</text>
        <text x="424" y="60" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="700">Diferencial 03</text>
        <text x="424" y="78" fill="#64748B" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="400">Resultados práticos e</text>
        <text x="424" y="90" fill="#64748B" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="400">satisfação garantida.</text>
      </g>

      <!-- Desktop Footer Strip -->
      <rect x="60" y="475" width="700" height="70" fill="#0F172A" />
      <text x="90" y="505" fill="#94A3B8" font-family="Inter, system-ui, sans-serif" font-size="10">© 2026 ${templateName} &bull; Todos os direitos reservados.</text>
    </g>
  </g>

  <!-- ========================================================================= -->
  <!-- 2. MOBILE SMARTPHONE MOCKUP (RIGHT) -->
  <!-- ========================================================================= -->
  <g filter="url(#mob_shadow)">
    <!-- Smartphone Outer Rim -->
    <rect x="810" y="100" width="310" height="485" rx="36" fill="#0F172A" stroke="#475569" stroke-width="3" />

    <!-- Smartphone Screen -->
    <g clip-path="url(#mobile_clip)">
      <!-- Mobile Canvas -->
      <rect x="815" y="105" width="300" height="475" fill="${bgLight}" />

      <!-- Mobile Speaker Notch -->
      <rect x="915" y="112" width="100" height="14" rx="7" fill="#0F172A" />
      <circle cx="995" cy="119" r="3" fill="#334155" />

      <!-- Mobile Hero Section -->
      <rect x="815" y="135" width="300" height="175" fill="#FFFFFF" />
      <rect x="835" y="145" width="80" height="16" rx="8" fill="${accentColor}" fill-opacity="0.15" />
      <text x="843" y="156" fill="${primaryColor}" font-family="Inter, system-ui, sans-serif" font-size="8" font-weight="700">${category}</text>

      <text x="835" y="180" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="800">${templateName}</text>
      <text x="835" y="196" fill="#64748B" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="500">Pronto para mobile &amp; WhatsApp.</text>

      <rect x="835" y="210" width="260" height="30" rx="8" fill="url(#primary_grad)" />
      <text x="900" y="229" fill="#FFFFFF" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="700">Falar no WhatsApp</text>

      <!-- Mobile Hero Image Box -->
      <rect x="835" y="250" width="260" height="50" rx="8" fill="url(#card_grad)" stroke="#E2E8F0" stroke-width="1" />
      <text x="895" y="280" fill="#64748B" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="600">Visual Responsivo</text>

      <!-- Mobile Services Title -->
      <text x="835" y="330" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="700">${servicesTitle}</text>

      <!-- Mobile Stacked Cards -->
      <rect x="835" y="342" width="260" height="42" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1" />
      <circle cx="855" cy="363" r="10" fill="${accentColor}" fill-opacity="0.15" />
      <text x="852" y="367" fill="${primaryColor}" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="800">1</text>
      <text x="875" y="360" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="700">Serviço Principal</text>
      <text x="875" y="372" fill="#64748B" font-family="Inter, system-ui, sans-serif" font-size="8">Atendimento dedicado</text>

      <rect x="835" y="392" width="260" height="42" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1" />
      <circle cx="855" cy="413" r="10" fill="${primaryColor}" fill-opacity="0.15" />
      <text x="852" y="417" fill="${primaryColor}" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="800">2</text>
      <text x="875" y="410" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="700">Benefício Estratégico</text>
      <text x="875" y="422" fill="#64748B" font-family="Inter, system-ui, sans-serif" font-size="8">Alta conversão</text>

      <!-- Mobile FAQ item -->
      <rect x="835" y="442" width="260" height="34" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1" />
      <text x="848" y="463" fill="${textColor}" font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="600">Dúvidas Frequentes (FAQ)</text>
      <path d="M1075 459L1080 464L1085 459" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" />

      <!-- Mobile Footer -->
      <rect x="815" y="490" width="300" height="90" fill="#0F172A" />
      <text x="880" y="520" fill="#94A3B8" font-family="Inter, system-ui, sans-serif" font-size="8">© 2026 ${templateName}</text>
    </g>
  </g>

  <!-- Bottom Info Tag -->
  <g transform="translate(60, 575)">
    <text x="0" y="16" fill="#94A3B8" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="500">
      Miniatura gerada a partir do Schema Blue Bolt &bull; ${sectionCount} secções estruturadas &bull; Design Responsivo
    </text>
  </g>
</svg>
`.trim()
}
