# Blue Bolt Page Studio ⚡

Plataforma interna profissional para a equipa da agência digital **Blue Bolt**. Permite criar, estruturar, gerir, editar, rever e aprovar landing pages e websites de clientes com base em diretrizes estratégicas de conversão.

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS (v4)
- **Backend**: Vercel Serverless Functions (`/api`), Node.js
- **Base de Dados**: Neon PostgreSQL Serverless
- **Segurança**: Criptografia `bcrypt` (fator 12), Tokens JWT assinados com `SESSION_SECRET`, Cookies `httpOnly` + `Secure` + `SameSite=Lax` contra XSS/CSRF, Validação Zod, Rate Limiting

---

## ⚙️ Ambiente de Desenvolvimento Local (com API & Autenticação)

Para testar a aplicação com a API serverless e autenticação a funcionar localmente, utilize a CLI da Vercel:

### 1. Instalação e Autenticação na Vercel CLI
```bash
npm install -g vercel
vercel login
```

### 2. Associar o Projeto Local ao Projeto da Vercel
```bash
vercel link
```

### 3. Obter as Variáveis de Ambiente de Forma Segura
```bash
vercel env pull .env.local
```
*(O ficheiro `.env.local` é ignorado pelo Git e nunca será partilhado).*

### 4. Iniciar o Servidor de Desenvolvimento Completo
```bash
npm run dev:vercel
```
Abra o URL indicado no terminal (habitualmente `http://localhost:3000`).

---

## 🗄️ Execução de Migrações na Base de Dados (Neon)

As alterações ao esquema de dados são geridas através de ficheiros SQL versionados e **nunca** por endpoints públicos.

### 1. Criar Tabelas e Índices
1. Aceda ao painel do **Neon** (`https://console.neon.tech`) ou no painel da **Vercel** > **Storage** > **blueia** > **Query** (desative o toggle *Read-only* ou use o botão *Open in Neon*).
2. Execute o conteúdo de [`migrations/001_initial_neon_schema.sql`](./migrations/001_initial_neon_schema.sql).

### 2. Criar o Primeiro Administrador de Forma Segura
No mesmo SQL Editor, execute o modelo de [`migrations/002_create_first_admin_template.sql`](./migrations/002_create_first_admin_template.sql) definindo o seu e-mail e palavra-passe desejados.
