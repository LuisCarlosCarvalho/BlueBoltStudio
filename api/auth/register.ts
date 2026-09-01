import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_lib/db'
import { hashPassword, generateToken, setAuthCookie } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password, full_name } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e palavra-passe são obrigatórios.' })
  }

  try {
    const sql = getDb()
    const existing = await sql`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${email.trim()}) LIMIT 1
    `

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Já existe uma conta associada a este endereço de e-mail.' })
    }

    const hashedPassword = await hashPassword(password)
    const insertedUsers = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email.trim()}, ${hashedPassword})
      RETURNING id, email
    `

    const user = insertedUsers[0]
    await sql`
      INSERT INTO profiles (id, full_name, role)
      VALUES (${user.id}, ${full_name || email.split('@')[0]}, 'user')
    `

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: 'user',
    })

    // Store JWT securely in httpOnly, Secure cookie
    setAuthCookie(res, token)

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        id: user.id,
        full_name: full_name || email.split('@')[0],
        avatar_url: null,
        role: 'user',
      },
    })
  } catch (err: unknown) {
    console.error('Registration error:', err)
    const message = err instanceof Error ? err.message : 'Database error'
    return res.status(500).json({ error: 'Falha ao criar conta: ' + message })
  }
}
