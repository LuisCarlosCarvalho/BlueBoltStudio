# AGENTS.md — Blue Bolt Page Studio

Este ficheiro é lido por agentes de IA (Antigravity, Copilot, Cursor, etc.) antes de gerar qualquer código para este repositório.

---

## ⚡ Regra Obrigatória de Design System

**Todo o trabalho visual deve seguir [`docs/DESIGN_SYSTEM_BLUE_BOLT.md`](./docs/DESIGN_SYSTEM_BLUE_BOLT.md).**

Não inventar cores, tipografia, sombras, border-radius ou componentes UI fora do sistema definido nesse documento.

---

## Contexto do Projecto

- **Stack:** React 19, TypeScript, Vite, TailwindCSS v4, sem shadcn/ui, sem next-themes
- **Tema actual:** Maioritariamente claro (`bg-slate-50`, `text-slate-900`) excepto sidebar e login (escuros)
- **Sistema de temas:** Não existe `.dark` class toggle — o tema é fixo por componente
- **Fonte do design system:** `DESIGN_SYSTEM_BLUE_BOLT.md.txt` extraído de `tools.bluebolt.pt` (aplicação diferente, shadcn/ui)

---

## Restrições Não Negociáveis

### 1. Preservar o tema visual actual

O produto está em produção em `https://bbia.vercel.app`. **Não alterar o comportamento visual global** sem aprovação explícita:

- `AppLayout.tsx` tem `bg-slate-50 text-slate-900` — não remover sem migração aprovada
- `index.html` body tem `bg-slate-50 text-slate-900` — não mudar sem aprovação
- As páginas (`/user`, `/templates`, `/admin`) usam fundo claro — comportamento aprovado em produção

### 2. Tipografia — Inter apenas

- Pesos carregados: **300, 400, 500, 600, 700, 800** (seis pesos, nada mais)
- Fonte verificada no documento fonte original
- Peso 900 (font-black) não existe no bundle carregado

### 3. Border Radius base: `--radius: 0.75rem`

- É o **único** token de radius verificado no documento fonte
- O código actual usa `rounded-[14px]`, `rounded-[16px]`, `rounded-[10px]` directamente
- Os tokens `--bb-radius-sm/lg/xl` são extensões propostas, não regras do fonte

### 4. `App.css` — NÃO IMPORTAR

Citação directa do documento fonte:
> "⚠️ src/App.css existe mas NÃO É IMPORTADO em lado nenhum. Não faz parte do sistema. Se alguém o importar, parte o layout."

- `src/App.css` existe mas está vazio
- Só `src/index.css` é importado em `src/main.tsx`
- **Nunca adicionar** `import './App.css'` a qualquer ficheiro

### 5. Logótipo Blue Bolt

- Asset: `/logo.png` (em `public/`)
- Container na sidebar: `w-9 h-9 rounded-xl bg-white/5 border border-white/10`
- Não alterar dimensões, cores, proporção, nem substituir por emoji ou SVG

### 6. Thumbnails — honestidade obrigatória

- Nunca mostrar um placeholder e chamar-lhe "gerado"
- Se `preview_image_url` for nulo ou falhar → mostrar placeholder honesto com texto "Miniatura ainda não gerada"
- Não implementar thumbnails até instrução explícita

### 7. Tokens `--bb-*` são extensões propostas

Os tokens `--bb-blue-*`, `--bb-navy-*`, `--bb-surface-*`, `--bb-border-*`, `--bb-text-*` declarados em `src/index.css` são **extensões propostas** — não estão no documento fonte original, e não são consumidos por componentes existentes. Usar apenas em código novo explicitamente aprovado.

### 8. `.glass-card` — só em contextos escuros

A classe `.glass-card` existe no `src/index.css` e é fiel ao conceito do documento fonte. Deve ser usada **apenas em contextos de fundo escuro** (sidebar, login, modais escuros, thumbnails). Não aplicar sobre fundos claros (`bg-slate-50`, `bg-white`).

---

## Localização dos Ficheiros Chave

| Ficheiro | Propósito |
|---|---|
| `docs/DESIGN_SYSTEM_BLUE_BOLT.md` | Especificação visual — ler antes de qualquer trabalho UI |
| `DESIGN_SYSTEM_BLUE_BOLT.md.txt` | **Documento fonte original** — referência de fidelidade |
| `src/index.css` | CSS custom properties — ponto de entrada único |
| `src/App.css` | **Vestigial — não importar nunca** |
| `src/components/layout/AppLayout.tsx` | Layout raiz — define o tema claro actual |
| `src/components/layout/Sidebar.tsx` | Sidebar escura com logótipo |
| `src/components/layout/Header.tsx` | Topbar claro |
| `src/components/ui/Card.tsx` | Componente de cartão base |
| `src/components/ui/Button.tsx` | Variantes de botão |

---

## Âmbito do Commit `9db8431` (Setembro 2026)

Este commit estabelece **apenas documentação e referência de enforcement**:
- ✅ `docs/DESIGN_SYSTEM_BLUE_BOLT.md` — documento de design system (corrigido na auditoria)
- ✅ `README.md` — secção de regra de engenharia adicionada
- ✅ `AGENTS.md` — este ficheiro; enforcement para agentes de IA
- ✅ `src/index.css` — tokens `--bb-*` declarados (não consumidos); body preservado no tema claro actual
- ✅ `index.html` — body restaurado ao original claro
- ❌ Nenhuma funcionalidade existente foi alterada
- ❌ Nenhum componente foi refactorizado (isso é trabalho da Fase 4)
