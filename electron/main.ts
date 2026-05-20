import { app, BrowserWindow, ipcMain, powerMonitor } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppSettings, DailyStats, NotificationPayload, PostureSession, TrayStatus } from '../src/types';
import { sendNativeNotification } from './notifications';
import { createAppTray, updateTrayIcon } from './tray';
import { readSettings, readStats, saveSession, saveSettings, saveStats } from './store';
import { startWellnessTimers, stopWellnessTimers } from './timers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.VITE_DEV_SERVER_URL) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

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
    window.webContents.openDevTools();
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
  });

  powerMonitor.on('lock-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ergoremind:pause-monitoring');
      updateTrayIcon('paused');
    }
  });

  powerMonitor.on('unlock-screen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ergoremind:resume-monitoring');
      updateTrayIcon('good');
    }
  });

  powerMonitor.on('resume', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ergoremind:resume-monitoring');
      updateTrayIcon('good');
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
    await window.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow = window;
  createAppTray(window);
  return window;
}

/** Registers all renderer-to-main IPC handlers for app services. */
function registerIpcHandlers(): void {
  ipcMain.handle('ergoremind:get-settings', async (): Promise<AppSettings> => readSettings());

  ipcMain.handle('ergoremind:save-settings', async (_event, settings: Partial<AppSettings>): Promise<AppSettings> => {
    const updated = await saveSettings(settings);
    if (mainWindow) {
      startWellnessTimers(mainWindow, updated);
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
}

app.name = 'ergoremind';
registerIpcHandlers();

app.whenReady().then(async () => {
  const window = await createWindow();
  startWellnessTimers(window, await readSettings());
});

app.on('before-quit', () => {
  isQuitting = true;
  stopWellnessTimers();
});

app.on('window-all-closed', (event: Electron.Event) => {
  event.preventDefault();
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});
