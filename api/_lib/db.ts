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
    throw new Error('A variável DATABASE_URL ou POSTGRES_URL não está configurada nas Environment Variables da Vercel.')
  }
  return neon(url)
}
