# ergoRemind — Tech Stack

Comprehensive reference of every technology used in ergoRemind, with pinned versions
and the rationale for each choice.

---

## Core Runtime

| Technology | Version | Role | Rationale |
|-----------|---------|------|-----------|
| **Electron** | 28+ | Desktop shell | Cross-platform desktop app with native OS access (tray, notifications, file system) |
| **Node.js** | Bundled with Electron 28 | Main process runtime | File I/O, child_process for AppleScript, IPC handlers |

---

## Frontend

| Technology | Version | Role | Rationale |
|-----------|---------|------|-----------|
| **React** | 18.2.0 | UI library | Component model, hooks, declarative rendering |
| **React DOM** | 18.2.0 | DOM renderer | Required peer dep for React in browser environment |
| **TypeScript** | 5.4.5 | Language | Type safety with `strict: true`, no `any` allowed |

---

## Build Tooling

| Technology | Version | Role | Rationale |
|-----------|---------|------|-----------|
| **Vite** | 5.2.8 | Dev server + bundler | Fast HMR, ESM-native, excellent DX |
| **vite-plugin-electron** | 0.28.6 | Electron integration | Compiles main + preload alongside renderer |
| **vite-plugin-electron-renderer** | 0.14.5 | Renderer Node compat | Enables Node.js module resolution in renderer when needed |
| **@vitejs/plugin-react** | 4.2.1 | React fast refresh | JSX transform + HMR for React components |

---

## Styling

| Technology | Version | Role | Rationale |
|-----------|---------|------|-----------|
| **Tailwind CSS** | 3.4.3 | Utility-first CSS | Rapid UI development, dark theme, consistent spacing |
| **PostCSS** | 8.4.38 | CSS processing | Required by Tailwind pipeline |
| **Autoprefixer** | 10.4.19 | Vendor prefixes | Cross-browser CSS compatibility |

---

## AI / Computer Vision

| Technology | Version | Role | Rationale |
|-----------|---------|------|-----------|
| **@mediapipe/tasks-vision** | 0.10.14 | Pose detection | WASM-based on-device ML; no cloud API needed |

### MediaPipe Details

- **Model:** `pose_landmarker_lite.task` (stored in `public/models/`, not committed to git)
- **WASM files:** Copied to `public/mediapipe/wasm/` for fully offline operation
- **Delegate:** CPU only (GPU delegate unreliable in Electron)
- **Running mode:** `VIDEO` (continuous frame processing)
- **Inference location:** Web Worker thread (`src/workers/poseWorker.ts`)
- **Frame skip:** Every 3rd frame processed to conserve CPU

---

## Data Storage

| Technology | Format | Location | Rationale |
|-----------|--------|----------|-----------|
| **JSON file** | `settings.json` | `app.getPath('userData')` | App settings persistence |
| **JSON file** | `stats-YYYY-MM-DD.json` | `app.getPath('userData')` | Daily posture session data |

### Why JSON Files?

- Zero native dependencies (no SQLite, no `electron-rebuild`)
- Simple key-value and array storage is sufficient for settings + daily stats
- Human-readable for debugging
- Trivial backup (copy the JSON files)

---

## IPC & Security

| Technology | Role | Details |
|-----------|------|---------|
| **contextBridge** | Main ↔ Renderer bridge | Exposes `window.ergoremind` API |
| **ipcRenderer.invoke** | Renderer → Main calls | Promise-based request/response |
| **ipcMain.handle** | Main-side handlers | Async handlers for each channel |
| **webContents.send** | Main → Renderer events | Push notifications (timers, tray) |

### Security Configuration

```typescript
webPreferences: {
  preload: path.join(__dirname, 'preload.mjs'),
  contextIsolation: true,      // REQUIRED — isolates renderer
  nodeIntegration: false,      // REQUIRED — no Node in renderer
  webSecurity: true,           // REQUIRED — CORS enforcement
}
```

---

## Focus Guard (Planned)

| Technology | Role | Rationale |
|-----------|------|-----------|
| **AppleScript via `child_process.execFile`** | Active window detection | macOS-native, zero npm deps, no native modules |
| **Overlay BrowserWindow** | Distraction nudge UI | Transparent, frameless Electron window |

### Why AppleScript?

- No native Node addons required (no `node-ffi`, no `electron-rebuild`)
- macOS provides reliable `System Events` for frontmost app + window title
- Minimal overhead: single `osascript` call on a polling interval
- Falls back gracefully if Accessibility permissions not granted

---

## Dev Dependencies (Type Definitions)

| Package | Version | Purpose |
|---------|---------|---------|
| **@types/node** | 20.11.30 | Node.js type definitions |
| **@types/react** | 18.2.66 | React type definitions |
| **@types/react-dom** | 18.2.22 | React DOM type definitions |

---

## Explicitly NOT Used

| Technology | Reason for exclusion |
|-----------|---------------------|
| SQLite / any database | JSON files are sufficient; avoids `electron-rebuild` |
| `electron-rebuild` | No native modules needed |
| `@electron/remote` | Deprecated; security risk |
| CDN for WASM files | Must work fully offline |
| GPU delegate for MediaPipe | Unreliable in Electron's Chromium |
| Icon libraries (Heroicons, etc.) | Emoji-based icons for V1 simplicity |
| CSS-in-JS (styled-components, etc.) | Tailwind provides all styling needs |
| State management (Redux, Zustand) | React hooks + IPC are sufficient |
