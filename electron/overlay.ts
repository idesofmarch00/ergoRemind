import { BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let overlayWindow: BrowserWindow | null = null;
let dismissTimer: NodeJS.Timeout | null = null;

/** Clears the current overlay auto-dismiss timer. */
function clearDismissTimer(): void {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

/** Creates the transparent, frameless overlay window. */
export function createOverlayWindow(): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds; // use bounds for screen centering
  const overlayWidth = 420;
  const overlayHeight = 220;
  
  overlayWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x: Math.round((width - overlayWidth) / 2),
    y: Math.round((height - overlayHeight) / 2),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    focusable: false,      // Don't steal focus from user typing
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  // Ensure window stays above fullscreen apps on macOS
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true);

  if (process.env.VITE_DEV_SERVER_URL) {
    overlayWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}overlay.html`);
  } else {
    overlayWindow.loadURL('app://overlay.html');
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

/** Shows the overlay window with distraction alert data. */
export function showOverlay(data: { appName: string; duration: number }): void {
  const win = createOverlayWindow();
  clearDismissTimer();
  
  const sendData = () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('ergoremind:distraction-detected', data);
      win.showInactive(); // Show without taking keyboard focus
      dismissTimer = setTimeout(hideOverlay, 5000);
    }
  };

  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', sendData);
  } else {
    sendData();
  }
}

/** Hides the overlay window. */
export function hideOverlay(): void {
  clearDismissTimer();
  if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
    overlayWindow.webContents.send('ergoremind:focus-restored');
    // Hide it with a small delay to allow fade-out animation in React renderer
    setTimeout(() => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.hide();
      }
    }, 500); // 500ms matches fade-out duration
  }
}

/** Destroys the overlay window when Focus Guard is disabled. */
export function destroyOverlay(): void {
  clearDismissTimer();
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy();
  }
  overlayWindow = null;
}
