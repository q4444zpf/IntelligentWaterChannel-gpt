import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AERATION_PROTOTYPE_DEFAULT_DEVICE_IDS,
  AERATION_PROTOTYPE_DEVICES,
  buildAerationPrototypeAlarmPage,
  buildAerationPrototypeAlarmStatistics,
  buildAerationPrototypeHistoryPage,
} from '../src/data/aeration-prototype-data.js';
import { getPrototypeSceneData } from '../src/data/prototype-scene-data.js';

test('曝气项目原型设备包含DO、气量和风机输出', () => {
  assert.deepEqual(AERATION_PROTOTYPE_DEFAULT_DEVICE_IDS, ['DO-01', 'AFM-01', 'BLW-01']);
  assert.deepEqual(AERATION_PROTOTYPE_DEVICES.map((device) => device.unit), ['', 'Nm³/h', '%']);
});

test('曝气历史原型数据只返回所选设备及其工程单位', () => {
  const page = buildAerationPrototypeHistoryPage({
    start: '2026-09-01T08:00:00',
    end: '2026-09-01T09:00:00',
    intervalSeconds: 300,
    deviceIds: ['DO-01', 'AFM-01'],
  });

  assert.deepEqual(new Set(page.records.map((record) => record.uid)), new Set(['DO-01', 'AFM-01']));
  assert.ok(page.records.some((record) => record.uid === 'DO-01' && record.unit === ''));
  assert.ok(page.records.some((record) => record.uid === 'AFM-01' && record.unit === 'Nm³/h'));
});

test('曝气场景当前没有报警设备、报警类型和报警记录', () => {
  const scene = getPrototypeSceneData('aeration');
  const page = buildAerationPrototypeAlarmPage();
  const statistics = buildAerationPrototypeAlarmStatistics();

  assert.deepEqual(scene.alarmDevices, []);
  assert.deepEqual(scene.alarmTypes, []);
  assert.deepEqual(page.records, []);
  assert.equal(page.total, 0);
  assert.deepEqual(statistics, {
    total: 0,
    unhandled: 0,
    handled: 0,
    fatal: 0,
    offline: 0,
    waterLevel: 0,
    gate: 0,
  });
});
