import { z } from 'zod'
import type { Database, ProjectStatus, UserRole, ProjectAccessLevel, Json } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Project = Database['public']['Tables']['projects']['Row'] & {
  creator?: Profile | null
  assignee?: Profile | null
}
export type ProjectMember = Database['public']['Tables']['project_members']['Row'] & {
  profile?: Profile | null
}

export type { UserRole, ProjectStatus, ProjectAccessLevel, Json }
export * from './template.types'
export * from './ai.types'

export interface BriefingData {
  [key: string]: Json | undefined
  objective?: string
  target_audience?: string
  customer_pains?: string
  services_products?: string
  main_cta?: string
  additional_notes?: string
}

// Zod schema for new project form validation
export const newProjectSchema = z.object({
  name: z
    .string()
    .min(3, { message: 'O nome do projeto deve ter no mínimo 3 caracteres.' })
    .max(100, { message: 'O nome do projeto não pode exceder 100 caracteres.' }),
  client_name: z
    .string()
    .min(2, { message: 'O nome do cliente deve ter no mínimo 2 caracteres.' })
    .max(100, { message: 'O nome do cliente não pode exceder 100 caracteres.' }),
  client_business: z
    .string()
    .min(2, { message: 'O ramo de atividade / nicho é obrigatório.' })
    .max(100, { message: 'O nicho não pode exceder 100 caracteres.' }),
  objective: z
    .string()
    .min(10, { message: 'Descreva o objetivo do projeto com pelo menos 10 caracteres.' }),
  target_audience: z
    .string()
    .min(5, { message: 'Indique o público-alvo principal da página.' }),
  customer_pains: z
    .string()
    .min(5, { message: 'Indique as principais dores ou necessidades do cliente.' }),
  services_products: z
    .string()
    .min(5, { message: 'Liste os serviços ou produtos a destacar na página.' }),
  main_cta: z
    .string()
    .min(3, { message: 'Indique o Call-to-Action principal (ex: Agendar Reunião, Comprar Agora).' }),
  additional_notes: z.string().optional(),
})

export type NewProjectFormData = z.infer<typeof newProjectSchema>

// Zod schema for login form validation
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'O e-mail é obrigatório.' })
    .email({ message: 'Introduza um endereço de e-mail válido.' }),
  password: z
    .string()
    .min(6, { message: 'A palavra-passe deve ter pelo menos 6 caracteres.' }),
})

export type LoginFormData = z.infer<typeof loginSchema>
