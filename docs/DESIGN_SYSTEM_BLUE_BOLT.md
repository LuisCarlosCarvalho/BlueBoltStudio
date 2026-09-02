# Blue Bolt Page Studio — Design System
**Versão 1.0 · Setembro 2026**

> **Regra de Engenharia:** Todo o trabalho visual deve seguir este documento.
> Não inventar cores, tipografia, sombras, radius ou componentes fora deste sistema.

---

## Aviso de Fidelidade ao Documento Fonte

O documento fonte (`DESIGN_SYSTEM_BLUE_BOLT.md.txt`, extraído de `tools.bluebolt.pt` commit `3196fe3`, 01/09/2026) documenta o sistema visual de uma **aplicação diferente** (`tools.bluebolt.pt`) baseada em shadcn/ui + Radix UI + next-themes.

O **Blue Bolt Page Studio** (`bbia.vercel.app`) usa Vite + TailwindCSS v4 + React 19, sem shadcn/ui, sem next-themes, e sem sistema de temas `.dark`.

Este documento extrai as regras aplicáveis do fonte original e identifica claramente as extensões propostas para este projecto.

---

## 1. TOKENS DE COR

### 1.1 Regras extraídas directamente do documento fonte

**FONTE ORIGINAL — Cores da aplicação `tools.bluebolt.pt`:**

| Token | Claro (`:root`) | Escuro (`.dark`) | Para que serve |
|---|---|---|---|
| `--background` | `210 40% 98%` | `222 47% 6%` | Fundo da página |
| `--foreground` | `222 47% 11%` | `210 40% 92%` | Texto sobre o fundo |
| `--card` | `0 0% 100%` | `222 44% 8%` | Fundo dos cartões |
| `--card-foreground` | `222 47% 11%` | `210 40% 92%` | Texto dentro do cartão |
| `--primary` | `217 91% 50%` | `217 91% 60%` | Azul da casa: botões, links, foco |
| `--primary-foreground` | `0 0% 100%` | `222 47% 6%` | Texto sobre o azul |
| `--secondary` | `210 40% 96%` | `222 40% 14%` | Superfície secundária |
| `--muted-foreground` | `215 16% 42%` | `215 20% 55%` | Texto secundário, legendas |
| `--border` | `214 25% 88%` | `222 30% 18%` | Todas as bordas |
| `--ring` | `217 91% 50%` | `217 91% 60%` | Anel de foco |
| `--sidebar-background` | `210 40% 96%` | `222 47% 5%` | Fundo da barra lateral |
| `--radius` | `0.75rem` | `0.75rem` | Raio base (igual nos dois temas) |

> **⚠️ NOTA IMPORTANTE:** O sistema de temas original usa a classe `.dark` no `<html>` via `next-themes`. O Page Studio **não tem** este sistema. Os tokens acima são documentados por fidelidade ao fonte; **não estão activos neste projecto**.

### 1.2 O que está activo no Page Studio (valores directamente no código)

Cores reais encontradas no código de `bbia`:

| Uso | Valor no código | Ficheiro |
|---|---|---|
| Sidebar background | `#05192D` / `bg-[#05192D]` | `Sidebar.tsx` |
| Sidebar active item | `#1463FF` / `bg-[#1463FF]` | `Sidebar.tsx` |
| Admin active item | `#064B88` / `bg-[#064B88]` | `Sidebar.tsx` |
| Login page background | `#05192D` | `LoginPage.tsx` |
| App layout background | `bg-slate-50` | `AppLayout.tsx` |
| Page background padrão | `bg-slate-50` | Todas as páginas |
| Texto padrão | `text-slate-900` | `AppLayout.tsx`, páginas |
| Botão primário | `#1463FF` → hover `#0D4ED8` | `Button.tsx` |
| Botão secundário | `#064B88` → hover `#042A4D` | `Button.tsx` |

### 1.3 Tokens `--bb-*` definidos neste documento

> **⚠️ EXTENSÃO PROPOSTA — Não presentes no documento fonte original.**
> Estes tokens foram criados neste PR para uso futuro. Ainda **não são consumidos** por nenhum componente existente.

```css
--bb-blue-500:          hsl(221, 100%, 54%)   /* ≈ #1463FF do código existente */
--bb-blue-600:          hsl(221, 100%, 43%)   /* ≈ #0D4ED8 hover */
--bb-navy-800:          hsl(211, 91%, 27%)    /* ≈ #064B88 */
--bb-navy-900:          hsl(213, 88%, 15%)    /* ≈ #05192D sidebar */
--bb-navy-950:          hsl(214, 89%, 9%)     /* fundo escuro proposto */
--bb-surface-app:       hsl(214, 89%, 9%)     /* extensão proposta */
--bb-surface-elevated:  hsl(213, 88%, 12%)    /* extensão proposta */
--bb-surface-card:      hsl(213, 50%, 16%)    /* extensão proposta */
--bb-border-default:    hsl(215, 25%, 22%)    /* extensão proposta */
--bb-text-primary:      hsl(0, 0%, 96%)       /* extensão proposta */
--bb-text-secondary:    hsl(215, 20%, 65%)    /* extensão proposta */
--bb-text-muted:        hsl(215, 15%, 45%)    /* extensão proposta */
```

---

## 2. TIPOGRAFIA

### 2.1 Regras directamente do documento fonte ✅

- **Fonte única: Inter**, do Google Fonts.
- **Pesos carregados: 300, 400, 500, 600, 700, 800.** Seis. Font-black (900) não existe.
- Aplicação no body: `font-family: 'Inter', system-ui, sans-serif;`
- Import: `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap`

### 2.2 O que NÃO está definido no documento fonte

> **⚠️ NÃO DEFINIDO no documento fonte:**
> "TAMANHOS E ESCALA: NÃO DEFINIDOS no projecto. O tailwind.config.ts não estende fontSize nem fontFamily — a escala é a do Tailwind por omissão."
>
> A tabela de escala tipográfica (text-xs → text-3xl com pesos e line-heights) que constava no documento de design system anterior era uma **EXTENSÃO PROPOSTA**, não uma regra existente. Foi removida desta versão corrigida.

A escala tipográfica activa é a **escala padrão do Tailwind v4** (não customizada).

---

## 3. ESPAÇAMENTO E RAIOS

### 3.1 Regras directamente do documento fonte ✅

- **`--radius: 0.75rem` (12px)** — igual nos dois temas. Esta é a **única** variável de radius definida.
- Derivações do Tailwind config da `tools.bluebolt.pt`:
  - `rounded-lg` → `var(--radius)` = 0.75rem
  - `rounded-md` → `calc(var(--radius) - 2px)` = 10px
  - `rounded-sm` → `calc(var(--radius) - 4px)` = 8px

> **⚠️ NOTA:** No Page Studio (TailwindCSS v4, sem `tailwind.config.ts`), estas derivações **não existem**. O código usa `rounded-[14px]`, `rounded-[16px]`, `rounded-[10px]` directamente.

### 3.2 O que NÃO está definido no documento fonte

> **⚠️ EXTENSÃO PROPOSTA:** Os tokens `--bb-radius-sm`, `--bb-radius-lg`, `--bb-radius-xl`, `--bb-radius-full` foram criados como proposta de extensão para o Page Studio. **Não estão presentes no documento fonte.**

### 3.3 Escala de espaços

> **⚠️ NÃO DEFINIDO no documento fonte:**
> "ESCALA DE ESPAÇOS: NÃO DEFINIDA. O tailwind.config.ts não estende `spacing`. Toda a app usa a escala do Tailwind por omissão."

---

## 4. CLASSES DA CASA

### 4.1 Regras directamente do documento fonte ✅

#### `.glass-card` — 237 usos (na `tools.bluebolt.pt`)

```css
@apply bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl;
```

Cartão translúcido a 60% com desfoque atrás e borda a meia opacidade.

> **⚠️ ADAPTAÇÃO para o Page Studio:** O Page Studio não usa os tokens shadcn (`--card`, `--border`). A implementação `.glass-card` neste projecto usa valores HSL directos. Os valores são propostos; o conceito (translúcido, blur, borda suave) é fiel ao fonte.

```css
/* Implementação adaptada para Page Studio */
.glass-card {
  background: hsl(213 50% 16% / 0.7);
  border: 1px solid hsl(215 25% 22%);
  border-radius: var(--bb-radius);
  box-shadow: 0 2px 6px hsl(214 89% 5% / 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

#### `.glow-blue` / `.glow-blue-sm`

Definidas no documento fonte com comportamento diferente por tema:

- **Modo escuro:** `box-shadow: 0 0 20px hsl(var(--primary) / 0.3), 0 0 60px hsl(var(--primary) / 0.1)`
- **Modo claro:** Sombras de elevação normais (não halo azul)

> **⚠️ NÃO IMPLEMENTADO no Page Studio.** Estas classes existem no fonte mas não foram transportadas para este projecto porque o sistema de temas (`.dark`) não existe aqui.

#### `.logo-plate`

Só existe no modo escuro: `background: hsl(210 40% 92% / 0.10); border-radius: 22%;`
Usada nas páginas públicas para dar contraste ao logótipo sobre fundo escuro.

> **⚠️ NÃO IMPLEMENTADO no Page Studio.** Sem sistema de temas `.dark`, não se aplica directamente.

#### `.scrollbar-nativa` / `.scrollbar-oculta`

Válvulas de escape do scroll, sem usos no fonte original. Definidas em CSS simples, **fora** do `@layer utilities`, precisamente porque o Tailwind apagaria classes sem uso dentro do layer.

### 4.2 Regras de scrollbar do documento fonte ✅

Configuração activa só quando `[data-scrollbar="classica"]` está no `<html>`:

- Calha transparente
- Polegar: `hsl(var(--border))` arredondado a 9999px, 10px largura, 2px borda transparente
- Hover: `hsl(var(--muted-foreground) / 0.5)`

> **⚠️ ADAPTAÇÃO no Page Studio:** O sistema `[data-scrollbar]` não existe. As barras são estilizadas directamente com `::-webkit-scrollbar` simples.

### 4.3 O que NÃO está definido no documento fonte

> **⚠️ EXTENSÃO PROPOSTA:** A escala de sombras `--bb-shadow-xs/sm/md/lg/glow` e os gradientes `--bb-gradient-*` são propostas de extensão. **Não estão presentes no documento fonte.**

---

## 5. COMPONENTES

### 5.1 Regras directamente do documento fonte ✅

**Biblioteca base da `tools.bluebolt.pt`:** shadcn/ui (Radix UI + Tailwind + class-variance-authority), 49 ficheiros.

> **⚠️ NÃO APLICÁVEL ao Page Studio.** O Page Studio não usa shadcn/ui. Os componentes são `Button.tsx`, `Card.tsx`, `Input.tsx`, etc., escritos de raiz.

#### Variantes do Botão (do fonte original) ✅

| Variante | Fundo | Hover |
|---|---|---|
| `default` | `bg-primary` | `hover:bg-primary/90` |
| `destructive` | `bg-destructive` | `hover:bg-destructive/90` |
| `outline` | `border-input + bg-background` | `hover:bg-accent` |
| `secondary` | `bg-secondary` | `hover:bg-secondary/80` |
| `ghost` | — | `hover:bg-accent` |
| `link` | — | text-primary com sublinhado |

Tamanhos: `default` h-10 px-4, `sm` h-9 px-3, `lg` h-11 px-8, `icon` h-10 w-10.

#### Variantes do Crachá (do fonte original) ✅

Base: `rounded-full px-2.5 py-0.5 text-xs font-semibold border`
Variantes: `default / secondary / destructive / outline`

---

## 6. REGRAS QUE APRENDEMOS (do documento fonte)

### 6.1 Crachás semânticos têm sempre par dark ✅

A fórmula documentada em `src/lib/worklensStatus.ts` da `tools.bluebolt.pt`:

```
bg-COR-500/10  text-COR-700  border-COR-500/25
dark:bg-COR-500/15  dark:text-COR-400  dark:border-COR-500/30
```

> **Aplicação no Page Studio:** Sem sistema `.dark`, apenas o par de modo claro é usado. Os crachás em `StatusBadge.tsx` usam cores directas do Tailwind.

### 6.2 `App.css` não deve ser importado ✅

**Citação directa do documento fonte:**
> "⚠️ src/App.css existe mas NÃO É IMPORTADO em lado nenhum. É o resto do template do Vite (o logótipo do React a rodar, #root com max-width 1280px e text-align:center). Não faz parte do sistema. Se alguém o importar, parte o layout."

**Estado no Page Studio:** `App.css` existe (`/* App.css - Cleaned for Blue Bolt Page Studio */`) e **não é importado** em nenhum ficheiro. ✅

### 6.3 Cores de marca de terceiros ficam em hex fixo ✅

Meta/Facebook `#1877F2`, Instagram `#E1306C`, LinkedIn `#0A66C2`, Google `#EA4335`. Não passam a tokens.

### 6.4 O que deve ficar fora do `@layer utilities` ✅

- Selectores descendentes (`.dark .glow-blue`, `.dark .logo-plate`)
- Classes sem uso (`.scrollbar-nativa`, `.scrollbar-oculta`)

O Tailwind remove do build o que não encontra no código — uma classe dentro do layer sem referência no HTML/TSX desaparece silenciosamente.

### 6.5 O tema por omissão é escuro ✅

**Citação directa:**
> "⚠️ O TEMA POR OMISSÃO É O ESCURO. `defaultTheme=\"dark\"` no `App.tsx`, com o motivo escrito: 'quem já usa a Tools não vê o ecrã mudar sozinho no dia do deploy'."

> **Aplicação no Page Studio:** O Page Studio não tem sistema de temas alternáveis. O design visual actual é maioritariamente claro (páginas com `bg-slate-50`), excepto a barra lateral e o login, que são escuros. A intenção declarada é migrar progressivamente para dark-first.

---

## 7. Regra sobre o Logótipo ✅

Do documento fonte (§6.5):
> "Um logótipo azul vivo dá 6,0:1 sobre o fundo claro e 3,1:1 sobre o escuro. No escuro leva `.logo-plate`; no claro não leva nada."

**Implementação no Page Studio** (`Sidebar.tsx`):
```tsx
<div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 shadow-inner shrink-0">
  <img src="/logo.png" alt="Blue Bolt Logo" className="w-full h-full object-contain" />
</div>
```

Container: `w-9 h-9`, `rounded-xl`, `bg-white/5`, `border border-white/10` — equivalente funcional ao `.logo-plate` do fonte original. ✅

---

## 8. Extensões Propostas (não presentes no documento fonte)

As seguintes secções do documento de design system anterior eram **extensões propostas**, não regras do fonte. Estão listadas aqui para transparência:

| Extensão Proposta | Status |
|---|---|
| Tabela de escala tipográfica (text-xs → text-3xl com pesos) | ⚠️ Não existe no fonte — removida |
| Tokens `--bb-shadow-*` (xs/sm/md/lg/glow) | ⚠️ Extensão proposta — não validada |
| Tokens `--bb-gradient-*` | ⚠️ Extensão proposta — não validada |
| Tokens `--bb-surface-*`, `--bb-border-*`, `--bb-text-*` | ⚠️ Extensão proposta — não consumidos por código existente |
| Tokens `--bb-radius-sm/lg/xl/full` | ⚠️ Extensão proposta — `--bb-radius` é o único do fonte |
| Especificação de modal (background, max-width) | ⚠️ Extensão proposta |
| Especificação de input/textarea (dark) | ⚠️ Extensão proposta |
| Status badges com HSL específico | ⚠️ Extensão proposta |
| Secção "Thumbnail Implementation Rules" | ⚠️ Extensão proposta — implementação futura |
| Escala de ícones por tamanho | ⚠️ Extensão proposta |
| Secção de animações com valores específicos | ⚠️ Extensão proposta |

---

## 9. Estado Actual do Produto (Setembro 2026)

### Tema visual actual

| Área | Tema | Implementação |
|---|---|---|
| Login page | **Escuro** | `bg-[#05192D]`, barra lateral escura |
| Barra lateral (todas as páginas) | **Escuro** | `bg-[#05192D]`, texto slate-300 |
| Header | **Claro** | `bg-white`, texto slate-900 |
| Páginas (`/user`, `/templates`, `/admin`) | **Claro** | `bg-slate-50`, `text-slate-900` |
| Modais | **Claro** | `bg-white` com borda slate |
| Cards | **Claro** | `bg-white` com borda slate-200 |

### Compatibilidade CSS

- Os tokens `--bb-*` estão declarados no `:root` mas **não são consumidos** por nenhum componente existente.
- O `body { background-color: var(--bb-surface-app) }` é **sobreposto** pelo `AppLayout.tsx` com `bg-slate-50`, portanto **não causa regressão visual** nas páginas autenticadas.
- A página de login já usava `bg-[#05192D]` próprio — sem alteração.
- O `App.css` **não é importado**. ✅

---

## 10. Approved Template Gallery Visual Contract

Este contrato visual estabelece a arquitetura de informação e a composição canónica da Galeria de Templates (`/templates`):

### 10.1 Estrutura e Canvas
- **Barra Lateral:** Fixa à esquerda, escura (`bg-[#05192D]`), com logótipo canónico Blue Bolt.
- **Canvas Principal:** Escuro (`bg-[#05192D]`, `text-slate-100`), sem banners gigantes de marketing / hero no topo.
- **Cabeçalho:** Limpo, minimalista, com título direto ("Templates"), subtítulo sucinto e barra de pesquisa/filtros integrada.
- **Espaçamento:** A grelha de templates inicia-se perto do topo com espaçamento respirável (`py-8 sm:py-10 max-w-7xl`).
- **Scroll:** Rolagem vertical natural para toda a biblioteca.

### 10.2 Grelha Responsiva (Grid)
- **Desktop (≥ 1024px):** Exatamente 3 colunas iguais (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8`).
- **Tablet (768px – 1023px):** 2 colunas (`md:grid-cols-2`).
- **Mobile (< 768px):** 1 coluna (`grid-cols-1`).
- **Alinhamento:** Cartões com alturas uniformes e gutters consistentes.

### 10.3 Cartão de Template (Template Card)
- **Superfície:** Fundo escuro (`bg-[#091524]`), borda subtil (`border border-white/10`), raio de 12px (`rounded-xl`), `overflow-hidden`.
- **Área Superior (Thumbnail):**
  - Proporção aproximada de 16:9 (`aspect-[16/9]`).
  - Sem sobreposição de badges flutuantes, contadores de secções, chips de categoria ou texto "Miniatura ainda não gerada" a cobrir a arte.
- **Área Inferior (Metadados):**
  - Nome do template em destaque (`text-sm sm:text-base font-semibold text-white truncate`).
  - Subtítulo simples com a categoria ou "Template" (`text-xs text-slate-400 font-normal mt-0.5`).
- **Hover:** Transição suave com realce de borda (`hover:border-[#1463FF]/50`) e elevação subtil (`hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)]`). Sem efeitos exagerados.

### 10.4 Estados da Miniatura (Thumbnail States)
- **Sucesso:** Renderiza a imagem real da landing page desktop/mobile (`object-cover`).
- **Pendente / Sem Imagem:** Estado de esqueleto/wireframe neutro e compacto (`bg-[#071322]` com blocos estruturais mínimos), nunca uma miniatura falsa completa e nunca uma caixa vazia com avisos de erro técnico.
- **Erro:** Silenciosamente exibido como esqueleto neutro. Ações de regeneração técnica pertencem exclusivamente a `/admin/templates`.

### 10.5 Separação de Responsabilidades (Admin vs Público)
- O `/templates` é focado no utilizador final e seleção rápida para projetos.
- Ações administrativas (importação de Elementor, regenerar miniaturas, controlo de versões, ativação de rascunhos) permanecem restritas a `/admin/templates`.

---

*Este documento foi corrigido em 2026-09-02 para reflectir fielmente o documento fonte original e o Approved Template Gallery Visual Contract.*

