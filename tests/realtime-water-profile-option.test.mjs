import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRealtimeWaterProfileOption } from '../src/realtime-water-profile-option.js';
import { buildWaterProfileSnapshot } from '../src/realtime-water-profile.js';

const snapshot = buildWaterProfileSnapshot({ tick: 0, timestamp: Date.UTC(2026, 6, 17, 9, 0, 0) });

test('builds the node-water business axes and two distinct profile series', () => {
  const option = buildRealtimeWaterProfileOption(snapshot);

  assert.equal(option.title.text, '节点水位曲线');
  assert.match(option.xAxis.name, /m/);
  assert.match(option.yAxis.name, /m/);
  assert.deepEqual(option.legend.data, ['实测水位', '模拟水位']);
  assert.equal(option.series.length, 2);
  assert.equal(option.series[0].lineStyle.type, 'solid');
  assert.equal(option.series[1].lineStyle.type, 'dashed');
});

test('includes seven gate markers, two thresholds, and eight process segments', () => {
  const option = buildRealtimeWaterProfileOption(snapshot);
  const markLines = option.series[0].markLine.data;
  const gateLines = markLines.filter((line) => line.name?.startsWith('G'));
  const segments = option.series[0].markArea.data;

  assert.equal(gateLines.length, 7);
  assert.equal(markLines.filter((line) => line.name?.includes('限')).length, 2);
  assert.equal(segments.length, 8);
  assert.equal(segments[0][0].name, '前池');
  assert.equal(segments.at(-1)[0].name, '集水池');
});

test('formats node details and constrains zoom to the chart', () => {
  const option = buildRealtimeWaterProfileOption(snapshot);
  const html = option.tooltip.formatter([
    { dataIndex: 0, marker: '<i></i>', value: option.series[0].data[0] },
    { dataIndex: 0, marker: '<i></i>', value: option.series[1].data[0] }
  ]);

  assert.match(html, /前池/);
  assert.match(html, /沿程距离/);
  assert.match(html, /实测水位/);
  assert.match(html, /模拟水位/);
  assert.equal(option.tooltip.confine, true);
  assert.deepEqual(option.dataZoom.map((zoom) => zoom.type), ['inside', 'slider']);
});
