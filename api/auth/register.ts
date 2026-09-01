import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getDb } from '../_lib/db'
import { hashPassword, getAuthUser, validateCsrf } from '../_lib/auth'

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  full_name: z.string().min(2).max(100).optional(),
  role: z.enum(['admin', 'user']).default('user'),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  if (!validateCsrf(req)) {
    return res.status(403).json({ error: 'Origem da requisição inválida.' })
  }

  // Only authenticated administrators can register new platform members
  const authUser = await getAuthUser(req)
  if (!authUser || authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem registar novos colaboradores.' })
  }

  const parseResult = registerSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Dados de registo inválidos.' })
  }

  const { email, password, full_name, role } = parseResult.data

  try {
    const sql = getDb()
    const existing = await sql`
      SELECT id FROM public.users WHERE LOWER(email) = LOWER(${email.trim()}) LIMIT 1
    `

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Já existe um utilizador registado com este e-mail.' })
    }

    const hashedPassword = await hashPassword(password)
    const insertedUsers = await sql`
      INSERT INTO public.users (email, password_hash)
      VALUES (${email.trim().toLowerCase()}, ${hashedPassword})
      RETURNING id, email
    `

    const user = insertedUsers[0]
    await sql`
      INSERT INTO public.profiles (id, full_name, role)
      VALUES (${user.id}, ${full_name || email.split('@')[0]}, ${role})
    `

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: full_name || email.split('@')[0],
        role,
      },
    })
  } catch {
    console.error('Registration process error')
    return res.status(500).json({ error: 'Erro interno ao registar utilizador.' })
  }
}
