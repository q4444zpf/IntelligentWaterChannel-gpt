import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCombinedChartModel } from '../src/history-chart-options.js';

const makeResult = (id, type, metric, unit, order, values) => ({
  device: { id, type, metric, unit, order, precision: unit === 'm' || unit === 'MPa' ? 3 : 1 },
  points: values.map((value, index) => ({ timestamp: 1000 + index * 1000, value }))
});

const results = [
  makeResult('WL-01', '水位计', '水位', 'm', 10, [0.4, 0.41]),
  makeResult('WL-02', '水位计', '水位', 'm', 30, [0.38, 0.39]),
  makeResult('G2', '闸门', '开度', '%', 60, [40, 42]),
  makeResult('PT-01', '压力计', '压力', 'MPa', 15, [0.22, 0.23])
];

test('shares a y axis for devices with the same unit', () => {
  const model = buildCombinedChartModel(results);
  assert.equal(model.yAxes.length, 3);
  assert.deepEqual(model.series.map((series) => series.yAxisIndex), [0, 0, 1, 2]);
});

test('alternates y axes and offsets repeated sides', () => {
  const model = buildCombinedChartModel(results);
  assert.deepEqual(model.yAxes.map((axis) => axis.position), ['left', 'right', 'left']);
  assert.deepEqual(model.yAxes.map((axis) => axis.offset), [0, 0, 64]);
  assert.ok(model.grid.left >= 126);
  assert.ok(model.grid.right >= 62);
});

test('uses fixed percentage bounds and real units', () => {
  const model = buildCombinedChartModel(results);
  assert.deepEqual({ min: model.yAxes[1].min, max: model.yAxes[1].max }, { min: 0, max: 100 });
  assert.deepEqual(model.yAxes.map((axis) => axis.unit), ['m', '%', 'MPa']);
});

test('preserves process order in legend and series data', () => {
  const model = buildCombinedChartModel(results);
  assert.deepEqual(model.legendNames, ['WL-01 水位', 'WL-02 水位', 'G2 开度', 'PT-01 压力']);
  assert.deepEqual(model.series[2].data, [[1000, 40], [2000, 42]]);
  assert.equal(model.series[2].unit, '%');
});
