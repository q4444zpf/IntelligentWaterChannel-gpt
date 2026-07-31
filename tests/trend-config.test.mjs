import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TREND_CONFIGS,
  TREND_DEVICES,
  TREND_PRODUCT_TYPES,
  getDefaultDeviceId,
  getDefaultDeviceIds,
  normalizeRealtimeTrendDevices,
  sortDeviceIds
} from '../src/config/trendConfig.ts';

test('defines the four time-trend types and their business units', () => {
  assert.deepEqual(Object.keys(TREND_CONFIGS), ['flow', 'level', 'pump', 'siphon']);
  assert.equal(TREND_CONFIGS.flow.unit, 'L/s');
  assert.equal(TREND_CONFIGS.level.unit, 'm');
  assert.equal(TREND_CONFIGS.pump.unit, 'Hz');
  assert.equal(TREND_CONFIGS.siphon.unit, 'MPa');
  assert.equal(TREND_CONFIGS.siphon.label, '倒虹吸压力');
  assert.ok(Object.values(TREND_CONFIGS).every((config) => config.showStatistics));
  assert.deepEqual(TREND_PRODUCT_TYPES, { flow: 4, level: 6, pump: 1, siphon: 9 });
});

test('normalizes backend trend devices with MQTT tags and chart metadata', () => {
  const devices = normalizeRealtimeTrendDevices('flow', [{
    id: 101,
    name: '流量计1',
    location: '渠①',
    unit: 'L/s',
    tag: 'Flow_1',
  }]);

  assert.equal(devices[0].id, '101');
  assert.equal(devices[0].tag, 'Flow_1');
  assert.equal(devices[0].type, 'flow');
  assert.equal(devices[0].unit, 'L/s');
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
