import { z } from 'zod'

export const INDUSTRY_KEYS = [
  'pet_shop',
  'restaurant',
  'beauty_clinic',
  'beauty_salon',
  'barbershop',
  'real_estate',
  'law_firm',
  'accounting',
  'healthcare',
  'dental_clinic',
  'gym',
  'ecommerce',
  'local_store',
  'construction',
  'logistics',
  'professional_services',
  'education',
  'events',
  'other',
] as const

export type IndustryKey = (typeof INDUSTRY_KEYS)[number]

export interface IndustryOption {
  key: IndustryKey
  label: string
  description?: string
  iconName?: string
}

export const INDUSTRY_OPTIONS: IndustryOption[] = [
  { key: 'pet_shop', label: 'Pet Shop e Bem-Estar Animal', description: 'Clínicas veterinárias, banho & tosa, rações e acessórios' },
  { key: 'restaurant', label: 'Restaurante e Gastronomia', description: 'Restaurantes, cafés, pastelarias, bares e catering' },
  { key: 'beauty_clinic', label: 'Clínica de Estética e Dermatologia', description: 'Tratamentos estéticos, rejuvenescimento e cuidados faciais' },
  { key: 'beauty_salon', label: 'Salão de Beleza e Cabeleireiro', description: 'Cabeleireiros, manicuras, maquilhagem e cuidados capilares' },
  { key: 'barbershop', label: 'Barbearia Masculina', description: 'Cortes modernos, barba clássica e cuidados masculinos' },
  { key: 'real_estate', label: 'Imobiliária e Mediação', description: 'Compra, venda, arrendamento de imóveis e consultoria' },
  { key: 'law_firm', label: 'Advocacia e Serviços Jurídicos', description: 'Sociedades de advogados, consultoria legal e solicitadoria' },
  { key: 'accounting', label: 'Contabilidade e Fiscalidade', description: 'Gabinetes de contabilidade, gestão fiscal e apoio financeiro' },
  { key: 'healthcare', label: 'Saúde e Clínicas Médicas', description: 'Consultórios médicos, fisioterapia e cuidados de saúde' },
  { key: 'dental_clinic', label: 'Clínica Dentária e Ortodontia', description: 'Implantologia, branqueamento e saúde oral' },
  { key: 'gym', label: 'Ginásio e Fitness', description: 'Treino personalizado, crossfit, ioga e estúdios desportivos' },
  { key: 'ecommerce', label: 'E-commerce e Loja Online', description: 'Venda de produtos online, marcas digitais e dropshipping' },
  { key: 'local_store', label: 'Comércio Local e Loja Física', description: 'Vestuário, decoração, mercearias e retalho especializado' },
  { key: 'construction', label: 'Construção, Obras e Reformas', description: 'Empreiteiros, remodelações, canalização e eletricidade' },
  { key: 'logistics', label: 'Logística e Transportes', description: 'Distribuição, frotas, mudanças e transitários' },
  { key: 'professional_services', label: 'Serviços Profissionais e Consultoria', description: 'Consultoria de gestão, marketing, TI e serviços empresariais' },
  { key: 'education', label: 'Educação, Cursos e Formação', description: 'Escolas, centros de estudos, workshops e cursos online' },
  { key: 'events', label: 'Eventos, Fotografia e Festas', description: 'Organizadores de eventos, fotógrafos e espaços para festas' },
  { key: 'other', label: 'Outro Segmento de Negócio', description: 'Especifique o seu nicho específico de atuação' },
]

export const industryKeySchema = z.enum(INDUSTRY_KEYS)

export function getIndustryLabel(key?: string | null): string {
  if (!key) return 'Segmento Geral'
  const found = INDUSTRY_OPTIONS.find((opt) => opt.key === key)
  return found ? found.label : key
}
