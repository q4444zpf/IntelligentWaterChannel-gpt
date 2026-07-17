import assert from 'node:assert/strict';
import test from 'node:test';

import {
  drawAlarmChart,
  drawProfileChart,
  drawRealtimeChart
} from '../src/utils/canvas-charts.js';

test('exports high-level canvas chart renderers', () => {
  assert.equal(typeof drawRealtimeChart, 'function');
  assert.equal(typeof drawAlarmChart, 'function');
  assert.equal(typeof drawProfileChart, 'function');
});

test('canvas renderers ignore missing canvases', () => {
  assert.doesNotThrow(() => drawRealtimeChart(null));
  assert.doesNotThrow(() => drawAlarmChart(null));
  assert.doesNotThrow(() => drawProfileChart(null));
});
