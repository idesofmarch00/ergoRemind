import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import type { TrayStatus } from '../src/types';

let tray: Tray | null = null;
let paused = false;

/** Builds a small fallback tray icon when asset files are unavailable. */
function createFallbackIcon(status: TrayStatus): Electron.NativeImage {
  const colorMap: Record<TrayStatus, string> = {
    good: '#22c55e',
    bad: '#ef4444',
    paused: '#64748b',
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"><circle cx="11" cy="11" r="8" fill="${colorMap[status]}"/></svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

/** Returns a tray icon from assets, falling back to an in-memory icon. */
function loadTrayIcon(status: TrayStatus): Electron.NativeImage {
  const iconPath = path.join(__dirname, '../assets/tray', `tray-${status}.png`);
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? createFallbackIcon(status) : image;
}

/** Sends a pause or resume event from main to renderer after tray interaction. */
function emitMonitoringState(window: BrowserWindow, nextPaused: boolean): void {
  paused = nextPaused;
  window.webContents.send(nextPaused ? 'ergoremind:pause-monitoring' : 'ergoremind:resume-monitoring');
  updateTrayIcon(nextPaused ? 'paused' : 'good');
}

/** Creates the system tray icon and contextual menu for app control. */
export function createAppTray(window: BrowserWindow): Tray {
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
      label: 'Open ergoremind',
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

/** Updates the tray status icon to show good, bad, or paused posture state. */
export function updateTrayIcon(status: TrayStatus): void {
  tray?.setImage(loadTrayIcon(status));
}
