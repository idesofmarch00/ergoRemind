import { contextBridge, ipcRenderer } from 'electron';
import type { AppSettings, DailyStats, ergoremindAPI, NotificationPayload, PostureSession, TrayStatus, FocusStats, FocusGuardCapability } from '../src/types';

/** Subscribes to a main-to-renderer IPC event with optional data and returns a cleanup function. */
function subscribe<T = void>(channel: string, callback: (data: T) => void): () => void {
  const listener = (_event: unknown, data: T): void => {
    callback(data);
  };
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const api: ergoremindAPI = {
  /** renderer to main: loads persisted app settings. */
  getSettings: () => ipcRenderer.invoke('ergoremind:get-settings') as Promise<AppSettings>,
  /** renderer to main: saves changed app settings. */
  saveSettings: (settings: Partial<AppSettings>) =>
    ipcRenderer.invoke('ergoremind:save-settings', settings) as Promise<AppSettings>,
  /** renderer to main: loads daily stats for a given date. */
  getStats: (date?: string) => ipcRenderer.invoke('ergoremind:get-stats', date) as Promise<DailyStats>,
  /** renderer to main: writes a full daily stats object. */
  saveStats: (stats: DailyStats) => ipcRenderer.invoke('ergoremind:save-stats', stats) as Promise<DailyStats>,
  /** renderer to main: appends a completed session to today's stats. */
  saveSession: (session: PostureSession) =>
    ipcRenderer.invoke('ergoremind:save-session', session) as Promise<DailyStats>,
  /** renderer to main: sends a native notification. */
  sendNotification: (payload: NotificationPayload) =>
    ipcRenderer.invoke('ergoremind:send-notification', payload) as Promise<void>,
  /** renderer to main: starts wellness timers. */
  startTimers: () => ipcRenderer.invoke('ergoremind:start-timers') as Promise<void>,
  /** renderer to main: stops wellness timers. */
  stopTimers: () => ipcRenderer.invoke('ergoremind:stop-timers') as Promise<void>,
  /** renderer to main: updates the tray posture status. */
  updateTrayStatus: (status: TrayStatus) => ipcRenderer.invoke('ergoremind:update-tray-status', status) as Promise<void>,
  /** main to renderer: receives stand-up reminder events. */
  onStandupReminder: (callback: () => void) => subscribe<void>('ergoremind:standup-reminder', callback),
  /** main to renderer: receives eye-rest reminder events. */
  onEyeReminder: (callback: () => void) => subscribe<void>('ergoremind:eye-reminder', callback),
  /** main to renderer: receives tray pause events. */
  onPauseMonitoring: (callback: () => void) => subscribe<void>('ergoremind:pause-monitoring', callback),
  /** main to renderer: receives tray resume events. */
  onResumeMonitoring: (callback: () => void) => subscribe<void>('ergoremind:resume-monitoring', callback),
  /** renderer to main: starts active window distraction monitoring. */
  startFocusGuard: () => ipcRenderer.invoke('ergoremind:start-focus-guard') as Promise<void>,
  /** renderer to main: stops distraction monitoring. */
  stopFocusGuard: () => ipcRenderer.invoke('ergoremind:stop-focus-guard') as Promise<void>,
  /** renderer to main: retrieves distraction statistics. */
  getFocusStats: () => ipcRenderer.invoke('ergoremind:get-focus-stats') as Promise<FocusStats>,
  /** renderer to main: reports whether active-window monitoring is supported. */
  getFocusGuardCapability: () => ipcRenderer.invoke('ergoremind:get-focus-capability') as Promise<FocusGuardCapability>,
  /** renderer to main: requests to hide the distraction alert overlay. */
  dismissOverlay: () => ipcRenderer.invoke('ergoremind:dismiss-overlay') as Promise<void>,
  /** main to renderer: receives distraction alert details. */
  onDistractionDetected: (callback: (event: { appName: string; duration: number }) => void) =>
    subscribe<{ appName: string; duration: number }>('ergoremind:distraction-detected', callback),
  /** main to renderer: receives notice when focus is restored. */
  onFocusRestored: (callback: () => void) => subscribe<void>('ergoremind:focus-restored', callback),
  /** main to renderer: receives focus statistics updates. */
  onFocusStatsUpdated: (callback: (stats: FocusStats) => void) => subscribe<FocusStats>('ergoremind:focus-stats-updated', callback),
  /** main to renderer: receives Focus Guard permission or persistence errors. */
  onFocusGuardError: (callback: (message: string) => void) => subscribe<string>('ergoremind:focus-error', callback),
  /** main to renderer: receives notice when Focus Guard is toggled in system tray. */
  onToggleFocusGuard: (callback: () => void) => subscribe<void>('ergoremind:toggle-focus-guard', callback),
};

contextBridge.exposeInMainWorld('ergoremind', api);
