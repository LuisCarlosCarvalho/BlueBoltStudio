import type {
  Project,
  Profile,
  BriefingData,
  ProjectStatus,
  Template,
  TemplateCreateInput,
  TemplateUpdateInput,
  ProjectContentSource,
  ProjectAiMapping,
} from '@/types'

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
    throw new Error('Falha de ligação à API. Confirme a sua ligação ou tente novamente.')
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

    if (response.status === 401) {
      throw new Error(data?.error || 'Sessão expirada ou credenciais inválidas. Inicie sessão novamente.')
    }

    if (response.status === 403) {
      throw new Error(data?.error || 'Não tem permissão para realizar esta operação.')
    }

    if (response.status === 404) {
      throw new Error(data?.error || 'O recurso solicitado não foi encontrado.')
    }

    if (response.status === 429) {
      throw new Error(data?.error || 'Demasiados pedidos. Aguarde um momento antes de tentar novamente.')
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

  async assignProjectTemplate(
    projectId: string,
    templateId: string
  ): Promise<{ project: Project; template: Template; message: string }> {
    return fetchWithCredentials<{ project: Project; template: Template; message: string }>(
      '/api/projects/template',
      {
        method: 'PATCH',
        body: JSON.stringify({ project_id: projectId, template_id: templateId }),
      }
    )
  },

  async getProjectContentSources(projectId: string): Promise<ProjectContentSource[]> {
    return fetchWithCredentials<ProjectContentSource[]>(`/api/projects/content-sources?projectId=${projectId}`)
  },

  async addProjectContentSource(
    projectId: string,
    text: string,
    sourceType: string = 'pasted_text',
    originalFilename?: string
  ): Promise<{ source: ProjectContentSource; message: string }> {
    return fetchWithCredentials<{ source: ProjectContentSource; message: string }>(
      '/api/projects/content-sources',
      {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, text, source_type: sourceType, original_filename: originalFilename }),
      }
    )
  },

  // Phase 3: AI Content Mapping
  async generateAiMapping(
    projectId: string,
    contentSourceId: string
  ): Promise<{ mapping: ProjectAiMapping; message: string }> {
    return fetchWithCredentials<{ mapping: ProjectAiMapping; message: string }>(
      '/api/projects/ai-mappings',
      {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, content_source_id: contentSourceId }),
      }
    )
  },

  async getAiMappings(projectId: string): Promise<ProjectAiMapping[]> {
    return fetchWithCredentials<ProjectAiMapping[]>(`/api/projects/ai-mappings?projectId=${projectId}`)
  },

  async applyAiMapping(
    mappingId: string,
    appliedFields: Record<string, Record<string, string>>
  ): Promise<{ project: Project; mapping: ProjectAiMapping; message: string }> {
    return fetchWithCredentials<{ project: Project; mapping: ProjectAiMapping; message: string }>(
      `/api/projects/ai-mappings/${mappingId}/apply`,
      {
        method: 'POST',
        body: JSON.stringify({ applied_fields: appliedFields }),
      }
    )
  },

  async discardAiMapping(mappingId: string): Promise<{ mapping: ProjectAiMapping; message: string }> {
    return fetchWithCredentials<{ mapping: ProjectAiMapping; message: string }>(
      `/api/projects/ai-mappings/${mappingId}/discard`,
      {
        method: 'POST',
      }
    )
  },

  // Templates (Agency User Library)
  async getTemplates(params?: { category?: string; search?: string }): Promise<Template[]> {
    const queryParams = new URLSearchParams()
    if (params?.category && params.category !== 'all') {
      queryParams.set('category', params.category)
    }
    if (params?.search && params.search.trim()) {
      queryParams.set('search', params.search.trim())
    }
    const qs = queryParams.toString()
    return fetchWithCredentials<Template[]>(`/api/templates${qs ? `?${qs}` : ''}`)
  },

  async getTemplate(id: string): Promise<Template> {
    return fetchWithCredentials<Template>(`/api/templates/${id}`)
  },

  // Admin Templates Repository
  async getAdminTemplates(): Promise<Template[]> {
    return fetchWithCredentials<Template[]>('/api/admin/templates')
  },

  async getAdminTemplate(id: string): Promise<{ template: Template; versions: unknown[] }> {
    return fetchWithCredentials<{ template: Template; versions: unknown[] }>(`/api/admin/templates/${id}`)
  },

  async createAdminTemplate(data: TemplateCreateInput): Promise<Template> {
    return fetchWithCredentials<Template>('/api/admin/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateAdminTemplate(id: string, data: TemplateUpdateInput): Promise<Template> {
    return fetchWithCredentials<Template>(`/api/admin/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  // Admin Stats
  async getAdminStats(): Promise<AdminStats> {
    return fetchWithCredentials<AdminStats>('/api/admin/stats')
  },
}
