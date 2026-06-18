import { app, BrowserWindow, ipcMain, powerMonitor, protocol, net } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { AppSettings, DailyStats, FocusGuardCapability, NotificationPayload, PostureSession, TrayStatus } from '../src/types';
import { sendNativeNotification } from './notifications';
import { createAppTray, setFocusDistracted, setFocusGuardEnabled, updateTrayIcon } from './tray';
import { readSettings, readStats, saveSession, saveSettings, saveStats } from './store';
import { startWellnessTimers, stopWellnessTimers } from './timers';
import { FocusMonitor } from './focusMonitor';
import { showOverlay, hideOverlay, destroyOverlay } from './overlay';

// Register the custom 'app' protocol to support fetching local assets (WASM/models)
// in a packaged environment with webSecurity enabled.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.VITE_DEV_SERVER_URL) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let focusMonitor: FocusMonitor | null = null;

/** Returns platform support information for Focus Guard active-window polling. */
function getFocusGuardCapability(): FocusGuardCapability {
  return process.platform === 'darwin'
    ? { supported: true, reason: null }
    : { supported: false, reason: 'Focus Guard active-window detection currently requires macOS.' };
}

/** Starts the Focus Guard monitor engine. */
async function startFocusGuardInternal(): Promise<void> {
  if (!getFocusGuardCapability().supported) return;
  const settings = await readSettings();
  if (focusMonitor) {
    await focusMonitor.stop();
  }
  
  focusMonitor = new FocusMonitor(settings, {
    onDistractionDetected: (appName, durationMs) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ergoremind:distraction-detected', { appName, duration: durationMs });
      }
    },
    onFocusRestored: () => {
      hideOverlay();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ergoremind:focus-restored');
        readStats().then(stats => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ergoremind:focus-stats-updated', stats.focusStats);
          }
        });
      }
    },
    onAlert: (appName, durationMs) => {
      showOverlay({ appName, duration: durationMs });
    },
    onStateChange: (state) => {
      setFocusDistracted(state === 'alerting' || state === 'distracted' || state === 'cooldown');
    },
    onError: (message) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ergoremind:focus-error', message);
      }
    },
  });
  
  focusMonitor.start();
  setFocusGuardEnabled(true);
}

/** Creates the main Electron browser window with secure renderer settings. */
async function createWindow(): Promise<BrowserWindow> {
  const settings = await readSettings();
  const window = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  window.once('ready-to-show', () => {
    if (!settings.startMinimized) {
      window.show();
    }
  });

  // Power monitor listeners to save resources when user is idle
  powerMonitor.on('suspend', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ergoremind:pause-monitoring');
      updateTrayIcon('paused');
    }
    if (focusMonitor) {
      void focusMonitor.pause();
      hideOverlay();
    }
  });

  powerMonitor.on('lock-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ergoremind:pause-monitoring');
      updateTrayIcon('paused');
    }
    if (focusMonitor) {
      void focusMonitor.pause();
      hideOverlay();
    }
  });

  powerMonitor.on('unlock-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ergoremind:resume-monitoring');
      updateTrayIcon('good');
    }
    if (focusMonitor) {
      focusMonitor.resume();
    }
  });

  powerMonitor.on('resume', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ergoremind:resume-monitoring');
      updateTrayIcon('good');
    }
    if (focusMonitor) {
      focusMonitor.resume();
    }
  });

  window.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      window.hide();
      window.webContents.send('ergoremind:pause-monitoring');
      updateTrayIcon('paused');
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await window.loadURL('app://index.html');
  }

  mainWindow = window;
  createAppTray(window);
  return window;
}

/** Registers all renderer-to-main IPC handlers for app services. */
function registerIpcHandlers(): void {
  ipcMain.handle('ergoremind:get-settings', async (): Promise<AppSettings> => readSettings());

  ipcMain.handle('ergoremind:save-settings', async (_event, settings: Partial<AppSettings>): Promise<AppSettings> => {
    const capability = getFocusGuardCapability();
    const safeUpdate = settings.focusGuardEnabled && !capability.supported
      ? { ...settings, focusGuardEnabled: false }
      : settings;
    const updated = await saveSettings(safeUpdate);
    if (mainWindow) {
      startWellnessTimers(mainWindow, updated);
    }
    
    // Dynamically start/stop or update Focus Guard settings
    if (updated.focusGuardEnabled) {
      setFocusGuardEnabled(true);
      if (focusMonitor) {
        focusMonitor.updateSettings(updated);
      } else {
        await startFocusGuardInternal();
      }
    } else {
      if (focusMonitor) {
        await focusMonitor.stop();
        focusMonitor = null;
      }
      destroyOverlay();
      setFocusGuardEnabled(false);
    }
    
    return updated;
  });

  ipcMain.handle('ergoremind:get-stats', async (_event, date?: string): Promise<DailyStats> => readStats(date));

  ipcMain.handle('ergoremind:save-stats', async (_event, stats: DailyStats): Promise<DailyStats> => saveStats(stats));

  ipcMain.handle('ergoremind:save-session', async (_event, session: PostureSession): Promise<DailyStats> => saveSession(session));

  ipcMain.handle('ergoremind:send-notification', async (_event, payload: NotificationPayload): Promise<void> => {
    sendNativeNotification(payload);
  });

  ipcMain.handle('ergoremind:start-timers', async (): Promise<void> => {
    if (mainWindow) {
      startWellnessTimers(mainWindow, await readSettings());
    }
  });

  ipcMain.handle('ergoremind:stop-timers', async (): Promise<void> => {
    stopWellnessTimers();
  });

  ipcMain.handle('ergoremind:update-tray-status', async (_event, status: TrayStatus): Promise<void> => {
    updateTrayIcon(status);
  });

  ipcMain.handle('ergoremind:start-focus-guard', async (): Promise<void> => {
    await startFocusGuardInternal();
  });

  ipcMain.handle('ergoremind:stop-focus-guard', async (): Promise<void> => {
    if (focusMonitor) {
      await focusMonitor.stop();
      focusMonitor = null;
    }
    destroyOverlay();
    setFocusGuardEnabled(false);
  });

  ipcMain.handle('ergoremind:get-focus-stats', async () => {
    const stats = await readStats();
    return stats.focusStats;
  });

  ipcMain.handle('ergoremind:get-focus-capability', async (): Promise<FocusGuardCapability> => getFocusGuardCapability());

  ipcMain.handle('ergoremind:dismiss-overlay', async (): Promise<void> => {
    hideOverlay();
  });
}

app.name = 'ergoremind';
registerIpcHandlers();

app.whenReady().then(async () => {
  // Set up standard handler for the 'app' scheme to fetch local files in dist
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const relativePath = path.join(url.hostname, decodeURIComponent(url.pathname));
    const filePath = path.join(__dirname, '../dist', relativePath);
    return net.fetch(pathToFileURL(filePath).toString());
  });

  const window = await createWindow();
  const settings = await readSettings();
  startWellnessTimers(window, settings);
  setFocusGuardEnabled(settings.focusGuardEnabled && getFocusGuardCapability().supported);
  if (settings.focusGuardEnabled) {
    await startFocusGuardInternal();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopWellnessTimers();
  if (focusMonitor) {
    focusMonitor.stop();
  }
  destroyOverlay();
});

app.on('window-all-closed', (event: Electron.Event) => {
  event.preventDefault();
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});
