# AGENTS.md — ergoSmart AI Agent Instructions

> This file tells AI coding agents (Codex, Cursor, Copilot) exactly how to
> build this project. Read this entire file before writing any code.

---

## 🎯 What You Are Building

An **Electron desktop app** called **ergoSmart** that:
1. Uses the webcam + MediaPipe Pose WASM to detect slouching in real-time
2. Sends OS native notifications when bad posture is detected
3. Sends reminders every 30 min to stand up and every 20 min for 20-20-20 eye rule
4. Runs silently in the system tray
5. Tracks daily posture stats in a local JSON file

**This runs locally only via `npm run dev`. No packaging. No installer. No cloud.**

---

## 🏗️ Tech Stack — Do Not Deviate

```
Electron 28+
React 18 + TypeScript (strict)
Vite + vite-plugin-electron
@mediapipe/tasks-vision (WASM pose detection)
Tailwind CSS
JSON file storage (no SQLite, no database)
Electron contextBridge for IPC (never use remote module)
```

---

## 📁 Directory Structure — Follow Exactly

```
ergosmart/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── tray.ts
│   ├── notifications.ts
│   ├── timers.ts
│   └── store.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── hooks/
│   │   ├── usePoseDetection.ts
│   │   ├── usePostureAnalysis.ts
│   │   ├── usePostureSession.ts
│   │   └── useSettings.ts
│   ├── components/
│   │   ├── VideoFeed.tsx
│   │   ├── PostureStatus.tsx
│   │   ├── StatsPanel.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── CameraSelector.tsx
│   ├── workers/
│   │   └── poseWorker.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── postureUtils.ts
│       └── landmarkUtils.ts
├── public/
│   └── models/        ← .task file goes here (not committed to git)
├── assets/
│   └── sounds/
│       └── alert.wav
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

---

## 🔒 Coding Rules — Non-Negotiable

### Architecture
- **Electron main process** handles: tray, notifications, timers, file I/O, app lifecycle
- **Renderer process (React)** handles: UI, webcam, MediaPipe, canvas drawing
- **IPC** is the ONLY bridge between them — use `contextBridge` in preload.ts
- **Never** use `require('electron')` in renderer — only via preload exposed APIs
- **Never** use `nodeIntegration: true` — security risk
- **Web Worker** (`poseWorker.ts`) handles MediaPipe inference — never on main React thread

### TypeScript
- `strict: true` in tsconfig — no `any` types
- All props must have explicit interfaces
- All hook return types must be explicitly typed
- Use `type` not `interface` for unions/primitives, `interface` for objects

### React
- Functional components only — no class components
- All side effects in `useEffect` with proper cleanup
- Custom hooks for all logic — components are only for rendering
- `useCallback` / `useMemo` on all functions passed as props
- Cleanup webcam stream and MediaPipe on unmount — memory leaks are bugs

### Performance
- Process pose every 3rd frame only (use a frame counter ref)
- Use `requestAnimationFrame` for canvas drawing loop
- Tray mode: suspend pose processing entirely when window is hidden
- All MediaPipe work in Web Worker thread

### Error Handling
- Camera access can fail — always handle `getUserMedia` rejection gracefully
- MediaPipe model load can fail — show clear error state in UI
- File I/O (stats/settings JSON) must have try/catch with fallback defaults
- Never crash the app — all async operations wrapped in try/catch

### Comments
- Every function must have a JSDoc comment explaining what it does
- Complex math (angle calculations) must have inline comments explaining the formula
- Every IPC channel must have a comment explaining direction: main→renderer or renderer→main

---

## 🧠 MediaPipe Implementation Details

### Installation
```bash
npm install @mediapipe/tasks-vision
```

### Model File
The model file `pose_landmarker_lite.task` must be placed at:
`public/models/pose_landmarker_lite.task`

**This file is NOT in the repo. See SETUP.md for download instructions.**

### Initialization Pattern
```typescript
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const filesetResolver = await FilesetResolver.forVisionTasks(
  // Point to the WASM files — use the npm package path
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
  // OR copy WASM files to public/ for fully offline use
);

const poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
  baseOptions: {
    modelAssetPath: '/models/pose_landmarker_lite.task',
    delegate: 'CPU', // Use CPU — GPU not reliable in Electron
  },
  runningMode: 'VIDEO',
  numPoses: 1,
});
```

### Landmark Indices (Critical — Do Not Change)
```typescript
export const LANDMARKS = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;
```

### Posture Scoring Algorithm
```typescript
// Calculate angle between 3 points (in degrees)
function calculateAngle(a: Point, b: Point, c: Point): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) 
                - Math.atan2(a.y - b.y, a.x - b.x);
  return Math.abs(radians * (180 / Math.PI));
}

// Head forward posture: ear should be roughly above shoulder
// If ear Y is significantly greater than shoulder Y → head forward
const headForwardScore = earY - shoulderY; // positive = head forward

// Slouch: nose drops relative to shoulder average
const shoulderAvgY = (leftShoulderY + rightShoulderY) / 2;
const slouchScore = noseY - shoulderAvgY; // increases as you slouch

// Lateral tilt: shoulders should be level
const tiltScore = Math.abs(leftShoulderY - rightShoulderY);

// Combine into 0–100 score (100 = perfect posture)
// These weights are tuned — do not change without testing
const rawScore = (headForwardScore * 0.4) + (slouchScore * 0.4) + (tiltScore * 0.2);
const postureScore = Math.max(0, Math.min(100, 100 - (rawScore * 100)));
```

---

## ⚡ IPC Channels — Complete Reference

### renderer → main (invoke)
```typescript
'ergosmart:get-settings'        // Returns AppSettings
'ergosmart:save-settings'       // Accepts Partial<AppSettings>
'ergosmart:get-stats'           // Returns DailyStats
'ergosmart:save-stats'          // Accepts DailyStats
'ergosmart:send-notification'   // Accepts NotificationPayload
'ergosmart:start-timers'        // Starts wellness timers in main process
'ergosmart:stop-timers'         // Stops all timers
```

### main → renderer (on)
```typescript
'ergosmart:standup-reminder'    // Emitted by main timer
'ergosmart:eye-reminder'        // Emitted by main timer
'ergosmart:pause-monitoring'    // Emitted by tray menu
'ergosmart:resume-monitoring'   // Emitted by tray menu
```

---

## 🗂️ TypeScript Types Reference

### Core Types (define in `src/types/index.ts`)
```typescript
export interface PostureLandmark {
  x: number;      // 0–1 normalized
  y: number;      // 0–1 normalized
  z: number;      // depth
  visibility: number; // 0–1 confidence
}

export interface PostureFrame {
  score: number;            // 0–100
  isGood: boolean;          // score >= 60
  headForward: number;      // raw deviation
  slouch: number;           // raw deviation
  tilt: number;             // raw deviation
  timestamp: number;        // Date.now()
}

export interface PostureSession {
  startTime: number;
  totalFrames: number;
  goodFrames: number;
  badFrames: number;
  goodPercent: number;      // computed
  durationMs: number;       // computed
}

export interface AppSettings {
  slouchThreshold: number;      // default: 15
  alertDelay: number;           // seconds, default: 10
  alertCooldown: number;        // seconds, default: 60
  standUpInterval: number;      // minutes, default: 30
  eyeRuleInterval: number;      // minutes, default: 20
  soundEnabled: boolean;        // default: true
  selectedCamera: string;       // deviceId or 'default'
  startMinimized: boolean;      // default: false
}

export interface DailyStats {
  date: string;                 // YYYY-MM-DD
  sessions: PostureSession[];
  totalGoodMs: number;
  totalBadMs: number;
}

export interface NotificationPayload {
  title: string;
  body: string;
  type: 'posture' | 'standup' | 'eye';
}
```

---

## 🖥️ Electron Main Process Rules

### Window Creation
```typescript
const win = new BrowserWindow({
  width: 900,
  height: 680,
  minWidth: 800,
  minHeight: 600,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,      // REQUIRED
    nodeIntegration: false,      // REQUIRED — security
    webSecurity: true,
  },
  titleBarStyle: 'hiddenInset', // Mac native feel
  show: false,                   // Show after ready-to-show
});

// Show window only when ready — prevents white flash
win.once('ready-to-show', () => {
  if (!settings.startMinimized) win.show();
});

// Minimize to tray instead of closing
win.on('close', (e) => {
  e.preventDefault();
  win.hide();
});
```

### Tray Setup
```typescript
// tray.ts
// Tray icon must be 16x16 (Windows) / 22x22 (Mac) PNG
// Keep two versions: tray-green.png, tray-red.png, tray-grey.png
// Store in assets/tray/

export function updateTrayIcon(status: 'good' | 'bad' | 'paused') {
  const iconName = `tray-${status}.png`;
  tray.setImage(path.join(__dirname, '../assets/tray', iconName));
}
```

---

## 🎨 UI/UX Rules

- Dark theme only — easier on eyes for a posture app
- Main colors: `#0f172a` bg, `#22c55e` good, `#ef4444` bad, `#64748b` neutral
- Video feed: show skeleton overlay always when monitoring
- Posture score: large number prominently displayed, color coded
- Session timer: HH:MM:SS format
- Stats: simple percentage bar or donut — no complex charts
- Settings: sliders for thresholds, toggles for booleans
- All interactive elements must have focus rings (accessibility)
- Font: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI'`)

---

## 🔨 Build Order — Follow This Sequence

**Do not skip steps or build out of order.**

```
Step 1: package.json + vite.config.ts + tsconfig.json
Step 2: src/types/index.ts  ← all types first
Step 3: electron/store.ts   ← file I/O utilities
Step 4: electron/main.ts    ← window + IPC handlers
Step 5: electron/preload.ts ← contextBridge API
Step 6: electron/tray.ts    ← tray icon + menu
Step 7: electron/notifications.ts
Step 8: electron/timers.ts  ← wellness timers
Step 9: src/utils/postureUtils.ts + landmarkUtils.ts
Step 10: src/workers/poseWorker.ts
Step 11: src/hooks/usePoseDetection.ts
Step 12: src/hooks/usePostureAnalysis.ts
Step 13: src/hooks/usePostureSession.ts
Step 14: src/hooks/useSettings.ts
Step 15: src/components/VideoFeed.tsx
Step 16: src/components/PostureStatus.tsx
Step 17: src/components/CameraSelector.tsx
Step 18: src/components/StatsPanel.tsx
Step 19: src/components/SettingsPanel.tsx
Step 20: src/App.tsx
Step 21: src/main.tsx
```

---

## ✅ Definition of Done (Per File)

A file is complete when:
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] No `any` types used
- [ ] All functions have JSDoc comments
- [ ] All error cases are handled (try/catch where async)
- [ ] All useEffect hooks have cleanup functions
- [ ] File does exactly ONE thing (single responsibility)

---

## ⛔ Things You Must Never Do

- Never use `nodeIntegration: true`
- Never use `remote` module (deprecated)
- Never import electron APIs directly in renderer — use preload IPC only
- Never block the main thread with synchronous file reads (use async)
- Never run MediaPipe on the React render thread — use Web Worker
- Never hardcode file paths — use `app.getPath('userData')`
- Never use `alert()` or `console.log` in production paths — use proper error states
- Never load the MediaPipe WASM from CDN — copy to public/ for offline use
- Never commit the `pose_landmarker_lite.task` file — it's 5MB binary, add to .gitignore
- Never use `electron-rebuild` unless specifically needed — keep deps minimal
