import { neon } from '@neondatabase/serverless'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    if (res.setHeader) res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  // Precedence: 1. DATABASE_URL (Canonical), 2. POSTGRES_URL, 3. postgres_URL
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.postgres_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    ''

  if (!dbUrl) {
    return res.status(503).json({
      status: 'degraded',
      reason: 'database_url_not_configured',
    })
  }

  try {
    const sql = neon(dbUrl)
    const result = await sql`SELECT 1 as alive`
    const isDbConnected = result && result.length > 0 && (result[0] as any).alive === 1

    if (!isDbConnected) {
      return res.status(503).json({
        status: 'degraded',
      })
    }

    return res.status(200).json({
      status: 'ok',
      database: 'connected',
    })
  } catch {
    console.error('Database query failed in health check')
    return res.status(503).json({
      status: 'degraded',
      reason: 'database_connection_failed',
    })
  }
}
