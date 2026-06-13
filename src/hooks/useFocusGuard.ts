import { useEffect, useState, useCallback } from 'react';
import type { FocusStats, AppSettings } from '../types';
import alertSound from '../../assets/sounds/alert.wav';

interface UseFocusGuardResult {
  focusStats: FocusStats;
  currentDistraction: { appName: string; duration: number } | null;
  startFocusGuard: () => Promise<void>;
  stopFocusGuard: () => Promise<void>;
  reloadFocusStats: () => Promise<void>;
}

/**
 * useFocusGuard is a custom React hook that integrates with the preload IPC
 * Focus Guard API. It subscribes to distraction events, focus restoration events,
 * and handles playing sounds and loading daily statistics.
 */
export function useFocusGuard(settings: AppSettings): UseFocusGuardResult {
  const [focusStats, setFocusStats] = useState<FocusStats>({
    totalDistractionMs: 0,
    distractionCount: 0,
    focusPercentage: 100,
    distractionsByApp: {},
  });
  const [currentDistraction, setCurrentDistraction] = useState<{ appName: string; duration: number } | null>(null);

  const reloadFocusStats = useCallback(async () => {
    if (!window.ergoremind) return;
    try {
      const stats = await window.ergoremind.getFocusStats();
      setFocusStats(stats);
    } catch (err) {
      console.error('useFocusGuard: Failed to load focus stats', err);
    }
  }, []);

  const startFocusGuard = useCallback(async () => {
    if (!window.ergoremind) return;
    await window.ergoremind.startFocusGuard();
  }, []);

  const stopFocusGuard = useCallback(async () => {
    if (!window.ergoremind) return;
    await window.ergoremind.stopFocusGuard();
    setCurrentDistraction(null);
  }, []);

  useEffect(() => {
    if (!window.ergoremind) return;

    // Load initial stats
    reloadFocusStats();

    // Subscribe to distraction detections
    const unsubscribeDetect = window.ergoremind.onDistractionDetected((event) => {
      setCurrentDistraction(event);
      
      // Play alert sound if it's the start of distraction alert (duration is 0 or very small)
      if (event.duration === 0 && settings.soundEnabled) {
        try {
          const audio = new Audio(alertSound);
          audio.play().catch(() => {
            // Ignore autoplay blocks
          });
        } catch {
          // Ignore audio initialization errors
        }
      }
    });

    // Subscribe to focus restorations
    const unsubscribeRestore = window.ergoremind.onFocusRestored(() => {
      setCurrentDistraction(null);
      reloadFocusStats();
    });

    // Subscribe to real-time stats updates
    const unsubscribeStats = window.ergoremind.onFocusStatsUpdated((stats) => {
      setFocusStats(stats);
    });

    return () => {
      unsubscribeDetect();
      unsubscribeRestore();
      unsubscribeStats();
    };
  }, [reloadFocusStats, settings.soundEnabled]);

  return {
    focusStats,
    currentDistraction,
    startFocusGuard,
    stopFocusGuard,
    reloadFocusStats,
  };
}
