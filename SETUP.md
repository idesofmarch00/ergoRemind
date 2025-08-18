# SETUP.md — ergoSmart Local Setup Guide

> Everything you need to do BEFORE running `npm run dev`
> These are the manual steps no AI can do for you.

---

## Step 1: Install Node.js (Both Machines)

Download and install Node.js **v18 or higher** (LTS recommended):
- https://nodejs.org/en/download

Verify:
```bash
node --version   # Should show v18+
npm --version    # Should show 9+
```

---

## Step 2: Download the MediaPipe Model File

This is the AI brain for pose detection. It's a 5MB binary file.

1. Go to: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task
2. Download the file — it will be called `pose_landmarker_lite.task`
3. Place it here in your project:
   ```
   ergosmart/
   └── public/
       └── models/
           └── pose_landmarker_lite.task   ← HERE
   ```
4. Create the folder if it doesn't exist: `mkdir -p public/models`

> ⚠️ Do NOT rename the file. The code expects exactly `pose_landmarker_lite.task`

> ⚠️ Do NOT commit this file to git. It's already in `.gitignore`

---

## Step 3: Allow Camera Permission

### macOS
1. Go to `System Settings → Privacy & Security → Camera`
2. Make sure your Terminal app (or the Electron app) is allowed
3. On first run, macOS will show a popup — click **Allow**

### Windows
1. Go to `Settings → Privacy → Camera`
2. Make sure **Allow apps to access your camera** is ON
3. On first run, Windows will ask — click **Allow**

---

## Step 4: Clone and Install

```bash
# Clone the repo
git clone <your-repo-url>
cd ergosmart

# Install all dependencies
npm install

# Start the app
npm run dev
```

That's it. Electron window will open.

---

## Step 5: Calibrate on First Run

When the app opens:
1. **Sit up straight** — back against chair, head level, eyes looking at screen normally
2. Click the **"Calibrate"** button in the app
3. Hold still for 3 seconds while it captures your baseline
4. The app saves your personal posture reference

> ⚠️ Do this on EACH machine separately (Mac + Windows)
> Different webcam angles = different baselines

> ⚠️ Recalibrate if you: move your monitor, change chair height, switch cameras

---

## Step 6: Adjust Thresholds (After 1–2 Days of Use)

Go to **Settings** in the app:

| Setting | Default | Increase if... | Decrease if... |
|---------|---------|----------------|----------------|
| Slouch Threshold | 15° | Too many false alerts | Missing real slouches |
| Alert Delay | 10s | Alerts too frequent | Missing bad posture |
| Alert Cooldown | 60s | Too spammy | Stops reminding you |
| Stand Up Interval | 30 min | Feels too frequent | Want more reminders |
| 20-20-20 Interval | 20 min | Eyes fine already | Need more eye breaks |

---

## Running on Both Machines

Both laptops need:
- Node.js installed ✅
- The repo cloned / copied ✅
- `npm install` run ✅
- `pose_landmarker_lite.task` in `public/models/` ✅
- Camera permission allowed ✅
- Calibrated separately ✅

Then on each machine just:
```bash
npm run dev
```

---

## Troubleshooting

### "Camera not found" error
- Check camera permission in OS settings
- Try selecting a different camera from the dropdown
- On Windows, make sure no other app is using the camera

### "Model file not found" error
- Verify `public/models/pose_landmarker_lite.task` exists
- File must be exactly at that path, not renamed

### "Pose not detected" (skeleton not showing)
- Make sure your full upper body is visible in webcam
- Good lighting — MediaPipe struggles in low light
- Sit ~50–80cm from camera for best results

### App won't start on Mac after Gatekeeper warning
- Since this is running from source (npm run dev), not a signed app,
  macOS won't block it — Gatekeeper only applies to .app bundles

### High CPU usage
- Check Settings → reduce camera FPS if option available
- Close the main window (app continues in tray) — suspends video processing
- Ensure you're on power adapter, not battery saver mode
