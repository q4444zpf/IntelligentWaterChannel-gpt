import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildHistoryFilterParams,
  buildHistoryParams,
  buildHistoryReplayParams,
  parseDownloadFilename,
} from '../src/history-api-params.js';

test('builds history parameters using the fields read by the history SQL', () => {
  assert.deepEqual(buildHistoryParams({
    current: 2,
    size: 50,
    groupId: 18,
    start: '2026-07-08T09:00',
    end: '2026-07-08T10:00:30',
    intervalSeconds: 5,
    deviceIds: ['1001', '1002'],
  }), {
    current: 2,
    size: 50,
    groupId: 18,
    startTime: '2026-07-08 09:00:00',
    endTime: '2026-07-08 10:00:30',
    intervalSeconds: 5,
    deviceUids: ['1001', '1002'],
  });
});

test('builds unpaged history export parameters', () => {
  assert.deepEqual(buildHistoryFilterParams({
    groupId: 69,
    start: '2026-07-30T00:00:00',
    end: '2026-07-30T23:59:59',
    intervalSeconds: 300,
    deviceIds: ['2001'],
  }), {
    groupId: 69,
    startTime: '2026-07-30 00:00:00',
    endTime: '2026-07-30 23:59:59',
    intervalSeconds: 300,
    deviceUids: ['2001'],
  });
});

test('builds a negative page size for an unpaged history query', () => {
  const params = buildHistoryParams({
    current: 1,
    size: -1,
    groupId: 69,
    start: '2026-07-30T00:00:00',
    end: '2026-07-30T23:59:59',
    intervalSeconds: 5,
    deviceIds: ['2001', '2002'],
  });

  assert.equal(params.size, -1);
  assert.deepEqual(params.deviceUids, ['2001', '2002']);
});

test('builds aligned replay query parameters', () => {
  assert.deepEqual(buildHistoryReplayParams({
    groupId: 69,
    start: '2026-07-30T09:00:00',
    end: '2026-07-30T10:00:00',
    intervalSeconds: 5,
    channels: ['渠②', '渠③'],
  }), {
    groupId: 69,
    startTime: '2026-07-30 09:00:00',
    endTime: '2026-07-30 10:00:00',
    intervalSeconds: 5,
    channels: ['渠②', '渠③'],
  });
});

test('reads the UTF-8 file name from a download response', () => {
  assert.equal(
    parseDownloadFilename("attachment; filename*=UTF-8''%E8%9B%87%E5%BD%A2%E6%B0%B4%E6%A7%BD.csv"),
    '蛇形水槽.csv',
  );
});
