import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'

const AUTH_COOKIE_NAME = 'bluebolt_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

const getDbUrl = (): string => {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.postgres_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  )
}

const getJwtSecret = (dbUrl: string): string => {
  return (
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    (dbUrl ? `derived_secret_${dbUrl.slice(0, 24)}` : 'bluebolt_session_secret')
  )
}

const getAuthUserFromRequest = async (req: any, dbUrl: string) => {
  const cookieHeader = req.headers['cookie']
  let token: string | null = null

  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map((c: string) => c.trim())
      .find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
    if (match) {
      token = match.substring(AUTH_COOKIE_NAME.length + 1)
    }
  }

  if (!token) {
    const authHeader = req.headers['authorization']
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim()
    }
  }

  if (!token) return null

  const secret = getJwtSecret(dbUrl)

  try {
    const payload = jwt.verify(token, secret) as any
    if (!payload || !payload.userId) return null

    const sql = neon(dbUrl)
    const rows = await sql`
      SELECT u.id, u.email, p.role, p.full_name, p.avatar_url
      FROM public.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE u.id = ${payload.userId}
      LIMIT 1
    `

    if (!rows || rows.length === 0) return null
    const row = rows[0] as any
    const role = row.role || (row.email?.toLowerCase().startsWith('admin@') ? 'admin' : 'user')
    return {
      id: row.id,
      email: row.email,
      role,
      full_name: row.full_name || (role === 'admin' ? 'Administrador' : 'Colaborador'),
      avatar_url: row.avatar_url,
    }
  } catch {
    return null
  }
}

export default async function handler(req: any, res: any) {
  const dbUrl = getDbUrl()
  if (!dbUrl) {
    return res.status(500).json({ error: 'Base de dados não configurada.' })
  }

  // Parse path to route: /api/auth/login, /api/auth/logout, /api/auth/me, /api/auth/register
  const url = req.url || ''
  const cleanUrl = url.split('?')[0]
  const action = cleanUrl.replace(/^\/api\/auth\/?/, '')

  const sql = neon(dbUrl)
  const secret = getJwtSecret(dbUrl)

  // 1. GET /api/auth/me
  if (action === 'me' || action === '') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método não permitido.' })
    }

    const authUser = await getAuthUserFromRequest(req, dbUrl)
    if (!authUser) {
      return res.status(401).json({ error: 'Não autenticado.' })
    }

    return res.status(200).json({ user: authUser })
  }

  // 2. POST /api/auth/login
  if (action === 'login') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido.' })
    }

    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e palavra-passe são obrigatórios.' })
    }

    try {
      const users = await sql`
        SELECT u.id, u.email, u.password_hash, p.role, p.full_name, p.avatar_url
        FROM public.users u
        LEFT JOIN public.profiles p ON p.id = u.id
        WHERE LOWER(u.email) = LOWER(${email.trim()})
        LIMIT 1
      `

      if (users.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas.' })
      }

      const user = users[0] as any
      const isMatch = await bcrypt.compare(password, user.password_hash)
      if (!isMatch) {
        return res.status(401).json({ error: 'Credenciais inválidas.' })
      }

      const role = user.role || (user.email?.toLowerCase().startsWith('admin@') ? 'admin' : 'user')

      const token = jwt.sign(
        { userId: user.id, email: user.email, role },
        secret,
        { expiresIn: '7d' }
      )

      res.setHeader(
        'Set-Cookie',
        `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`
      )

      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          role,
          full_name: user.full_name || (role === 'admin' ? 'Administrador' : 'Colaborador'),
          avatar_url: user.avatar_url,
        },
      })
    } catch (err) {
      console.error('[AUTH_LOGIN_ERROR]:', err)
      return res.status(500).json({ error: 'Erro no servidor ao processar autenticação.' })
    }
  }

  // 3. POST /api/auth/logout
  if (action === 'logout') {
    res.setHeader(
      'Set-Cookie',
      `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
    )
    return res.status(200).json({ message: 'Sessão terminada com sucesso.' })
  }

  // 4. POST /api/auth/register
  if (action === 'register') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido.' })
    }

    const { email, password, full_name, role = 'user' } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e palavra-passe são obrigatórios.' })
    }

    try {
      const existing = await sql`SELECT id FROM public.users WHERE LOWER(email) = LOWER(${email.trim()}) LIMIT 1`
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Este endereço de e-mail já se encontra registado.' })
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      const inserted = await sql`
        INSERT INTO public.users (email, password_hash)
        VALUES (${email.trim().toLowerCase()}, ${hashedPassword})
        RETURNING id, email
      `
      const newUser = inserted[0] as any

      await sql`
        INSERT INTO public.profiles (id, full_name, role)
        VALUES (${newUser.id}, ${full_name || email.split('@')[0]}, ${role})
        ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role
      `

      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email, role },
        secret,
        { expiresIn: '7d' }
      )

      res.setHeader(
        'Set-Cookie',
        `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`
      )

      return res.status(201).json({
        user: {
          id: newUser.id,
          email: newUser.email,
          role,
          full_name: full_name || email.split('@')[0],
          avatar_url: null,
        },
      })
    } catch {
      return res.status(500).json({ error: 'Erro ao registar utilizador.' })
    }
  }

  return res.status(404).json({ error: 'Ação de autenticação desconhecida.' })
}
