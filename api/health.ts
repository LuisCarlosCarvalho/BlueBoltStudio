import { neon } from '@neondatabase/serverless'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    if (res.setHeader) res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    ''

  if (!dbUrl) {
    return res.status(200).json({
      status: 'degraded',
      database: 'missing_environment_variable',
      message: 'A variável DATABASE_URL ou POSTGRES_URL não está configurada nas Environment Variables da Vercel.',
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const sql = neon(dbUrl)
    const result = await sql`SELECT 1 as alive`
    const isDbConnected = result && result.length > 0 && (result[0] as any).alive === 1

    return res.status(200).json({
      status: isDbConnected ? 'ok' : 'degraded',
      database: isDbConnected ? 'connected' : 'unreachable',
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return res.status(200).json({
      status: 'degraded',
      database: 'connection_failed',
      diagnostic: err?.message || 'Database connection error',
      timestamp: new Date().toISOString(),
    })
  }
}
