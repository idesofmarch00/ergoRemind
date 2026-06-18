import type { DistractionEvent, FocusStats } from '../types/index.ts';

export const FOCUS_PRESETS: Record<string, string[]> = {
  Entertainment: ['YouTube', 'Netflix', 'Twitch', 'Disney+', 'Hulu', 'Prime Video'],
  Social: ['Twitter', 'X', 'Reddit', 'Instagram', 'Facebook', 'TikTok', 'Snapchat'],
  Chat: ['Discord', 'Telegram', 'WhatsApp'],
  Gaming: ['Steam', 'Epic Games', 'Battle.net'],
};

/** Returns whether an app name or window title contains a blocklist keyword. */
export function matchesBlocklist(blocklist: string[], appName: string, windowTitle: string): boolean {
  const normalizedApp = appName.toLowerCase();
  const normalizedTitle = windowTitle.toLowerCase();
  return blocklist.some((keyword) => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return normalizedKeyword.length > 0
      && (normalizedApp.includes(normalizedKeyword) || normalizedTitle.includes(normalizedKeyword));
  });
}

/** Adds a missing preset or removes all of its keywords when already active. */
export function togglePreset(blocklist: string[], preset: string[]): string[] {
  const normalizedPreset = new Set(preset.map((word) => word.toLowerCase()));
  const isActive = preset.every((word) =>
    blocklist.some((keyword) => keyword.toLowerCase() === word.toLowerCase()),
  );
  if (isActive) {
    return blocklist.filter((keyword) => !normalizedPreset.has(keyword.toLowerCase()));
  }
  return [
    ...blocklist,
    ...preset.filter((word) => !blocklist.some((keyword) => keyword.toLowerCase() === word.toLowerCase())),
  ];
}

/** Computes aggregate Focus Guard metrics from completed distraction events. */
export function calculateFocusStats(events: DistractionEvent[], totalTrackingMs: number): FocusStats {
  const totalDistractionMs = events.reduce((total, event) => total + event.durationMs, 0);
  const distractionsByApp: Record<string, number> = {};
  for (const event of events) {
    distractionsByApp[event.appName] = (distractionsByApp[event.appName] ?? 0) + event.durationMs;
  }
  const measuredTrackingMs = Math.max(totalTrackingMs, totalDistractionMs);
  const focusPercentage = measuredTrackingMs === 0
    ? 100
    : Math.max(0, Math.min(100, Math.round(((measuredTrackingMs - totalDistractionMs) / measuredTrackingMs) * 100)));
  return {
    totalDistractionMs,
    distractionCount: events.length,
    focusPercentage,
    distractionsByApp,
  };
}
