import { neon } from '@neondatabase/serverless'

export const getDbUrl = (): string => {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  )
}

export const getDb = () => {
  const url = getDbUrl()
  if (!url) {
    return null
  }
  try {
    return neon(url)
  } catch {
    console.error('Failed to initialize Neon client')
    return null
  }
}
