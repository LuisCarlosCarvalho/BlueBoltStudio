import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { IncomingMessage, ServerResponse } from 'http'
import type { VercelRequest } from '@vercel/node'
import { getDb } from './db'

export const AUTH_COOKIE_NAME = 'bluebolt_session'

export const getSessionSecret = (): string => {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    (process.env.DATABASE_URL ? `derived_bluebolt_secret_${process.env.DATABASE_URL.slice(0, 24)}` : '')

  if (!secret) {
    return 'bluebolt_studio_secure_session_key_2026_default_entropy'
  }
  return secret
}

export interface TokenPayload {
  userId: string
  email: string
  role: 'admin' | 'user'
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

export const generateToken = (payload: TokenPayload): string => {
  const secret = getSessionSecret()
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const secret = getSessionSecret()
    return jwt.verify(token, secret) as TokenPayload
  } catch {
    return null
  }
}

/**
 * Sets an httpOnly, Secure, SameSite=Lax cookie preventing XSS access
 */
export const setAuthCookie = (res: ServerResponse, token: string): void => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  const secureFlag = isProduction ? '; Secure' : ''
  const cookieHeader = `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secureFlag}`
  res.setHeader('Set-Cookie', cookieHeader)
}

/**
 * Clears the httpOnly session cookie on logout
 */
export const clearAuthCookie = (res: ServerResponse): void => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  const secureFlag = isProduction ? '; Secure' : ''
  const cookieHeader = `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`
  res.setHeader('Set-Cookie', cookieHeader)
}

/**
 * Resolves token from httpOnly cookie or Authorization header
 */
export const getTokenFromRequest = (req: IncomingMessage): string | null => {
  const cookieHeader = req.headers['cookie']
  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`))
    if (match) {
      return match.substring(AUTH_COOKIE_NAME.length + 1)
    }
  }

  const authHeader = req.headers['authorization']
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim()
  }

  return null
}

export const getAuthUser = async (req: IncomingMessage): Promise<{
  id: string
  email: string
  role: 'admin' | 'user'
  full_name: string | null
  avatar_url: string | null
} | null> => {
  const token = getTokenFromRequest(req)
  if (!token) {
    return null
  }

  const payload = verifyToken(token)
  if (!payload || !payload.userId) {
    return null
  }

  try {
    const sql = getDb()
    const rows = await sql`
      SELECT u.id, u.email, p.role, p.full_name, p.avatar_url
      FROM public.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE u.id = ${payload.userId}
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      return null
    }

    const row = rows[0]
    return {
      id: row.id as string,
      email: row.email as string,
      role: ((row.role as string) as 'admin' | 'user') || 'user',
      full_name: row.full_name as string | null,
      avatar_url: row.avatar_url as string | null,
    }
  } catch {
    return null
  }
}

// Rate limiting
const loginAttemptsMap = new Map<string, { attempts: number; resetAt: number }>()

export const checkRateLimit = (req: VercelRequest, maxAttempts = 15, windowMs = 60 * 1000): boolean => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const record = loginAttemptsMap.get(ip)

  if (!record || now > record.resetAt) {
    loginAttemptsMap.set(ip, { attempts: 1, resetAt: now + windowMs })
    return true
  }

  if (record.attempts >= maxAttempts) {
    return false
  }

  record.attempts += 1
  return true
}

export const validateCsrf = (req: VercelRequest): boolean => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
    return true
  }

  const origin = (req.headers['origin'] as string) || ''
  const referer = (req.headers['referer'] as string) || ''
  const host = (req.headers['host'] as string) || ''

  if (!origin && !referer) {
    return true
  }

  if (origin && !origin.includes(host) && !origin.includes('localhost') && !origin.includes('vercel.app')) {
    return false
  }

  if (referer && !referer.includes(host) && !referer.includes('localhost') && !referer.includes('vercel.app')) {
    return false
  }

  return true
}
