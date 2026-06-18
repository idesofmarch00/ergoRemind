import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AppSettings, ActiveWindowInfo, DistractionEvent } from '../src/types';
import { saveDistractionEvent, incrementTrackingTime } from './store';
import { matchesBlocklist } from '../src/utils/focusUtils';

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
  onError: (message: string) => void;
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
  private pollInFlight = false;
  private lastError: string | null = null;

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
    } catch {
      const message = 'Focus Guard cannot read the active window. Allow your terminal or Electron under System Settings > Privacy & Security > Accessibility.';
      if (message !== this.lastError) {
        this.lastError = message;
        this.callbacks.onError(message);
      }
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
    
    this.intervalId = setInterval(() => {
      void this.poll(intervalMs);
    }, intervalMs);
  }

  /** Stops the polling interval and saves any pending distraction event. */
  public async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    await this.finishDistraction(Date.now());
    this.resetState();
  }

  /** Pause monitoring (e.g. when system is locked or screen suspends). */
  public async pause(): Promise<void> {
    this.isPaused = true;
    await this.finishDistraction(Date.now());
    this.resetState();
  }

  /** Resume monitoring. */
  public resume(): void {
    this.isPaused = false;
    this.resetState();
  }

  /** Update settings without stopping. */
  public updateSettings(settings: AppSettings): void {
    const oldInterval = this.settings.focusCheckInterval;
    this.settings = settings;

    // If interval changed, restart polling
    if (oldInterval !== settings.focusCheckInterval && this.intervalId) {
      void this.stop().then(() => this.start());
    }
  }

  /** Runs one non-overlapping active-window poll and persistence update. */
  private async poll(intervalMs: number): Promise<void> {
    if (this.isPaused || this.pollInFlight) return;
    this.pollInFlight = true;
    try {
      const info = await this.getActiveWindow();
      if (info.appName === 'Unknown') return;
      this.lastError = null;
      await incrementTrackingTime(intervalMs);
      await this.tick(info);
    } catch {
      this.callbacks.onError('Focus Guard could not update local tracking statistics.');
    } finally {
      this.pollInFlight = false;
    }
  }

  /** Core state machine tick. */
  private async tick(info: ActiveWindowInfo): Promise<void> {
    const isBlocked = this.isDistraction(info.appName, info.windowTitle);
    const now = Date.now();

    // Do not count the app's own window as a distraction
    if (info.appName === 'ergoRemind' || info.appName === 'Electron') {
      await this.handleProductiveTick();
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
      await this.handleProductiveTick();
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
          await saveDistractionEvent(event);
        }
      }
    }
  }

  /** Persists the active distraction up to the supplied end time. */
  private async finishDistraction(endTime: number): Promise<void> {
    if (!this.distractionStartTime || !this.currentDistractedApp) return;
    const durationMs = endTime - this.distractionStartTime;
    if (durationMs < 1000) return;
    const event: DistractionEvent = {
      appName: this.currentDistractedApp,
      startTime: this.distractionStartTime,
      endTime,
      durationMs,
    };
    try {
      await saveDistractionEvent(event);
    } catch {
      this.callbacks.onError('Focus Guard could not save the latest distraction event.');
    }
  }

  /** Clears distraction timing and returns the state machine to monitoring. */
  private resetState(): void {
    this.distractionStartTime = null;
    this.currentDistractedApp = null;
    this.lastAlertTime = null;
    this.state = 'monitoring';
    this.callbacks.onStateChange(this.state);
  }

  /** Check if the active window matches the blocklist. */
  private isDistraction(appName: string, windowTitle: string): boolean {
    return matchesBlocklist(this.settings.blocklist, appName, windowTitle);
  }
}
