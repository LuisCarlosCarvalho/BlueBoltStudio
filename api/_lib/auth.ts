import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { serialize, parse } from 'cookie'
import type { IncomingMessage, ServerResponse } from 'http'
import type { VercelRequest } from '@vercel/node'
import { getDb } from './db'

export const AUTH_COOKIE_NAME = 'bluebolt_session'

// Retrieve secret strictly from environment variables without hardcoded fallbacks in production
export const getSessionSecret = (): string => {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
      throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET is not configured in environment variables.')
    }
    // Local dev only safety guard
    return 'local_dev_only_temporary_secret_key_not_for_production'
  }
  return secret
}

export interface TokenPayload {
  userId: string
  email: string
  role: 'admin' | 'user'
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12) // High security cost factor 12
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
 * Resolves token from httpOnly cookie or Authorization header
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
      id: row.id,
      email: row.email,
      role: (row.role as 'admin' | 'user') || 'user',
      full_name: row.full_name,
      avatar_url: row.avatar_url,
    }
  } catch {
    return null
  }
}

// In-memory rate limiting map for brute force mitigation in serverless instances
const loginAttemptsMap = new Map<string, { attempts: number; resetAt: number }>()

export const checkRateLimit = (req: VercelRequest, maxAttempts = 5, windowMs = 60 * 1000): boolean => {
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

/**
 * Validate Origin / Referer header on state-changing requests to prevent CSRF
 */
export const validateCsrf = (req: VercelRequest): boolean => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
    return true
  }

  const origin = (req.headers['origin'] as string) || ''
  const referer = (req.headers['referer'] as string) || ''
  const host = (req.headers['host'] as string) || ''

  if (!origin && !referer) {
    // In strict browser environments origin or referer is always provided
    return true
  }

  if (origin && !origin.includes(host) && !origin.includes('localhost')) {
    return false
  }

  if (referer && !referer.includes(host) && !referer.includes('localhost')) {
    return false
  }

  return true
}
