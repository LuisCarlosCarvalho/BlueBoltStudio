import { z } from 'zod'

export const safeNavLinkSchema = z
  .string()
  .max(500)
  .refine(
    (val) => {
      if (!val || val.startsWith('/') || val.startsWith('#')) return true
      try {
        const parsed = new URL(val)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      } catch {
        return false
      }
    },
    { message: 'URL de navegação inválido. Deve ser um caminho relativo (/), âncora (#) ou URL HTTP(S).' }
  )

export const safeImageUrlSchema = z
  .string()
  .max(1000)
  .refine(
    (val) => {
      if (!val) return true
      try {
        const parsed = new URL(val)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      } catch {
        return false
      }
    },
    { message: 'URL de imagem inválido. Deve ser um URL HTTP ou HTTPS seguro.' }
  )

export const heroPropertiesSchema = z
  .object({
    headline: z.string().min(1, 'O título principal é obrigatório.').max(200),
    subheadline: z.string().max(500).optional().default(''),
    cta_primary_text: z.string().max(100).optional().default(''),
    cta_primary_url: safeNavLinkSchema.optional().default(''),
    cta_secondary_text: z.string().max(100).optional().default(''),
    cta_secondary_url: safeNavLinkSchema.optional().default(''),
    badge_text: z.string().max(100).optional().default(''),
    bg_image_url: safeImageUrlSchema.optional().default(''),
  })
  .strict()

export const servicesPropertiesSchema = z
  .object({
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional().default(''),
    cards: z
      .array(
        z
          .object({
            id: z.string().optional(),
            title: z.string().min(1).max(150),
            description: z.string().max(500).optional().default(''),
            icon_name: z.string().max(50).optional().default(''),
            image_url: safeImageUrlSchema.optional().default(''),
          })
          .strict()
      )
      .min(1)
      .max(12),
  })
  .strict()

export const benefitsPropertiesSchema = z
  .object({
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional().default(''),
    items: z
      .array(
        z
          .object({
            id: z.string().optional(),
            title: z.string().min(1).max(150),
            description: z.string().max(500).optional().default(''),
            icon_name: z.string().max(50).optional().default(''),
          })
          .strict()
      )
      .min(1)
      .max(12),
  })
  .strict()

export const processPropertiesSchema = z
  .object({
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional().default(''),
    steps: z
      .array(
        z
          .object({
            step_number: z.number().int().positive(),
            title: z.string().min(1).max(150),
            description: z.string().max(500).optional().default(''),
          })
          .strict()
      )
      .min(1)
      .max(10),
  })
  .strict()

export const aboutPropertiesSchema = z
  .object({
    title: z.string().min(1).max(200),
    story: z.string().max(2000),
    image_url: safeImageUrlSchema.optional().default(''),
  })
  .strict()

export const teamPropertiesSchema = z
  .object({
    title: z.string().min(1).max(200),
    members: z
      .array(
        z
          .object({
            name: z.string().min(1).max(100),
            role: z.string().max(100),
            photo_url: safeImageUrlSchema.optional().default(''),
          })
          .strict()
      )
      .min(1)
      .max(20),
  })
  .strict()

export const testimonialsPropertiesSchema = z
  .object({
    title: z.string().min(1).max(200),
    testimonials: z
      .array(
        z
          .object({
            id: z.string().optional(),
            quote: z.string().min(1).max(1000),
            author_name: z.string().min(1).max(100),
            role_company: z.string().max(100).optional().default(''),
            avatar_url: safeImageUrlSchema.optional().default(''),
          })
          .strict()
      )
      .min(1)
      .max(20),
  })
  .strict()

export const faqPropertiesSchema = z
  .object({
    title: z.string().min(1).max(200),
    items: z
      .array(
        z
          .object({
            id: z.string().optional(),
            question: z.string().min(1).max(300),
            answer: z.string().min(1).max(1500),
          })
          .strict()
      )
      .min(1)
      .max(30),
  })
  .strict()

export const contactPropertiesSchema = z
  .object({
    title: z.string().min(1).max(200),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(50).optional().default(''),
    address: z.string().max(200).optional().default(''),
    google_maps_url: safeNavLinkSchema.optional().default(''),
  })
  .strict()

export const formPropertiesSchema = z
  .object({
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional().default(''),
    submit_button_text: z.string().max(100).optional().default('Enviar'),
    fields: z
      .array(
        z
          .object({
            id: z.string(),
            label: z.string().min(1).max(100),
            type: z.enum(['text', 'email', 'phone', 'textarea']),
            required: z.boolean(),
          })
          .strict()
      )
      .min(1)
      .max(10),
  })
  .strict()

export const footerPropertiesSchema = z
  .object({
    copyright_text: z.string().min(1).max(200),
    contact_text: z.string().max(300).optional().default(''),
    links: z
      .array(
        z
          .object({
            label: z.string().max(100),
            url: safeNavLinkSchema,
          })
          .strict()
      )
      .max(10)
      .optional(),
  })
  .strict()

export const studioNodeSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string(), type: z.literal('HeroBlock'), section_type: z.literal('hero'), properties: heroPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('ServicesBlock'), section_type: z.literal('services'), properties: servicesPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('BenefitsBlock'), section_type: z.literal('benefits'), properties: benefitsPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('ProcessBlock'), section_type: z.literal('process'), properties: processPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('AboutBlock'), section_type: z.literal('about'), properties: aboutPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('TeamBlock'), section_type: z.literal('team'), properties: teamPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('TestimonialsBlock'), section_type: z.literal('testimonials'), properties: testimonialsPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('FaqBlock'), section_type: z.literal('faq'), properties: faqPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('ContactBlock'), section_type: z.literal('contact'), properties: contactPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('FormBlock'), section_type: z.literal('form'), properties: formPropertiesSchema }).strict(),
  z.object({ id: z.string(), type: z.literal('FooterBlock'), section_type: z.literal('footer'), properties: footerPropertiesSchema }).strict(),
])

export const pageTreeSchema = z
  .object({
    nodes: z.array(studioNodeSchema),
  })
  .strict()
