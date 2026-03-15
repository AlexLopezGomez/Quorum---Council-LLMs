# Quorum Design System — Agent Reference

This document is a decision guide, not a code library. Read source files for implementation details; read this for *why* tokens exist, *when* to use each one, and what is explicitly forbidden.

---

## 1. Visual Language

**Tone:** Warm, editorial, professional SaaS. Palette is parchment + copper — not white + blue.
**Density:** Generous whitespace. Information-dense cards, not crammed UIs.
**Motion:** Functional only — entry animations for new content, not decorative loops.
**No dark mode. No emoji in UI.**

---

## 2. Color Tokens

### Core Palette

| Tailwind Token | Hex | Use |
|----------------|-----|-----|
| `bg-surface-secondary` / `bg-background` | `#F5F3EF` | Page background, sidebar |
| `bg-surface` / `bg-card` | `#FFFFFF` | Card surfaces, panels |
| `bg-surface-tertiary` / `bg-secondary` | `#EEEBE4` | Hover states, input bg, pill badges |
| `border-surface-border` / `border-border` | `#DDD9D1` | All dividers and card borders |
| `border-surface-border-strong` | `#C9C4BB` | Active/focused borders, table headers |
| `text-text-primary` / `text-foreground` | `#3b3c36` | Headings, labels, primary values |
| `text-text-secondary` / `text-muted-foreground` | `#6e6e66` | Descriptions, meta, placeholder |
| `text-text-tertiary` | `#9e9d97` | Timestamps, disabled, fine print |
| `bg-accent` / `bg-primary` | `#d99058` | CTA buttons, focus rings, active indicators |
| `bg-accent-hover` | `#c47d45` | Hover state for accent elements |
| `bg-destructive` | `#EF4444` | Errors, fail states only |

### Domain Colors

| Domain | Token | Hex |
|--------|-------|-----|
| OpenAI | `text-openai` / `bg-openai-light` / `border-openai-border` | `#10A37F` / `#ECFDF5` / `#A7F3D0` |
| Anthropic | `text-anthropic` / `bg-anthropic-light` / `border-anthropic-border` | `#D97706` / `#FFFBEB` / `#FDE68A` |
| Gemini | `text-gemini` / `bg-gemini-light` / `border-gemini-border` | `#4285F4` / `#EFF6FF` / `#BFDBFE` |
| Strategy: Council | `text-strategy-council` / `bg-strategy-council` | `#8B5CF6` (purple) |
| Strategy: Hybrid | `text-strategy-hybrid` / `bg-strategy-hybrid` | `#F59E0B` (amber) |
| Strategy: Single | `text-strategy-single` / `bg-strategy-single` | `#3b3c36` (dark) |
| Verdict: Pass | `text-verdict-pass` / `bg-verdict-pass` | `#10B981` |
| Verdict: Warn | `text-verdict-warn` / `bg-verdict-warn` | `#F59E0B` |
| Verdict: Fail | `text-verdict-fail` / `bg-verdict-fail` | `#EF4444` |

**Color decision rules:**
- Domain colors always come in triplets: dark (icon/text), light (bg), border. Never mix triplet members across domains.
- `accent` / `primary` is for interactive surfaces only. Never use as a data-visualization color.
- `verdict-warn` and `strategy-hybrid` share the same amber hex — they are the same token in different semantic contexts.
- Never hardcode hex values in JSX — always use Tailwind tokens from `tailwind.config.js`.

---

## 3. Typography

**Font stack:** `'New York', ui-serif, Georgia, serif` — this is the default everywhere, including the dashboard. Tailwind maps the `sans` family to this stack. Do not override to sans-serif.
**Monospace (terminal/code):** `'SF Mono', 'Fira Code', monospace`

### Semantic Scale

| Use | Tailwind Classes | Approx px | Line-height |
|-----|-----------------|-----------|-------------|
| Page title | `text-2xl font-semibold` | 24 | 1.3 |
| Card / section heading | `text-sm font-semibold` | 14 | 1.4 |
| Body text | `text-sm text-text-secondary` | 14 | 1.65 |
| Label / meta | `text-xs text-text-tertiary` | 12 | 1.3 |
| Table header | `text-xs font-medium uppercase tracking-wider` | 12 | — |
| Badge | `text-xs font-medium` | 12 | — |
| KPI / score display | `text-3xl font-semibold` | 30 | 1.1 |
| Hero display | `text-5xl font-extrabold tracking-tight` | 48+ | 1.1 |
| Section label (ALL CAPS) | `text-[0.7rem] font-bold uppercase tracking-[0.1em]` | 11 | — |

**Rules:**
- ALL CAPS only for: table headers, stat card labels, `text-[0.7rem]` section labels.
- `font-semibold` for dashboard headings. `font-bold` is landing/marketing only.

---

## 4. Spacing

Base unit: 4px (Tailwind default). All spacing is multiples of 4.

| Context | Value | Tailwind |
|---------|-------|----------|
| Card internal padding | 20px / 24px | `p-5` / `p-6` |
| Card header (with border-b) | 16px v, 24px h | `px-6 py-4` |
| Page padding | 32px | `px-8 py-8` |
| Section gap | 32px | `mb-8` |
| Between cards in grid | 16px / 24px | `gap-4` / `gap-6` |
| Between list items | use divide | `divide-y divide-surface-border` |
| Icon–text gap | 8px / 12px | `gap-2` / `gap-3` |
| Form elements | 16px | `space-y-4` |

---

## 5. Borders, Radius, Shadows

**Radius:**
- `rounded-xl` — cards, panels (12px)
- `rounded-lg` — inputs, selects, dropdowns (8px)
- `rounded-full` — badges, pills, avatars only
- `rounded-2xl` — modals, large hero cards (20px)
- Never `rounded-full` on cards or panels.

**Borders:** Always `1px border-surface-border`. Never heavier. `border-surface-border-strong` only for active/focused states.

**Shadows:**
- `shadow-sm` — all cards (default, only permitted on static cards)
- `shadow-lg` — dropdowns, popovers
- Copper glow: `shadow-[0_4px_20px_rgba(217,144,88,0.30)]` — Gradient CTA button only
- Never `shadow-md` or `shadow-xl` on cards.

---

## 6. Animation & Motion

### Custom utility classes (defined in `index.css`)

| Class | Behavior | When to use |
|-------|----------|-------------|
| `.animate-fadeInUp` | 0.3s ease-out, opacity 0→1 + translateY(12px)→0 | New card/panel enter |
| `.animate-scaleIn` | 0.25s ease-out scale | Modal/popover appear |
| `.animate-staggerFadeIn` | 0.4s ease-out, reads `--stagger-delay` CSS var | Judge card lists |
| `.animate-shimmer` | 2s infinite gradient shift | Skeleton loading only |
| `.animate-subtleGlow` | 2s infinite copper glow pulse | Accent highlights only |
| `.animate-countUp` | cubic-bezier(0.34,1.56,0.64,1) | KPI numbers appearing |
| `animate-pulse` | Tailwind built-in | Skeleton loaders |
| `animate-spin` | Tailwind built-in | Active judge spinner |

### Timing rules

- Entry animations: 0.2–0.4s ease-out.
- Hover transitions: `transition-colors` (150ms). Apply to all interactive elements.
- Hover lift (clickable cards): `transition-all hover:-translate-y-1 hover:shadow-md`
- Infinite/ambient animations: 2s ease-in-out. Accent highlights only, not content areas.
- No transform animations on non-interactive elements.

**Stagger pattern for lists:**
```
style={{ '--stagger-delay': `${index * 80}ms` }}
className="animate-staggerFadeIn"
```

---

## 7. Interactive Surface Patterns

Three named effects — always use the component or class pattern, never replicate inline.

**SpotlightCard** — mouse-follow radial glow for feature/pillar cards.
- Import: `@/components/landing/SpotlightCard`
- Always pass `spotlightColor="rgba(217,144,88,0.12)"`. No other glow color permitted.

**Glassmorphism nav** — `bg-surface-secondary/60 backdrop-blur-xl border border-surface-border/50 rounded-2xl`

**Hover lift** — `transition-all hover:-translate-y-1 hover:shadow-md hover:border-accent/20`

**Top accent bar** — `<div className="h-0.5 bg-gradient-to-r from-accent to-transparent" />`
Use on judge cards and feature cards. This is the only permitted gradient on a card.

**Focus ring** — `focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent`
Apply to all inputs, textareas, selects, and focusable buttons.

---

## 8. Component Decision Rules

### Cards

- Standard card: `bg-surface rounded-xl border border-surface-border shadow-sm`
- Card with header: add `border-b border-surface-border` between header and body
- Never `rounded-full` on cards. Never `shadow-md` or higher on static cards.

### Buttons

| Variant | When | Classes |
|---------|------|---------|
| Primary (CTA) | Default action | `bg-accent text-white hover:bg-accent-hover transition-colors` |
| Gradient CTA | Hero / marketing sections only | `bg-gradient-to-br from-accent to-accent-hover shadow-[0_4px_20px_rgba(217,144,88,0.30)]` |
| Secondary | Cancel / alternative | `bg-surface border border-surface-border text-text-primary hover:bg-surface-secondary` |
| Ghost | Inline / low emphasis | `text-text-secondary hover:text-text-primary hover:bg-surface-tertiary` |
| Pill split | Landing nav only | Copper left half + dark right half, `rounded-full overflow-hidden` |

### Badges / Pills

All badges: `inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full` + domain color triplet (light bg, colored text, matching border). Never use raw hex in badge styles.

### Tables

- Header cells: `text-xs font-medium text-text-secondary uppercase tracking-wider`
- Row hover: `hover:bg-surface-secondary transition-colors`
- Row dividers: `divide-y divide-surface-border` on `<tbody>`

### Spinners (active judge)

`w-4 h-4 border-2 border-surface-border border-t-{provider} rounded-full animate-spin`

---

## 9. Naming Conventions

**Files/folders:**
- Components: `PascalCase.jsx` (`JudgeCard.jsx`)
- Utilities/hooks: `camelCase.js` (`useSSE.js`)
- CSS: `ComponentName.css` — landing-specific only; dashboard uses Tailwind only
- Landing components: `frontend/src/components/landing/`
- UI primitives (shadcn): `frontend/src/components/ui/`

**CSS namespacing:**
- Landing page: all custom classes prefixed `.landing-*`, `.hero-*`, `.nav-*`
- Dashboard: Tailwind only, no custom CSS classes

**Props:**
- Boolean show/hide: `isLoading`, `isOpen`, `showHeader`
- Event handlers: `onClose`, `onSubmit`, `onChange`
- Slot children: `children`, `header`, `footer`

---

## 10. What Never To Do

- No gradients except: Gradient CTA Button, Pill Split Button, Top Accent Bar
- No `rounded-full` on cards or panels
- No `shadow-md` or `shadow-xl` on cards (`shadow-sm` only)
- No colored page backgrounds — always `bg-surface-secondary`
- No ALL CAPS except table headers, stat labels, `text-[0.7rem]` section labels
- No emoji in the UI
- No dark mode
- No freestyle spotlight/glow — always use the `SpotlightCard` component
- No sans-serif font — 'New York' serif is the brand font (Tailwind `font-sans` maps to it)
- No warm/cool accent color mixing in a single view
- No hardcoded hex values in JSX — always use Tailwind tokens from `tailwind.config.js`
