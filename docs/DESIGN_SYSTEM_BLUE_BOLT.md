# Blue Bolt Design System — Page Studio
**Version 1.0 · September 2026**

> **Engineering Rule:** All visual work must follow this document.
> Do not invent colours, typography, shadows, radius, or components outside this system.
> Every UI element — preview, thumbnail, card, modal, template renderer — must be implemented
> using the tokens, patterns, and constraints defined here.

---

## 1. Guiding Principles

| # | Principle | What it means in practice |
|---|---|---|
| 1 | **Dark-first** | Dark mode is the default. All backgrounds default to the dark palette. |
| 2 | **Single typeface** | Inter only. No other font families. |
| 3 | **HSL token discipline** | Every colour must come from the documented HSL tokens below. No raw hex codes in component markup. |
| 4 | **Radius consistency** | Base radius is `0.75rem` (12px). Never use `rounded-md`, `rounded-lg` ad-hoc without a design decision. |
| 5 | **No phantom images** | Never show a "generated thumbnail" when the content is actually a placeholder/fallback. Declare placeholders honestly. |
| 6 | **Logo integrity** | The Blue Bolt logo (`/logo.png`) must never be resized, recoloured, cropped, or replaced. |
| 7 | **No unused CSS** | Do not import `App.css`. It is a vestigial file. Only `index.css` is the styling entry point. |

---

## 2. Colour System — HSL Tokens

All tokens are defined as CSS custom properties in `src/index.css`. No inline hex values are permitted in component code unless necessary for Tailwind JIT.

### 2.1 Brand Primaries

| Token | HSL Value | Usage |
|---|---|---|
| `--bb-blue-500` | `hsl(221 100% 54%)` | Primary CTA, active nav, links |
| `--bb-blue-600` | `hsl(221 100% 43%)` | Primary hover state |
| `--bb-navy-800` | `hsl(211 91% 27%)` | Secondary buttons, avatar backgrounds |
| `--bb-navy-900` | `hsl(213 88% 15%)` | Sidebar background |
| `--bb-navy-950` | `hsl(214 89% 9%)` | Deepest dark background, canvas |

### 2.2 Dark Mode Semantic Pairs

Each semantic token has a light-mode and dark-mode value. The dark values are the **default**.

| Role | Dark (Default) | Light (Override) |
|---|---|---|
| **Surface / App BG** | `hsl(214 89% 9%)` | `hsl(210 17% 98%)` |
| **Surface / Elevated** | `hsl(213 88% 12%)` | `hsl(0 0% 100%)` |
| **Surface / Card** | `hsl(213 50% 16%)` | `hsl(0 0% 100%)` |
| **Surface / Sidebar** | `hsl(213 88% 15%)` | `hsl(213 88% 15%)` |
| **Border / Default** | `hsl(215 25% 22%)` | `hsl(214 13% 90%)` |
| **Border / Subtle** | `hsl(215 20% 18%)` | `hsl(214 13% 95%)` |
| **Text / Primary** | `hsl(0 0% 96%)` | `hsl(222 47% 11%)` |
| **Text / Secondary** | `hsl(215 20% 65%)` | `hsl(215 16% 47%)` |
| **Text / Muted** | `hsl(215 15% 45%)` | `hsl(215 14% 63%)` |

### 2.3 Status & Feedback Tokens

| Status | Background HSL | Text HSL | Border HSL |
|---|---|---|---|
| **Success** | `hsl(142 72% 12%)` | `hsl(142 72% 55%)` | `hsl(142 72% 20%)` |
| **Warning** | `hsl(38 92% 12%)` | `hsl(38 92% 60%)` | `hsl(38 92% 20%)` |
| **Error / Danger** | `hsl(0 80% 12%)` | `hsl(0 80% 60%)` | `hsl(0 80% 20%)` |
| **Info** | `hsl(221 80% 14%)` | `hsl(221 100% 70%)` | `hsl(221 80% 22%)` |
| **Neutral** | `hsl(215 20% 14%)` | `hsl(215 15% 55%)` | `hsl(215 20% 22%)` |

### 2.4 Gradient Tokens

```
--bb-gradient-brand:    linear-gradient(135deg, hsl(213 88% 15%), hsl(211 91% 27%), hsl(221 100% 54%))
--bb-gradient-surface:  linear-gradient(180deg, hsl(213 50% 16%), hsl(214 89% 9%))
--bb-gradient-glow:     radial-gradient(ellipse at top, hsl(221 100% 54% / 0.15), transparent 60%)
```

---

## 3. Typography

### 3.1 Font Family

```css
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Inter** is the only permitted typeface. Load it via Google Fonts in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

### 3.2 Weight Scale

| Weight | Name | Usage |
|---|---|---|
| 300 | Light | Legal text, footnotes, captions |
| 400 | Regular | Body copy, descriptions |
| 500 | Medium | Labels, secondary buttons |
| 600 | Semi-Bold | Card titles, field labels |
| 700 | Bold | Section headings, primary buttons |
| 800 | Extra-Bold | Page titles, hero headlines |

> **Rule:** Weights below 300 and above 800 are forbidden.

### 3.3 Type Scale (Tailwind classes → px)

| Class | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `text-[10px]` | 10px | 600–700 | 1.4 | Badges, timestamps, micro-labels |
| `text-xs` | 12px | 400–600 | 1.5 | Table cells, secondary meta |
| `text-sm` | 14px | 400–600 | 1.5 | Body text, form labels |
| `text-base` | 16px | 600–700 | 1.4 | Card titles, nav labels |
| `text-lg` | 18px | 700 | 1.3 | Sub-section headings |
| `text-xl` | 20px | 700–800 | 1.2 | Page headers |
| `text-2xl` | 24px | 800 | 1.1 | Modal titles, hero headings |
| `text-3xl+` | 30px+ | 800 | 1.0 | Landing page hero (reserved) |

---

## 4. Spacing & Layout

### 4.1 Base Grid

- Container max-width: `max-w-7xl` (1280px)
- Page padding: `px-6 sm:px-8`
- Section vertical gap: `space-y-8` or `gap-8`
- Card internal padding: `p-5` (default), `p-6` (spacious)

### 4.2 Border Radius Scale

| Token | Value | Usage |
|---|---|---|
| Base (`--bb-radius`) | `0.75rem` (12px) | Standard card, modal, input |
| `--bb-radius-sm` | `0.5rem` (8px) | Buttons, badges, chips |
| `--bb-radius-lg` | `1rem` (16px) | Modals, large panels |
| `--bb-radius-xl` | `1.25rem` (20px) | Feature cards, hero blocks |
| `--bb-radius-full` | `9999px` | Pills, avatar rings |

> **Rule:** Use the Tailwind `rounded-[0.75rem]` convention for non-standard values, not semantic names like `rounded-xl` whose meaning shifts with config.

### 4.3 Shadow Scale

```css
--bb-shadow-xs:   0 1px 2px hsl(214 89% 5% / 0.4);
--bb-shadow-sm:   0 2px 6px hsl(214 89% 5% / 0.45);
--bb-shadow-md:   0 4px 16px hsl(214 89% 5% / 0.5);
--bb-shadow-lg:   0 8px 32px hsl(214 89% 5% / 0.55);
--bb-shadow-glow: 0 0 24px hsl(221 100% 54% / 0.25);
```

---

## 5. Component Specifications

### 5.1 Glass Card (`glass-card`)

The **glass-card** is the primary elevated surface for dark-mode UIs.

```css
.glass-card {
  background: hsl(213 50% 16% / 0.7);
  border: 1px solid hsl(215 25% 22%);
  border-radius: var(--bb-radius);         /* 0.75rem */
  box-shadow: var(--bb-shadow-sm);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.glass-card:hover {
  background: hsl(213 50% 18% / 0.8);
  border-color: hsl(221 100% 54% / 0.3);
  box-shadow: var(--bb-shadow-md);
}
```

**Usage rules:**
- Use `glass-card` as the default card surface on dark backgrounds.
- Never use a pure `bg-white` card on the dark canvas — it breaks the dark-first rule.
- The `CardContent`, `Card` components must be updated to default to `glass-card` styling.

### 5.2 Thumbnail / Preview Card

A template thumbnail card must:

1. **Show the actual image** if `preview_image_url` is set and loads without error.
2. **Show an honest placeholder** if the image is absent or fails — styled with `glass-card`, the template name, category badge, and section count. No false "generated" claims.
3. **Ratio:** Always `aspect-video` (16:9) or `aspect-[4/3]`.
4. **Overlay on hover:** A translucent gradient overlay with action buttons.

```tsx
// Correct placeholder — honest and visually on-brand
<div className="glass-card flex flex-col items-center justify-center gap-2 w-full h-full">
  <Layers className="w-6 h-6 text-[var(--bb-blue-500)]" />
  <span className="text-xs font-semibold text-[var(--text-primary)]">{template.name}</span>
  <span className="text-[10px] text-[var(--text-muted)] px-2 py-0.5 rounded-full border border-[var(--border-default)]">
    {template.category}
  </span>
  <span className="text-[10px] text-[var(--text-secondary)]">{sectionCount} secções</span>
</div>
```

### 5.3 Status Badge

| Status | Tailwind classes (dark-first) |
|---|---|
| `active` | `bg-[hsl(142_72%_12%)] text-[hsl(142_72%_55%)] border border-[hsl(142_72%_20%)]` |
| `draft` | `bg-[hsl(215_20%_14%)] text-[hsl(215_15%_55%)] border border-[hsl(215_20%_22%)]` |
| `archived` | `bg-[hsl(38_92%_12%)] text-[hsl(38_92%_60%)] border border-[hsl(38_92%_20%)]` |

### 5.4 Button Variants

All buttons use `rounded-[var(--bb-radius-sm)]` (0.5rem) and Inter weight 600–700.

| Variant | Background | Text | Hover BG |
|---|---|---|---|
| `primary` | `hsl(221 100% 54%)` | `white` | `hsl(221 100% 43%)` |
| `secondary` | `hsl(211 91% 27%)` | `white` | `hsl(214 89% 9%)` |
| `outline` | `transparent` | `hsl(0 0% 96%)` | `hsl(215 25% 22%)` |
| `ghost` | `transparent` | `hsl(215 20% 65%)` | `hsl(213 50% 16%)` |
| `danger` | `hsl(0 80% 50%)` | `white` | `hsl(0 80% 42%)` |

### 5.5 Input / Textarea

```css
background:   hsl(213 88% 9%);
border:       1px solid hsl(215 25% 22%);
border-radius: var(--bb-radius);
color:        hsl(0 0% 96%);
placeholder:  hsl(215 15% 45%);

/* Focus */
border-color: hsl(221 100% 54%);
box-shadow:   0 0 0 3px hsl(221 100% 54% / 0.15);
```

### 5.6 Modal / Dialog

```css
background:    hsl(213 50% 13%);
border:        1px solid hsl(215 25% 22%);
border-radius: var(--bb-radius-lg);   /* 1rem */
box-shadow:    var(--bb-shadow-lg);
backdrop:      hsl(214 89% 5% / 0.75) with backdrop-blur(8px)
max-width:     56rem (896px) — standard; 72rem (1152px) — wide
```

---

## 6. Sidebar & Navigation

The sidebar is always dark (`hsl(213 88% 15%)`), regardless of theme.

### Active Navigation Item (User route)
```css
background: hsl(221 100% 54%);   /* --bb-blue-500 */
color: white;
border-radius: var(--bb-radius-sm);
```

### Active Navigation Item (Admin route)
```css
background: hsl(211 91% 27%);    /* --bb-navy-800 */
border: 1px solid hsl(221 100% 54% / 0.3);
color: white;
border-radius: var(--bb-radius-sm);
```

### Logo Block
- Logo asset: `/logo.png`
- Container: `w-9 h-9`, rounded `0.75rem`, `bg-white/5`, `border border-white/10`
- Do not alter the logo image, its colours, or its aspect ratio.

---

## 7. Iconography

- **Library:** Lucide React (current version in `package.json`)
- **Sizes:** `w-3.5 h-3.5` (inline/badge), `w-4 h-4` (button), `w-5 h-5` (card header), `w-6 h-6` (section icon), `w-8 h-8` (empty state)
- **Colour:** Inherit from text or use explicit token classes. Never hardcode `#hex` for icon colour.

---

## 8. Animation & Transition Standards

| Property | Value |
|---|---|
| Default transition | `transition-all duration-150 ease-out` |
| Hover scale | `hover:scale-[1.01]` (cards), `active:scale-[0.98]` (buttons) |
| Skeleton pulse | `animate-pulse` with `hsl(213 50% 18%)` base |
| Spinner | `animate-spin` on `Loader2` icon |

---

## 9. `src/index.css` — Canonical Token Definitions

All tokens **must** be declared in `src/index.css` inside `:root`. This is the single source of truth. Components may reference them via Tailwind's arbitrary value syntax or direct `var()` calls.

```css
@import "tailwindcss";

@layer base {
  :root {
    /* === Brand Colours === */
    --bb-blue-500: hsl(221, 100%, 54%);
    --bb-blue-600: hsl(221, 100%, 43%);
    --bb-navy-800: hsl(211, 91%, 27%);
    --bb-navy-900: hsl(213, 88%, 15%);
    --bb-navy-950: hsl(214, 89%, 9%);

    /* === Radius === */
    --bb-radius:    0.75rem;
    --bb-radius-sm: 0.5rem;
    --bb-radius-lg: 1rem;
    --bb-radius-xl: 1.25rem;

    /* === Shadows (dark) === */
    --bb-shadow-xs:   0 1px 2px hsl(214 89% 5% / 0.4);
    --bb-shadow-sm:   0 2px 6px hsl(214 89% 5% / 0.45);
    --bb-shadow-md:   0 4px 16px hsl(214 89% 5% / 0.5);
    --bb-shadow-lg:   0 8px 32px hsl(214 89% 5% / 0.55);
    --bb-shadow-glow: 0 0 24px hsl(221 100% 54% / 0.25);

    /* === Semantic (dark-mode default) === */
    --bb-surface-app:      hsl(214, 89%, 9%);
    --bb-surface-elevated: hsl(213, 88%, 12%);
    --bb-surface-card:     hsl(213, 50%, 16%);
    --bb-border-default:   hsl(215, 25%, 22%);
    --bb-border-subtle:    hsl(215, 20%, 18%);
    --bb-text-primary:     hsl(0, 0%, 96%);
    --bb-text-secondary:   hsl(215, 20%, 65%);
    --bb-text-muted:       hsl(215, 15%, 45%);

    /* === Legacy aliases (backwards compatibility) === */
    --brand-navy:       #064B88;
    --brand-navy-dark:  #042A4D;
    --brand-sidebar:    #05192D;
    --brand-blue:       #1463FF;
    --brand-blue-hover: #0D4ED8;
    --brand-blue-light: #EBF2FF;
    --card-radius: 12px;
  }
}
```

---

## 10. Prohibited Patterns

The following patterns are **forbidden** in all new UI work:

| ❌ Prohibited | ✅ Required Instead |
|---|---|
| `bg-white` on dark canvas | `glass-card` / `bg-[var(--bb-surface-card)]` |
| `bg-slate-50` or `bg-slate-100` as page background | `bg-[var(--bb-surface-app)]` |
| `text-slate-900` as primary text in dark mode | `text-[var(--bb-text-primary)]` |
| Hardcoded hex `#1463FF` in JSX className | `text-[var(--bb-blue-500)]` |
| `rounded-xl`, `rounded-lg` without base alignment | `rounded-[var(--bb-radius)]` |
| `font-sans` (default browser) without Inter loaded | Ensure Google Fonts Inter link in `index.html` |
| `import './App.css'` | Removed — `App.css` is unused |
| Showing a placeholder and calling it "generated" | Mark placeholder explicitly with "Miniatura não gerada" |

---

## 11. File Structure Conventions

```
src/
├── index.css                          ← Single CSS entry point. All tokens here.
├── App.css                            ← Vestigial. Do NOT import. May be deleted.
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                ← Dark sidebar, logo integrity enforced
│   │   └── Header.tsx                 ← Topbar, sticky
│   └── ui/
│       ├── Card.tsx                   ← Must default to glass-card in dark mode
│       ├── Button.tsx                 ← Uses design system token variants
│       ├── Input.tsx                  ← Dark input styling
│       ├── Textarea.tsx               ← Dark textarea styling
│       └── StatusBadge.tsx            ← Uses semantic status tokens
└── features/
    └── admin/pages/
        └── AdminTemplatesPage.tsx     ← Thumbnail must use honest placeholder pattern
```

---

## 12. Thumbnail Implementation Rules (Phase 4 Reference)

When implementing or refactoring the template thumbnail system:

1. **Never call `handleGenerateThumbnail` and then show a placeholder** — the API must return a real URL or the function must fail visibly.
2. **The thumbnail card must be `aspect-[16/9]` or `aspect-[4/3]`** — no fixed pixel heights unless inside a constrained grid.
3. **On image load error:** Show the honest placeholder (Section 5.2), not a recycled spinner.
4. **On pending generation:** Show a pulsing skeleton, not a static fallback with "Generating…" text next to a placeholder image.
5. **The thumbnail renderer component** must be extracted to `src/components/ui/TemplateThumbnail.tsx` in the next implementation phase.

---

*This document is the single source of truth for all visual decisions in Blue Bolt Page Studio.*
*Last updated: 2026-09-02 by Engineering — adopted as mandatory reference.*
