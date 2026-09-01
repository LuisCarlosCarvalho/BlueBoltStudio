import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, getDbUrl } from './_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  const dbUrl = getDbUrl()
  if (!dbUrl) {
    return res.status(503).json({
      status: 'degraded',
    })
  }

  try {
    const sql = getDb()
    const result = await sql`SELECT 1 as alive`
    const isDbConnected = result && result.length > 0 && result[0].alive === 1

    if (!isDbConnected) {
      return res.status(503).json({
        status: 'degraded',
      })
    }

    return res.status(200).json({
      status: 'ok',
    })
  } catch {
    return res.status(503).json({
      status: 'degraded',
    })
  }
}
