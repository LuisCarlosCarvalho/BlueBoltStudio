import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

/**
 * Resolves the database connection string strictly in order of precedence:
 * 1. process.env.DATABASE_URL (Canonical preferred variable)
 * 2. process.env.POSTGRES_URL
 * 3. process.env.postgres_URL
 * 4. process.env.POSTGRES_URL_NON_POOLING
 * 5. process.env.POSTGRES_PRISMA_URL
 */
export const getDbUrl = (): string => {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.postgres_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  )
}

export const getDb = (): NeonQueryFunction<false, false> => {
  const url = getDbUrl()
  if (!url) {
    throw new Error('Database connection URL is not configured.')
  }
  return neon(url)
}
