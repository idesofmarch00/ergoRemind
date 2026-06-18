import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateFocusStats, matchesBlocklist, togglePreset } from '../src/utils/focusUtils.ts';
import type { DistractionEvent } from '../src/types/index.ts';

test('matches blocklist keywords without case sensitivity', () => {
  assert.equal(matchesBlocklist(['youtube'], 'Google Chrome', 'YouTube - Home'), true);
  assert.equal(matchesBlocklist(['Discord'], 'Discord', 'Friends'), true);
  assert.equal(matchesBlocklist(['  '], 'Chrome', 'Work'), false);
  assert.equal(matchesBlocklist([], 'YouTube', 'Home'), false);
});

test('preset toggle adds missing values once and removes an active preset', () => {
  const preset = ['YouTube', 'Netflix'];
  const added = togglePreset(['Slack', 'youtube'], preset);
  assert.deepEqual(added, ['Slack', 'youtube', 'Netflix']);
  assert.deepEqual(togglePreset(added, preset), ['Slack']);
});

test('focus stats aggregate events and clamp tracking time safely', () => {
  const events: DistractionEvent[] = [
    { appName: 'YouTube', startTime: 0, endTime: 20_000, durationMs: 20_000 },
    { appName: 'YouTube', startTime: 30_000, endTime: 40_000, durationMs: 10_000 },
    { appName: 'Discord', startTime: 50_000, endTime: 60_000, durationMs: 10_000 },
  ];
  assert.deepEqual(calculateFocusStats(events, 100_000), {
    totalDistractionMs: 40_000,
    distractionCount: 3,
    focusPercentage: 60,
    distractionsByApp: { YouTube: 30_000, Discord: 10_000 },
  });
  assert.equal(calculateFocusStats(events, 10_000).focusPercentage, 0);
  assert.equal(calculateFocusStats([], 0).focusPercentage, 100);
});
