import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../_lib/db'
import { comparePassword, generateToken, setAuthCookie } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e palavra-passe são obrigatórios.' })
  }

  try {
    const sql = getDb()
    const rows = await sql`
      SELECT u.id, u.email, u.password_hash, p.role, p.full_name, p.avatar_url
      FROM users u
      LEFT JOIN profiles p ON p.id = u.id
      WHERE LOWER(u.email) = LOWER(${email.trim()})
      LIMIT 1
    `

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique o seu e-mail e palavra-passe.' })
    }

    const user = rows[0]
    const passwordMatch = await comparePassword(password, user.password_hash)

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique o seu e-mail e palavra-passe.' })
    }

    const role = (user.role as 'admin' | 'user') || 'user'
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role,
    })

    // Store JWT securely in an httpOnly, Secure cookie
    setAuthCookie(res, token)

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        id: user.id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        role,
      },
    })
  } catch (err: unknown) {
    console.error('Login error:', err)
    const message = err instanceof Error ? err.message : 'Database error'
    return res.status(500).json({ error: 'Falha na autenticação: ' + message })
  }
}
