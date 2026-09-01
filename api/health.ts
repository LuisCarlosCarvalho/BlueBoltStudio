import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    const sql = getDb()
    // Test minimal connectivity safely
    const result = await sql`SELECT 1 as alive`
    const isDbConnected = result && result.length > 0 && result[0].alive === 1

    return res.status(200).json({
      status: isDbConnected ? 'ok' : 'degraded',
      database: isDbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    })
  } catch {
    console.error('Health check database connection failure')
    return res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    })
  }
}
