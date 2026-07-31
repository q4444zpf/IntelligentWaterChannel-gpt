import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRealtimeWaterProfileOption } from '../src/realtime-water-profile-option.js';
import { buildWaterProfileSnapshot } from '../src/realtime-water-profile.js';

const snapshot = buildWaterProfileSnapshot({
  topology: [
    { key: 'level1', label: '前池', unit: 'm', tag: 'level1' },
    { key: 'level2', label: '渠①', unit: 'm', tag: 'level2' },
    { key: 'level3', label: '集水池', unit: 'm', tag: 'level3' },
  ],
  values: { level1: 0.31, level2: 0.35, level3: 0.29 },
  timestamp: Date.UTC(2026, 6, 17, 9, 0, 0),
});

test('builds a latest-time profile using the backend topology labels', () => {
  const option = buildRealtimeWaterProfileOption(snapshot);

  assert.equal(option.title.text, '节点水位空间剖面');
  assert.match(option.title.subtext, /最新时间/);
  assert.equal(option.xAxis.type, 'category');
  assert.deepEqual(option.xAxis.data, ['前池', '渠①', '集水池']);
  assert.match(option.yAxis.name, /m/);
  assert.deepEqual(option.legend.data, ['最新水位']);
  assert.equal(option.series.length, 1);
  assert.equal(option.series[0].id, 'latest-water-level');
  assert.equal(option.series[0].smooth, true);
  assert.deepEqual(option.series[0].data, [0.31, 0.35, 0.29]);
});

test('keeps only the water-level thresholds and no static topology overlays', () => {
  const option = buildRealtimeWaterProfileOption(snapshot);
  const markLines = option.series[0].markLine.data;

  assert.equal(markLines.length, 2);
  assert.ok(markLines.every((line) => line.name.includes('限')));
  assert.equal(option.series[0].markArea, undefined);
});

test('formats latest node details and supports a missing MQTT timestamp', () => {
  const option = buildRealtimeWaterProfileOption(snapshot);
  const html = option.tooltip.formatter([
    { dataIndex: 0, marker: '<i></i>', value: option.series[0].data[0] },
  ]);

  assert.match(html, /前池/);
  assert.match(html, /最新水位/);
  assert.doesNotMatch(html, /模拟水位/);
  assert.equal(option.tooltip.confine, true);

  const waitingOption = buildRealtimeWaterProfileOption({ ...snapshot, timestamp: null });
  assert.match(waitingOption.title.subtext, /等待 MQTT 数据/);
});
