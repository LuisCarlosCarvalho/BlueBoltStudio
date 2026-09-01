# Blue Bolt Page Studio ⚡

Plataforma interna profissional para a equipa da agência digital **Blue Bolt**. Permite criar, estruturar, gerir, editar, rever e aprovar landing pages e websites de clientes com base em diretrizes estratégicas de conversão e templates modulares.

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS (v4), Lucide Icons
- **Backend**: Vercel Serverless Functions (`/api`), Node.js (arquitetura modular em 5 controladores)
- **Base de Dados**: Neon PostgreSQL Serverless
- **Validação de Dados**: Zod (validador estrito de esquemas JSON de templates no cliente e servidor)
- **Segurança**: Criptografia `bcrypt` (fator 12), Tokens JWT assinados com `SESSION_SECRET`, Cookies `httpOnly` + `Secure` + `SameSite=Lax` contra ataques XSS/CSRF

---

## 🏛️ Arquitetura Serverless na Vercel (Regra do Plano Hobby)

> ⚠️ **Diretriz Crítica de Roteamento Serverless:**
> No plano **Hobby da Vercel**, existe um limite estrito de **no máximo 12 Funções Serverless** por deployment. Para garantir conformidade total e evitar erros de build, a API está organizada em **5 Controladores Modulares**:

| Ficheiro Serverless | Rotas Mapeadas | Descrição / Responsabilidade |
| :--- | :--- | :--- |
| **`api/health.ts`** | `GET /api/health` | Diagnóstico de integridade do servidor e verificação ativa da ligação ao Neon PostgreSQL. |
| **`api/auth.ts`** | `POST /api/auth/login`<br>`POST /api/auth/logout`<br>`GET /api/auth/me`<br>`POST /api/auth/register` | Gestão de sessão, emissão e revogação de cookies JWT seguros. |
| **`api/templates.ts`** | `GET /api/templates`<br>`GET /api/templates/:id` | Galeria de templates ativos para colaboradores da agência com pesquisa e filtros. |
| **`api/admin.ts`** | `GET /api/admin/stats`<br>`GET, POST /api/admin/templates`<br>`GET, PATCH /api/admin/templates/:id` | Painel administrativo restrito: métricas, criação de templates JSON e versionamento imutável. |
| **`api/projects.ts`** | `GET, POST /api/projects`<br>`GET, PATCH /api/projects/:id`<br>`PATCH /api/projects/template`<br>`GET, POST /api/projects/content-sources` | Gestão de projetos, associação de templates base e submissão de materiais/textos do cliente. |

*O ficheiro [`vercel.json`](./vercel.json) contém as regras de `rewrites` que encaminham os sub-caminhos REST para estes 5 controladores.*

---

## 🔐 Configuração de Variáveis de Ambiente na Vercel

A resolução da base de dados no servidor segue a seguinte ordem de precedência:
1. **`DATABASE_URL`** *(Variável canónica e preferida para ambiente de produção)*
2. `POSTGRES_URL`
3. `postgres_URL`

> 🛡️ **Segurança:** Nenhuma variável de base de dados ou segredo JWT é exposta no código do frontend (React / Vite). Todas as consultas ao Neon ocorrem exclusivamente no backend serverless.

---

## 🗄️ Migrações de Base de Dados (Neon PostgreSQL)

As alterações ao esquema de dados são versionadas em ficheiros SQL na pasta `migrations/`:

### 1. Esquema Base
- **Ficheiro:** [`migrations/001_initial_neon_schema.sql`](./migrations/001_initial_neon_schema.sql)
- Cria as tabelas fundamentais: `users`, `profiles`, `projects`, `project_members` e `activity_logs`.

### 2. Criação do Primeiro Administrador
- **Ficheiro:** [`migrations/002_create_first_admin_template.sql`](./migrations/002_create_first_admin_template.sql)
- Insere a conta administrativa inicial com palavra-passe encriptada em `bcrypt`.

### 3. Repositório de Templates e Fontes de Conteúdo (Fase 2)
- **Ficheiro:** [`migrations/003_template_repository_and_sources.sql`](./migrations/003_template_repository_and_sources.sql)
- Cria as tabelas `templates`, `template_versions` e `project_content_sources`.
- Insere automaticamente o template padrão de desenvolvimento **"Serviços Profissionais"** com 8 secções estruturadas.

---

## ⚙️ Desenvolvimento Local

### 1. Iniciar Frontend Local (Vite)
```bash
npm run dev
```

### 2. Validação e Compilação para Produção
```bash
npm run lint      # Validação de regras e boas práticas com oxlint
npm run build     # Verificação rigorosa do TypeScript (tsc -b) e empacotamento Vite
```

### 3. Execução Local com Serverless Functions (Vercel CLI)
```bash
npm run dev:vercel
```

---

## 📋 Estado das Fases do Projeto

- [x] **Fase 1**: Arquitetura base, autenticação segura por cookies `httpOnly`, ligação Neon PostgreSQL, dashboard do utilizador e painel de administração.
- [x] **Fase 2**: Repositório de templates com validação Zod, editor JSON para admins, rastreabilidade de versões, seleção de template por projeto e submissão de texto do cliente (`project_content_sources`).
- [ ] **Fase 3**: Integração com IA para análise e mapeamento automático do conteúdo do cliente nas secções do template selecionado.
- [ ] **Fase 4**: Editor visual da página e portal público de revisão e aprovação pelo cliente.
