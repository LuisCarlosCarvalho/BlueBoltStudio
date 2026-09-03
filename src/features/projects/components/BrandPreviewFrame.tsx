import React from 'react'
import { Sparkles, ArrowRight, Check, Phone, Mail, Star, ShieldCheck } from 'lucide-react'
import type { BrandKitData } from '@/types'

interface BrandPreviewFrameProps {
  brandData: BrandKitData
  device: 'desktop' | 'mobile'
}

export const BrandPreviewFrame: React.FC<BrandPreviewFrameProps> = ({ brandData, device }) => {
  const {
    brand_name = 'Sua Marca',
    slogan = 'Transformamos ideias em resultados extraordinários',
    logo_url,
    logo_dark_url,
    primary_color = '#1463FF',
    secondary_color = '#05192D',
    accent_color = '#FF6B00',
    bg_color = '#FFFFFF',
    text_color = '#0F172A',
    font_heading = 'Inter',
    font_body = 'Inter',
    visual_style = 'clean_minimal',
    voice_tone = 'profissional',
  } = brandData

  // Safe logo url check
  const logoToDisplay = logo_url || '/logo.png'

  return (
    <div className="w-full flex flex-col items-center">
      {/* Frame Container */}
      <div
        className={`transition-all duration-300 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 ${
          device === 'mobile' ? 'w-[375px] min-h-[667px] my-2' : 'w-full min-h-[600px]'
        }`}
        style={{
          fontFamily: `'${font_body}', sans-serif`,
          backgroundColor: bg_color,
          color: text_color,
        }}
      >
        {/* Sample Top Navigation Header */}
        <header
          className="px-6 py-4 flex items-center justify-between border-b transition-colors"
          style={{
            backgroundColor: secondary_color,
            color: '#FFFFFF',
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center gap-3">
            {logo_dark_url ? (
              <img src={logo_dark_url} alt={brand_name} className="h-8 max-w-[120px] object-contain" />
            ) : logoToDisplay ? (
              <img src={logoToDisplay} alt={brand_name} className="h-8 max-w-[120px] object-contain" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: primary_color, color: '#FFFFFF' }}
              >
                {brand_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className="font-bold text-sm tracking-tight text-white"
              style={{ fontFamily: `'${font_heading}', sans-serif` }}
            >
              {brand_name || 'Marca'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs opacity-90">
            <span>Início</span>
            <span>Serviços</span>
            <span>Contacto</span>
          </div>

          <button
            type="button"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: primary_color }}
          >
            Falar Connosco
          </button>
        </header>

        {/* 1. Hero Section Sample */}
        <section
          className="px-6 py-10 sm:py-14 text-center flex flex-col items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: bg_color }}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 border"
            style={{
              backgroundColor: `${primary_color}15`,
              color: primary_color,
              borderColor: `${primary_color}30`,
            }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: accent_color }} />
            <span>Estilo {visual_style.replace('_', ' ')} • Tom {voice_tone}</span>
          </div>

          <h1
            className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight max-w-xl mb-3"
            style={{ fontFamily: `'${font_heading}', sans-serif`, color: text_color }}
          >
            {slogan || 'Sua Mensagem de Impacto em Destaque'}
          </h1>

          <p className="text-xs sm:text-sm max-w-md mb-6 opacity-80" style={{ color: text_color }}>
            Soluções sob medida desenhadas com precisão para elevar o seu negócio ao próximo nível de conversão e autoridade.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
              style={{ backgroundColor: primary_color }}
            >
              <span>Começar Agora</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border transition-colors"
              style={{
                borderColor: `${primary_color}40`,
                color: text_color,
                backgroundColor: `${primary_color}08`,
              }}
            >
              Saber Mais
            </button>
          </div>
        </section>

        {/* 2. Features / Cards Section Sample */}
        <section
          className="px-6 py-8 border-t"
          style={{
            backgroundColor: `${secondary_color}05`,
            borderColor: `${secondary_color}15`,
          }}
        >
          <div className="text-center mb-6">
            <h2
              className="text-lg font-bold tracking-tight mb-1"
              style={{ fontFamily: `'${font_heading}', sans-serif`, color: text_color }}
            >
              Os Nossos Diferenciais
            </h2>
            <p className="text-xs opacity-75">Garantia de qualidade e resultados consistentes</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: 'Excelência Técnica', icon: ShieldCheck, desc: 'Padrões internacionais de entrega' },
              { title: 'Atendimento Dedicado', icon: Star, desc: 'Acompanhamento humano contínuo' },
              { title: 'Resultados Comprovados', icon: Check, desc: 'Foco total no retorno do seu projeto' },
            ].map((card, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border bg-white shadow-sm flex flex-col items-start gap-2"
                style={{ borderColor: `${secondary_color}20` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${primary_color}15`, color: primary_color }}
                >
                  <card.icon className="w-4 h-4" />
                </div>
                <h3
                  className="font-bold text-xs"
                  style={{ fontFamily: `'${font_heading}', sans-serif`, color: text_color }}
                >
                  {card.title}
                </h3>
                <p className="text-[11px] opacity-70 leading-snug">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Contact & CTA Banner Sample */}
        <section
          className="px-6 py-8 text-white text-center flex flex-col items-center"
          style={{ backgroundColor: secondary_color }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: accent_color, color: '#FFFFFF' }}
          >
            <Phone className="w-5 h-5" />
          </div>

          <h3
            className="text-lg font-bold mb-1"
            style={{ fontFamily: `'${font_heading}', sans-serif` }}
          >
            Pronto para impulsionar a marca {brand_name}?
          </h3>
          <p className="text-xs opacity-80 max-w-sm mb-4">
            Entre em contacto com a nossa equipa especializada e agende uma avaliação sem compromisso.
          </p>

          <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-white/10 border border-white/20">
            <Mail className="w-3.5 h-3.5 text-white/80" />
            <span>contacto@{brand_name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'suamarca'}.pt</span>
          </div>
        </section>

        {/* Footer Sample */}
        <footer
          className="px-6 py-3 border-t text-[10px] text-center opacity-60"
          style={{ backgroundColor: secondary_color, color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          © {new Date().getFullYear()} {brand_name}. Todos os direitos reservados. Powered by Blue Bolt Page Studio.
        </footer>
      </div>
    </div>
  )
}
