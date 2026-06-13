# ergoRemind — UI Design Tokens

Design tokens extracted from `tailwind.config.js`, `src/styles.css`, and component source files.

---

## Color Palette

### Custom Posture Colors (`tailwind.config.js` → `theme.extend.colors.posture`)

| Token | Hex | Usage |
|-------|-----|-------|
| `posture-bg` | `#0f172a` | App background (slate-900 equivalent) |
| `posture-good` | `#22c55e` | Good posture state (green-500) |
| `posture-bad` | `#ef4444` | Bad posture state (red-500) |
| `posture-neutral` | `#64748b` | Inactive / paused state (slate-500) |
| `posture-warning` *(planned)* | `#f59e0b` | Focus Guard distraction state (amber-500) |

### Tailwind Slate Scale (Most Used)

| Token | Hex | Usage |
|-------|-----|-------|
| `slate-50` | `#f8fafc` | App title text |
| `slate-100` | `#f1f5f9` | Primary text, stat values |
| `slate-300` | `#cbd5e1` | Secondary text, labels, nav items |
| `slate-400` | `#94a3b8` | Tertiary text, subtitles, descriptions |
| `slate-500` | `#64748b` | Faint labels, stat category names |
| `slate-700` | `#334155` | Borders, dividers |
| `slate-800` | `#1e293b` | Hover backgrounds, divider lines |
| `slate-900` | `#0f172a` | Card backgrounds |
| `slate-950` | `#020617` | Deep backgrounds (video, stat cells) |

### Semantic Status Colors

| State | Primary | Faded / Background |
|-------|---------|---------------------|
| Good posture | `text-green-400` / `bg-green-500` | `bg-green-950/60`, `border-green-400/40` |
| Bad posture | `text-red-400` / `bg-red-500` | `bg-red-950/90`, `border-red-400/40` |
| Inactive | `text-slate-400` | — |
| Distracted *(planned)* | `text-amber-400` / `bg-amber-500` | `bg-amber-950/60`, `border-amber-400/40` |

### Accent Colors

| Context | Color | Usage |
|---------|-------|-------|
| Active tab | `bg-green-500 text-slate-950` | Selected nav button |
| Calibrate button | `bg-green-500 text-slate-950` | Primary CTA |
| Focus rings | `ring-green-400/50` or `ring-green-300` | Accessibility focus |
| Slider accent | `accent-green-500` | Range inputs, checkboxes |

---

## Typography

### Font Stack

Defined in both `tailwind.config.js` and `styles.css`:

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Type Scale (as used in components)

| Element | Classes | Size |
|---------|---------|------|
| App title | `text-2xl font-semibold tracking-normal` | 24px |
| Section headings | `text-lg font-semibold` | 18px |
| Posture score | `text-6xl font-semibold leading-none` | 60px |
| Stat percentage | `text-3xl font-semibold` | 30px |
| Body text | `text-sm` | 14px |
| Labels / captions | `text-sm text-slate-400` | 14px |
| Faint labels | `text-sm text-slate-500` | 14px |

---

## Theme

| Property | Value |
|----------|-------|
| Mode | **Dark only** (`color-scheme: dark` in `:root`) |
| Background | `#0f172a` (posture-bg / slate-900) |
| Text default | `text-slate-100` |
| Scheme | Enforced via `:root { color-scheme: dark; }` |

---

## Spacing

Uses **Tailwind defaults** (0.25rem increments):

| Common Usage | Classes |
|-------------|---------|
| Card padding | `p-5` (1.25rem) |
| Section gaps | `space-y-5` or `gap-5` |
| Stat cell padding | `p-3` (0.75rem) |
| Main content padding | `px-5 py-6` |
| Grid gaps | `gap-3` to `gap-5` |

---

## Border Radius

| Usage | Classes |
|-------|---------|
| Cards / sections | `rounded-lg` (0.5rem) |
| Stat cells | `rounded-md` (0.375rem) |
| Buttons | `rounded-md` |
| Progress bar | `rounded-full` (9999px) |
| Logo icon | `rounded-xl` (0.75rem) |
| Select inputs | `rounded-md` |

---

## Borders

| Usage | Classes |
|-------|---------|
| Card border | `border border-slate-700` |
| Error banner | `border border-red-400/40` |
| Notice banner | `border border-green-400/40` |
| Header divider | `border-b border-slate-800` |
| Input focus border | `focus:border-green-400` |

---

## Focus / Accessibility

| Element | Classes |
|---------|---------|
| Buttons | `focus:ring-2 focus:ring-green-400/50` |
| Calibrate button | `focus:ring-2 focus:ring-green-300` |
| Select inputs | `focus:border-green-400 focus:ring-2 focus:ring-green-400/40` |
| Sliders | `focus:ring-2 focus:ring-green-400/40` |
| Checkboxes | `focus:ring-2 focus:ring-green-400/40` |

---

## Overlay Tokens (Planned — Focus Guard)

| Property | Value |
|----------|-------|
| Background | `rgba(15, 23, 42, 0.92)` (slate-950 at 92% opacity) |
| Text | White (`text-white`) |
| Border | Accent-colored (`border-amber-500`) |
| Blur | `backdrop-blur` (optional) |
| Animation | Fade in, auto-dismiss after configurable duration |

---

## Shadows & Effects

| Usage | Classes |
|-------|---------|
| Logo icon | `shadow-lg shadow-green-500/10` |
| Logo hover | `transition-all duration-300 hover:scale-105` |
| Skeleton glow | `shadowBlur: 6` (canvas context) |
| Grid overlay | `bg-[linear-gradient(...)]` scan-line pattern |

---

## Layout

| Property | Value |
|----------|-------|
| Min width | `800px` (set on `body`) |
| Min height | `600px` (set on `body`) |
| Max content width | `max-w-6xl` (72rem / 1152px) |
| Main grid | `lg:grid-cols-[minmax(0,1fr)_360px]` |
| Sidebar width | Fixed `360px` on large screens |
| Box sizing | `border-box` (global reset) |
