import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import type { TrayStatus } from '../src/types';

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let paused = false;
let focusGuardEnabled = false;
let postureStatus: 'good' | 'bad' = 'good';
let focusDistracted = false;

/** Builds a small fallback tray icon when asset files are unavailable. */
function createFallbackIcon(status: TrayStatus): Electron.NativeImage {
  const colorMap: Record<TrayStatus, string> = {
    good: '#22c55e',
    bad: '#ef4444',
    paused: '#64748b',
    distracted: '#f59e0b',
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"><circle cx="11" cy="11" r="8" fill="${colorMap[status]}"/></svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

/** Returns a tray icon from assets, falling back to an in-memory icon. */
function loadTrayIcon(status: TrayStatus): Electron.NativeImage {
  if (status === 'distracted') return createFallbackIcon(status);
  const iconPath = path.join(__dirname, '../assets/tray', `tray-${status}.png`);
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? createFallbackIcon(status) : image;
}

/** Sends a pause or resume event from main to renderer after tray interaction. */
function emitMonitoringState(window: BrowserWindow, nextPaused: boolean): void {
  paused = nextPaused;
  window.webContents.send(nextPaused ? 'ergoremind:pause-monitoring' : 'ergoremind:resume-monitoring');
  renderTrayStatus();
}

/** Resolves tray state with pause first, then bad posture, then distraction. */
function getResolvedStatus(): TrayStatus {
  if (paused) return 'paused';
  if (postureStatus === 'bad') return 'bad';
  if (focusDistracted) return 'distracted';
  return 'good';
}

/** Applies the resolved icon and tooltip to the live tray. */
function renderTrayStatus(): void {
  const status = getResolvedStatus();
  tray?.setImage(loadTrayIcon(status));
  const focusText = focusGuardEnabled ? ` | Focus: ${focusDistracted ? 'Distracted' : 'Focused'}` : '';
  tray?.setToolTip(`ergoRemind | Posture: ${postureStatus === 'bad' ? 'Bad' : 'Good'}${focusText}`);
}

/** Creates the system tray icon and contextual menu for app control. */
export function createAppTray(window: BrowserWindow): Tray {
  mainWindow = window;
  tray = new Tray(loadTrayIcon('paused'));
  tray.setToolTip('ergoremind');
  tray.setContextMenu(buildTrayMenu(window));
  tray.on('click', () => {
    window.show();
  });
  return tray;
}

/** Rebuilds the tray menu with the current paused state reflected. */
function buildTrayMenu(window: BrowserWindow): Electron.Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Open ergoRemind',
      click: () => {
        window.show();
      },
    },
    {
      label: paused ? 'Resume Monitoring' : 'Pause Monitoring',
      click: () => {
        emitMonitoringState(window, !paused);
        tray?.setContextMenu(buildTrayMenu(window));
      },
    },
    {
      label: focusGuardEnabled ? 'Disable Focus Guard' : 'Enable Focus Guard',
      click: () => {
        window.webContents.send('ergoremind:toggle-focus-guard');
      },
    },
    {
      label: "Today's Stats",
      click: () => {
        window.show();
        window.webContents.send('ergoremind:resume-monitoring');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
}

/** Updates the tray status icon to show good, bad, paused, or distracted posture/focus state. */
export function updateTrayIcon(status: TrayStatus): void {
  if (status === 'paused') {
    paused = true;
  } else {
    paused = false;
    if (status === 'good' || status === 'bad') {
      postureStatus = status;
    }
  }
  renderTrayStatus();
}

/** Updates the Focus Guard enabled state in the tray menu. */
export function setFocusGuardEnabled(enabled: boolean): void {
  focusGuardEnabled = enabled;
  if (!enabled) focusDistracted = false;
  if (tray && mainWindow) {
    tray.setContextMenu(buildTrayMenu(mainWindow));
  }
  renderTrayStatus();
}

/** Updates only the Focus Guard portion of the combined tray status. */
export function setFocusDistracted(distracted: boolean): void {
  focusDistracted = distracted;
  renderTrayStatus();
}
