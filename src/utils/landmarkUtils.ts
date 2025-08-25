import type { PostureLandmark } from '@/types';

export const LANDMARKS = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

export const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [7, 8],
  [7, 11],
  [8, 12],
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
];

const REQUIRED_LANDMARKS = [
  LANDMARKS.NOSE,
  LANDMARKS.LEFT_EAR,
  LANDMARKS.RIGHT_EAR,
  LANDMARKS.LEFT_SHOULDER,
  LANDMARKS.RIGHT_SHOULDER,
] as const;

/** Returns true when every required landmark is visible enough to analyze. */
export function hasRequiredLandmarks(landmarks: PostureLandmark[], minVisibility = 0.5): boolean {
  return REQUIRED_LANDMARKS.every((index) => {
    const landmark = landmarks[index];
    return Boolean(landmark && landmark.visibility >= minVisibility);
  });
}

/** Gets the vertical midpoint for the user's ears. */
export function getEarMidY(landmarks: PostureLandmark[]): number {
  return (landmarks[LANDMARKS.LEFT_EAR].y + landmarks[LANDMARKS.RIGHT_EAR].y) / 2;
}

/** Gets the vertical midpoint for the user's shoulders. */
export function getShoulderMidY(landmarks: PostureLandmark[]): number {
  return (landmarks[LANDMARKS.LEFT_SHOULDER].y + landmarks[LANDMARKS.RIGHT_SHOULDER].y) / 2;
}

/** Converts MediaPipe landmarks to the app's serializable landmark type. */
export function normalizeLandmarks(landmarks: ReadonlyArray<PostureLandmark>): PostureLandmark[] {
  return landmarks.map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: landmark.visibility,
  }));
}
