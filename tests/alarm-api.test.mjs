import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAlarmParams } from '../src/alarm-api-params.js';
import {
  buildAlarmCsv,
  normalizeAlarmPage,
  normalizeAlarmStatistics,
  validateAlarmQuery,
} from '../src/alarm-data.js';

test('builds big water channel alarm parameters without dropping unhandled status', () => {
  assert.deepEqual(buildAlarmParams({
    current: 2,
    size: 50,
    groupId: 69,
    start: '2026-07-31T00:00:00',
    end: '2026-07-31T23:59:59',
    warnConfigName: ' 水位 ',
    grade: 'fatal',
    content: ' 超限 ',
    deviceType: '液位计',
    deviceName: ' 水位计1 ',
    handlingStatus: 0,
    channel: '渠①',
  }), {
    current: 2,
    size: 50,
    groupId: 69,
    startDate: '2026-07-31 00:00:00',
    endDate: '2026-07-31 23:59:59',
    warnConfigName: '水位',
    grade: 'fatal',
    content: '超限',
    deviceType: '液位计',
    deviceName: '水位计1',
    handlingStatus: 0,
    channel: '渠①',
  });
});

test('omits all-value alarm filters and validates the time range', () => {
  assert.deepEqual(buildAlarmParams({
    groupId: 69,
    start: '2026-07-31T00:00:00',
    end: '2026-07-31T23:59:59',
    deviceType: '全部',
    channel: '全部',
    handlingStatus: '',
  }), {
    current: 1,
    size: 20,
    groupId: 69,
    startDate: '2026-07-31 00:00:00',
    endDate: '2026-07-31 23:59:59',
  });
  assert.equal(validateAlarmQuery({ start: '2026-07-31T12:00:00', end: '2026-07-31T11:00:00' }), '开始时间不能晚于结束时间');
});

test('normalizes alarm records for the table and detail modal', () => {
  const page = normalizeAlarmPage({
    current: 1,
    size: 20,
    total: 1,
    records: [{
      id: '9007199254740993',
      uid: '101',
      code: 'A-1',
      warnTime: '2026-07-31 10:00:00',
      deviceName: '水位计1',
      deviceType: '液位计',
      location: '渠①',
      warnConfigName: '高水位',
      content: '水位超过阈值',
      grade: 'fatal',
      gradeName: '严重',
      handlingStatus: 0,
    }],
  });

  assert.equal(page.total, 1);
  assert.equal(page.rows[0].key, '9007199254740993');
  assert.equal(page.rows[0].handled, '未处理');
  assert.equal(page.rows[0].device, '水位计1');
  assert.equal(page.rows[0].message, '水位超过阈值');
  assert.match(buildAlarmCsv(page.rows), /水位计1/);
});

test('normalizes all alarm statistic card counts', () => {
  assert.deepEqual(normalizeAlarmStatistics({
    total: 28,
    unhandled: '5',
    handled: 23,
    fatal: 2,
    offline: 4,
    waterLevel: 8,
    gate: 3,
  }), {
    total: 28,
    unhandled: 5,
    handled: 23,
    fatal: 2,
    offline: 4,
    waterLevel: 8,
    gate: 3,
  });
});
