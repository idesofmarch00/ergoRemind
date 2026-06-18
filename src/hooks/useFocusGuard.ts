import { useEffect, useState, useCallback } from 'react';
import type { FocusStats, AppSettings, FocusGuardCapability } from '../types';
import alertSound from '../../assets/sounds/alert.wav';

interface UseFocusGuardResult {
  focusStats: FocusStats;
  currentDistraction: { appName: string; duration: number } | null;
  startFocusGuard: () => Promise<void>;
  stopFocusGuard: () => Promise<void>;
  reloadFocusStats: () => Promise<void>;
  capability: FocusGuardCapability;
  error: string | null;
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
  const [capability, setCapability] = useState<FocusGuardCapability>({ supported: true, reason: null });
  const [error, setError] = useState<string | null>(null);

  const reloadFocusStats = useCallback(async () => {
    if (!window.ergoremind) return;
    try {
      const stats = await window.ergoremind.getFocusStats();
      setFocusStats(stats);
    } catch {
      setError('Unable to load today\'s Focus Guard statistics.');
    }
  }, []);

  const startFocusGuard = useCallback(async () => {
    if (!window.ergoremind) return;
    try {
      await window.ergoremind.startFocusGuard();
    } catch {
      setError('Unable to start Focus Guard.');
    }
  }, []);

  const stopFocusGuard = useCallback(async () => {
    if (!window.ergoremind) return;
    try {
      await window.ergoremind.stopFocusGuard();
      setCurrentDistraction(null);
    } catch {
      setError('Unable to stop Focus Guard.');
    }
  }, []);

  useEffect(() => {
    if (!window.ergoremind) return;

    // Load initial stats
    void reloadFocusStats();
    void window.ergoremind.getFocusGuardCapability()
      .then(setCapability)
      .catch(() => {
        setCapability({ supported: false, reason: 'Unable to determine Focus Guard platform support.' });
      });

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
      void reloadFocusStats();
    });

    // Subscribe to real-time stats updates
    const unsubscribeStats = window.ergoremind.onFocusStatsUpdated((stats) => {
      setFocusStats(stats);
    });
    const unsubscribeError = window.ergoremind.onFocusGuardError(setError);

    return () => {
      unsubscribeDetect();
      unsubscribeRestore();
      unsubscribeStats();
      unsubscribeError();
    };
  }, [reloadFocusStats, settings.soundEnabled]);

  return {
    focusStats,
    currentDistraction,
    startFocusGuard,
    stopFocusGuard,
    reloadFocusStats,
    capability,
    error,
  };
}
