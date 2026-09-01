import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { serialize, parse } from 'cookie'
import type { IncomingMessage, ServerResponse } from 'http'
import { getDb } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'bluebolt_studio_secure_jwt_secret_default_key_2026'
export const AUTH_COOKIE_NAME = 'bluebolt_session'

export interface TokenPayload {
  userId: string
  email: string
  role: 'admin' | 'user'
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

/**
 * Sets an httpOnly, Secure, SameSite=Lax cookie preventing XSS access
 */
export const setAuthCookie = (res: ServerResponse, token: string): void => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  const cookieHeader = serialize(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
  res.setHeader('Set-Cookie', cookieHeader)
}

/**
 * Clears the httpOnly session cookie on logout
 */
export const clearAuthCookie = (res: ServerResponse): void => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  const cookieHeader = serialize(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  res.setHeader('Set-Cookie', cookieHeader)
}

/**
 * Resolves token from httpOnly cookie or Authorization header fallback
 */
export const getTokenFromRequest = (req: IncomingMessage): string | null => {
  const cookieHeader = req.headers['cookie']
  if (cookieHeader) {
    const cookies = parse(cookieHeader)
    if (cookies[AUTH_COOKIE_NAME]) {
      return cookies[AUTH_COOKIE_NAME]
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
      FROM users u
      LEFT JOIN profiles p ON p.id = u.id
      WHERE u.id = ${payload.userId}
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      return null
    }

    const row = rows[0]
    return {
      id: row.id,
      email: row.email,
      role: (row.role as 'admin' | 'user') || 'user',
      full_name: row.full_name,
      avatar_url: row.avatar_url,
    }
  } catch (err) {
    console.error('Error fetching auth user from database:', err)
    return null
  }
}
