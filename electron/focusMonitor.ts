import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AppSettings, ActiveWindowInfo, DistractionEvent } from '../src/types';
import { saveDistractionEvent, incrementTrackingTime } from './store';

const execFileAsync = promisify(execFile);

// AppleScript to get the frontmost app name and its window title
const APPLE_SCRIPT = `
tell application "System Events"
  set frontApp to first process whose frontmost is true
  set appName to name of frontApp
  try
    set winTitle to name of window 1 of frontApp
  on error
    set winTitle to ""
  end try
  return appName & "|" & winTitle
end tell
`.trim();

export interface FocusMonitorCallbacks {
  onDistractionDetected: (appName: string, durationMs: number) => void;
  onFocusRestored: () => void;
  onAlert: (appName: string, durationMs: number) => void;
  onStateChange: (state: string) => void;
}

/**
 * FocusMonitor polls macOS for the frontmost active window and matches it against
 * a blocklist of distracting apps and sites. It implements a state machine to
 * handle alert delays, alert triggers, and cooldowns.
 */
export class FocusMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private settings: AppSettings;
  private callbacks: FocusMonitorCallbacks;
  
  // State machine tracking
  private state: 'monitoring' | 'distracted' | 'alerting' | 'cooldown' = 'monitoring';
  private distractionStartTime: number | null = null;
  private lastAlertTime: number | null = null;
  private currentDistractedApp: string | null = null;
  private isPaused = false;

  constructor(settings: AppSettings, callbacks: FocusMonitorCallbacks) {
    this.settings = settings;
    this.callbacks = callbacks;
  }

  /** Gets the active window info on macOS using AppleScript. */
  public async getActiveWindow(): Promise<ActiveWindowInfo> {
    try {
      const { stdout } = await execFileAsync('osascript', ['-e', APPLE_SCRIPT], { timeout: 1500 });
      const parts = stdout.trim().split('|');
      return {
        appName: parts[0] || 'Unknown',
        windowTitle: parts[1] || '',
      };
    } catch (error) {
      console.error('FocusMonitor: Error executing AppleScript', error);
      return { appName: 'Unknown', windowTitle: '' };
    }
  }

  /** Starts the polling interval. */
  public start(): void {
    if (this.intervalId) return;
    this.isPaused = false;
    this.state = 'monitoring';
    this.callbacks.onStateChange(this.state);

    const intervalMs = this.settings.focusCheckInterval * 1000;
    
    this.intervalId = setInterval(async () => {
      if (this.isPaused) return;

      // Track active monitoring time
      try {
        await incrementTrackingTime(intervalMs);
      } catch (err) {
        console.error('FocusMonitor: Failed to increment tracking time', err);
      }

      const info = await this.getActiveWindow();
      this.tick(info);
    }, intervalMs);
  }

  /** Stops the polling interval and saves any pending distraction event. */
  public async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.distractionStartTime && this.currentDistractedApp) {
      const durationMs = Date.now() - this.distractionStartTime;
      const event: DistractionEvent = {
        appName: this.currentDistractedApp,
        startTime: this.distractionStartTime,
        endTime: Date.now(),
        durationMs,
      };
      try {
        await saveDistractionEvent(event);
      } catch (err) {
        console.error('FocusMonitor: Failed to save final distraction event', err);
      }
    }

    this.distractionStartTime = null;
    this.currentDistractedApp = null;
    this.state = 'monitoring';
  }

  /** Pause monitoring (e.g. when system is locked or screen suspends). */
  public pause(): void {
    this.isPaused = true;
  }

  /** Resume monitoring. */
  public resume(): void {
    this.isPaused = false;
  }

  /** Update settings without stopping. */
  public updateSettings(settings: AppSettings): void {
    const oldInterval = this.settings.focusCheckInterval;
    this.settings = settings;

    // If interval changed, restart polling
    if (oldInterval !== settings.focusCheckInterval && this.intervalId) {
      this.stop().then(() => this.start());
    }
  }

  /** Core state machine tick. */
  private async tick(info: ActiveWindowInfo): Promise<void> {
    const isBlocked = this.isDistraction(info.appName, info.windowTitle);
    const now = Date.now();

    // Do not count the app's own window as a distraction
    if (info.appName === 'ergoRemind' || info.appName === 'Electron') {
      this.handleProductiveTick();
      return;
    }

    if (isBlocked) {
      if (this.state === 'monitoring') {
        // Just entered distraction
        this.state = 'distracted';
        this.distractionStartTime = now;
        this.currentDistractedApp = info.appName;
        this.callbacks.onStateChange(this.state);
        this.callbacks.onDistractionDetected(info.appName, 0);
      } else if (this.state === 'distracted') {
        const durationSec = (now - (this.distractionStartTime || now)) / 1000;
        this.callbacks.onDistractionDetected(info.appName, now - (this.distractionStartTime || now));

        if (durationSec >= this.settings.distractionAlertDelay) {
          // Alert delay passed, trigger alert
          this.state = 'alerting';
          this.lastAlertTime = now;
          this.callbacks.onStateChange(this.state);
          this.callbacks.onAlert(info.appName, now - (this.distractionStartTime || now));
        }
      } else if (this.state === 'alerting') {
        // Overlay is visible/auto-dismissing, move to cooldown
        this.state = 'cooldown';
        this.callbacks.onStateChange(this.state);
      } else if (this.state === 'cooldown') {
        const cooldownSec = (now - (this.lastAlertTime || now)) / 1000;
        this.callbacks.onDistractionDetected(info.appName, now - (this.distractionStartTime || now));

        if (cooldownSec >= this.settings.distractionCooldown) {
          // Cooldown finished, move back to distracted state
          this.state = 'distracted';
          this.callbacks.onStateChange(this.state);
        }
      }
    } else {
      // Productive window active
      this.handleProductiveTick();
    }
  }

  /** Handle transition back to productive app. */
  private async handleProductiveTick(): Promise<void> {
    if (this.state !== 'monitoring') {
      const wasDistracted = this.distractionStartTime !== null;
      const appName = this.currentDistractedApp;
      const startTime = this.distractionStartTime;

      this.state = 'monitoring';
      this.distractionStartTime = null;
      this.currentDistractedApp = null;
      this.callbacks.onStateChange(this.state);
      this.callbacks.onFocusRestored();

      if (wasDistracted && appName && startTime) {
        const durationMs = Date.now() - startTime;
        if (durationMs >= 1000) {
          const event: DistractionEvent = {
            appName,
            startTime,
            endTime: Date.now(),
            durationMs,
          };
          try {
            await saveDistractionEvent(event);
          } catch (err) {
            console.error('FocusMonitor: Failed to save distraction event', err);
          }
        }
      }
    }
  }

  /** Check if the active window matches the blocklist. */
  private isDistraction(appName: string, windowTitle: string): boolean {
    const list = this.settings.blocklist || [];
    if (list.length === 0) return false;
    
    const appLower = appName.toLowerCase();
    const titleLower = windowTitle.toLowerCase();
    
    return list.some(keyword => {
      const cleanKeyword = keyword.trim().toLowerCase();
      if (!cleanKeyword) return false;
      return appLower.includes(cleanKeyword) || titleLower.includes(cleanKeyword);
    });
  }
}
