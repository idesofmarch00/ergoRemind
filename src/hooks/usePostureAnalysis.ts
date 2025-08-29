import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AlertState, AppSettings, PostureFrame, PostureLandmark } from '@/types';
import { analyzePosture } from '@/utils/postureUtils';

interface UsePostureAnalysisOptions {
  landmarks: PostureLandmark[] | null;
  settings: AppSettings;
  isMonitoring: boolean;
}

interface UsePostureAnalysisResult {
  frame: PostureFrame | null;
  alertState: AlertState;
}

import alertSound from '../../assets/sounds/alert.wav';

/** Sends a posture notification through the preload IPC API and plays an alert sound. */
async function sendPostureAlert(soundEnabled: boolean): Promise<void> {
  if (soundEnabled) {
    try {
      const audio = new Audio(alertSound);
      await audio.play();
    } catch {
      // Ignore audio play errors (e.g. autoplay blocked)
    }
  }

  if (window.ergoremind) {
    await window.ergoremind.sendNotification({
      title: 'Posture check',
      body: 'You seem to be slouching. Sit tall and relax your shoulders.',
      type: 'posture',
    });
  }
}

/**
 * Converts landmarks into posture frames and manages the alert cooldown state.
 *
 * Alert logic inspired by PostureCorrectionAlarm-TFJs:
 *   - Track how long bad posture is sustained (badSinceRef)
 *   - Once it exceeds alertDelay seconds, fire a notification
 *   - Then enter cooldown for alertCooldown seconds
 *
 * Key fix: the previous implementation was resetting badSinceRef in cleanup
 * functions on every render, preventing alerts from ever building up. Now
 * we only reset when posture becomes good or monitoring stops.
 */
export function usePostureAnalysis(options: UsePostureAnalysisOptions): UsePostureAnalysisResult {
  const { landmarks, settings, isMonitoring } = options;
  const [frame, setFrame] = useState<PostureFrame | null>(null);
  const [alertState, setAlertState] = useState<AlertState>('IDLE');
  const badSinceRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef<number | null>(null);

  /** Updates the tray icon to reflect current posture status. */
  const updateTray = useCallback(async (nextFrame: PostureFrame | null): Promise<void> => {
    if (!window.ergoremind) return;
    if (!isMonitoring) {
      await window.ergoremind.updateTrayStatus('paused');
      return;
    }
    await window.ergoremind.updateTrayStatus(nextFrame?.isGood === false ? 'bad' : 'good');
  }, [isMonitoring]);

  useEffect(() => {
    if (!isMonitoring) {
      setAlertState('IDLE');
      setFrame(null);
      badSinceRef.current = null;
      cooldownUntilRef.current = null;
      void updateTray(null);
      return;
    }

    const nextFrame = landmarks ? analyzePosture(landmarks, settings) : null;
    setFrame(nextFrame);
    void updateTray(nextFrame);

    if (!nextFrame) {
      setAlertState('MONITORING');
      return;
    }

    const now = Date.now();

    // In cooldown — wait it out
    if (cooldownUntilRef.current && now < cooldownUntilRef.current) {
      setAlertState('COOLDOWN');
      return;
    }

    // Good posture — reset bad-posture timer
    if (nextFrame.isGood) {
      badSinceRef.current = null;
      cooldownUntilRef.current = null;
      setAlertState('MONITORING');
      return;
    }

    // Bad posture — start or continue timing
    if (badSinceRef.current === null) {
      badSinceRef.current = now;
    }

    const badDurationMs = now - badSinceRef.current;

    if (badDurationMs >= settings.alertDelay * 1000) {
      // Bad posture held long enough — fire alert!
      setAlertState('ALERTING');
      void sendPostureAlert(settings.soundEnabled);
      cooldownUntilRef.current = now + settings.alertCooldown * 1000;
      badSinceRef.current = null;
      return;
    }

    setAlertState('BAD_POSTURE');
  }, [isMonitoring, landmarks, settings, updateTray]);

  return useMemo(() => ({ frame, alertState }), [frame, alertState]);
}
