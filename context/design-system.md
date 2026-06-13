# ergoRemind — Design System

Rules, patterns, and guidelines for building consistent UI in ergoRemind.
All new components **must** follow these patterns.

---

## Theme

- **Dark theme only** — no light mode, no theme toggle
- `color-scheme: dark` set at `:root` level
- Background: `#0f172a` (slate-900 / posture-bg)
- Primary text: `text-slate-100`
- Secondary text: `text-slate-400`

---

## Card Pattern

The primary container pattern used by all section components:

```html
<section class="rounded-lg border border-slate-700 bg-slate-900 p-5">
  <!-- content -->
</section>
```

| Property | Value |
|----------|-------|
| Background | `bg-slate-900` |
| Border | `border border-slate-700` |
| Radius | `rounded-lg` |
| Padding | `p-5` |
| Element | `<section>` |

### Nested Stat Cell

For data display within cards:

```html
<div class="rounded-md bg-slate-950 p-3">
  <p class="text-slate-500">Label</p>
  <p class="mt-1 font-semibold text-slate-100">Value</p>
</div>
```

---

## Status Indicators

Color-coded feedback for different states:

| State | Text Color | Background (banners) | Border |
|-------|-----------|---------------------|--------|
| ✅ Good / Active | `text-green-400` | `bg-green-950/60` | `border-green-400/40` |
| ❌ Bad / Error | `text-red-400` | `bg-red-950/90` | `border-red-400/40` |
| ⏸️ Inactive / Paused | `text-slate-400` | — | — |
| ⚠️ Distracted *(new)* | `text-amber-400` | `bg-amber-950/60` | `border-amber-400/40` |

### Score Color Logic

```typescript
const color = !isMonitoring
  ? 'text-slate-400'        // Paused
  : frame?.isGood === false
    ? 'text-red-400'        // Bad posture
    : 'text-green-400';     // Good posture
```

---

## Interactive Elements

### Buttons

**Primary (CTA):**

```html
<button class="rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-green-300">
  Calibrate
</button>
```

**Secondary:**

```html
<button class="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 outline-none hover:bg-slate-800 focus:ring-2 focus:ring-green-400/50">
  Pause
</button>
```

**Nav Tab (Active):**

```html
<button class="rounded px-3 py-2 text-sm bg-green-500 text-slate-950">
  Monitor
</button>
```

**Nav Tab (Inactive):**

```html
<button class="rounded px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
  Stats
</button>
```

### Hover States

| Element | Hover Class |
|---------|-------------|
| Secondary buttons | `hover:bg-slate-800` |
| Nav tabs (inactive) | `hover:bg-slate-800` |
| Logo icon | `hover:scale-105` (with `transition-all duration-300`) |

### Focus States

All interactive elements must have visible focus indicators:

| Element | Focus Classes |
|---------|--------------|
| Primary buttons | `focus:ring-2 focus:ring-green-300` |
| Secondary buttons | `focus:ring-2 focus:ring-green-400/50` |
| Select inputs | `focus:border-green-400 focus:ring-2 focus:ring-green-400/40` |
| Sliders / checkboxes | `focus:ring-2 focus:ring-green-400/40` |

All buttons must include `outline-none` to replace the default outline with ring.

---

## Form Controls

### Range Slider

```html
<label class="block text-sm text-slate-300">
  <span class="flex justify-between">
    <span>Label</span>
    <span class="font-semibold text-slate-100">Value unit</span>
  </span>
  <input class="mt-2 w-full accent-green-500 focus:outline-none focus:ring-2 focus:ring-green-400/40"
         type="range" min="..." max="..." />
</label>
```

### Toggle Checkbox

```html
<label class="flex items-center justify-between rounded-md bg-slate-950 p-3 text-sm text-slate-300">
  <span>Label</span>
  <input class="h-5 w-5 accent-green-500 focus:ring-2 focus:ring-green-400/40"
         type="checkbox" />
</label>
```

### Select Dropdown

```html
<select class="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/40">
  <option>...</option>
</select>
```

---

## Progress Bars

```html
<div class="h-3 overflow-hidden rounded-full bg-red-500/30">
  <div class="h-full bg-green-500" style="width: 75%"></div>
</div>
```

| Property | Value |
|----------|-------|
| Track | `bg-red-500/30` (faded red to show "remaining bad") |
| Fill | `bg-green-500` (green for good percentage) |
| Height | `h-3` |
| Radius | `rounded-full` |

---

## Overlays

### Paused Video Overlay

```html
<div class="absolute inset-0 grid place-items-center bg-slate-950/85 text-sm font-medium text-slate-300">
  Monitoring paused
</div>
```

### Focus Guard Overlay *(planned)*

| Property | Value |
|----------|-------|
| Position | `fixed inset-0` |
| Z-index | `z-50` or higher |
| Background | `rgba(15, 23, 42, 0.92)` |
| Blur | `backdrop-blur` (optional) |
| Content | Centered card, `max-w-md`, `rounded-xl` |
| Accent | `border-amber-500` |
| Dismiss | Auto-dismiss after timeout or button click |

---

## Animations & Transitions

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Default transition | `300ms` | `ease-in-out` (via Tailwind `transition-all`) | Logo hover, general UI |
| Notice auto-dismiss | `5000ms` | — | Notice banner timeout |
| Canvas rAF loop | Per-frame | — | Skeleton overlay rendering |
| Overlay fade *(planned)* | `300ms` | `ease-in-out` | Focus Guard overlay appear/dismiss |

### CSS Transition Pattern

```html
<element class="transition-all duration-300">
```

---

## Layout

### Main Grid

```html
<div class="grid flex-1 gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_360px]">
  <div class="space-y-5"><!-- Video + Status --></div>
  <aside class="space-y-5"><!-- Sidebar panels --></aside>
</div>
```

| Property | Value |
|----------|-------|
| Breakpoint | `lg` (1024px) for 2-column layout |
| Sidebar width | `360px` fixed |
| Main content | `minmax(0, 1fr)` flexible |
| Gap | `gap-5` |
| Stacking | `space-y-5` for vertical sections |

### Responsive

- Below `lg`: Single column, sidebar stacks below main content
- Min viewport: `800px × 600px` (enforced on `body`)

---

## Icons

- **V1: Emoji-based** — no icon library (Heroicons, Lucide, etc.)
- App logo: Custom PNG (`assets/icon.png`)
- Future consideration: Lucide React for V2

---

## Banners / Notices

### Success Notice

```html
<div class="mt-4 rounded-md border border-green-400/40 bg-green-950/60 px-4 py-3 text-sm text-green-100">
  Calibration saved.
</div>
```

### Error Banner

```html
<div class="rounded-md border border-red-400/40 bg-red-950/90 px-4 py-3 text-sm text-red-100">
  Error message here.
</div>
```

### Warning Banner *(planned — Focus Guard)*

```html
<div class="rounded-md border border-amber-400/40 bg-amber-950/60 px-4 py-3 text-sm text-amber-100">
  You seem distracted.
</div>
```

---

## Accessibility Checklist

- [ ] All interactive elements have focus rings (`focus:ring-2`)
- [ ] Color is never the sole indicator (text labels accompany status colors)
- [ ] Form inputs have associated `<label>` elements
- [ ] Buttons have `type="button"` to prevent accidental form submission
- [ ] Images have `alt` attributes
- [ ] Minimum contrast ratio met (light text on dark backgrounds)
