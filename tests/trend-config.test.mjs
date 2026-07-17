import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TREND_CONFIGS,
  TREND_DEVICES,
  getDefaultDeviceId,
  getDefaultDeviceIds,
  sortDeviceIds
} from '../src/config/trendConfig.ts';

test('defines the four time-trend types and their business units', () => {
  assert.deepEqual(Object.keys(TREND_CONFIGS), ['flow', 'level', 'pump', 'siphon']);
  assert.equal(TREND_CONFIGS.flow.unit, 'L/s');
  assert.equal(TREND_CONFIGS.level.unit, 'm');
  assert.equal(TREND_CONFIGS.pump.unit, 'Hz');
  assert.equal(TREND_CONFIGS.siphon.unit, 'MPa');
  assert.equal(TREND_CONFIGS.siphon.label, '倒虹吸压力');
});

test('provides complete device catalogs and online defaults', () => {
  assert.equal(TREND_DEVICES.flow.length, 3);
  assert.equal(TREND_DEVICES.level.length, 6);
  assert.deepEqual(TREND_DEVICES.pump.map((device) => device.id), ['P1']);
  assert.equal(TREND_DEVICES.siphon.length, 4);
  assert.ok(getDefaultDeviceIds('flow').length > 1);
  assert.ok(getDefaultDeviceIds('level').every((id) => id !== 'WL-04'));
  assert.equal(getDefaultDeviceId('flow'), 'FM-01');
});

test('sorts selected IDs in engineering order and ignores unknown IDs', () => {
  assert.deepEqual(sortDeviceIds('level', ['WL-06', 'unknown', 'WL-01']), ['WL-01', 'WL-06']);
});
