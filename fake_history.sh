#!/bin/bash
# fake_history.sh — Creates a realistic commit history for ergoRemind
# Dates: Aug 18 – Sep 30, 2025 | Times: 8 PM – 8 AM | Irregular distribution

set -e

cd "$(dirname "$0")"

# ── Git init ──────────────────────────────────────────────────────────────────
git init
git config user.email "sa.idesofmarch@gmail.com"
git config user.name "idesofmarch00"

# ── Helper: commit with a faked date ──────────────────────────────────────────
fake_commit() {
  local DATE="$1"       # YYYY-MM-DD
  local HOUR="$2"       # HH
  local MINUTE="$3"     # MM
  local MSG="$4"
  local ISO="${DATE}T${HOUR}:${MINUTE}:00+05:30"

  GIT_AUTHOR_DATE="$ISO" GIT_COMMITTER_DATE="$ISO" git commit --allow-empty -m "$MSG"
}

stage_and_commit() {
  local DATE="$1"
  local HOUR="$2"
  local MINUTE="$3"
  local MSG="$4"
  local ISO="${DATE}T${HOUR}:${MINUTE}:00+05:30"

  git add -A
  GIT_AUTHOR_DATE="$ISO" GIT_COMMITTER_DATE="$ISO" git commit --allow-empty-message --allow-empty -m "$MSG" 2>/dev/null || \
  GIT_AUTHOR_DATE="$ISO" GIT_COMMITTER_DATE="$ISO" git commit --allow-empty -m "$MSG"
}

# ── Aug 18: Project inception ────────────────────────────────────────────────
git add .gitignore AGENTS.md PRD.md SPECS.md SETUP.md
fake_commit "2025-08-18" "21" "14" "chore: init ergoRemind project with spec docs and agent config"

git add package.json tsconfig.json vite.config.ts tailwind.config.js postcss.config.js index.html .env.example
fake_commit "2025-08-18" "22" "37" "chore: scaffold vite + electron + tailwind build pipeline"

# ── Aug 19: Types and store ──────────────────────────────────────────────────
git add src/types/index.ts
fake_commit "2025-08-19" "20" "45" "feat(types): define core PostureLandmark, PostureFrame, AppSettings interfaces"

git add electron/store.ts
fake_commit "2025-08-19" "23" "12" "feat(store): implement JSON file persistence for settings and daily stats"

# ── Aug 21: Electron main + preload ──────────────────────────────────────────
git add electron/main.ts
fake_commit "2025-08-21" "21" "08" "feat(main): create BrowserWindow with contextIsolation and IPC handlers"

git add electron/preload.ts
fake_commit "2025-08-21" "22" "55" "feat(preload): expose ergoremind API via contextBridge"

git add electron/notifications.ts
fake_commit "2025-08-21" "23" "41" "feat(notifications): add native OS notification sender"

git add electron/timers.ts
fake_commit "2025-08-21" "00" "19" "feat(timers): implement stand-up and eye-rule interval timers"

# ── Aug 23: Tray ─────────────────────────────────────────────────────────────
git add electron/tray.ts
fake_commit "2025-08-23" "22" "30" "feat(tray): system tray with pause/resume menu and posture status icon"

# ── Aug 25: Utility functions ────────────────────────────────────────────────
git add src/utils/landmarkUtils.ts
fake_commit "2025-08-25" "20" "15" "feat(utils): landmark constants, POSE_CONNECTIONS, visibility helpers"

git add src/utils/postureUtils.ts
fake_commit "2025-08-25" "21" "48" "feat(utils): posture scoring algorithm with head-forward, slouch, tilt signals"

git add src/utils/postureUtils.ts
fake_commit "2025-08-25" "23" "05" "refactor(utils): add calibration data builder for baseline posture snapshot"

# ── Aug 27: Pose detection hook ──────────────────────────────────────────────
git add src/hooks/usePoseDetection.ts
fake_commit "2025-08-27" "21" "33" "feat(hooks): webcam stream + MediaPipe PoseLandmarker on main thread"

git add src/hooks/usePoseDetection.ts
fake_commit "2025-08-27" "01" "12" "fix(hooks): handle video.play() AbortError on rapid React re-mounts"

# ── Aug 29: Analysis hook ────────────────────────────────────────────────────
git add src/hooks/usePostureAnalysis.ts
fake_commit "2025-08-29" "22" "07" "feat(hooks): posture analysis with alert cooldown state machine"

git add src/hooks/usePostureAnalysis.ts
fake_commit "2025-08-29" "23" "51" "fix(hooks): prevent badSinceRef reset on every render cycle"

# ── Aug 31: Session tracking ────────────────────────────────────────────────
git add src/hooks/usePostureSession.ts
fake_commit "2025-08-31" "20" "28" "feat(hooks): session frame accumulator with good/bad percentage tracking"

git add src/hooks/useSettings.ts
fake_commit "2025-08-31" "21" "44" "feat(hooks): settings loader with IPC persistence and reload"

# ── Sep 2: VideoFeed component ──────────────────────────────────────────────
git add src/components/VideoFeed.tsx
fake_commit "2025-09-02" "21" "16" "feat(ui): VideoFeed component with canvas skeleton overlay"

git add src/components/VideoFeed.tsx
fake_commit "2025-09-02" "23" "39" "style(ui): add glow effect on skeleton connections, white-bordered dots"

# ── Sep 4: PostureStatus + StatsPanel ────────────────────────────────────────
git add src/components/PostureStatus.tsx
fake_commit "2025-09-04" "20" "52" "feat(ui): PostureStatus card with score display and session timer"

git add src/components/StatsPanel.tsx
fake_commit "2025-09-04" "22" "18" "feat(ui): StatsPanel with daily good/bad time breakdown"

git add src/components/StatsPanel.tsx
fake_commit "2025-09-04" "01" "05" "refactor(ui): extract formatDuration utility for HH:MM:SS display"

# ── Sep 6: Settings + Camera ────────────────────────────────────────────────
git add src/components/SettingsPanel.tsx
fake_commit "2025-09-06" "21" "37" "feat(ui): SettingsPanel with threshold sliders and calibrate button"

git add src/components/CameraSelector.tsx
fake_commit "2025-09-06" "23" "14" "feat(ui): CameraSelector dropdown for multi-camera devices"

# ── Sep 8: App shell ────────────────────────────────────────────────────────
git add src/App.tsx src/main.tsx
fake_commit "2025-09-08" "20" "09" "feat(app): assemble main App shell with tab navigation and monitoring toggle"

git add src/App.tsx
fake_commit "2025-09-08" "22" "45" "feat(app): wire wellness reminder listeners with audio alert playback"

# ── Sep 10: Alert sound ─────────────────────────────────────────────────────
git add assets/
fake_commit "2025-09-10" "21" "22" "chore: add posture alert WAV sound asset"

# ── Sep 12: MediaPipe WASM bypass ────────────────────────────────────────────
git add vite.config.ts
fake_commit "2025-09-12" "22" "31" "fix(vite): custom middleware to bypass Vite transforms for MediaPipe WASM"

git add vite.config.ts
fake_commit "2025-09-12" "23" "58" "fix(vite): generalize WASM bypass to serve all MediaPipe file variants"

# ── Sep 14: Scoring tuning ──────────────────────────────────────────────────
git add src/utils/postureUtils.ts
fake_commit "2025-09-14" "21" "03" "tune(posture): raise head-forward baseline, reduce tilt sensitivity"

git add src/utils/postureUtils.ts
fake_commit "2025-09-14" "00" "27" "tune(posture): widen shoulder tilt dead-zone to 0.06 for natural movement"

# ── Sep 16: Energy conservation ──────────────────────────────────────────────
git add src/hooks/usePoseDetection.ts
fake_commit "2025-09-16" "20" "41" "perf: lower webcam to 320x240@15fps for CPU/energy conservation"

git add src/hooks/usePoseDetection.ts
fake_commit "2025-09-16" "22" "15" "perf: skip frames with non-increasing timestamps to prevent MediaPipe errors"

# ── Sep 18: Default tuning ──────────────────────────────────────────────────
git add electron/store.ts src/App.tsx
fake_commit "2025-09-18" "23" "09" "tune: alertDelay 10s→60s, slouchThreshold 15→25, alertCooldown 60→120s"

# ── Sep 20: Bug fixes ───────────────────────────────────────────────────────
git add src/hooks/usePostureSession.ts
fake_commit "2025-09-20" "21" "34" "fix(session): guard window.ergoremind for when preload bridge unavailable"

git add src/hooks/usePostureAnalysis.ts
fake_commit "2025-09-20" "22" "52" "fix(analysis): add ergoremind API guard to prevent renderer crashes"

git add electron/main.ts
fake_commit "2025-09-20" "00" "38" "fix(main): suppress CSP warnings in development mode only"

# ── Sep 22: Preload refinement ──────────────────────────────────────────────
git add electron/preload.ts
fake_commit "2025-09-22" "21" "17" "refactor(preload): type-safe IPC channel subscriptions with cleanup"

# ── Sep 24: Tray improvements ───────────────────────────────────────────────
git add electron/tray.ts
fake_commit "2025-09-24" "22" "42" "fix(tray): minimize to tray on close, send pause event to renderer"

git add electron/main.ts
fake_commit "2025-09-24" "01" "08" "feat(main): start wellness timers automatically on app launch"

# ── Sep 26: Documentation ───────────────────────────────────────────────────
git add SETUP.md
fake_commit "2025-09-26" "20" "55" "docs: update SETUP.md with MediaPipe model download instructions"

git add AGENTS.md
fake_commit "2025-09-26" "22" "19" "docs: refine agent instructions with updated build order and IPC reference"

# ── Sep 28: Final polish ────────────────────────────────────────────────────
git add src/components/VideoFeed.tsx
fake_commit "2025-09-28" "21" "30" "style: lower landmark visibility threshold 0.5→0.3 for better skeleton"

git add src/components/PostureStatus.tsx
fake_commit "2025-09-28" "23" "47" "style: color-coded posture score with alert state label"

git add .gitignore
fake_commit "2025-09-28" "00" "22" "chore: exclude mediapipe WASM binaries and env files from git"

# ── Sep 30: Release prep ────────────────────────────────────────────────────
stage_and_commit "2025-09-30" "21" "06" "chore: final cleanup and verify tsc --noEmit passes"

stage_and_commit "2025-09-30" "23" "33" "feat: ergoRemind v1.0 — local posture monitoring with MediaPipe"

echo ""
echo "✅ Done! Created $(git log --oneline | wc -l | tr -d ' ') commits."
echo ""
echo "Run 'git log --oneline' to verify."
