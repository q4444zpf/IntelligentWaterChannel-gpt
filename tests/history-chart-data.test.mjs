import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeHistoryChartResults } from '../src/history-chart-data.js';

const devices = [
  { id: '1001', name: '水位计1', type: '液位计', location: '渠①', unit: 'm' },
  { id: '1002', name: '闸门1', type: '闸门', location: '渠①出口', unit: 'm' },
  { id: '1003', name: '流量计1', type: '流量计', location: '渠①', unit: 'L/s' },
];

test('builds actual chart points for selected devices in device order', () => {
  const results = normalizeHistoryChartResults([
    { uid: '1002', timestamp: '2026-07-30 10:00:05', metric: '开度', value: '0.42', unit: 'm' },
    { uid: '1001', timestamp: '2026-07-30 10:00:05', metric: '水位', value: '0.385', unit: 'm' },
    { uid: '1001', timestamp: '2026-07-30 10:00:00', metric: '水位', value: '0.381', unit: 'm' },
    { uid: '1003', timestamp: '2026-07-30 10:00:00', metric: '流量', value: '18.2', unit: 'L/s' },
  ], devices, ['1001', '1002']);

  assert.deepEqual(results.map((result) => result.device.id), ['1001', '1002']);
  assert.deepEqual(results[0].points.map((point) => point.value), [0.381, 0.385]);
  assert.equal(results[1].points[0].value, 0.42);
  assert.equal(results[0].device.state, '正常');
});

test('keeps one chart result for every selected device without data', () => {
  const results = normalizeHistoryChartResults([], devices, ['1002', '1003']);

  assert.equal(results.length, 2);
  assert.deepEqual(results.map((result) => result.points), [[], []]);
  assert.deepEqual(results.map((result) => result.device.unit), ['m', 'L/s']);
});

test('ignores unselected records and non-numeric values', () => {
  const results = normalizeHistoryChartResults([
    { uid: '1001', timestamp: '2026-07-30 10:00:00', metric: '水位', value: 'invalid', unit: 'm' },
    { uid: '1003', timestamp: '2026-07-30 10:00:00', metric: '流量', value: '18.2', unit: 'L/s' },
  ], devices, ['1001']);

  assert.deepEqual(results[0].points, []);
});
