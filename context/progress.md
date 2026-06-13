# ergoRemind — Build Progress

Tracks every build step from the original AGENTS.md spec plus the new Focus Guard feature.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Completed |
| 🔲 | TODO — not started |
| 🚧 | In progress |

---

## Phase 1: Posture Detection System (Steps 1–21)

All 21 steps from the original AGENTS.md build order are **complete**.

| Step | File(s) | Description | Status |
|------|---------|-------------|--------|
| 1 | `package.json`, `vite.config.ts`, `tsconfig.json` | Project scaffolding + build config | ✅ |
| 2 | `src/types/index.ts` | Core TypeScript type definitions | ✅ |
| 3 | `electron/store.ts` | JSON file I/O for settings + stats | ✅ |
| 4 | `electron/main.ts` | Window creation + IPC handlers + app lifecycle | ✅ |
| 5 | `electron/preload.ts` | contextBridge API (`window.ergoremind`) | ✅ |
| 6 | `electron/tray.ts` | System tray icon + context menu | ✅ |
| 7 | `electron/notifications.ts` | Native notification wrapper | ✅ |
| 8 | `electron/timers.ts` | Stand-up + eye-rule wellness timers | ✅ |
| 9 | `src/utils/postureUtils.ts`, `src/utils/landmarkUtils.ts` | Posture scoring + landmark constants | ✅ |
| 10 | `src/workers/poseWorker.ts` | Web Worker for MediaPipe inference | ✅ |
| 11 | `src/hooks/usePoseDetection.ts` | Webcam + worker management hook | ✅ |
| 12 | `src/hooks/usePostureAnalysis.ts` | Posture scoring + alert state machine hook | ✅ |
| 13 | `src/hooks/usePostureSession.ts` | Session tracking + stats persistence hook | ✅ |
| 14 | `src/hooks/useSettings.ts` | Settings load/save hook | ✅ |
| 15 | `src/components/VideoFeed.tsx` | Live webcam feed + skeleton overlay | ✅ |
| 16 | `src/components/PostureStatus.tsx` | Score display + status label + session stats | ✅ |
| 17 | `src/components/CameraSelector.tsx` | Camera dropdown selector | ✅ |
| 18 | `src/components/StatsPanel.tsx` | Daily stats + progress bar | ✅ |
| 19 | `src/components/SettingsPanel.tsx` | Settings UI (sliders, toggles, calibrate) | ✅ |
| 20 | `src/App.tsx` | Root app shell + state orchestration | ✅ |
| 21 | `src/main.tsx` | React entry point | ✅ |

---

## Phase 2: Focus Guard Feature (Steps 22–35)

New feature: active window monitoring + distraction detection + overlay nudge.

| Step | File(s) | Description | Status |
|------|---------|-------------|--------|
| 22 | `src/types/index.ts` | Add Focus Guard types (`FocusGuardSettings`, `FocusEvent`, `FocusStats`, `FocusGuardState`) | 🔲 |
| 23 | `electron/store.ts` | Extend store with Focus Guard settings + focus event persistence | 🔲 |
| 24 | `electron/focusMonitor.ts` | AppleScript-based active window detection (frontmost app + window title) | 🔲 |
| 25 | `electron/overlay.ts` | Overlay BrowserWindow manager (create, show, hide, destroy) | 🔲 |
| 26 | `electron/main.ts` | Register Focus Guard IPC handlers (`ergoremind:focus-*` channels) | 🔲 |
| 27 | `electron/preload.ts` | Expose Focus Guard API methods via contextBridge | 🔲 |
| 28 | `electron/tray.ts` | Add Focus Guard toggle + status to tray context menu | 🔲 |
| 29 | `overlay.html` + `src/overlay/OverlayApp.tsx` | Distraction overlay UI (separate entry point) | 🔲 |
| 30 | `src/components/FocusSettings.tsx` | Blocklist management, category presets, sensitivity controls | 🔲 |
| 31 | `src/components/FocusStats.tsx` | Focus percentage, top distractors list, distraction count | 🔲 |
| 32 | `src/hooks/useFocusGuard.ts` | Focus Guard state management hook | 🔲 |
| 33 | `src/App.tsx` | Integrate Focus Guard tab, settings, and stats into app shell | 🔲 |
| 34 | `context/*.md` | Update documentation for Focus Guard architecture | 🔲 |
| 35 | — | End-to-end testing + polish (edge cases, performance, UX) | 🔲 |

---

## Phase 2 Details

### Step 22 — Types Extension

New types to add to `src/types/index.ts`:

```typescript
export interface FocusGuardSettings {
  enabled: boolean;
  blocklist: string[];            // App bundle IDs or names
  categoryPresets: string[];      // e.g., 'social', 'entertainment', 'news'
  sensitivity: number;            // seconds before triggering (default 15)
  overlayDuration: number;        // seconds overlay stays visible (default 8)
  cooldown: number;               // seconds between overlays (default 120)
}

export interface FocusEvent {
  app: string;
  windowTitle: string;
  timestamp: number;
  durationMs: number;
  wasDistraction: boolean;
}

export interface FocusStats {
  date: string;
  totalFocusMs: number;
  totalDistractionMs: number;
  distractionCount: number;
  topDistractors: { app: string; count: number; totalMs: number }[];
  events: FocusEvent[];
}
```

### Step 24 — Focus Monitor

- Uses `child_process.execFile('osascript', [...])` to get frontmost app
- AppleScript query: `tell application "System Events" to get {name, title} of first process whose frontmost is true`
- Polling interval: configurable (default 3 seconds)
- Compares against blocklist → triggers overlay after sustained distraction
- No native Node modules required

### Step 25 — Overlay Manager

- Creates a frameless, transparent, always-on-top BrowserWindow
- Loads separate `overlay.html` entry point
- Positioned centered on screen
- Auto-dismisses after `overlayDuration` seconds
- Respects cooldown period between shows

### Step 29 — Overlay UI

- Separate Vite entry point (not part of main React app)
- Minimal React app: single component
- Semi-transparent dark background with centered card
- Amber accent color for Focus Guard branding
- "Back to Work" dismiss button
- CSS fade-in animation

---

## Completion Summary

| Phase | Steps | Complete | Remaining |
|-------|-------|----------|-----------|
| Phase 1: Posture Detection | 1–21 | 21/21 (100%) | 0 |
| Phase 2: Focus Guard | 22–35 | 0/14 (0%) | 14 |
| **Total** | **1–35** | **21/35 (60%)** | **14** |

---

## Next Action

Start with **Step 22** (types extension) — all Focus Guard work depends on having the
type definitions in place first. Then proceed sequentially through Steps 23–35.
