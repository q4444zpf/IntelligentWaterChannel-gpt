import assert from 'node:assert/strict';
import test from 'node:test';

import {buildGateStatusChartOption} from '../src/gate-status-chart-option.js';

test('builds gate opening bars in meters with online and offline gradients', () => {
  const option = buildGateStatusChartOption([
    {id: 'G1', open: '0.262', state: '在线', before: '1.2', after: '1.1'},
    {id: 'G2', open: '--', state: '离线', before: '--', after: '--'},
  ]);

  assert.equal(option.backgroundColor, 'transparent');
  assert.equal(option.animation, true);
  assert.equal(option.animationDurationUpdate, 700);
  assert.equal(option.animationEasingUpdate, 'cubicInOut');
  assert.equal(option.yAxis.name, '开度（m）');
  assert.equal(option.yAxis.max, 0.5);
  assert.deepEqual(option.xAxis.data, ['G1', 'G2']);
  assert.deepEqual(option.series[0].data.map((item) => item.value), [0.262, 0]);
  assert.equal(option.series[0].id, 'gate-opening');
  assert.deepEqual(option.series[0].data.map((item) => item.id), ['G1', 'G2']);
  assert.equal(option.series[0].barMinHeight, 16);
  assert.deepEqual(option.series[0].data[0].itemStyle.color.colorStops, [
    {offset: 0, color: '#05F9FD'},
    {offset: 1, color: '#096BF8'},
  ]);
  assert.match(option.series[0].data[1].itemStyle.color.colorStops[0].color, /rgba\(.+, 0\.46\)/);
  assert.match(option.series[0].data[1].itemStyle.color.colorStops[1].color, /rgba\(.+, 0\.3\)/);
  assert.match(option.tooltip.formatter([{data: option.series[0].data[0]}]), /0\.262 m/);
  assert.doesNotMatch(option.tooltip.formatter([{data: option.series[0].data[0]}]), /闸前|闸后|%/);
});

test('uses a one-meter scale when every gate is offline', () => {
  const option = buildGateStatusChartOption([{id: 'G0', open: '--', state: '离线'}]);

  assert.equal(option.yAxis.max, 1);
  assert.equal(option.series[0].data[0].openingLabel, '--');
});
