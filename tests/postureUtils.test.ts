import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePosture, buildCalibration, calculateAngle, formatDuration } from '../src/utils/postureUtils.ts';
import type { PostureLandmark } from '../src/types/index.ts';

/** Creates a complete landmark array with the posture points needed by analysis. */
function createLandmarks(): PostureLandmark[] {
  const landmarks = Array.from({ length: 25 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  landmarks[0] = { x: 0.5, y: 0.25, z: 0, visibility: 1 };
  landmarks[7] = { x: 0.4, y: 0.3, z: 0, visibility: 1 };
  landmarks[8] = { x: 0.6, y: 0.3, z: 0, visibility: 1 };
  landmarks[11] = { x: 0.4, y: 0.5, z: 0, visibility: 1 };
  landmarks[12] = { x: 0.6, y: 0.5, z: 0, visibility: 1 };
  landmarks[23] = { x: 0.4, y: 0.8, z: 0, visibility: 1 };
  landmarks[24] = { x: 0.6, y: 0.8, z: 0, visibility: 1 };
  return landmarks;
}

test('angle and duration helpers return stable values', () => {
  assert.equal(Math.round(calculateAngle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 })), 90);
  assert.equal(formatDuration(3_661_000), '01:01:01');
});

test('calibration and posture analysis produce a bounded frame', () => {
  const landmarks = createLandmarks();
  const calibration = buildCalibration(landmarks);
  assert.ok(calibration);
  const frame = analyzePosture(landmarks, 15, calibration);
  assert.ok(frame);
  assert.ok(frame.score >= 0 && frame.score <= 100);
  assert.equal(frame.isGood, frame.score >= 60);
});

test('posture analysis rejects insufficient landmarks', () => {
  assert.equal(buildCalibration([]), null);
  assert.equal(analyzePosture([], 15, null), null);
});
