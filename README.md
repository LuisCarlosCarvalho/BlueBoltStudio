# Blue Bolt Page Studio ⚡

Plataforma interna profissional para a equipa da agência digital **Blue Bolt**. Permite criar, estruturar, gerir, editar, rever e aprovar landing pages e websites de clientes com base em diretrizes estratégicas de conversão.

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Vite
- **Roteamento & Autenticação**: React Router DOM (v7), Supabase Auth
- **Estilização**: Tailwind CSS (v4) com identidade visual personalizada Blue Bolt
- **Ícones**: Lucide React
- **Validação de Formulários**: React Hook Form, Zod
- **Base de Dados & Segurança**: Supabase (PostgreSQL), Row Level Security (RLS)

---

## ⚙️ Configuração e Execução Local

### 1. Pré-requisitos
- Node.js (v18+)
- Conta e projeto no [Supabase](https://supabase.com)

### 2. Instalação de Dependências
```bash
npm install
```

### 3. Configuração das Variáveis de Ambiente
Crie um ficheiro `.env` na raiz do projeto baseado no `.env.example`:

```bash
cp .env.example .env
```

Preencha as variáveis com as chaves públicas do seu projeto Supabase:
```env
VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-publica
```

> **Nota de Segurança:** Nunca utilize ou exponha chaves de serviço (`service_role`) no frontend. O cliente web utiliza exclusivamente a chave anónima (`anon key`) combinada com as regras de **Row Level Security (RLS)** da base de dados.

### 4. Executar em Desenvolvimento
```bash
npm run dev
```

Aceda à aplicação em `http://localhost:5173`.

---

## 🗄️ Aplicação de Migrações no Supabase

O ficheiro de migração inicial encontra-se em:
`supabase/migrations/20260901000001_initial_schema.sql`

Para aplicar a estrutura de base de dados:
1. Aceda ao painel do seu projeto no **Supabase** (`https://supabase.com/dashboard`).
2. No menu lateral esquerdo, clique no ícone **SQL Editor**.
3. Clique em **New query**.
4. Copie todo o conteúdo do ficheiro `supabase/migrations/20260901000001_initial_schema.sql` e cole no editor.
5. Clique em **Run** para executar o script.

O script criará:
- Tabelas: `public.profiles`, `public.projects`, `public.project_members`
- Função auxiliar e trigger para timestamps automáticos (`handle_updated_at`)
- Função auxiliar `public.is_admin(user_id)` com `SECURITY DEFINER` para evitar recursão no RLS
- Trigger para criação automática de perfil aquando do registo de novo utilizador (`handle_new_user`)
- Todas as políticas de **Row Level Security (RLS)** restritivas por papel e atribuição de projetos

---

## 🛡️ Atribuição Segura do Primeiro Administrador

Por motivos estritos de segurança, nenhum utilizador é promovido a administrador automaticamente pelo frontend. Para designar o primeiro administrador da agência:

1. Crie o utilizador no painel de autenticação do Supabase (**Authentication > Users > Add user**) ou faça o registo inicial da conta.
2. Aceda ao **SQL Editor** no painel do Supabase.
3. Execute o seguinte comando SQL substituindo pelo e-mail do colaborador:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@bluebolt.pt'
);
```

Após a execução, esse utilizador terá permissões completas de acesso ao painel de administração (`/admin`) e supervisão de todos os projetos da agência.

---

## 🧭 Estrutura de Rotas e Permissões (Fase 1)

| Rota | Descrição | Acesso |
| :--- | :--- | :--- |
| `/login` | Autenticação com e-mail e palavra-passe | Público |
| `/user` | Dashboard principal de projetos e métricas | `user`, `admin` |
| `/projects/new` | Formulário e registo de briefing estratégico | `user`, `admin` |
| `/projects/:projectId` | Detalhes do projeto e edição do briefing | `user`, `admin` |
| `/admin` | Painel de administração e supervisão global | Apenas `admin` |
| `/unauthorized` | Ecrã de bloqueio para tentativas não autorizadas | Autenticado |

---

## 🧠 Arquitetura: Mapeamento Inteligente de Conteúdo (Fase 2)

O **Blue Bolt Page Studio** inclui na sua especificação arquitetural o módulo **“Importar conteúdo para o template”**, permitindo à equipa preencher landing pages profissionais a partir de materiais brutos fornecidos pelo cliente sem quebrar a harmonia do design:

### 1. Fontes de Entrada Suportadas
- Texto não formatado colado diretamente.
- Ficheiros `.txt`.
- Documentos Word (`.docx`).
- Ficheiros PDF (`.pdf`).
- Campos estruturados do briefing já registados no projeto.

### 2. Fluxo Operacional
1. O colaborador seleciona o template pretendido.
2. É feito o upload do documento ou colado o texto de conteúdo do cliente.
3. O serviço extrai o texto com sanitização de segurança.
4. O motor de IA analisa o esquema JSON do template, as secções disponíveis e o conteúdo do cliente.
5. É gerada uma proposta estruturada de mapeamento (ex: `hero`, `value_proposition`, `services`, `faq`, etc.).
6. **Ecrã de Revisão Obrigatório**: O utilizador inspeciona lado a lado:
   - A secção do template;
   - O conteúdo proposto pela IA;
   - O excerto do documento de origem utilizado;
   - O nível de confiança;
   - Ações: *Aceitar*, *Editar manualmente* ou *Ignorar*.
7. O `page_data` só é atualizado após **confirmação explícita** do utilizador.
8. O texto original importado permanece armazenado no histórico do projeto para auditoria e rastreabilidade.
9. O layout e a integridade estética do template são estritamente preservados.

---

## 🔮 Roteiro para a Fase 2

1. **Repositório de Templates JSON**: Modelagem estrutural e limites por secção (`hero`, `services`, `process`, `faq`, etc.).
2. **Mapeamento Inteligente de Conteúdo**: Processamento seguro de `.docx`, `.pdf`, `.txt` e preenchimento assistido por IA com ecrã de revisão.
3. **Gerador de Copy com IA**: Alimentação do agente com as diretrizes de conversão do briefing.
4. **Editor Visual Interativo**: Manipulação e personalização em tempo real de blocos e secções.
5. **Portal de Revisão e Aprovação**: Partilha segura de links de validação com o cliente final.
