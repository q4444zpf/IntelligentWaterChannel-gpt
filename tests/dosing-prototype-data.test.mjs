import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DOSING_PROTOTYPE_ALARM_NAME,
  DOSING_PROTOTYPE_DEFAULT_DEVICE_IDS,
  DOSING_PROTOTYPE_DEVICES,
  buildDosingPrototypeAlarmPage,
  buildDosingPrototypeAlarmStatistics,
  buildDosingPrototypeHistoryPage,
} from '../src/data/dosing-prototype-data.js';

test('配药项目原型设备保留真实数据接入所需的完整元数据', () => {
  const tank = DOSING_PROTOTYPE_DEVICES.find((device) => device.id === 'PAC-TANK');

  assert.deepEqual(DOSING_PROTOTYPE_DEFAULT_DEVICE_IDS, ['TUB-01', 'TUB-02', 'PAC-TANK']);
  assert.equal(tank?.name, 'PAC配药箱水位');
  assert.equal(tank?.type, '液位计');
  assert.equal(tank?.unit, 'mm');
});

test('历史原型数据只为所选设备生成确定性结果', () => {
  const query = {
    start: '2026-09-01T08:00:00',
    end: '2026-09-01T09:00:00',
    intervalSeconds: 300,
    deviceIds: ['TUB-01', 'PAC-TANK'],
  };
  const first = buildDosingPrototypeHistoryPage(query);
  const second = buildDosingPrototypeHistoryPage(query);

  assert.deepEqual(first, second);
  assert.deepEqual(new Set(first.records.map((record) => record.uid)), new Set(['TUB-01', 'PAC-TANK']));
  assert.ok(first.records.some((record) => record.uid === 'PAC-TANK' && record.unit === 'mm'));
});

test('告警原型数据只有PAC配药箱水位过低一种类型', () => {
  const page = buildDosingPrototypeAlarmPage({}, 1, 3);
  const nextPage = buildDosingPrototypeAlarmPage({}, 2, 3);

  assert.equal(page.records.length, 3);
  assert.equal(nextPage.records.length, 3);
  assert.ok([...page.records, ...nextPage.records].every((record) => (
    record.warnConfigName === DOSING_PROTOTYPE_ALARM_NAME
      && record.deviceName === 'PAC配药箱水位'
  )));
});

test('告警筛选和统计使用同一份静态结果', () => {
  const query = { handlingStatus: 0, warnConfigName: DOSING_PROTOTYPE_ALARM_NAME };
  const page = buildDosingPrototypeAlarmPage(query, 1, 20);
  const statistics = buildDosingPrototypeAlarmStatistics(query);

  assert.equal(page.total, statistics.total);
  assert.equal(statistics.total, statistics.unhandled);
  assert.equal(statistics.handled, 0);
  assert.equal(statistics.waterLevel, statistics.total);
  assert.equal(buildDosingPrototypeAlarmPage({ warnConfigName: '其他告警' }).total, 0);
});
