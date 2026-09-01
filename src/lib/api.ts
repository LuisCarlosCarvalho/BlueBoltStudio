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

  const response = await fetch(endpoint, {
    ...options,
    credentials: 'include', // Automatically sends and receives httpOnly session cookies
    headers,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const errorMessage = data?.error || `Erro HTTP ${response.status}: ${response.statusText}`
    throw new Error(errorMessage)
  }

  return data as T
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
