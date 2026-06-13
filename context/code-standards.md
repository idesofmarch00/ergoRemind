# ergoRemind — Code Standards

Standards extracted from `AGENTS.md` and verified against the actual codebase.
All contributors and AI agents **must** follow these rules.

---

## TypeScript

| Rule | Details |
|------|---------|
| Strict mode | `strict: true` in tsconfig.json — enforced |
| No `any` | Every variable, parameter, and return value must have an explicit type |
| Explicit return types | All functions must declare their return type |
| `type` for unions/primitives | e.g., `type AlertState = 'IDLE' \| 'MONITORING' \| ...` |
| `interface` for objects | e.g., `interface PostureFrame { score: number; ... }` |
| Unused variables | `noUnusedLocals: true`, `noUnusedParameters: true` |
| Target | ES2020 |
| Module | ESNext with bundler resolution |
| Path aliases | `@/*` → `./src/*`, `@electron/*` → `./electron/*` |

### tsconfig.json Key Settings

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "jsx": "react-jsx",
    "isolatedModules": true
  }
}
```

---

## React

| Rule | Details |
|------|---------|
| Functional components only | No class components — ever |
| Named exports | Components use `export function ComponentName()` (not default export, except App.tsx) |
| Props interfaces | Every component defines an explicit `interface XProps` |
| `useEffect` cleanup | All `useEffect` hooks must return a cleanup function |
| Custom hooks for logic | Components are for rendering only; logic lives in `src/hooks/` |
| `useCallback` for handlers | All functions passed as props must be wrapped in `useCallback` |
| `useMemo` for derived data | Expensive computations or stable references use `useMemo` |
| Ref-based DOM access | `useRef` for video/canvas elements, never direct DOM queries |

### Component Pattern

```typescript
interface VideoFeedProps {
  videoRef: RefObject<HTMLVideoElement>;
  landmarks: PostureLandmark[] | null;
  isGoodPosture: boolean;
  isMonitoring: boolean;
  error: string | null;
}

/** Shows the live webcam stream and posture skeleton overlay. */
export function VideoFeed(props: VideoFeedProps): JSX.Element {
  const { videoRef, landmarks, isGoodPosture, isMonitoring, error } = props;
  // ... render only, no business logic
}
```

---

## Electron Architecture

| Rule | Details |
|------|---------|
| `contextBridge` IPC only | All main ↔ renderer communication through `preload.ts` |
| Never `nodeIntegration: true` | Security — renderer must not access Node APIs |
| Never `remote` module | Deprecated and insecure |
| `contextIsolation: true` | Always enabled |
| `webSecurity: true` | Always enabled |
| Minimize to tray | Window close is intercepted; app hides instead |
| Async file I/O | Never use `readFileSync` / `writeFileSync` in main process |

### IPC Channel Convention

> **Important:** All IPC channels use the `ergoremind:` prefix (NOT `ergosmart:` as
> AGENTS.md originally specified). The codebase has standardized on `ergoremind:`.

#### Renderer → Main (invoke/handle)

| Channel | Payload | Return |
|---------|---------|--------|
| `ergoremind:get-settings` | — | `AppSettings` |
| `ergoremind:save-settings` | `Partial<AppSettings>` | `AppSettings` |
| `ergoremind:get-stats` | `date?: string` | `DailyStats` |
| `ergoremind:save-stats` | `DailyStats` | `DailyStats` |
| `ergoremind:save-session` | `PostureSession` | `DailyStats` |
| `ergoremind:send-notification` | `NotificationPayload` | `void` |
| `ergoremind:start-timers` | — | `void` |
| `ergoremind:stop-timers` | — | `void` |
| `ergoremind:update-tray-status` | `TrayStatus` | `void` |

#### Main → Renderer (send/on)

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `ergoremind:standup-reminder` | main → renderer | Stand-up timer fired |
| `ergoremind:eye-reminder` | main → renderer | 20-20-20 eye rule timer fired |
| `ergoremind:pause-monitoring` | main → renderer | Tray "Pause" or system suspend |
| `ergoremind:resume-monitoring` | main → renderer | Tray "Resume" or system unlock |

---

## Performance

| Rule | Details |
|------|---------|
| Process every 3rd frame | Frame counter ref in `usePoseDetection`; skip 2 out of 3 |
| `requestAnimationFrame` for canvas | Skeleton overlay uses rAF loop with proper cleanup |
| Web Worker for ML inference | MediaPipe runs in `poseWorker.ts`, never on React thread |
| Suspend on window hide | When minimized to tray, pause monitoring entirely |
| CPU delegate | MediaPipe uses CPU (GPU unreliable in Electron) |
| Visibility threshold | Landmarks below 0.3 visibility are skipped |

---

## Error Handling

| Scenario | Strategy |
|----------|----------|
| Camera access denied | `getUserMedia` rejection caught; error message shown in UI |
| MediaPipe model load failure | Worker sends `INIT_ERROR`; clear error state in UI |
| File I/O (settings/stats) | `try/catch` with fallback to default values |
| IPC failures | All `invoke` calls wrapped in `try/catch` |
| Audio playback failure | `.play().catch(() => {})` — silent fail |
| General async | Every `async` function has a `try/catch` — no unhandled rejections |
| App crash prevention | Never let an uncaught error crash the app |

---

## Comments & Documentation

| Rule | Details |
|------|---------|
| JSDoc on every function | Every exported and internal function has a `/** ... */` comment |
| Inline comments for math | Angle calculations, scoring formulas get line-by-line explanations |
| IPC direction comments | Each IPC method documents `renderer → main` or `main → renderer` |
| Complex logic explained | Non-obvious code blocks have a preceding comment |

### Example

```typescript
/**
 * Calculates the angle between three points in degrees.
 * Uses atan2 for quadrant-safe angle computation.
 */
function calculateAngle(a: Point, b: Point, c: Point): number {
  // Compute the angle at point b formed by rays ba and bc
  const radians = Math.atan2(c.y - b.y, c.x - b.x)
                - Math.atan2(a.y - b.y, a.x - b.x);
  return Math.abs(radians * (180 / Math.PI));
}
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| TypeScript modules | camelCase | `postureUtils.ts`, `poseWorker.ts` |
| React components | PascalCase | `VideoFeed.tsx`, `PostureStatus.tsx` |
| Hooks | `use` prefix + camelCase | `usePoseDetection.ts` |
| Type files | camelCase | `types/index.ts` |
| Electron modules | camelCase | `main.ts`, `preload.ts`, `tray.ts` |
| Config files | kebab-case or standard names | `vite.config.ts`, `tailwind.config.js` |

---

## Directory Structure

```
electron/          ← Main process code
  main.ts          ← Window creation, IPC handlers, app lifecycle
  preload.ts       ← contextBridge API definition
  tray.ts          ← System tray icon + menu
  notifications.ts ← Native notification wrapper
  timers.ts        ← Wellness timer management
  store.ts         ← JSON file I/O for settings + stats

src/               ← Renderer process code
  main.tsx         ← React entry point
  App.tsx          ← Root component
  components/      ← UI components (PascalCase .tsx)
  hooks/           ← Custom React hooks (camelCase .ts)
  types/           ← TypeScript type definitions
  utils/           ← Pure utility functions
  workers/         ← Web Worker scripts
  styles.css       ← Tailwind directives + global styles
```

---

## Definition of Done (Per File)

A file is considered complete when:

- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] No `any` types used anywhere
- [ ] All functions have JSDoc comments
- [ ] All error cases handled (`try/catch` where async)
- [ ] All `useEffect` hooks have cleanup functions
- [ ] File has single responsibility
- [ ] Follows naming conventions above
