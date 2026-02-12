# RAGScope Design System — Claude Code Reference

## Design Philosophy

Clean, professional SaaS dashboard aesthetic. Inspired by Linear, Attio, and modern observability tools.
Key principles: generous whitespace, subtle depth through shadows not borders, warm neutral palette, information density without clutter.

---

## Color Palette (Tailwind Config)

```js
// tailwind.config.js — extend colors
colors: {
  // Base neutrals (warm gray, not blue-gray)
  surface: {
    DEFAULT: '#FFFFFF',
    secondary: '#F9FAFB',    // Page background, sidebar bg
    tertiary: '#F3F4F6',     // Hover states, input backgrounds
    border: '#E5E7EB',       // Subtle dividers
    'border-strong': '#D1D5DB', // Active borders, table headers
  },
  text: {
    primary: '#111827',      // Headings, primary content
    secondary: '#6B7280',    // Descriptions, meta info, timestamps
    tertiary: '#9CA3AF',     // Placeholders, disabled
  },

  // Judge colors (keep existing)
  openai: {
    DEFAULT: '#10A37F',
    light: '#ECFDF5',
    border: '#A7F3D0',
  },
  anthropic: {
    DEFAULT: '#D97706',
    light: '#FFFBEB',
    border: '#FDE68A',
  },
  gemini: {
    DEFAULT: '#4285F4',
    light: '#EFF6FF',
    border: '#BFDBFE',
  },

  // Strategy colors (NEW)
  strategy: {
    council: '#8B5CF6',      // Purple — full evaluation
    hybrid: '#F59E0B',       // Amber — mixed approach
    single: '#6B7280',       // Gray — fast/cheap
  },

  // Verdict colors
  verdict: {
    pass: '#10B981',         // Green
    warn: '#F59E0B',         // Amber
    fail: '#EF4444',         // Red
  },

  // Accent
  accent: {
    DEFAULT: '#111827',      // Primary buttons (dark)
    hover: '#1F2937',
  }
}
```

---

## Layout Structure

### Page Shell
```
┌──────────────────────────────────────────────────┐
│ Sidebar (240px fixed)  │  Main Content Area       │
│                        │                          │
│ Logo/Brand             │  Page Header             │
│ ─────────              │  Tab Navigation          │
│ Nav Items              │  ─────────────           │
│  · Evaluate            │                          │
│  · History             │  Content Area            │
│  · Stats               │  (cards, tables, etc)    │
│                        │                          │
│ ─────────              │                          │
│ Settings               │                          │
└──────────────────────────────────────────────────┘
```

### Sidebar
```jsx
// Fixed left sidebar, full height
<aside className="fixed left-0 top-0 h-screen w-60 bg-surface-secondary border-r border-surface-border flex flex-col">
  
  {/* Logo area */}
  <div className="px-5 py-5">
    <span className="text-lg font-semibold text-text-primary">RAGScope</span>
  </div>

  {/* Main nav */}
  <nav className="flex-1 px-3 space-y-1">
    {/* Active item */}
    <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-tertiary text-text-primary text-sm font-medium">
      <Icon size={18} />
      Evaluate
    </a>
    {/* Inactive item */}
    <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary text-sm hover:bg-surface-tertiary hover:text-text-primary transition-colors">
      <Icon size={18} />
      History
    </a>
  </nav>

  {/* Bottom section */}
  <div className="px-3 pb-4 border-t border-surface-border pt-4">
    <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-secondary text-sm">
      Settings
    </a>
  </div>
</aside>

{/* Main content offset */}
<main className="ml-60 min-h-screen bg-surface-secondary">
  <div className="max-w-6xl mx-auto px-8 py-8">
    {/* Page content */}
  </div>
</main>
```

### Page Header Pattern
```jsx
{/* Page header with title + action */}
<div className="flex items-center justify-between mb-8">
  <div>
    <h1 className="text-2xl font-semibold text-text-primary">Evaluate</h1>
    <p className="text-sm text-text-secondary mt-1">Run evaluation on your RAG system outputs</p>
  </div>
  <button className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors">
    New Evaluation
  </button>
</div>
```

### Tab Navigation (for view switching)
```jsx
{/* Tabs — underline style like the reference */}
<div className="flex items-center gap-6 border-b border-surface-border mb-6">
  {/* Active tab */}
  <button className="pb-3 text-sm font-medium text-text-primary border-b-2 border-text-primary -mb-px">
    Overview
  </button>
  {/* Inactive tab */}
  <button className="pb-3 text-sm text-text-secondary hover:text-text-primary transition-colors">
    History
  </button>
  <button className="pb-3 text-sm text-text-secondary hover:text-text-primary transition-colors">
    Cost Analytics
  </button>
</div>
```

---

## Component Patterns

### Card (Primary container)
```jsx
{/* Standard card — white bg, subtle shadow, rounded */}
<div className="bg-surface rounded-xl border border-surface-border shadow-sm p-6">
  {/* Card content */}
</div>

{/* Card with header */}
<div className="bg-surface rounded-xl border border-surface-border shadow-sm">
  <div className="px-6 py-4 border-b border-surface-border">
    <h3 className="text-sm font-semibold text-text-primary">Card Title</h3>
    <p className="text-xs text-text-secondary mt-0.5">Description text</p>
  </div>
  <div className="p-6">
    {/* Body */}
  </div>
</div>
```

### Stat Card (KPI display — like the dashboard screenshot)
```jsx
{/* Row of stat cards */}
<div className="grid grid-cols-4 gap-4 mb-6">
  <div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5">
    <p className="text-xs text-text-secondary font-medium uppercase tracking-wide">Total Evaluations</p>
    <div className="flex items-baseline gap-2 mt-2">
      <span className="text-2xl font-semibold text-text-primary">158</span>
      <span className="text-xs font-medium text-emerald-600">+3.2%</span>
    </div>
  </div>
  {/* ...more stat cards */}
</div>
```

### Judge Card (Adapted to design system)
```jsx
{/* Judge card — uses provider accent color on left border */}
<div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
  {/* Colored top bar (2px) */}
  <div className="h-0.5 bg-openai" />
  
  <div className="p-5">
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-openai" />
        <span className="text-sm font-semibold text-text-primary">OpenAI</span>
        <span className="text-xs text-text-secondary">gpt-4o-mini</span>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-openai-light text-openai font-medium">
        Faithfulness
      </span>
    </div>

    {/* Score */}
    <div className="flex items-baseline gap-1 mb-3">
      <span className="text-3xl font-semibold text-text-primary">0.87</span>
      <span className="text-sm text-text-secondary">/ 1.0</span>
    </div>

    {/* Score bar */}
    <div className="w-full h-1.5 bg-surface-tertiary rounded-full mb-4">
      <div className="h-full bg-openai rounded-full" style={{ width: '87%' }} />
    </div>

    {/* Reasoning */}
    <p className="text-xs text-text-secondary leading-relaxed">
      All claims in the response are supported by the retrieved context...
    </p>

    {/* Footer meta */}
    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-surface-border">
      <span className="text-xs text-text-tertiary">1.2s</span>
      <span className="text-xs text-text-tertiary">847 tokens</span>
      <span className="text-xs text-text-tertiary">$0.0004</span>
    </div>
  </div>
</div>
```

### Strategy Badge
```jsx
{/* Inline badge showing evaluation strategy */}
// Council
<span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
  Council
</span>

// Hybrid
<span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
  Hybrid
</span>

// Single
<span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200">
  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
  Single
</span>
```

### Verdict Badge
```jsx
// PASS
<span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
  PASS
</span>

// WARN
<span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
  WARN
</span>

// FAIL
<span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
  FAIL
</span>
```

### Table (History view — like the billing screenshot)
```jsx
<div className="bg-surface rounded-xl border border-surface-border shadow-sm overflow-hidden">
  {/* Table header with filters */}
  <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
    <h3 className="text-sm font-semibold text-text-primary">Evaluation History</h3>
    <div className="flex items-center gap-3">
      {/* Filter pills */}
      <select className="text-xs text-text-secondary bg-surface-secondary border border-surface-border rounded-lg px-3 py-1.5">
        <option>Strategy: All</option>
      </select>
      <select className="text-xs text-text-secondary bg-surface-secondary border border-surface-border rounded-lg px-3 py-1.5">
        <option>Verdict: All</option>
      </select>
    </div>
  </div>

  {/* Table */}
  <table className="w-full">
    <thead>
      <tr className="border-b border-surface-border">
        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Job ID</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Strategy</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Test Cases</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Score</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cost</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Verdict</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-surface-border">
      <tr className="hover:bg-surface-secondary transition-colors cursor-pointer">
        <td className="px-6 py-4 text-sm font-mono text-text-primary">abc123</td>
        <td className="px-6 py-4"><StrategyBadge strategy="council" /></td>
        <td className="px-6 py-4 text-sm text-text-secondary">5</td>
        <td className="px-6 py-4 text-sm font-medium text-text-primary">0.82</td>
        <td className="px-6 py-4 text-sm text-text-secondary">$0.0234</td>
        <td className="px-6 py-4 text-sm text-text-secondary">12 Feb 2026</td>
        <td className="px-6 py-4"><VerdictBadge verdict="pass" /></td>
      </tr>
    </tbody>
  </table>
</div>
```

### Cost Breakdown Card
```jsx
<div className="bg-surface rounded-xl border border-surface-border shadow-sm p-6">
  <h3 className="text-sm font-semibold text-text-primary mb-4">Cost Breakdown</h3>
  
  {/* Strategy cost comparison bars */}
  <div className="space-y-3">
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary">Council (3 cases)</span>
        <span className="font-medium text-text-primary">$0.0180</span>
      </div>
      <div className="w-full h-2 bg-surface-tertiary rounded-full">
        <div className="h-full bg-strategy-council rounded-full" style={{ width: '100%' }} />
      </div>
    </div>
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary">Hybrid (4 cases)</span>
        <span className="font-medium text-text-primary">$0.0048</span>
      </div>
      <div className="w-full h-2 bg-surface-tertiary rounded-full">
        <div className="h-full bg-strategy-hybrid rounded-full" style={{ width: '27%' }} />
      </div>
    </div>
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-secondary">Single (3 cases)</span>
        <span className="font-medium text-text-primary">$0.0006</span>
      </div>
      <div className="w-full h-2 bg-surface-tertiary rounded-full">
        <div className="h-full bg-strategy-single rounded-full" style={{ width: '3%' }} />
      </div>
    </div>
  </div>

  {/* Savings callout */}
  <div className="mt-4 pt-4 border-t border-surface-border flex items-center justify-between">
    <span className="text-xs text-text-secondary">vs. all-council baseline</span>
    <span className="text-sm font-semibold text-emerald-600">-67% cost saved</span>
  </div>
</div>
```

### Progress/Loading States
```jsx
{/* Skeleton loader for cards */}
<div className="bg-surface rounded-xl border border-surface-border shadow-sm p-5 animate-pulse">
  <div className="h-3 w-24 bg-surface-tertiary rounded mb-4" />
  <div className="h-8 w-16 bg-surface-tertiary rounded mb-3" />
  <div className="h-1.5 w-full bg-surface-tertiary rounded mb-4" />
  <div className="space-y-2">
    <div className="h-2.5 w-full bg-surface-tertiary rounded" />
    <div className="h-2.5 w-3/4 bg-surface-tertiary rounded" />
  </div>
</div>

{/* Spinning indicator for active judge */}
<div className="w-4 h-4 border-2 border-surface-border border-t-openai rounded-full animate-spin" />
```

### Input / Form Elements
```jsx
{/* Text input */}
<input className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors" />

{/* Primary button */}
<button className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors">
  Run Evaluation
</button>

{/* Secondary button */}
<button className="px-4 py-2 bg-surface text-text-primary text-sm font-medium rounded-lg border border-surface-border hover:bg-surface-secondary transition-colors">
  Cancel
</button>

{/* Ghost button */}
<button className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-tertiary rounded-lg transition-colors">
  View all
</button>
```

---

## Typography Scale

| Use | Class | Size |
|-----|-------|------|
| Page title | `text-2xl font-semibold` | 24px |
| Card title | `text-sm font-semibold` | 14px |
| Body text | `text-sm text-text-secondary` | 14px |
| Meta / timestamps | `text-xs text-text-tertiary` | 12px |
| Large number (KPI) | `text-2xl font-semibold` | 24px |
| Score display | `text-3xl font-semibold` | 30px |
| Badge text | `text-xs font-medium` | 12px |
| Table header | `text-xs font-medium uppercase tracking-wider` | 12px |
| Table cell | `text-sm` | 14px |

---

## Spacing Rules

- Page padding: `px-8 py-8`
- Between sections: `mb-8`
- Between cards in a grid: `gap-4` or `gap-6`
- Card internal padding: `p-5` or `p-6`
- Card header/body separation: `border-b border-surface-border` with `px-6 py-4` header and `p-6` body
- Between form elements: `space-y-4`
- Between list items: `divide-y divide-surface-border`

---

## Shadows

- Cards: `shadow-sm` only (very subtle)
- Dropdowns/popovers: `shadow-lg`
- No shadow on buttons, badges, or inline elements
- Never use `shadow-md` or `shadow-xl` on cards — keep it minimal

---

## Transitions

- All interactive elements: `transition-colors` (150ms default)
- No transform animations except loading spinners
- Skeleton loaders: `animate-pulse`
- Active judge spinner: `animate-spin`

---

## Icons

Use Lucide React (already lightweight, consistent stroke style):
```
npm install lucide-react
```

Common icons for RAGScope:
- Navigation: `LayoutDashboard`, `History`, `BarChart3`, `Settings`
- Actions: `Play`, `Upload`, `Download`, `Filter`, `ChevronDown`
- Status: `CheckCircle2`, `AlertTriangle`, `XCircle`, `Clock`, `Loader2`
- Judges: `Brain` (OpenAI), `Sparkles` (Anthropic), `Gem` (Gemini)

Size: 18px for nav items, 16px for inline, 14px for badges/meta.

---

## CRITICAL — What NOT to Do

- No gradients anywhere
- No rounded-full on cards (use rounded-xl)
- No colored backgrounds on the page (keep bg-surface-secondary)
- No heavy borders (1px border-surface-border only)
- No drop shadows heavier than shadow-sm on cards
- No ALL CAPS except table headers and stat labels
- No emoji in the UI
- No font changes — use the system font stack (Tailwind default: Inter if loaded, else system)
- No dark mode (out of scope, adds complexity for no demo value)