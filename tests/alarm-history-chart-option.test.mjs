import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAlarmHistoryChartOption } from '../src/alarm-history-chart-option.js';

const query = { start: '2026-07-31T09:55:00', end: '2026-07-31T10:05:00' };
const point = { timestamp: new Date('2026-07-31T10:00:00').getTime(), value: 0.36 };

test('builds a legend-free alarm chart with an alarm marker and water thresholds', () => {
  const option = buildAlarmHistoryChartOption({
    device: { id: '101', name: '水位计1', type: '液位计', metric: '水位', unit: 'm', precision: 3 },
    points: [point],
  }, query, point.timestamp);

  assert.equal(option.legend, undefined);
  assert.equal(option.series[0].markLine.data[0].xAxis, point.timestamp);
  assert.equal(option.series[0].markLine.data[0].label.rotate, 0);
  assert.deepEqual(option.series[0].markLine.data.slice(1).map((line) => line.yAxis), [0.5, 0.2]);
  assert.ok(option.series[0].markLine.data.slice(1).every((line) => line.label.position === 'insideEndTop'));
  assert.deepEqual(option.grid, { left: 12, right: 12, top: 38, bottom: 12, containLabel: true });
});

test('does not add water thresholds to a gate opening measured in meters', () => {
  const option = buildAlarmHistoryChartOption({
    device: { id: '201', name: '闸门1', type: '闸门', metric: '开度', unit: 'm', precision: 3 },
    points: [point],
  }, query, point.timestamp);

  assert.equal(option.series[0].markLine.data.length, 1);
});
