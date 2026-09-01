import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { neon } from '@neondatabase/serverless'

const AUTH_COOKIE_NAME = 'bluebolt_session'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    if (res.setHeader) res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  // Precedence: 1. DATABASE_URL, 2. POSTGRES_URL, 3. postgres_URL
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.postgres_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    ''

  if (!dbUrl) {
    console.error('DATABASE_URL is missing')
    return res.status(500).json({
      error: 'Não foi possível iniciar sessão. Tente novamente ou contacte o administrador.',
    })
  }

  const { email, password } = req.body || {}

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'E-mail e palavra-passe são obrigatórios.' })
  }

  const genericAuthError = 'Credenciais inválidas. Verifique o seu e-mail e palavra-passe.'

  try {
    const sql = neon(dbUrl)
    const rows = await sql`
      SELECT u.id, u.email, u.password_hash, p.role, p.full_name, p.avatar_url
      FROM public.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE LOWER(u.email) = LOWER(${email.trim()})
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      // Fake compare to prevent timing side-channel attacks
      await bcrypt.compare(password, '$2a$12$e8xOQW0M5p8K4/7k8oX9g.Y8x5OQW0M5p8K4/7k8oX9g.Y8x5OQW0')
      return res.status(401).json({ error: genericAuthError })
    }

    const user = rows[0] as any
    const passwordMatch = await bcrypt.compare(password, user.password_hash)

    if (!passwordMatch) {
      return res.status(401).json({ error: genericAuthError })
    }

    const role = (user.role as 'admin' | 'user') || 'user'
    const secret =
      process.env.SESSION_SECRET ||
      process.env.JWT_SECRET ||
      `derived_secret_${dbUrl.slice(0, 24)}`

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role,
      },
      secret,
      { expiresIn: '7d' }
    )

    // Set secure httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
    const secureFlag = isProduction ? '; Secure' : ''
    const cookieHeader = `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secureFlag}`
    res.setHeader('Set-Cookie', cookieHeader)

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
  } catch (err: any) {
    console.error('Login database error')
    return res.status(500).json({
      error: 'Não foi possível iniciar sessão. Tente novamente ou contacte o administrador.',
    })
  }
}
