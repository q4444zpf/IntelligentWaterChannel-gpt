import assert from 'node:assert/strict';
import test from 'node:test';
import { computed, reactive } from 'vue';

import { WEB_TOPO_CONFIG } from '../src/config/webTopoConfig.js';
import {
  buildRealtimeTableData,
  mergeRealtimeValues,
} from '../src/realtime-device-data.js';

const deviceGroups = [{
  gate: [{
    openingTag: 'G1',
    downLevelTag: 'wl2',
    name: '闸门1',
    upLevelTag: 'wl1',
  }],
  other: [{
    name: '水位计',
    data: [
      { unit: 'mm', name: '水位计1', place: '渠①', tag: 'wl1' },
      { unit: 'mm', name: '水位计2', place: null, tag: 'wl2' },
    ],
  }],
}];

test('uses the configured realtime device group', () => {
  assert.equal(WEB_TOPO_CONFIG.deviceGroupId, 69);
});

test('builds realtime tables from API metadata and MQTT values', () => {
  const result = buildRealtimeTableData(deviceGroups, { G1: 0, wl1: 120.5 });

  assert.deepEqual(result.gates[0], {
    id: 'G1',
    name: '闸门1',
    openingTag: 'G1',
    upLevelTag: 'wl1',
    downLevelTag: 'wl2',
    open: '0',
    before: '120.5',
    after: '--',
    state: '在线',
    color: 'green',
  });
  assert.equal(result.sensorGroups[0].rows[0].value, '120.5');
  assert.equal(result.sensorGroups[0].rows[0].state, '在线');
  assert.equal(result.sensorGroups[0].rows[1].location, '--');
  assert.equal(result.sensorGroups[0].rows[1].state, '离线');
});

test('merges flat MQTT payloads while retaining previous tag values', () => {
  const values = { wl1: 100 };

  mergeRealtimeValues(values, { ' WL2 ': 0, G1: 35 });
  mergeRealtimeValues(values, null);

  assert.deepEqual(values, { wl1: 100, ' WL2 ': 0, G1: 35 });
});

test('matches reactive MQTT tag values with case sensitivity', () => {
  const values = reactive({});
  const tableData = computed(() => buildRealtimeTableData(deviceGroups, values));

  assert.equal(tableData.value.sensorGroups[0].rows[0].value, '--');
  mergeRealtimeValues(values, { WL1: 88.6 });
  assert.equal(tableData.value.sensorGroups[0].rows[0].value, '--');
  assert.equal(tableData.value.gates[0].state, '离线');

  mergeRealtimeValues(values, { wl1: 88.6 });
  assert.equal(tableData.value.sensorGroups[0].rows[0].value, '88.6');
  assert.equal(tableData.value.gates[0].before, '88.6');
  assert.equal(tableData.value.gates[0].state, '离线');

  mergeRealtimeValues(values, { G1: 0 });
  assert.equal(tableData.value.gates[0].state, '在线');
});
