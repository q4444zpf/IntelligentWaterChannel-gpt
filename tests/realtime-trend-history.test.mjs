import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatTrendHistoryDateTime,
  normalizeTrendHistoryPoints,
} from '../src/realtime-trend-history.ts';

test('normalizes backend history into ascending trend points for one device', () => {
  const points = normalizeTrendHistoryPoints([
    { uid: '101', timestamp: '2026-07-31 10:00:10', value: '32' },
    { uid: 'other', timestamp: '2026-07-31 10:00:05', value: '99' },
    { uid: '101', timestamp: '2026-07-31 10:00:00', value: '0' },
  ], 'pump', '101');

  assert.deepEqual(points.map((point) => point.value), [0, 32]);
  assert.deepEqual(points.map((point) => point.running), [false, true]);
  assert.ok(points[0].timestamp < points[1].timestamp);
});

test('formats history query dates without converting the local timezone', () => {
  const timestamp = new Date(2026, 6, 31, 10, 20, 30).getTime();
  assert.equal(formatTrendHistoryDateTime(timestamp), '2026-07-31T10:20:30');
});
