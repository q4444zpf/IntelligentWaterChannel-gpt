import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALARMS,
  GATES,
  PAGE_TABS,
  REPLAY_ROWS,
  SENSOR_GROUPS
} from '../src/data/monitoring-data.js';

test('exports complete monitoring fixtures', () => {
  assert.equal(PAGE_TABS.length, 3);
  assert.equal(GATES.length, 7);
  assert.equal(SENSOR_GROUPS[0].name, '水位计');
  assert.equal(SENSOR_GROUPS[0].rows.length, 6);
  assert.equal(ALARMS[0].code, 'ALM-20260708-0001');
  assert.equal(REPLAY_ROWS.length, 5);
});

test('orders alarm fixtures newest first', () => {
  assert.deepEqual(ALARMS.slice(0, 3).map((alarm) => alarm.time), ['09:21:10', '09:23:45', '09:25:12']);
});
