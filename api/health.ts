import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, getDbUrl } from './_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  const dbUrl = getDbUrl()
  if (!dbUrl) {
    return res.status(200).json({
      status: 'degraded',
      database: 'missing_environment_variable',
      message: 'A variável DATABASE_URL ou POSTGRES_URL não está configurada no projeto da Vercel.',
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const sql = getDb()
    if (!sql) {
      return res.status(200).json({
        status: 'degraded',
        database: 'driver_initialization_failed',
        timestamp: new Date().toISOString(),
      })
    }

    const result = await sql`SELECT 1 as alive`
    const isDbConnected = result && result.length > 0 && result[0].alive === 1

    return res.status(200).json({
      status: isDbConnected ? 'ok' : 'degraded',
      database: isDbConnected ? 'connected' : 'unreachable',
      timestamp: new Date().toISOString(),
    })
  } catch {
    console.error('Health check database query error')
    return res.status(200).json({
      status: 'degraded',
      database: 'connection_failed',
      timestamp: new Date().toISOString(),
    })
  }
}
