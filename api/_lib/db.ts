import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

export const getDbUrl = (): string => {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  )
}

export const getDb = (): NeonQueryFunction<false, false> => {
  const url = getDbUrl()
  if (!url) {
    throw new Error('DATABASE_URL is not configured in environment variables')
  }
  return neon(url)
}
