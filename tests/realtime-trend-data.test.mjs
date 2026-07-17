import assert from 'node:assert/strict';
import test from 'node:test';

import { TREND_DEVICES } from '../src/config/trendConfig.ts';
import {
  filterTrendDevices,
  queryTrendData,
  resolveTimeRange,
  summarizeSeries,
  toggleFilteredSelection
} from '../src/data/realtime-trend-data.ts';

const now = Date.UTC(2026, 6, 17, 8, 0, 0);

test('resolves preset ranges and rejects inverted custom ranges', () => {
  assert.equal(resolveTimeRange('10m', now).startTime, now - 600_000);
  assert.equal(resolveTimeRange('1h', now).startTime, now - 3_600_000);
  assert.equal(resolveTimeRange('24h', now).startTime, now - 86_400_000);
  assert.throws(() => resolveTimeRange('custom', now, { startTime: now, endTime: now - 1 }), /开始时间/);
});

test('filters devices by searchable text and region', () => {
  assert.deepEqual(filterTrendDevices(TREND_DEVICES.flow, { search: 'FM-02', region: '全部' }).map((item) => item.id), ['FM-02']);
  assert.deepEqual(filterTrendDevices(TREND_DEVICES.level, { search: '', region: '渠③' }).map((item) => item.id), ['WL-03']);
});

test('selects and clears only the filtered device subset', () => {
  assert.deepEqual(toggleFilteredSelection(['FM-01'], ['FM-02'], true), ['FM-01', 'FM-02']);
  assert.deepEqual(toggleFilteredSelection(['FM-01', 'FM-02'], ['FM-02', 'FM-03'], false), ['FM-01']);
});

test('generates deterministic bounded trend data with a capped sample count', async () => {
  const query = { trendType: 'level', deviceIds: ['WL-01', 'WL-02'], startTime: now - 86_400_000, endTime: now, now };
  const first = await queryTrendData(query);
  const second = await queryTrendData(query);
  assert.deepEqual(first, second);
  assert.ok(first.series.every((series) => series.points.length <= 121));
  assert.deepEqual(first.series.map((series) => series.device.id), ['WL-01', 'WL-02']);
});

test('produces pump running state and summary values', async () => {
  const snapshot = await queryTrendData({ trendType: 'pump', deviceIds: ['P1'], startTime: now - 600_000, endTime: now, now });
  const series = snapshot.series[0];
  const summary = summarizeSeries(series);
  assert.ok(series.points.every((point) => typeof point.running === 'boolean'));
  assert.equal(summary.current, series.points.at(-1).value);
  assert.ok(summary.max >= summary.min);
});
