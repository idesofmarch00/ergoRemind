# SPECS.md — ergoSmart Technical Specifications

## 1. Package.json Spec

```json
{
  "name": "ergosmart",
  "version": "1.0.0",
  "description": "AI-powered posture coach for developers",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "electron:dev": "vite --mode development",
    "dev": "concurrently \"vite\" \"electron .\"",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10.14",
    "electron": "^28.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "concurrently": "^8.2.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vite-plugin-electron": "^0.28.0",
    "vite-plugin-electron-renderer": "^0.14.0"
  }
}
```

---

## 2. vite.config.ts Spec

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
          }
        }
      },
      {
        // Preload script
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
          }
        }
      }
    ]),
    renderer(),
  ],
  // Allow Web Workers
  worker: {
    format: 'es'
  }
})
```

---

## 3. tsconfig.json Spec

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable", "WebWorker"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"],
      "@electron/*": ["./electron/*"]
    }
  },
  "include": ["src", "electron"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 4. Posture Analysis — Algorithm Spec

### Input
33 MediaPipe pose landmarks, each: `{ x: number, y: number, z: number, visibility: number }`

Coordinates are normalized 0–1 (x: left→right, y: top→bottom)

### Landmark Extraction
```
Required landmarks and minimum visibility threshold: 0.5
If any required landmark has visibility < 0.5 → return null (cannot analyze)

Required: LEFT_EAR(7), RIGHT_EAR(8), LEFT_SHOULDER(11), RIGHT_SHOULDER(12)
```

### Signal 1: Head Forward Posture
```
earMidY = (landmarks[7].y + landmarks[8].y) / 2
shoulderMidY = (landmarks[11].y + landmarks[12].y) / 2

// In normalized coords, larger Y = lower on screen
// When sitting straight: ear Y ≈ shoulder Y - small offset
// When head forward: ear Y approaches shoulder Y (they get closer vertically
//   because head tips forward and ear drops)

headForwardRatio = earMidY / shoulderMidY
// Ratio close to 1.0 = head forward. Ratio < 0.85 = good (head above shoulder)
```

### Signal 2: Slouch Detection
```
noseLandmark = landmarks[0]
shoulderMidY = (landmarks[11].y + landmarks[12].y) / 2

// As user slouches, entire body drops → nose Y increases relative to baseline
// We compare against calibrated baseline, not absolute value

slouchDelta = noseLandmark.y - calibratedNoseY
// Positive = slouching (nose dropped). Negative = sitting straighter than baseline.
```

### Signal 3: Lateral Tilt
```
leftShoulderY = landmarks[11].y
rightShoulderY = landmarks[12].y

tiltDelta = Math.abs(leftShoulderY - rightShoulderY)
// > 0.05 in normalized coords = noticeable tilt
```

### Scoring
```typescript
function calculatePostureScore(
  headForwardRatio: number,
  slouchDelta: number,
  tiltDelta: number,
  settings: AppSettings
): number {
  // Convert threshold degrees to normalized coordinate equivalent
  const thresholdNorm = settings.slouchThreshold / 100;

  // Penalties (0 = no penalty, higher = worse)
  const headPenalty = Math.max(0, (headForwardRatio - 0.92) * 200);
  const slouchPenalty = Math.max(0, slouchDelta / thresholdNorm * 40);
  const tiltPenalty = Math.max(0, (tiltDelta - 0.03) * 300);

  // Weighted sum of penalties
  const totalPenalty = (headPenalty * 0.4) + (slouchPenalty * 0.4) + (tiltPenalty * 0.2);

  // Score: 100 = perfect, 0 = terrible
  return Math.max(0, Math.min(100, 100 - totalPenalty));
}
```

### Calibration
```typescript
// During calibration: user sits straight for 3 seconds
// Capture 15 frames (at 5fps), average the landmark positions
// Store as calibration baseline in settings JSON

interface CalibrationData {
  noseY: number;
  earMidY: number;
  shoulderMidY: number;
  headForwardRatio: number;
  capturedAt: number; // timestamp
}
```

---

## 5. Alert State Machine

```
States: IDLE → MONITORING → BAD_POSTURE → ALERTING → COOLDOWN → MONITORING

IDLE: app open, not started
MONITORING: pose detected, score >= 60, all good
BAD_POSTURE: score < 60, timer counting down (alertDelay seconds)
  - if score recovers → back to MONITORING (reset timer)
  - if timer expires → ALERTING
ALERTING: notification sent, sound played
  - user dismisses → COOLDOWN
COOLDOWN: don't re-alert for alertCooldown seconds
  - timer expires → MONITORING
```

---

## 6. IPC API — Full Spec

### Preload exposes `window.ergoSmart`:

```typescript
interface ErgoSmartAPI {
  // Settings
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;

  // Stats
  getStats: (date?: string) => Promise<DailyStats>;
  saveSession: (session: PostureSession) => Promise<void>;

  // Notifications
  sendNotification: (payload: NotificationPayload) => Promise<void>;

  // Timers
  startTimers: () => Promise<void>;
  stopTimers: () => Promise<void>;

  // Tray
  updateTrayStatus: (status: 'good' | 'bad' | 'paused') => Promise<void>;

  // Events from main → renderer
  onStandupReminder: (callback: () => void) => () => void;  // returns unsubscribe
  onEyeReminder: (callback: () => void) => () => void;
  onPauseMonitoring: (callback: () => void) => () => void;
  onResumeMonitoring: (callback: () => void) => () => void;
}
```

---

## 7. Storage Spec

### File Locations
```
Mac:     ~/Library/Application Support/ergosmart/
Windows: C:\Users\<user>\AppData\Roaming\ergosmart\

Files:
  ergosmart-settings.json
  ergosmart-stats-YYYY-MM-DD.json   (one file per day)
```

### Settings Default
```json
{
  "slouchThreshold": 15,
  "alertDelay": 10,
  "alertCooldown": 60,
  "standUpInterval": 30,
  "eyeRuleInterval": 20,
  "soundEnabled": true,
  "selectedCamera": "default",
  "startMinimized": false,
  "calibration": null
}
```

### Stats File Format
```json
{
  "date": "2025-01-15",
  "sessions": [
    {
      "startTime": 1705312800000,
      "totalFrames": 1800,
      "goodFrames": 1440,
      "badFrames": 360,
      "goodPercent": 80,
      "durationMs": 3600000
    }
  ],
  "totalGoodMs": 3600000,
  "totalBadMs": 900000
}
```

---

## 8. Web Worker Message Protocol

```typescript
// Messages renderer → worker
type WorkerInMessage =
  | { type: 'INIT'; modelPath: string }
  | { type: 'PROCESS_FRAME'; imageData: ImageData; timestamp: number }
  | { type: 'DESTROY' }

// Messages worker → renderer
type WorkerOutMessage =
  | { type: 'READY' }
  | { type: 'INIT_ERROR'; error: string }
  | { type: 'LANDMARKS'; landmarks: PostureLandmark[]; timestamp: number }
  | { type: 'NO_PERSON_DETECTED'; timestamp: number }
  | { type: 'PROCESS_ERROR'; error: string }
```

---

## 9. Canvas Overlay Drawing Spec

```typescript
// Draw skeleton connections
const POSE_CONNECTIONS = [
  [7, 8],   // ear to ear (across head)
  [7, 11],  // left ear to left shoulder
  [8, 12],  // right ear to right shoulder
  [11, 12], // shoulder to shoulder
  [11, 23], // left shoulder to left hip
  [12, 24], // right shoulder to right hip
  [23, 24], // hip to hip
];

// Color: green if good posture, red if bad
const skeletonColor = isGoodPosture ? '#22c55e' : '#ef4444';

// Draw each landmark as a circle
// Draw each connection as a line
// Use landmark.visibility to set opacity (low confidence = transparent)
```

---

## 10. Environment Variables

```bash
# .env.development
VITE_APP_NAME=ergoSmart
VITE_MODEL_PATH=/models/pose_landmarker_lite.task
VITE_DEBUG_LANDMARKS=false   # set true to show raw landmark coords in UI
```

---

## 11. .gitignore Additions

```
# MediaPipe model (binary, too large for git)
public/models/*.task

# Electron build output
dist-electron/
dist/
release/

# User data (local only)
userData/

# OS files
.DS_Store
Thumbs.db
```
