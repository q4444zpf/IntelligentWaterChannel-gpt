import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_DEVICE_IDS,
  DEVICES,
  buildAlarmHistoryQuery,
  buildHistoryResults,
  buildHistoryRows,
  createTodayHistoryRange,
  filterHistoryDevices,
  sortDeviceIds,
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
test('creates a full-day default range using the local calendar date', () => {
  assert.deepEqual(createTodayHistoryRange(new Date(2026, 6, 30, 15, 20, 10)), {
    start: '2026-07-30T00:00:00',
    end: '2026-07-30T23:59:59',
  });
});

test('builds a five-minute alarm history query for the matching device', () => {
  const query = buildAlarmHistoryQuery({
    uid: '101',
    warnTime: '2026-07-31 00:03:20',
    deviceName: '水位计2',
    content: '水位计2高水位报警',
  }, [
    { id: '101', name: '水位计2', type: '液位计', location: '渠②' },
  ]);

  assert.deepEqual(query, {
    start: '2026-07-30T23:58:20',
    end: '2026-07-31T00:08:20',
    deviceIds: ['101'],
    deviceType: '液位计',
    channel: '渠②',
    intervalSeconds: 5,
    status: '全部',
  });
});

test('falls back to a device name in the alarm message', () => {
  const query = buildAlarmHistoryQuery({
    warnTime: '2026-07-31 10:00:00',
    content: '检测到闸门2开度异常',
  }, [
    { id: '102', name: '闸门2', type: '闸门', location: '渠②出口' },
  ]);

  assert.deepEqual(query.deviceIds, ['102']);
  assert.equal(buildAlarmHistoryQuery({ warnTime: '无效时间' }, []), null);
});

test('filters history devices by type, channel, and keyword', () => {
  assert.deepEqual(
    filterHistoryDevices({ deviceType: '闸门', channel: '渠②' }).map((item) => item.id),
    ['G2']
  );
  assert.deepEqual(
    filterHistoryDevices({ channel: '前池', keyword: 'wl' }).map((item) => item.id),
    ['WL-01']
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
