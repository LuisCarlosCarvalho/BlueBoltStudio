import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthUser } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' })
    }

    return res.status(200).json({
      user: {
        id: authUser.id,
        email: authUser.email,
      },
      profile: {
        id: authUser.id,
        full_name: authUser.full_name,
        avatar_url: authUser.avatar_url,
        role: authUser.role,
      },
    })
  } catch {
    return res.status(500).json({ error: 'Erro ao validar a sessão.' })
  }
}
