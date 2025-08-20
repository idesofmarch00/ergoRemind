import type { BrowserWindow } from 'electron';
import { sendNativeNotification } from './notifications';
import type { AppSettings } from '../src/types';

let standupTimer: NodeJS.Timeout | null = null;
let eyeTimer: NodeJS.Timeout | null = null;

/** Clears all wellness reminder timers. */
export function stopWellnessTimers(): void {
  if (standupTimer) {
    clearInterval(standupTimer);
    standupTimer = null;
  }

  if (eyeTimer) {
    clearInterval(eyeTimer);
    eyeTimer = null;
  }
}

/** Starts stand-up and eye-rule timers in the Electron main process. */
export function startWellnessTimers(window: BrowserWindow, settings: AppSettings): void {
  stopWellnessTimers();

  standupTimer = setInterval(() => {
    window.webContents.send('ergoremind:standup-reminder');
    sendNativeNotification({
      title: 'Stand up break',
      body: 'Time to stand up. Walk for 2 minutes.',
      type: 'standup',
    });
  }, settings.standUpInterval * 60 * 1000);

  eyeTimer = setInterval(() => {
    window.webContents.send('ergoremind:eye-reminder');
    sendNativeNotification({
      title: '20-20-20 eye break',
      body: 'Look 20 feet away for 20 seconds.',
      type: 'eye',
    });
  }, settings.eyeRuleInterval * 60 * 1000);
}
