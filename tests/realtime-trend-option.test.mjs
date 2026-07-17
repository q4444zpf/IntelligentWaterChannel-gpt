import assert from 'node:assert/strict';
import test from 'node:test';

import { TREND_CONFIGS } from '../src/config/trendConfig.ts';
import { queryTrendData } from '../src/data/realtime-trend-data.ts';
import { buildRealtimeTrendOption } from '../src/realtime-trend-option.ts';

const now = Date.UTC(2026, 6, 17, 8, 0, 0);

test('builds shared time axes, zoom, brush, and ordered series', async () => {
  const snapshot = await queryTrendData({ trendType: 'level', deviceIds: ['WL-01', 'WL-02'], startTime: now - 600_000, endTime: now, now });
  const option = buildRealtimeTrendOption(TREND_CONFIGS.level, snapshot);
  assert.equal(option.xAxis.type, 'time');
  assert.match(option.yAxis.name, /m/);
  assert.deepEqual(option.series.map((item) => item.name), ['WL-01', 'WL-02']);
  assert.deepEqual(option.dataZoom.map((item) => item.type), ['inside', 'slider']);
  assert.ok(option.toolbox.feature.brush);
  assert.equal(option.tooltip.confine, true);
});

test('formats device tooltip values with the configured unit', async () => {
  const snapshot = await queryTrendData({ trendType: 'flow', deviceIds: ['FM-01'], startTime: now - 600_000, endTime: now, now });
  const option = buildRealtimeTrendOption(TREND_CONFIGS.flow, snapshot);
  const html = option.tooltip.formatter([{ seriesIndex: 0, marker: '<i></i>', value: option.series[0].data[0] }]);
  assert.match(html, /FM-01/);
  assert.match(html, /L\/s/);
  assert.match(html, /进水总管/);
});

test('marks stopped pump periods and preserves null gaps', async () => {
  const snapshot = await queryTrendData({ trendType: 'pump', deviceIds: ['P1'], startTime: now - 3_600_000, endTime: now, now });
  snapshot.series[0].points[2].value = null;
  const option = buildRealtimeTrendOption(TREND_CONFIGS.pump, snapshot);
  assert.ok(option.series[0].markArea.data.length > 0);
  assert.equal(option.series[0].data[2][1], null);
  assert.equal(option.series[0].connectNulls, false);
});
