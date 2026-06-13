# ergoSmart — Product Requirements Document (PRD)

## 1. Overview

**Product Name:** ergoSmart  
**Type:** Electron desktop app (local, no distribution/packaging needed)  
**Target Platforms:** macOS + Windows (same codebase, `npm run dev`)  
**Primary User:** The developer themselves — a software engineer working long hours at a desk  
**Core Purpose:** Real-time AI posture coaching + wellness reminders using webcam, plus active window distraction monitoring (see [PRD-focus-guard.md](file:///Users/sahilahmed/cse/projects/electron-app/PRD-focus-guard.md)).

---

## 2. Problem Statement

Software engineers sit for 8–12 hours daily. This causes:
- Chronic back/neck pain from slouching
- Eye strain from uninterrupted screen staring
- Cardiovascular risk from prolonged sitting without movement

Existing solutions are either too basic (face Y-position hacks), browser-only, or require heavy Python runtimes.

---

## 3. Goals

- ✅ Detect bad posture in real-time using webcam + MediaPipe Pose
- ✅ Alert user when slouching persists beyond a configurable threshold
- ✅ Remind user every 30 minutes to stand, stretch, and walk
- ✅ Remind user every 20 minutes to look 20 feet away for 20 seconds (20-20-20 rule)
- ✅ Run silently in system tray — stay out of the way
- ✅ Track daily posture stats (good vs bad posture time)
- ✅ Work offline, cross-platform, lightweight
- ✅ Run via `npm run dev` — no installer, no packaging

---

## 4. Non-Goals

- ❌ No cloud sync, no backend, no accounts
- ❌ No distribution (.dmg / .exe packaging)
- ❌ No mobile support
- ❌ No AI chat or LLM features
- ❌ No sharing or social features

---

## 5. User Stories

### Posture Monitoring
- As a user, I want the app to watch my posture via webcam so I get alerted when I slouch
- As a user, I want to calibrate my "good posture" baseline so the app knows my correct position
- As a user, I want alerts only after I've been in bad posture for X seconds (configurable) so I'm not spammed
- As a user, I want to see a live skeleton overlay on my webcam feed so I can verify detection is working

### Wellness Reminders
- As a user, I want a reminder every 30 minutes to stand up and walk so I avoid sitting too long
- As a user, I want a 20-20-20 eye reminder so I reduce eye strain
- As a user, I want reminders to be dismissible OS notifications so they're not intrusive

### System Tray
- As a user, I want to minimize the app to the system tray so it runs in the background silently
- As a user, I want tray icon to change color (green/red) to show my current posture status at a glance
- As a user, I want to quit, pause, or open the app from the tray menu

### Stats
- As a user, I want to see today's good vs bad posture percentage so I can track improvement
- As a user, I want session duration (how long I've been sitting) so I know when to take a break

### Settings
- As a user, I want to configure slouch sensitivity, alert delay, and reminder intervals
- As a user, I want to choose which camera to use if I have multiple

---

## 6. Feature Specification

### 6.1 Posture Detection Engine

**Technology:** `@mediapipe/tasks-vision` (WASM, offline)  
**Model:** `pose_landmarker_lite.task` (fastest, ~5MB)  
**Processing rate:** Every 3rd frame at 15fps input = ~5fps effective analysis  
**Thread:** Web Worker — never blocks UI thread

**Key Landmarks Used:**
```
Nose        → index 0
Left Ear    → index 7
Right Ear   → index 8
Left Shoulder  → index 11
Right Shoulder → index 12
Left Hip    → index 23
Right Hip   → index 24
```

**Posture Signals:**
| Signal | Landmarks | Bad Posture Condition |
|--------|-----------|----------------------|
| Head forward | ear Y vs shoulder Y | ear Y > shoulder Y + threshold |
| Slouch depth | nose Y vs shoulder avg Y | nose dropped > threshold degrees |
| Lateral tilt | shoulder L Y vs shoulder R Y | diff > threshold |

**Scoring:** Each frame gets a 0–100 posture score. Score < 60 = bad posture.

### 6.2 Alert System

- Bad posture persists for `alertDelay` seconds (default: 10s) → trigger alert
- Alert = OS native notification + optional sound
- Alert cooldown: don't re-alert for `alertCooldown` seconds (default: 60s) after dismissal
- Tray icon turns red when bad posture detected

### 6.3 Wellness Timers

| Timer | Default Interval | Notification Text |
|-------|-----------------|-------------------|
| Stand Up | 30 min | "Time to stand up! Walk for 2 minutes 🚶" |
| 20-20-20 | 20 min | "Look 20 feet away for 20 seconds 👀" |

Timers run in **Electron main process** — survive window close.

### 6.4 Session Tracking

- Session starts when monitoring begins
- Tracks: total session time, time in good posture, time in bad posture
- Stored in JSON file at: `userData/ergosmart-stats.json`
- Resets daily at midnight

### 6.5 System Tray

- Tray icon: green = good posture, red = bad posture, grey = paused
- Right-click menu:
  - Open ergoSmart
  - Pause Monitoring
  - Today's Stats
  - Quit

### 6.6 Settings

Stored in `userData/ergosmart-settings.json`:
```json
{
  "slouchThreshold": 15,
  "alertDelay": 10,
  "alertCooldown": 60,
  "standUpInterval": 30,
  "eyeRuleInterval": 20,
  "soundEnabled": true,
  "selectedCamera": "default",
  "startMinimized": false
}
```

---

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 28+ |
| UI framework | React 18 + TypeScript |
| Build tool | Vite + `vite-plugin-electron` |
| Pose detection | `@mediapipe/tasks-vision` (WASM) |
| Styling | Tailwind CSS |
| Storage | JSON files via Electron `app.getPath('userData')` |
| IPC | Electron contextBridge (secure) |
| Notifications | Electron `Notification` API (native OS) |
| System tray | Electron `Tray` + `Menu` API |
| State management | React `useReducer` + Context |

---

## 8. Performance Requirements

- CPU usage: < 15% when monitoring at 5fps
- CPU usage: < 2% when minimized to tray (no active window)
- RAM: < 200MB total
- Startup time: < 3 seconds
- No internet required after initial `npm install`

---

## 9. File Structure

```
ergosmart/
├── electron/
│   ├── main.ts              ← App entry, window management
│   ├── preload.ts           ← Secure IPC bridge
│   ├── tray.ts              ← Tray icon + menu
│   ├── notifications.ts     ← OS notification helpers
│   ├── timers.ts            ← Stand-up + eye rule timers
│   └── store.ts             ← JSON file read/write
├── src/
│   ├── main.tsx             ← React entry
│   ├── App.tsx              ← Root component + routing
│   ├── hooks/
│   │   ├── usePoseDetection.ts   ← MediaPipe WASM hook
│   │   ├── usePostureAnalysis.ts ← Landmark → posture score
│   │   ├── usePostureSession.ts  ← Session timing + stats
│   │   └── useSettings.ts        ← Settings read/write via IPC
│   ├── components/
│   │   ├── VideoFeed.tsx         ← Webcam + canvas skeleton overlay
│   │   ├── PostureStatus.tsx     ← Score display + good/bad indicator
│   │   ├── StatsPanel.tsx        ← Today's posture pie chart
│   │   ├── SettingsPanel.tsx     ← Configure thresholds + intervals
│   │   └── CameraSelector.tsx    ← Dropdown for multiple cameras
│   ├── workers/
│   │   └── poseWorker.ts         ← Web Worker for ML inference
│   ├── types/
│   │   └── index.ts              ← All shared TypeScript types
│   └── utils/
│       ├── postureUtils.ts       ← Angle calculation functions
│       └── landmarkUtils.ts      ← MediaPipe landmark helpers
├── public/
│   └── models/
│       └── pose_landmarker_lite.task  ← YOU DOWNLOAD THIS (see SETUP.md)
├── assets/
│   └── sounds/
│       └── alert.wav             ← Alert sound file
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── electron-builder.yml          ← Not used for dev, kept for future
└── .env.example
```

---

## 10. Screens / Views

1. **Main View** — Video feed with skeleton overlay, posture score, session timer
2. **Stats View** — Today's good/bad posture breakdown
3. **Settings View** — All configurable options
4. **Calibration Modal** — Overlay prompting user to sit straight and confirm

---

## 11. Launch Checklist (Pre-dev)

- [ ] Node.js 18+ installed on Mac
- [ ] Node.js 18+ installed on Windows
- [ ] Downloaded `pose_landmarker_lite.task` into `public/models/`
- [ ] Camera permission allowed in OS settings
- [ ] Run `npm install` successfully
- [ ] Run `npm run dev` — Electron window opens
