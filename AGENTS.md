# AGENTS.md — Blue Bolt Page Studio

This file is read by AI coding agents (Antigravity, Copilot, Cursor, etc.) before generating any code for this repository.

---

## ⚡ Mandatory Design System Rule

**All visual work must follow [`docs/DESIGN_SYSTEM_BLUE_BOLT.md`](./docs/DESIGN_SYSTEM_BLUE_BOLT.md).**

Do not invent colours, typography, shadows, border-radius values, or UI components outside the system defined in that document.

---

## Non-Negotiable Constraints

Before generating **any** UI code (preview, thumbnail, card, modal, template renderer, badge, button, layout):

### 1. Dark Mode is Default
- Page backgrounds → `var(--bb-surface-app)` = `hsl(214, 89%, 9%)`
- Card surfaces → `glass-card` utility class (see design system §5.1)
- **Never** use `bg-white`, `bg-slate-50`, or `bg-gray-100` as a page background

### 2. Typography — Inter Only
- Font: `'Inter', system-ui, ...`
- Weights permitted: 300, 400, 500, 600, 700, 800
- Weights **forbidden**: 100, 200, 900

### 3. Border Radius
- Base: `0.75rem` via `var(--bb-radius)` or `rounded-[0.75rem]`
- Small: `0.5rem` for buttons/badges
- Large: `1rem` for modals
- **Do not** use bare `rounded-lg` or `rounded-xl` without confirming they resolve to system values

### 4. Colour Tokens (HSL Only)
All tokens are defined in `src/index.css`. Use CSS custom properties or Tailwind's arbitrary value syntax referencing them:
```
--bb-blue-500    hsl(221, 100%, 54%)   ← primary CTA / active state
--bb-blue-600    hsl(221, 100%, 43%)   ← primary hover
--bb-navy-800    hsl(211, 91%, 27%)    ← secondary buttons
--bb-navy-900    hsl(213, 88%, 15%)    ← sidebar background
--bb-navy-950    hsl(214, 89%, 9%)     ← app background / canvas
--bb-surface-card  hsl(213, 50%, 16%) ← card background
--bb-border-default hsl(215, 25%, 22%) ← card/input border
--bb-text-primary  hsl(0, 0%, 96%)    ← primary text in dark mode
--bb-text-secondary hsl(215, 20%, 65%) ← secondary/meta text
--bb-text-muted  hsl(215, 15%, 45%)   ← disabled / placeholder
```

### 5. Thumbnail / Image Placeholders
- **Never** show a thumbnail placeholder and call it "generated"
- When `preview_image_url` is null or fails to load → render the honest placeholder from design system §5.2
- Placeholders must show: template name, category badge, section count — styled with `glass-card`
- The loading skeleton uses `animate-pulse` with `hsl(213 50% 18%)` base colour

### 6. Blue Bolt Logo
- Asset: `/logo.png` (in `public/`)
- Container: `w-9 h-9`, `rounded-[0.75rem]`, `bg-white/5`, `border border-white/10`
- **Do not** alter dimensions, colours, or aspect ratio of the logo image
- **Do not** replace the logo with an emoji, text, or SVG icon

### 7. CSS Entry Point
- Only `src/index.css` is imported in `src/main.tsx`
- `src/App.css` is a vestigial empty file — **do not import it**
- All CSS custom properties belong in `src/index.css` under `:root`

### 8. Glass Card Component
When creating card-like surfaces in dark mode, use the `glass-card` pattern:
```css
background: hsl(213 50% 16% / 0.7);
border: 1px solid hsl(215 25% 22%);
border-radius: 0.75rem;
box-shadow: 0 2px 6px hsl(214 89% 5% / 0.45);
backdrop-filter: blur(12px);
```

---

## File Locations

| File | Purpose |
|---|---|
| `docs/DESIGN_SYSTEM_BLUE_BOLT.md` | Full visual specification — READ BEFORE ANY UI WORK |
| `src/index.css` | CSS token definitions — single source of truth |
| `src/App.css` | **Vestigial — do not import** |
| `src/components/ui/Card.tsx` | Base card component |
| `src/components/ui/Button.tsx` | Button variants |
| `src/components/layout/Sidebar.tsx` | Dark sidebar with logo |
| `src/components/layout/Header.tsx` | Sticky topbar |

---

## Commit Scope for This PR

This commit establishes **documentation and enforcement only**:
- ✅ `docs/DESIGN_SYSTEM_BLUE_BOLT.md` — new design system document
- ✅ `README.md` — engineering rule section added
- ✅ `AGENTS.md` — this file; AI agent enforcement
- ✅ `src/index.css` — extended with full HSL token set
- ✅ `index.html` — Inter font preload added
- ❌ No existing functionality was changed
- ❌ No components were refactored (that is Phase 4 work)
