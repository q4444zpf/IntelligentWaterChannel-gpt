import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterHistoryDeviceOptions,
  normalizeHistoryDevices,
  sortHistoryDeviceOptionIds,
} from '../src/history-device-data.js';

const devices = normalizeHistoryDevices([
  { id: '103', name: '水位计10', type: '液位计', location: '渠⑥', unit: 'm' },
  { id: '101', name: '水位计2', type: '液位计', location: '渠②' },
  { id: '102', name: '闸门2', type: '闸门', location: '渠②出口' },
  { id: '101', name: '重复设备' },
]);

test('normalizes and naturally sorts unique history devices', () => {
  assert.deepEqual(devices.map((device) => device.id), ['101', '103', '102']);
  assert.equal(devices.length, 3);
  assert.equal(devices[1].unit, 'm');
});

test('filters history device options by API metadata', () => {
  assert.deepEqual(
    filterHistoryDeviceOptions(devices, { channel: '渠②', keyword: '水位' })
      .map((device) => device.id),
    ['101'],
  );
});

test('sorts selected IDs in API device order and removes unknown IDs', () => {
  assert.deepEqual(sortHistoryDeviceOptionIds(devices, ['102', 'missing', '101']), ['101', '102']);
});
