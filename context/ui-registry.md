# ergoRemind — UI Component Registry

Visual patterns for every component in the app. New components must follow the
established patterns below. Extracted from actual source files.

---

## Existing Components

### 1. VideoFeed.tsx

**File:** `src/components/VideoFeed.tsx`

| Property | Value |
|----------|-------|
| **Container** | `<section>`, `relative overflow-hidden rounded-lg border border-slate-700 bg-slate-950` |
| **Video element** | `aspect-video w-full bg-slate-950 object-cover`, `muted playsInline` |
| **Canvas overlay** | `pointer-events-none absolute inset-0 h-full w-full object-cover` |
| **Skeleton colors** | `#22c55e` (good) / `#ef4444` (bad), with `shadowBlur: 6` glow |
| **Skeleton lines** | `lineWidth: 3`, opacity from landmark visibility |
| **Landmark dots** | Radius 7px for nose/shoulders, 5px for others; white border ring |
| **Scan-line overlay** | Grid pattern `bg-[size:48px_48px]` with `rgba(100,116,139,0.14)` lines |
| **Paused state** | Dark overlay `bg-slate-950/85` with centered "Monitoring paused" text |
| **Error banner** | Bottom-positioned, `bg-red-950/90 border-red-400/40 text-red-100`, rounded-md |

**Props:**

```typescript
interface VideoFeedProps {
  videoRef: RefObject<HTMLVideoElement>;
  landmarks: PostureLandmark[] | null;
  isGoodPosture: boolean;
  isMonitoring: boolean;
  error: string | null;
}
```

---

### 2. PostureStatus.tsx

**File:** `src/components/PostureStatus.tsx`

| Property | Value |
|----------|-------|
| **Container** | `<section>`, `rounded-lg border border-slate-700 bg-slate-900 p-5` |
| **Score display** | `text-6xl font-semibold leading-none`, color-coded |
| **Score colors** | `text-green-400` (good), `text-red-400` (bad), `text-slate-400` (inactive) |
| **Status badge** | `rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-300` |
| **Layout** | Flex row (score left, status badge right), then 3-column grid below |
| **Stat cells** | `rounded-md bg-slate-950 p-3`, label in `text-slate-500`, value in `text-slate-100` |
| **Good percent** | Displayed in `text-green-400` |

**Status Labels:**

| AlertState | Label |
|-----------|-------|
| `IDLE` (no frame) | "Paused" |
| `BAD_POSTURE` | "Bad posture detected" |
| `COOLDOWN` | "Alert cooldown" |
| good frame | "Good posture" |
| bad frame | "Needs attention" |

**Props:**

```typescript
interface PostureStatusProps {
  frame: PostureFrame | null;
  session: PostureSession;
  alertState: AlertState;
  isMonitoring: boolean;
}
```

---

### 3. StatsPanel.tsx

**File:** `src/components/StatsPanel.tsx`

| Property | Value |
|----------|-------|
| **Container** | `<section>`, `rounded-lg border border-slate-700 bg-slate-900 p-5` |
| **Header** | Flex row — "Today" heading left, percentage `text-3xl font-semibold text-green-400` right |
| **Date** | `text-sm text-slate-400`, format `YYYY-MM-DD` |
| **Progress bar** | `h-3 rounded-full`, track `bg-red-500/30`, fill `bg-green-500` |
| **Stats grid** | 2-column grid, `rounded-md bg-slate-950 p-3` cells |
| **Stat labels** | `text-slate-500` |
| **Stat values** | `font-semibold text-slate-100` |

**Props:**

```typescript
interface StatsPanelProps {
  stats: DailyStats | null;
  session: PostureSession;
}
```

---

### 4. SettingsPanel.tsx

**File:** `src/components/SettingsPanel.tsx`

| Property | Value |
|----------|-------|
| **Container** | `<section>`, `rounded-lg border border-slate-700 bg-slate-900 p-5` |
| **Header** | Flex row — title + subtitle left, "Calibrate" button right |
| **Calibrate button** | `bg-green-500 text-slate-950 rounded-md px-4 py-2 text-sm font-semibold` |
| **Content layout** | `space-y-5` vertical stack of settings |
| **Range slider pattern** | `<label>` block, flex header (label + value), `<input type="range">` below |
| **Slider styling** | `accent-green-500`, full width, `focus:ring-2 focus:ring-green-400/40` |
| **Toggle pattern** | `flex items-center justify-between`, `rounded-md bg-slate-950 p-3` |
| **Checkbox** | `h-5 w-5 accent-green-500 focus:ring-2 focus:ring-green-400/40` |

**Settings Controls:**

| Setting | Type | Range | Unit |
|---------|------|-------|------|
| Slouch threshold | Range slider | 5–35 | deg |
| Alert delay | Range slider | 3–30 | sec |
| Alert cooldown | Range slider | 20–180 | sec |
| Stand-up reminder | Range slider | 10–90 | min |
| Eye-rule reminder | Range slider | 10–60 | min |
| Sound enabled | Toggle checkbox | — | — |
| Start minimized | Toggle checkbox | — | — |

**Props:**

```typescript
interface SettingsPanelProps {
  settings: AppSettings;
  cameras: MediaDeviceInfo[];
  onSettingsChange: (update: Partial<AppSettings>) => void;
  onCalibrate: () => void;
}
```

---

### 5. CameraSelector.tsx

**File:** `src/components/CameraSelector.tsx`

| Property | Value |
|----------|-------|
| **Container** | `<label>` block with "Camera" text label |
| **Select element** | `w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2` |
| **Text color** | `text-slate-100` |
| **Focus state** | `focus:border-green-400 focus:ring-2 focus:ring-green-400/40` |
| **Default option** | "Default camera" with value `"default"` |
| **Dynamic options** | Mapped from `MediaDeviceInfo[]`, fallback label `Camera ${index + 1}` |

**Props:**

```typescript
interface CameraSelectorProps {
  cameras: MediaDeviceInfo[];
  selectedCamera: string;
  onCameraChange: (deviceId: string) => void;
}
```

---

## Planned Components (Focus Guard)

### 6. FocusSettings.tsx *(planned)*

| Property | Expected Pattern |
|----------|-----------------|
| **Container** | Same card pattern: `rounded-lg border border-slate-700 bg-slate-900 p-5` |
| **Blocklist** | Chip/tag pattern — `rounded-full bg-slate-800 px-3 py-1 text-sm` with × dismiss |
| **Category presets** | Button group — `rounded-md border border-slate-700 px-3 py-2 text-sm` |
| **Active preset** | `bg-amber-500 text-slate-950` (matches Focus Guard accent) |
| **Sensitivity slider** | Same `RangeSetting` pattern as SettingsPanel |
| **Toggle** | Same `ToggleSetting` pattern (enable/disable Focus Guard) |

---

### 7. FocusStats.tsx *(planned)*

| Property | Expected Pattern |
|----------|-----------------|
| **Container** | Same card pattern |
| **Focus percentage** | Large number like PostureStatus score, `text-amber-400` when distracted |
| **Top distractors** | Ordered list, each row: app icon (emoji) + name + count |
| **Distraction count** | Stat cell pattern from StatsPanel: `bg-slate-950 p-3 rounded-md` |
| **Time range** | "Today" header pattern from StatsPanel |

---

### 8. OverlayApp.tsx *(planned)*

| Property | Expected Pattern |
|----------|-----------------|
| **Position** | Fixed, full-screen, `z-50` minimum |
| **Background** | `rgba(15, 23, 42, 0.92)` — semi-transparent dark |
| **Blur** | `backdrop-blur` (optional, for glassmorphism effect) |
| **Card** | Centered, `max-w-md`, `rounded-xl`, `border border-amber-500` |
| **Text** | White primary, slate-300 secondary |
| **Animation** | CSS `opacity` transition, fade-in on mount |
| **Auto-dismiss** | Fades out after configurable duration (default 8s) |
| **Dismiss button** | "Got it" or "Back to work" — `bg-amber-500 text-slate-950` |

---

## App Shell (App.tsx)

| Property | Value |
|----------|-------|
| **Root** | `<main>`, `min-h-screen bg-slate-950 text-slate-100` |
| **Content width** | `max-w-6xl mx-auto`, `px-5 py-6` |
| **Header** | Flex row, logo + title left, nav + pause button right |
| **Nav tabs** | Pill-style: `rounded-md border border-slate-700 bg-slate-900 p-1` container |
| **Active tab** | `bg-green-500 text-slate-950` |
| **Inactive tab** | `text-slate-300 hover:bg-slate-800` |
| **Main grid** | `lg:grid-cols-[minmax(0,1fr)_360px]`, gap-5 |
| **Notice banner** | `rounded-md border-green-400/40 bg-green-950/60 text-green-100`, auto-dismiss 5s |
| **Loading state** | Full-screen grid centered, "Loading ergoremind..." in slate-400 |
