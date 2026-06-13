# ergoRemind — Project Overview

> **Note:** The AGENTS.md spec references the name "ergoSmart", but the actual codebase,
> package name, IPC channels, and UI all use **ergoRemind**.

---

## What is ergoRemind?

ergoRemind is a **desktop posture-tracking and focus-guard application** that runs locally on macOS. It uses the webcam and on-device ML (MediaPipe Pose WASM) to detect slouching in real-time, sends OS-native notifications when bad posture is sustained, and provides periodic wellness reminders (stand-up every 30 min, 20-20-20 eye rule every 20 min). The upcoming **Focus Guard** feature will detect distraction by monitoring the active window and overlaying a gentle nudge when the user drifts to a blocklisted app.

---

## Purpose

| Goal | How |
|------|-----|
| Detect slouching | Webcam → MediaPipe Pose landmarks → posture scoring algorithm |
| Alert bad posture | OS-native notifications after sustained poor posture |
| Stand-up reminders | Timer fires every N minutes (configurable, default 30 min) |
| 20-20-20 eye rule | Timer fires every N minutes (configurable, default 20 min) |
| Track daily stats | Session data persisted to local JSON files |
| Run silently | System tray mode; minimize-to-tray on close |
| Focus Guard *(planned)* | AppleScript active-window detection + overlay nudge |

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop framework | Electron | 28+ |
| UI library | React | 18.2.0 |
| Language | TypeScript | 5.4.5 (strict mode) |
| Build tooling | Vite + vite-plugin-electron | 5.2.8 / 0.28.6 |
| Pose detection | @mediapipe/tasks-vision (WASM) | 0.10.14 |
| Styling | Tailwind CSS | 3.4.3 |
| Data storage | JSON files (app.getPath('userData')) | — |
| Window detection *(planned)* | AppleScript via child_process | — |

---

## Current Status

| Milestone | Status |
|-----------|--------|
| Posture detection system (Steps 1–21) | ✅ Complete |
| Focus Guard feature (Steps 22–35) | 📋 Planning |

The posture detection pipeline is fully built and operational: webcam capture → Web Worker → MediaPipe pose inference → landmark extraction → posture scoring → alert state machine → native notifications. All 21 original build steps from AGENTS.md are implemented.

---

## Architecture

```
┌────────────────────────────────────────┐
│            Electron Main Process       │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ tray.ts  │ │timers.ts │ │store.ts│ │
│  └──────────┘ └──────────┘ └────────┘ │
│  ┌───────────────┐ ┌────────────────┐  │
│  │notifications.ts│ │focusMonitor.ts*│  │
│  └───────────────┘ └────────────────┘  │
│           ▲ IPC (contextBridge) ▼      │
├────────────────────────────────────────┤
│          Renderer (React + Vite)       │
│  ┌──────────────┐  ┌────────────────┐  │
│  │  Components   │  │    Hooks       │  │
│  │  VideoFeed    │  │ usePoseDetect  │  │
│  │  PostureStatus│  │ usePostureAnal │  │
│  │  StatsPanel   │  │ usePostureSess │  │
│  │  SettingsPanel│  │ useSettings    │  │
│  │  CameraSelect │  │ useFocusGuard* │  │
│  └──────────────┘  └────────────────┘  │
│           ▲ postMessage ▼              │
│  ┌──────────────────────────┐          │
│  │  Web Worker (poseWorker) │          │
│  │  MediaPipe WASM runtime  │          │
│  └──────────────────────────┘          │
└────────────────────────────────────────┘
* = planned (Focus Guard)
```

### Process Responsibilities

| Process | Responsibilities |
|---------|-----------------|
| **Main** | System tray, native notifications, wellness timers, JSON file I/O, app lifecycle, power monitor, Focus Guard monitor* |
| **Renderer** | React UI, webcam stream, MediaPipe inference (via worker), canvas skeleton overlay, posture scoring, settings/stats display |
| **Web Worker** | MediaPipe PoseLandmarker initialization + per-frame inference (off main thread) |

### IPC Bridge

All communication between main ↔ renderer uses `contextBridge` in `preload.ts`. The global API is exposed as `window.ergoremind`. All IPC channels use the `ergoremind:` prefix.

---

## Target Platform

- **macOS** only (development mode via `npm run dev`)
- No packaging, no installer, no cloud deployment
- Camera access via `getUserMedia` with macOS entitlements

---

## Key Constraints

| Constraint | Reason |
|-----------|--------|
| No cloud / no remote services | Privacy-first; all processing is local |
| No database (SQLite, etc.) | JSON file storage keeps deps minimal |
| No `nodeIntegration: true` | Security; renderer must not access Node APIs directly |
| No `remote` module | Deprecated; security risk |
| No CDN for WASM | MediaPipe WASM files copied to `public/` for offline use |
| No `electron-rebuild` | Keep native dependencies at zero |
| CPU delegate only | GPU not reliable in Electron for MediaPipe |
| Local dev only | `npm run dev` — no production builds required |
