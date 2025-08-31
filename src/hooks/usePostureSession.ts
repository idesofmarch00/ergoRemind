import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DailyStats, PostureFrame, PostureSession } from '@/types';

interface UsePostureSessionOptions {
  frame: PostureFrame | null;
  isMonitoring: boolean;
}

interface UsePostureSessionResult {
  session: PostureSession;
  stats: DailyStats | null;
  saveCurrentSession: () => Promise<void>;
}

/** Creates a fresh posture session object. */
function createSession(startTime = Date.now()): PostureSession {
  return {
    startTime,
    totalFrames: 0,
    goodFrames: 0,
    badFrames: 0,
    goodPercent: 0,
    durationMs: 0,
  };
}

/** Updates a session with a newly analyzed posture frame. */
function reduceSession(session: PostureSession, frame: PostureFrame): PostureSession {
  const totalFrames = session.totalFrames + 1;
  const goodFrames = session.goodFrames + (frame.isGood ? 1 : 0);
  const badFrames = session.badFrames + (frame.isGood ? 0 : 1);
  return {
    ...session,
    totalFrames,
    goodFrames,
    badFrames,
    goodPercent: Math.round((goodFrames / totalFrames) * 100),
    durationMs: Date.now() - session.startTime,
  };
}

/** Tracks the active posture session and persists completed sessions. */
export function usePostureSession(options: UsePostureSessionOptions): UsePostureSessionResult {
  const { frame, isMonitoring } = options;
  const [session, setSession] = useState<PostureSession>(() => createSession());
  const [stats, setStats] = useState<DailyStats | null>(null);
  const lastFrameTimestampRef = useRef<number | null>(null);
  const sessionRef = useRef(session);

  const saveCurrentSession = useCallback(async (): Promise<void> => {
    if (sessionRef.current.totalFrames === 0 || !window.ergoremind) {
      return;
    }
    const savedStats = await window.ergoremind.saveSession(sessionRef.current);
    setStats(savedStats);
    const nextSession = createSession();
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (window.ergoremind) {
      window.ergoremind.getStats().then(setStats).catch(() => {
        setStats(null);
      });
    }
    return () => {
      lastFrameTimestampRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isMonitoring) {
      void saveCurrentSession();
      return () => {
        lastFrameTimestampRef.current = null;
      };
    }

    if (frame && frame.timestamp !== lastFrameTimestampRef.current) {
      lastFrameTimestampRef.current = frame.timestamp;
      setSession((current) => reduceSession(current, frame));
    }

    return () => {
      if (!isMonitoring) {
        lastFrameTimestampRef.current = null;
      }
    };
  }, [frame, isMonitoring, saveCurrentSession]);

  return useMemo(() => ({ session, stats, saveCurrentSession }), [session, stats, saveCurrentSession]);
}
