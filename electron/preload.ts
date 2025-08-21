import { contextBridge, ipcRenderer } from 'electron';
import type { AppSettings, DailyStats, ergoremindAPI, NotificationPayload, PostureSession, TrayStatus } from '../src/types';

/** Subscribes to a main-to-renderer IPC event and returns a cleanup function. */
function subscribe(channel: string, callback: () => void): () => void {
  const listener = (): void => {
    callback();
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
  onStandupReminder: (callback: () => void) => subscribe('ergoremind:standup-reminder', callback),
  /** main to renderer: receives eye-rest reminder events. */
  onEyeReminder: (callback: () => void) => subscribe('ergoremind:eye-reminder', callback),
  /** main to renderer: receives tray pause events. */
  onPauseMonitoring: (callback: () => void) => subscribe('ergoremind:pause-monitoring', callback),
  /** main to renderer: receives tray resume events. */
  onResumeMonitoring: (callback: () => void) => subscribe('ergoremind:resume-monitoring', callback),
};

contextBridge.exposeInMainWorld('ergoremind', api);
