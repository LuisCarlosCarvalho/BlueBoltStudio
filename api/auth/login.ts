import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getDb } from '../_lib/db'
import { comparePassword, generateToken, setAuthCookie, checkRateLimit, validateCsrf } from '../_lib/auth'

const loginInputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  // CSRF validation
  if (!validateCsrf(req)) {
    return res.status(403).json({ error: 'Origem da requisição inválida.' })
  }

  // Rate limiting
  if (!checkRateLimit(req, 10, 60 * 1000)) {
    return res.status(429).json({ error: 'Demasiadas tentativas de início de sessão. Aguarde 1 minuto.' })
  }

  const parseResult = loginInputSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Formato de e-mail ou palavra-passe inválido.' })
  }

  const { email, password } = parseResult.data

  try {
    const sql = getDb()
    let rows

    try {
      rows = await sql`
        SELECT u.id, u.email, u.password_hash, p.role, p.full_name, p.avatar_url
        FROM public.users u
        LEFT JOIN public.profiles p ON p.id = u.id
        WHERE LOWER(u.email) = LOWER(${email.trim()})
        LIMIT 1
      `
    } catch (dbErr: unknown) {
      const dbMessage = dbErr instanceof Error ? dbErr.message : String(dbErr)
      console.error('Database query error during login:', dbMessage)

      if (dbMessage.includes('does not exist') || dbMessage.includes('42P01')) {
        return res.status(500).json({
          error: 'A base de dados ainda não tem as tabelas criadas. Execute a migração 001_initial_neon_schema.sql no Neon SQL Editor.',
        })
      }

      return res.status(500).json({
        error: 'Erro de conexão à base de dados. Verifique a DATABASE_URL no painel da Vercel.',
      })
    }

    const genericAuthError = 'Credenciais inválidas. Verifique o seu e-mail e palavra-passe.'

    if (!rows || rows.length === 0) {
      // Fake hash compare to prevent timing side-channel
      await comparePassword(password, '$2a$12$e8xOQW0M5p8K4/7k8oX9g.Y8x5OQW0M5p8K4/7k8oX9g.Y8x5OQW0')
      return res.status(401).json({ error: genericAuthError })
    }

    const user = rows[0]
    const passwordMatch = await comparePassword(password, user.password_hash)

    if (!passwordMatch) {
      return res.status(401).json({ error: genericAuthError })
    }

    const role = (user.role as 'admin' | 'user') || 'user'
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role,
    })

    // Set secure httpOnly cookie
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
    console.error('Login process error:', err)
    return res.status(500).json({
      error: 'Erro ao processar autenticação. Verifique se as variáveis de ambiente estão configuradas na Vercel.',
    })
  }
}
