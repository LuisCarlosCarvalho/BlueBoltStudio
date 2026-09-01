const AUTH_COOKIE_NAME = 'bluebolt_session'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    if (res.setHeader) res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  const secureFlag = isProduction ? '; Secure' : ''
  const cookieHeader = `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`
  res.setHeader('Set-Cookie', cookieHeader)

  return res.status(200).json({ success: true, message: 'Sessão terminada com sucesso.' })
}
