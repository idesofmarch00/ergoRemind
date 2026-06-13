import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppSettings, DailyStats, PostureSession, DistractionEvent } from '../src/types';

export const DEFAULT_SETTINGS: AppSettings = {
  slouchThreshold: 25,       // higher = more forgiving (minor tilts ignored)
  alertDelay: 60,            // seconds of continuous bad posture before alert fires
  alertCooldown: 120,        // seconds between repeated alerts
  standUpInterval: 30,       // minutes between stand-up reminders
  eyeRuleInterval: 20,       // minutes between 20-20-20 eye rule reminders
  soundEnabled: true,
  selectedCamera: 'default',
  startMinimized: false,
  calibration: null,
  focusGuardEnabled: false,
  blocklist: [],
  focusCheckInterval: 5,
  distractionAlertDelay: 10,
  distractionCooldown: 60,
};

/** Returns today's date in YYYY-MM-DD format for stats file naming. */
export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Builds an empty stats object for a given date. */
export function createDefaultStats(date = getTodayKey()): DailyStats {
  return {
    date,
    sessions: [],
    totalGoodMs: 0,
    totalBadMs: 0,
    distractionEvents: [],
    focusStats: {
      totalDistractionMs: 0,
      distractionCount: 0,
      focusPercentage: 100,
      distractionsByApp: {},
    },
    totalTrackingMs: 0,
  };
}

/** Ensures the app's user data directory exists before JSON file operations. */
async function ensureStoreDir(): Promise<string> {
  const directory = app.getPath('userData');
  await mkdir(directory, { recursive: true });
  return directory;
}

/** Returns the absolute path for the settings JSON file. */
async function getSettingsPath(): Promise<string> {
  return path.join(await ensureStoreDir(), 'ergoremind-settings.json');
}

/** Returns the absolute path for a dated stats JSON file. */
async function getStatsPath(date = getTodayKey()): Promise<string> {
  return path.join(await ensureStoreDir(), `ergoremind-stats-${date}.json`);
}

/** Checks that a loaded value looks like app settings before merging defaults. */
function normalizeSettings(value: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    calibration: value.calibration ?? null,
    blocklist: value.blocklist ?? [],
  };
}

/** Reads persisted settings, falling back to defaults on missing or invalid files. */
export async function readSettings(): Promise<AppSettings> {
  try {
    const filePath = await getSettingsPath();
    const raw = await readFile(filePath, 'utf8');
    return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Saves a partial settings update and returns the merged settings object. */
export async function saveSettings(update: Partial<AppSettings>): Promise<AppSettings> {
  const settings = normalizeSettings({ ...(await readSettings()), ...update });
  try {
    await writeFile(await getSettingsPath(), JSON.stringify(settings, null, 2), 'utf8');
  } catch {
    return DEFAULT_SETTINGS;
  }
  return settings;
}

/** Reads a daily stats file, falling back to a clean day on read errors. */
export async function readStats(date = getTodayKey()): Promise<DailyStats> {
  try {
    const raw = await readFile(await getStatsPath(date), 'utf8');
    const stats = JSON.parse(raw) as DailyStats;
    // Normalize old stats format
    if (!stats.distractionEvents) stats.distractionEvents = [];
    if (!stats.focusStats) {
      stats.focusStats = {
        totalDistractionMs: 0,
        distractionCount: 0,
        focusPercentage: 100,
        distractionsByApp: {},
      };
    }
    if (stats.totalTrackingMs === undefined) stats.totalTrackingMs = 0;
    return stats;
  } catch {
    return createDefaultStats(date);
  }
}

/** Writes daily stats to disk and returns the written object. */
export async function saveStats(stats: DailyStats): Promise<DailyStats> {
  try {
    await writeFile(await getStatsPath(stats.date), JSON.stringify(stats, null, 2), 'utf8');
    return stats;
  } catch {
    return createDefaultStats(stats.date);
  }
}

/** Appends a completed posture session to today's stats file. */
export async function saveSession(session: PostureSession): Promise<DailyStats> {
  const stats = await readStats();
  const frameMs = session.totalFrames > 0 ? session.durationMs / session.totalFrames : 0;
  const nextStats: DailyStats = {
    ...stats,
    sessions: [...stats.sessions, session],
    totalGoodMs: stats.totalGoodMs + Math.round(session.goodFrames * frameMs),
    totalBadMs: stats.totalBadMs + Math.round(session.badFrames * frameMs),
  };
  return saveStats(nextStats);
}

/** Recalculates and updates focusStats for a DailyStats object based on distractionEvents and totalTrackingMs. */
export function recalculateFocusStats(stats: DailyStats): void {
  const distractionEvents = stats.distractionEvents || [];
  const totalDistractionMs = distractionEvents.reduce((acc, e) => acc + e.durationMs, 0);
  const distractionCount = distractionEvents.length;
  
  const distractionsByApp: Record<string, number> = {};
  for (const event of distractionEvents) {
    distractionsByApp[event.appName] = (distractionsByApp[event.appName] || 0) + event.durationMs;
  }

  const totalTrackingMs = stats.totalTrackingMs || totalDistractionMs || 1; // avoid division by zero
  const focusPercentage = Math.max(0, Math.min(100, Math.round(((totalTrackingMs - totalDistractionMs) / totalTrackingMs) * 100)));

  stats.focusStats = {
    totalDistractionMs,
    distractionCount,
    focusPercentage,
    distractionsByApp,
  };
}

/** Saves a completed distraction event to today's stats file. */
export async function saveDistractionEvent(event: DistractionEvent): Promise<DailyStats> {
  const stats = await readStats();
  const nextStats: DailyStats = {
    ...stats,
    distractionEvents: [...(stats.distractionEvents || []), event],
  };
  recalculateFocusStats(nextStats);
  return saveStats(nextStats);
}

/** Increments the total tracking time of Focus Guard and saves it. */
export async function incrementTrackingTime(ms: number): Promise<DailyStats> {
  const stats = await readStats();
  const nextStats: DailyStats = {
    ...stats,
    totalTrackingMs: (stats.totalTrackingMs || 0) + ms,
  };
  recalculateFocusStats(nextStats);
  return saveStats(nextStats);
}
