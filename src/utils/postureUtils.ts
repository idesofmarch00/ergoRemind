import type { AppSettings, CalibrationData, PostureFrame, PostureLandmark } from '@/types';
import { LANDMARKS, getEarMidY, getShoulderMidY, hasRequiredLandmarks } from './landmarkUtils';

export interface Point {
  x: number;
  y: number;
}

export interface PostureSignals {
  headForwardRatio: number;
  slouchDelta: number;
  tiltDelta: number;
}

/** Calculates the angle between three points in degrees. */
export function calculateAngle(a: Point, b: Point, c: Point): number {
  // atan2 gives each segment's direction around point b; subtracting them gives the interior angle.
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  return Math.abs(radians * (180 / Math.PI));
}

/** Builds calibration data from the current seated-straight landmark frame. */
export function buildCalibration(landmarks: PostureLandmark[]): CalibrationData | null {
  if (!hasRequiredLandmarks(landmarks)) {
    return null;
  }

  const earMidY = getEarMidY(landmarks);
  const shoulderMidY = getShoulderMidY(landmarks);
  return {
    noseY: landmarks[LANDMARKS.NOSE].y,
    earMidY,
    shoulderMidY,
    headForwardRatio: earMidY / shoulderMidY,
    capturedAt: Date.now(),
  };
}

/** Extracts normalized posture signals from visible pose landmarks. */
export function extractPostureSignals(landmarks: PostureLandmark[], settings: AppSettings): PostureSignals | null {
  if (!hasRequiredLandmarks(landmarks)) {
    return null;
  }

  const earMidY = getEarMidY(landmarks);
  const shoulderMidY = getShoulderMidY(landmarks);
  const baselineNoseY = settings.calibration?.noseY ?? shoulderMidY - 0.22;
  return {
    headForwardRatio: earMidY / shoulderMidY,
    slouchDelta: landmarks[LANDMARKS.NOSE].y - baselineNoseY,
    tiltDelta: Math.abs(landmarks[LANDMARKS.LEFT_SHOULDER].y - landmarks[LANDMARKS.RIGHT_SHOULDER].y),
  };
}

/** Converts posture signals into a 0 to 100 posture score. */
export function calculatePostureScore(signals: PostureSignals, settings: AppSettings): number {
  const thresholdNorm = settings.slouchThreshold / 100;
  // Head forward: only penalize when ear/shoulder ratio exceeds 0.88 (forgiving baseline)
  const headPenalty = Math.max(0, (signals.headForwardRatio - 0.88) * 150);
  // Slouch: penalty scaled by user's threshold setting
  const slouchPenalty = Math.max(0, (signals.slouchDelta / thresholdNorm) * 35);
  // Tilt: ignore shoulder tilt < 0.06 (natural micro-movements), reduced multiplier
  const tiltPenalty = Math.max(0, (signals.tiltDelta - 0.06) * 150);
  const totalPenalty = headPenalty * 0.35 + slouchPenalty * 0.45 + tiltPenalty * 0.2;
  return Math.max(0, Math.min(100, 100 - totalPenalty));
}

/** Creates a posture frame from raw landmarks and current settings. */
export function analyzePosture(landmarks: PostureLandmark[], settings: AppSettings): PostureFrame | null {
  const signals = extractPostureSignals(landmarks, settings);
  if (!signals) {
    return null;
  }

  const score = calculatePostureScore(signals, settings);
  return {
    score,
    isGood: score >= 60,
    headForward: signals.headForwardRatio,
    slouch: signals.slouchDelta,
    tilt: signals.tiltDelta,
    timestamp: Date.now(),
  };
}

/** Formats elapsed milliseconds as HH:MM:SS for the session timer. */
export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
}
