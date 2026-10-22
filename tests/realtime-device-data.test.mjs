import assert from 'node:assert/strict';
import test from 'node:test';
import { computed, reactive } from 'vue';

import { WEB_TOPO_CONFIG } from '../src/config/webTopoConfig.js';
import {
  buildRealtimeTableData,
  mergeRealtimeValues,
} from '../src/realtime-device-data.js';

const deviceGroups = [{
  pump: {
    uid: '2092915057435348994',
    name: '水泵',
    tag: 'Pump',
    statusField: 'stats',
    frequencyField: 'frequency',
    maxFrequency: 50,
  },
  gate: [{
    uid: '2082047504001417217',
    openingTag: 'G1',
    downLevelTag: 'wl2',
    name: '闸门1',
    upLevelTag: 'wl1',
  }],
  valve: [
    {
      uid: '2094374545467707394',
      name: '阀门1',
      tag: 'v1',
      openingField: 'opening',
      maxOpening: 100,
    },
    {
      uid: '2094374967620210690',
      name: '阀门2',
      tag: 'v2',
      openingField: 'opening',
      maxOpening: 100,
    },
  ],
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
  const result = buildRealtimeTableData(deviceGroups, {
    G1: 0,
    wl1: 120.5,
    Pump: { stats: true, frequency: 35 },
    v1: { opening: 52 },
    v2: JSON.stringify({ opening: '68.5' }),
  });

  assert.deepEqual(result.gates[0], {
    id: 'G1',
    uid: '2082047504001417217',
    name: '闸门1',
    location: '',
    openingTag: 'G1',
    upLevelTag: 'wl1',
    downLevelTag: 'wl2',
    maxOpening: 90,
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
  assert.deepEqual(result.pump, {
    uid: '2092915057435348994',
    name: '水泵',
    location: '',
    tag: 'Pump',
    statusField: 'stats',
    frequencyField: 'frequency',
    maxFrequency: 50,
    running: true,
    frequency: 35,
    state: '在线',
  });
  assert.deepEqual(result.valves, [
    {
      id: 'v1',
      uid: '2094374545467707394',
      name: '阀门1',
      location: '',
      label: 'V1',
      tag: 'v1',
      openingField: 'opening',
      maxOpening: 100,
      opening: 52,
      state: '在线',
    },
    {
      id: 'v2',
      uid: '2094374967620210690',
      name: '阀门2',
      location: '',
      label: 'V2',
      tag: 'v2',
      openingField: 'opening',
      maxOpening: 100,
      opening: 68.5,
      state: '在线',
    },
  ]);
});

test('normalizes string pump telemetry values', () => {
  const result = buildRealtimeTableData(deviceGroups, {
    Pump: JSON.stringify({ stats: 'false', frequency: '42.5' }),
  });

  assert.equal(result.pump.running, false);
  assert.equal(result.pump.frequency, 42.5);
  assert.equal(result.pump.state, '在线');
});

test('reads scalar pump and valve values from the configuration topic', () => {
  const running = buildRealtimeTableData(deviceGroups, {
    Pump: 45,
    v1: '30',
    v2: 70.5,
  });

  assert.equal(running.pump.running, true);
  assert.equal(running.pump.frequency, 45);
  assert.equal(running.valves[0].opening, 30);
  assert.equal(running.valves[1].opening, 70.5);

  const stopped = buildRealtimeTableData(deviceGroups, { Pump: 'false' });
  assert.equal(stopped.pump.running, false);
  assert.equal(stopped.pump.frequency, 0);
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
