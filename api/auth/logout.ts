import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clearAuthCookie, validateCsrf } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  if (!validateCsrf(req)) {
    return res.status(403).json({ error: 'Origem da requisição inválida.' })
  }

  clearAuthCookie(res)
  return res.status(200).json({ success: true, message: 'Sessão terminada com sucesso.' })
}
