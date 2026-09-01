import type { Project, Profile, BriefingData, ProjectStatus } from '@/types'

export interface AuthResponse {
  user: {
    id: string
    email: string
  }
  profile: Profile
}

export interface AdminStats {
  totalUsers: number
  totalProjects: number
  approvedProjects: number
}

const fetchWithCredentials = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      ...options,
      credentials: 'include', // Automatically sends and receives httpOnly session cookies
      headers,
    })
  } catch (netErr: unknown) {
    if (import.meta.env.DEV) {
      console.error('Network fetch failure:', netErr)
    }
    throw new Error('Falha de ligação à API. Confirme que o servidor está a correr com npm run dev:vercel.')
  }

  let data: { error?: string } | null = null
  const responseText = await response.text()
  try {
    data = JSON.parse(responseText)
  } catch {
    data = null
  }

  if (!response.ok) {
    if (import.meta.env.DEV) {
      console.error(`API Error [${response.status}] ${endpoint}:`, data?.error || responseText)
    }

    if (response.status === 404) {
      throw new Error('Não foi possível iniciar sessão. Confirme a configuração do ambiente ou tente novamente.')
    }

    if (response.status === 401) {
      throw new Error(data?.error || 'Credenciais inválidas. Verifique o seu e-mail e palavra-passe.')
    }

    if (response.status === 429) {
      throw new Error(data?.error || 'Demasiadas tentativas. Aguarde 1 minuto antes de tentar novamente.')
    }

    if (response.status >= 500) {
      throw new Error('Não foi possível iniciar sessão. Tente novamente ou contacte o administrador.')
    }

    const errorMessage = data?.error || 'Ocorreu um erro ao processar o seu pedido. Tente novamente.'
    throw new Error(errorMessage)
  }

  return (data ?? ({} as unknown)) as T
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    return fetchWithCredentials<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  async getMe(): Promise<{ user: { id: string; email: string }; profile: Profile }> {
    return fetchWithCredentials<{ user: { id: string; email: string }; profile: Profile }>('/api/auth/me')
  },

  async logout(): Promise<void> {
    await fetchWithCredentials('/api/auth/logout', {
      method: 'POST',
    }).catch(() => null)
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    return fetchWithCredentials<Project[]>('/api/projects')
  },

  async createProject(params: {
    name: string
    client_name?: string
    client_business?: string
    briefing_data: BriefingData
    brand_data?: Record<string, unknown>
    page_data?: Record<string, unknown>
  }): Promise<Project> {
    return fetchWithCredentials<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  async getProject(id: string): Promise<Project> {
    return fetchWithCredentials<Project>(`/api/projects/${id}`)
  },

  async updateProject(
    id: string,
    params: {
      name?: string
      client_name?: string
      client_business?: string
      status?: ProjectStatus
      briefing_data?: BriefingData
      brand_data?: Record<string, unknown>
      page_data?: Record<string, unknown>
    }
  ): Promise<Project> {
    return fetchWithCredentials<Project>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
  },

  // Admin
  async getAdminStats(): Promise<AdminStats> {
    return fetchWithCredentials<AdminStats>('/api/admin/stats')
  },
}
