import { neon, neonConfig } from '@neondatabase/serverless'

// Enable connection caching in serverless environments
neonConfig.fetchConnectionCache = true

export const getDbUrl = (): string => {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  )
}

export const getDb = () => {
  const url = getDbUrl()
  if (!url) {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is not set.')
  }
  return neon(url)
}
