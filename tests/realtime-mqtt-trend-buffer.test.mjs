import assert from 'node:assert/strict';
import test from 'node:test';
import { nextTick, ref } from 'vue';

import { useMqttRealtimeTrends } from '../src/composables/useMqttRealtimeTrends.ts';
import { createRealtimeMqttTrendBuffer } from '../src/realtime-mqtt-trend-buffer.ts';

const devicesByType = {
  flow: [{ id: '1', name: '流量计1', tag: 'Flow_1', type: 'flow', location: '渠①', region: '渠①', unit: 'L/s', state: '在线', color: '#fff', order: 0 }],
  level: [{ id: '2', name: '水位计1', tag: 'Level_1', type: 'level', location: '渠①', region: '渠①', unit: 'm', state: '在线', color: '#fff', order: 0 }],
  pump: [{ id: '3', name: '水泵1', tag: 'Pump_1', type: 'pump', location: '集水池', region: '集水池', unit: 'Hz', state: '在线', color: '#fff', order: 0 }],
  siphon: [{ id: '4', name: '压力计1', tag: 'Pressure_1', type: 'siphon', location: '倒虹吸①', region: '倒虹吸①', unit: 'MPa', state: '在线', color: '#fff', order: 0 }],
};

test('records actual MQTT values for all four trend device types', () => {
  const buffer = createRealtimeMqttTrendBuffer();
  buffer.record(devicesByType, {
    Flow_1: 12.5,
    Level_1: '0.321',
    Pump_1: 32,
    Pressure_1: 0.108,
  }, 1000);

  assert.deepEqual(buffer.snapshot('flow', devicesByType.flow[0], 0, 2000, 1000).series[0].points, [{ timestamp: 1000, value: 12.5 }]);
  assert.deepEqual(buffer.snapshot('level', devicesByType.level[0], 0, 2000, 1000).series[0].points, [{ timestamp: 1000, value: 0.321 }]);
  assert.deepEqual(buffer.snapshot('pump', devicesByType.pump[0], 0, 2000, 1000).series[0].points, [{ timestamp: 1000, value: 32, running: true }]);
  assert.deepEqual(buffer.snapshot('siphon', devicesByType.siphon[0], 0, 2000, 1000).series[0].points, [{ timestamp: 1000, value: 0.108 }]);
});

test('matches MQTT tags with case sensitivity and ignores invalid values', () => {
  const buffer = createRealtimeMqttTrendBuffer();
  const changed = buffer.record(devicesByType, {
    flow_1: 10,
    Level_1: 'invalid',
  }, 1000);

  assert.equal(changed, false);
  assert.deepEqual(buffer.snapshot('flow', devicesByType.flow[0], 0, 2000, 1000).series[0].points, []);
});

test('replaces duplicate timestamps and filters snapshots by time range', () => {
  const buffer = createRealtimeMqttTrendBuffer();
  buffer.record(devicesByType, { Flow_1: 10 }, 1000);
  buffer.record(devicesByType, { Flow_1: 11 }, 1000);
  buffer.record(devicesByType, { Flow_1: 12 }, 2000);

  assert.deepEqual(
    buffer.snapshot('flow', devicesByType.flow[0], 1500, 2500, 2000).series[0].points,
    [{ timestamp: 2000, value: 12 }],
  );
});

test('merges initial history with MQTT points and keeps MQTT on timestamp conflicts', () => {
  const buffer = createRealtimeMqttTrendBuffer();
  buffer.record(devicesByType, { Flow_1: 15 }, 2000);
  buffer.seed('flow', '1', [
    { timestamp: 1000, value: 10 },
    { timestamp: 2000, value: 12 },
  ]);

  assert.deepEqual(
    buffer.snapshot('flow', devicesByType.flow[0], 0, 3000, 2000).series[0].points,
    [{ timestamp: 1000, value: 10 }, { timestamp: 2000, value: 15 }],
  );
});

test('uses the latest point from each display granularity bucket', () => {
  const buffer = createRealtimeMqttTrendBuffer();
  buffer.record(devicesByType, { Flow_1: 10 }, 120_000);
  buffer.record(devicesByType, { Flow_1: 11 }, 150_000);
  buffer.record(devicesByType, { Flow_1: 12 }, 240_000);

  assert.deepEqual(
    buffer.snapshot('flow', devicesByType.flow[0], 0, 300_000, 300_000, 120_000).series[0].points,
    [{ timestamp: 150_000, value: 11 }, { timestamp: 240_000, value: 12 }],
  );
});

test('continues collecting MQTT data while the trend display is paused and catches up on resume', async () => {
  const timestamp = ref(Date.now());
  const values = ref({ Flow_1: 10 });
  const trends = useMqttRealtimeTrends({
    devicesByType,
    realtimeValues: values,
    mqttTimestamp: timestamp,
    loadInitial: async () => [],
  });

  await Promise.resolve();
  await nextTick();
  timestamp.value += 1_000;
  const pausedPoints = trends.snapshot.value.series[0].points;
  trends.pause();

  values.value = { Flow_1: 15 };
  timestamp.value += 1_000;

  assert.equal(trends.lastUpdated.value, timestamp.value);
  assert.deepEqual(trends.snapshot.value.series[0].points, pausedPoints);

  trends.resume();

  assert.equal(trends.snapshot.value.series[0].points.at(-1).value, 15);
});
