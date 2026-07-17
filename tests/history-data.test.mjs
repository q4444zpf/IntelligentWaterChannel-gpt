import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_DEVICE_IDS,
  DEVICES,
  buildHistoryResults,
  buildHistoryRows,
  sortDeviceIds,
  toHistoryCsv,
  validateHistoryQuery
} from '../src/history-data.js';

test('catalog contains valid default devices', () => {
  const ids = new Set(DEVICES.map((device) => device.id));
  assert.ok(DEFAULT_DEVICE_IDS.every((id) => ids.has(id)));
});

test('sorts selected devices by physical process order', () => {
  assert.deepEqual(
    sortDeviceIds(['G2', 'WL-01', 'PT-01']),
    ['WL-01', 'PT-01', 'G2']
  );
});

test('rejects an inverted time range', () => {
  assert.equal(
    validateHistoryQuery({
      start: '2026-07-08T10:00',
      end: '2026-07-08T09:00',
      deviceIds: ['WL-01']
    }),
    '开始时间不能晚于结束时间'
  );
});

test('requires at least one selected device', () => {
  assert.equal(
    validateHistoryQuery({
      start: '2026-07-08T09:00',
      end: '2026-07-08T10:00',
      deviceIds: []
    }),
    '请至少选择一台设备'
  );
});

test('builds deterministic results in physical process order', () => {
  const query = {
    start: '2026-07-08T09:00',
    end: '2026-07-08T10:00',
    deviceIds: ['G2', 'WL-01'],
    intervalSeconds: 300
  };
  const first = buildHistoryResults(query);
  const second = buildHistoryResults(query);

  assert.deepEqual(first.map((result) => result.device.id), ['WL-01', 'G2']);
  assert.deepEqual(first, second);
  assert.equal(first[0].points.length, 13);
});

test('builds table rows by descending time then physical process order', () => {
  const results = buildHistoryResults({
    start: '2026-07-08T09:00',
    end: '2026-07-08T09:10',
    deviceIds: ['G2', 'WL-01'],
    intervalSeconds: 300
  });
  const rows = buildHistoryRows(results);

  assert.ok(rows[0].timestamp >= rows.at(-1).timestamp);
  assert.deepEqual(rows.slice(0, 2).map((row) => row.name), ['WL-01', 'G2']);
});

test('serializes UTF-8 CSV with headers and escaped values', () => {
  const csv = toHistoryCsv([{
    timestamp: '2026-07-08 09:00:00',
    type: '水位计',
    name: 'WL-01',
    location: '渠①,"前段"',
    metric: '水位',
    value: '0.400',
    unit: 'm',
    state: '正常'
  }]);

  assert.ok(csv.startsWith('\uFEFF时间,设备类型,设备名称,所属渠道,数据项,数值,单位,状态'));
  assert.match(csv, /"渠①,""前段"""/);
  assert.equal(csv.trim().split('\n').length, 2);
});
