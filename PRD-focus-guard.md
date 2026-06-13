# Focus Guard — Product Requirements Document (PRD)

**Parent Product:** ergoRemind  
**Module Name:** Focus Guard  
**Type:** Distraction detection module (Electron main process + overlay window)  
**Target Platform:** macOS only (V1)  
**Author:** ergoRemind team  
**Status:** Draft  
**Created:** 2026-06-13

---

## 1. Overview

**Focus Guard** is a distraction detection module for the ergoRemind desktop app. It passively monitors which application or website is in the foreground and alerts the user when they spend too long on distracting apps.

**Key characteristics:**
- Uses macOS **AppleScript** to read the active window title — zero native dependencies
- Shows a **center-screen overlay notification** when distraction is detected
- User configures a **blocklist** of distracting apps/sites via presets or manual entry
- Integrates with existing posture stats, tray icon, and settings panels
- All data stays **local** — no cloud, no tracking

---

## 2. Problem Statement

Knowledge workers lose **2+ hours per day** to distracting apps and websites. Context switching alone costs ~23 minutes to regain deep focus.

Current solutions fall short:
- Standalone focus apps require yet another tool — ergoRemind already monitors posture, so adding focus creates a **holistic wellness tool**
- Blocking apps feel punitive and are easy to circumvent — users want **passive accountability**, not enforcement
- Most focus tools phone home — privacy-conscious devs want local-only tracking

ergoRemind is already running, already watching the user's habits. Focus Guard is a natural extension.

---

## 3. Goals

- ✅ Detect when user is on a blocked app/site via **window title substring matching**
- ✅ Alert with a non-blocking **overlay notification** after a configurable delay
- ✅ Track distraction time and show stats alongside posture stats
- ✅ Zero friction setup — ship with **preset categories** (Social, Entertainment, Chat, Gaming)
- ✅ All data stays **local** — JSON file storage, no network calls
- ✅ Work even when the main window is **minimized to tray**
- ✅ Toggle Focus Guard **independently** of posture monitoring

---

## 4. Non-Goals

- ❌ No screen recording or pixel capture
- ❌ No browser extension required
- ❌ No URL tracking (privacy — only app names stored, never URLs or window titles)
- ❌ No app blocking or force-closing
- ❌ No cloud sync, no accounts
- ❌ No Windows/Linux support in V1
- ❌ No Pomodoro timer or focus sessions
- ❌ No AI-powered distraction detection
- ❌ No keystroke or mouse activity tracking

---

## 5. User Stories

### Blocklist Management
- As a user, I want to **add distracting sites** to my blocklist so I get alerted when I visit them
- As a user, I want to **quickly add common distractors** via category presets (Entertainment, Social, Chat, Gaming) so I don't have to type them all manually
- As a user, I want to **remove items** from my blocklist when they're no longer distracting

### Distraction Alerts
- As a user, I want a **prominent overlay notification** when I've been on a distraction too long so I'm nudged back to work
- As a user, I want the overlay to **auto-dismiss** when I switch back to a productive app so it doesn't stay in the way
- As a user, I want to **control how quickly** I get alerted (configurable delay) so short glances don't trigger alerts
- As a user, I want a **cooldown period** between alerts so I'm not spammed repeatedly

### Stats & Tracking
- As a user, I want to **see my focus percentage** alongside posture stats so I get a holistic view of my work habits
- As a user, I want to see a **breakdown of distraction time by app** so I know where my time goes

### System Integration
- As a user, I want Focus Guard to work even when the main window is **minimized to tray**
- As a user, I want to **toggle Focus Guard independently** of posture monitoring
- As a user, I want the **tray icon to reflect** my focus status (amber when distracted)

---

## 6. Feature Specification

### 6.1 Active Window Monitoring

**Technology:** macOS AppleScript via `child_process.execFile`  
**Thread:** Electron main process  
**Poll rate:** Every 5 seconds (configurable: 3–15s)

**AppleScript command:**
```applescript
tell application "System Events"
    set frontApp to name of first application process whose frontmost is true
    set frontWindow to name of front window of first application process whose frontmost is true
end tell
return frontApp & " | " & frontWindow
```

**Requirements:**
- macOS **Accessibility permission** required (System Preferences → Privacy & Security → Accessibility)
- Handle permission denial gracefully — show clear instruction to the user
- Handle cases where no window is open (e.g., Desktop focused)
- Never store raw window titles — only matched app names for stats

### 6.2 Blocklist Management

**Matching strategy:** Case-insensitive substring match against **both** app name AND window title.

**Category presets:**

| Category | Keywords |
|----------|----------|
| Entertainment | `YouTube`, `Netflix`, `Twitch`, `Disney+`, `Hulu`, `Prime Video` |
| Social Media | `Twitter`, `X.com`, `Reddit`, `Instagram`, `Facebook`, `TikTok`, `Snapchat` |
| Chat | `Discord`, `Telegram`, `WhatsApp` |
| Gaming | `Steam`, `Epic Games`, `Battle.net` |

**Storage:** `blocklist: string[]` in existing `AppSettings` JSON file.

**Behavior:**
- User can add/remove individual keywords
- User can toggle entire preset categories on/off
- Duplicate keywords silently ignored
- Empty blocklist = Focus Guard monitors but never alerts

### 6.3 Focus Guard State Machine

```
                ┌─────────────┐
                │  DISABLED    │
                └──────┬──────┘
                       │ user enables
                       ▼
                ┌─────────────┐
         ┌──────│ MONITORING  │◄──────────────────────┐
         │      └──────┬──────┘                        │
         │             │ blocked app detected           │
         │             ▼                                │
         │      ┌─────────────┐                        │
         │      │ DISTRACTED  │── user switches ───────┘
         │      └──────┬──────┘   to productive app
         │             │ distractionAlertDelay elapsed
         │             ▼
         │      ┌─────────────┐
         │      │  ALERTING   │── user switches ───────┐
         │      └──────┬──────┘   to productive app    │
         │             │ overlay dismissed (5s)         │
         │             ▼                                │
         │      ┌─────────────┐                        │
         │      │  COOLDOWN   │── user switches ───────┘
         │      └──────┬──────┘   to productive app
         │             │ distractionCooldown elapsed
         │             │
         └─────────────┘ (back to MONITORING)
```

**State descriptions:**

| State | Description | Duration |
|-------|-------------|----------|
| DISABLED | Focus Guard off — no polling | Until user enables |
| MONITORING | Polling active window, no distraction detected | Continuous |
| DISTRACTED | Blocked app detected, counting down before alert | `distractionAlertDelay` (default 10s) |
| ALERTING | Overlay notification visible | 5 seconds or until user switches app |
| COOLDOWN | Waiting before re-alerting if still distracted | `distractionCooldown` (default 60s) |

**Transitions:**
- Any state → MONITORING: user switches to a productive (non-blocked) app
- DISABLED ↔ MONITORING: user toggles Focus Guard in settings or tray

### 6.4 Overlay Notification

**Implementation:** Separate transparent `BrowserWindow` — NOT the main app window.

**Window properties:**
```typescript
const overlay = new BrowserWindow({
  width: 400,
  height: 200,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  focusable: false,         // Does NOT steal focus
  hasShadow: false,
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
  },
});

// macOS: screen-saver level to show over fullscreen apps
overlay.setAlwaysOnTop(true, 'screen-saver');
overlay.setVisibleOnAllWorkspaces(true);
```

**Visual design:**
- Centered on screen, ~400×200px, 16px rounded corners
- Semi-transparent dark background: `rgba(15, 23, 42, 0.92)`
- Content:
  - ⚠️ Warning icon (amber)
  - **"You're distracted"** — bold, 18px, white
  - App name — 14px, `#94a3b8` (slate-400)
  - Duration on distraction — 14px, `#f59e0b` (amber-500)
- Auto-dismiss after **5 seconds** (fade-out animation: 0.5s)
- Auto-dismiss **immediately** when user switches to productive app
- Respects `soundEnabled` setting for alert sound

**Lifecycle:**
- Created on first alert → kept hidden for reuse
- Destroyed when Focus Guard is disabled
- Never re-created per alert (avoids window creation cost)

### 6.5 Settings

All settings stored in existing `userData/ergosmart-settings.json`:

```json
{
  "focusGuardEnabled": false,
  "blocklist": [],
  "focusCheckInterval": 5,
  "distractionAlertDelay": 10,
  "distractionCooldown": 60
}
```

| Setting | Type | Default | Range | Description |
|---------|------|---------|-------|-------------|
| `focusGuardEnabled` | `boolean` | `false` | — | Opt-in toggle |
| `blocklist` | `string[]` | `[]` | — | Keywords to match against active window |
| `focusCheckInterval` | `number` | `5` | 3–15 sec | How often to poll active window |
| `distractionAlertDelay` | `number` | `10` | 5–60 sec | How long on distraction before alerting |
| `distractionCooldown` | `number` | `60` | 30–300 sec | Cooldown between repeat alerts |

**UI requirements:**
- New **"Focus Guard"** section in existing Settings panel
- Toggle switch for enable/disable
- Blocklist management: text input + add button, removable tags
- Preset category buttons (toggle on/off)
- Sliders for interval, delay, cooldown
- **Privacy notice** shown on first enable:
  > "Focus Guard reads the name of your active app to detect distractions. No window contents, URLs, or keystrokes are captured. All data stays on your device."

### 6.6 Stats Tracking

Stored in existing `userData/ergosmart-stats.json`, extended with focus fields:

```json
{
  "date": "2026-06-13",
  "sessions": [],
  "totalGoodMs": 0,
  "totalBadMs": 0,
  "focusStats": {
    "totalDistractionMs": 0,
    "distractionCount": 0,
    "distractionByApp": {
      "YouTube": 45000,
      "Discord": 120000
    },
    "monitoringStartTime": 1718280000000,
    "monitoringTotalMs": 0
  }
}
```

**Computed metrics:**
| Metric | Formula |
|--------|---------|
| Focus percentage | `(monitoringTotalMs - totalDistractionMs) / monitoringTotalMs × 100` |
| Top distractors | Sort `distractionByApp` by ms, top 3 |
| Distraction events | Count of state transitions into DISTRACTED |

**UI requirements:**
- New **"Focus"** section in existing Stats panel
- Focus percentage: large number, color-coded (green ≥80%, amber 50–79%, red <50%)
- Distraction time: total formatted as HH:MM
- Top distractors: bar chart or ranked list with time per app
- Distraction event count

### 6.7 Tray Integration

**New tray icon state:**

| State | Icon Color | Condition |
|-------|-----------|-----------|
| Good posture + focused | 🟢 Green | Posture good AND not distracted |
| Bad posture | 🔴 Red | Posture bad (existing) |
| Distracted | 🟠 Amber/Orange | Focus Guard detected distraction |
| Paused | ⚪ Grey | Monitoring paused (existing) |

**Priority:** Bad posture (red) takes priority over distracted (amber).

**Tray menu additions:**
```
─────────────────────────
✓ Enable Focus Guard     ← new toggle
─────────────────────────
```

**Tray tooltip:** Includes focus status when Focus Guard is enabled:
```
ergoSmart — Posture: Good | Focus: 87%
```

### 6.8 Screen Lock Integration

- **Pause** Focus Guard polling when screen is locked
  - Reuse existing `powerMonitor` events: `lock-screen`, `unlock-screen`
  - Stop `setInterval` timer on lock, restart on unlock
- **Do not** count locked time as distraction or monitoring time
- Resume state machine from MONITORING on unlock

---

## 7. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Active window detection | macOS AppleScript via `child_process.execFile` | Zero native deps |
| Overlay window | Electron `BrowserWindow` (transparent, frameless) | Reused, not recreated |
| Overlay UI | React + TypeScript | Separate entry point |
| Settings UI | React + TypeScript | Extends existing Settings panel |
| Stats UI | React + TypeScript | Extends existing Stats panel |
| Storage | JSON files via `app.getPath('userData')` | Extends existing files |
| IPC | Electron `contextBridge` (secure) | New channels added |
| State management | Electron main process state machine | `setInterval` based |

**No new npm dependencies required.**

---

## 8. IPC Channels — Focus Guard

### renderer → main (invoke)
```typescript
'ergosmart:focus-get-settings'      // Returns FocusGuardSettings
'ergosmart:focus-save-settings'     // Accepts Partial<FocusGuardSettings>
'ergosmart:focus-get-stats'         // Returns FocusStats
'ergosmart:focus-toggle'            // Enable/disable Focus Guard
'ergosmart:focus-add-blocklist'     // Accepts string — add keyword
'ergosmart:focus-remove-blocklist'  // Accepts string — remove keyword
'ergosmart:focus-add-preset'        // Accepts preset category name
'ergosmart:focus-remove-preset'     // Accepts preset category name
```

### main → renderer (on)
```typescript
'ergosmart:focus-state-change'      // Emits current FocusGuardState
'ergosmart:focus-distraction'       // Emits { appName, duration } when alerting
'ergosmart:focus-stats-update'      // Emits updated FocusStats
```

---

## 9. TypeScript Types

Add to existing `src/types/index.ts`:

```typescript
/** Focus Guard state machine states */
export type FocusGuardState = 
  | 'DISABLED' 
  | 'MONITORING' 
  | 'DISTRACTED' 
  | 'ALERTING' 
  | 'COOLDOWN';

/** Preset distraction categories */
export type DistractionCategory = 
  | 'entertainment' 
  | 'social' 
  | 'chat' 
  | 'gaming';

/** Focus Guard settings (extends AppSettings) */
export interface FocusGuardSettings {
  focusGuardEnabled: boolean;       // default: false (opt-in)
  blocklist: string[];              // default: [] (user adds via presets or manual)
  focusCheckInterval: number;       // seconds, default: 5, range: 3–15
  distractionAlertDelay: number;    // seconds, default: 10, range: 5–60
  distractionCooldown: number;      // seconds, default: 60, range: 30–300
}

/** Distraction event for stats tracking */
export interface DistractionEvent {
  appName: string;                  // matched app name (never window title)
  startTime: number;                // Date.now()
  durationMs: number;               // how long user stayed
}

/** Daily focus stats (stored alongside posture stats) */
export interface FocusStats {
  totalDistractionMs: number;       // total ms on blocked apps today
  distractionCount: number;         // number of distraction events
  distractionByApp: Record<string, number>;  // app name → total ms
  monitoringStartTime: number;      // when monitoring started today
  monitoringTotalMs: number;        // total ms Focus Guard was active
}

/** Active window info returned from AppleScript */
export interface ActiveWindowInfo {
  appName: string;                  // frontmost app name
  windowTitle: string;              // window title (used for matching only, never stored)
}

/** Overlay notification payload */
export interface FocusOverlayPayload {
  appName: string;                  // which distraction triggered
  durationSeconds: number;          // how long on distraction
}

/** Preset category definition */
export interface PresetCategory {
  id: DistractionCategory;
  label: string;
  keywords: string[];
}
```

---

## 10. Performance Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| AppleScript poll latency | < 200ms per call | Every 5s default |
| Overlay window memory | < 20MB when shown | Transparent BrowserWindow |
| CPU overhead (Focus Guard) | < 2% additional | Polling only, no video |
| Posture detection impact | Zero | Independent process, no shared resources |
| Overlay creation | One-time only | Created once, hidden/shown as needed |
| State machine transitions | < 1ms | Simple conditionals, no async |

---

## 11. Privacy & Security

| Principle | Implementation |
|-----------|---------------|
| No window titles stored | Only matched app names saved in stats |
| No URLs tracked | Matching is done in-memory, discarded after |
| No screenshots | AppleScript reads text properties only |
| No keystroke logging | Zero input monitoring |
| All data local | JSON files in `app.getPath('userData')` |
| Privacy notice | Shown on first enable, explains what's collected |
| User control | Disable anytime — stops polling immediately |
| Secure IPC | `contextIsolation: true`, no `nodeIntegration` |

---

## 12. File Structure (New Files)

```
electron/
├── focusMonitor.ts          ← Active window polling + blocklist matching logic
├── overlay.ts               ← Overlay BrowserWindow creation + show/hide/destroy
src/
├── components/
│   ├── FocusSettings.tsx    ← Focus Guard section in Settings panel
│   └── FocusStats.tsx       ← Focus stats section in Stats panel
├── hooks/
│   └── useFocusGuard.ts     ← Focus Guard renderer hook (state + IPC)
├── overlay-main.tsx         ← Overlay window React entry point
├── components/
│   └── OverlayApp.tsx       ← Overlay notification content component
overlay.html                 ← Overlay window HTML (loads overlay-main.tsx)
assets/
└── tray/
    └── tray-amber.png       ← New tray icon for distracted state (22×22)
```

**Modified existing files:**
- `electron/main.ts` — Register Focus Guard IPC handlers, init focus monitor
- `electron/preload.ts` — Expose Focus Guard IPC channels via contextBridge
- `electron/tray.ts` — Add amber icon state + Focus Guard menu toggle
- `src/types/index.ts` — Add Focus Guard types
- `src/components/SettingsPanel.tsx` — Import and render `FocusSettings`
- `src/components/StatsPanel.tsx` — Import and render `FocusStats`
- `vite.config.ts` — Add overlay entry point to multi-page build

---

## 13. Build Order

Follow this sequence — do not skip steps or build out of order:

```
Step 1:  src/types/index.ts         ← Add Focus Guard types
Step 2:  electron/focusMonitor.ts   ← AppleScript polling + matching
Step 3:  electron/overlay.ts        ← Overlay window management
Step 4:  electron/preload.ts        ← Expose new IPC channels
Step 5:  electron/main.ts           ← Register handlers, init monitor
Step 6:  electron/tray.ts           ← Add amber state + menu toggle
Step 7:  overlay.html               ← Overlay HTML shell
Step 8:  src/overlay-main.tsx       ← Overlay React entry
Step 9:  src/components/OverlayApp.tsx  ← Overlay content
Step 10: src/hooks/useFocusGuard.ts     ← Renderer hook
Step 11: src/components/FocusSettings.tsx ← Settings UI
Step 12: src/components/FocusStats.tsx    ← Stats UI
Step 13: src/components/SettingsPanel.tsx ← Integrate FocusSettings
Step 14: src/components/StatsPanel.tsx    ← Integrate FocusStats
Step 15: vite.config.ts                  ← Add overlay entry
```

---

## 14. Success Criteria

- [ ] Focus Guard **toggle** works in Settings and tray menu
- [ ] **Blocklist** add/remove/presets all function correctly
- [ ] **Overlay** appears after configurable delay on distraction
- [ ] **Overlay auto-dismisses** when user switches to productive app
- [ ] **Stats** track distraction time, count, and per-app breakdown
- [ ] **Focus percentage** shown in Stats panel alongside posture stats
- [ ] **Tray icon** turns amber when distracted
- [ ] **Privacy notice** shown on first enable
- [ ] **Screen lock** pauses/resumes monitoring correctly
- [ ] TypeScript compiles clean (`npx tsc --noEmit` — zero errors)
- [ ] All functions have **JSDoc** comments
- [ ] **Zero new native dependencies** (only `child_process` from Node stdlib)
- [ ] No impact on posture detection **frame rate**

---

## 15. Out of Scope (V2+)

- 🔮 Windows/Linux support (different active window APIs)
- 🔮 Pomodoro/focus session timer
- 🔮 Combined wellness score (posture + focus)
- 🔮 Work hours scheduling (auto-enable during 9am–5pm)
- 🔮 Custom overlay messages and themes
- 🔮 Historical stats, trends, and weekly reports
- 🔮 Browser extension for URL-level detection
- 🔮 Stats export (CSV/JSON)
- 🔮 Keyboard shortcut to toggle (Cmd+Shift+F)
- 🔮 Allowlist mode (block everything except allowed apps)
- 🔮 Notification center integration (Action buttons in notification)

---

## 16. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| macOS Accessibility permission denied | High | Feature broken | Clear setup instructions + graceful fallback UI |
| AppleScript fails for certain apps | Medium | Missed detections | Fallback to app name only if window title fails |
| Overlay not visible in fullscreen | Medium | Alert missed | Use `screen-saver` level `alwaysOnTop` + all workspaces |
| User overloaded by posture + focus alerts | Medium | Annoyance | Independent toggles, configurable delays |
| AppleScript poll affects battery | Low | User experience | 5s default interval, pause on screen lock |
| False positives (e.g., "Discord" in code editor title) | Low | Trust erosion | Match against app name first, title as secondary |

---

## 17. Open Questions

1. **Should Focus Guard be enabled by default or opt-in?**  
   Current decision: Opt-in (default `false`). Revisit after user testing.

2. **Should we show a first-run onboarding for Focus Guard?**  
   Current decision: Privacy notice only. Consider a guided setup in V2.

3. **Should overlay show a "Dismiss" button or be auto-dismiss only?**  
   Current decision: Auto-dismiss only. Adding a button would require focus stealing.

4. **Should we track "productive time" vs "distraction time" vs "idle time"?**  
   Current decision: Track distraction time only. Idle detection is V2.
