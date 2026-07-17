import assert from 'node:assert/strict';
import test from 'node:test';

import { GATES, SENSOR_GROUPS } from '../src/data/monitoring-data.js';
import {
  PROFILE_GATES,
  PROFILE_SEGMENTS,
  buildWaterProfileSnapshot,
  createMockWaterProfileSource
} from '../src/realtime-water-profile.js';

test('builds an ordered water-only profile from current monitoring fixtures', () => {
  const snapshot = buildWaterProfileSnapshot({
    gates: GATES,
    sensorGroups: SENSOR_GROUPS,
    tick: 0,
    timestamp: 1000
  });

  assert.equal(snapshot.timestamp, 1000);
  assert.equal(snapshot.nodes[0].label, '前池');
  assert.equal(snapshot.nodes.at(-1).label, '集水池');
  assert.ok(snapshot.nodes.every((node, index, nodes) => !index || node.distance >= nodes[index - 1].distance));
  assert.equal(snapshot.nodes.find((node) => node.id === 'PT-03'), undefined);
  assert.equal(PROFILE_GATES.length, 7);
  assert.equal(PROFILE_SEGMENTS.length, 8);
});

test('produces deterministic bounded movement without mutating fixtures', () => {
  const first = buildWaterProfileSnapshot({ gates: GATES, sensorGroups: SENSOR_GROUPS, tick: 0, timestamp: 1000 });
  const next = buildWaterProfileSnapshot({ gates: GATES, sensorGroups: SENSOR_GROUPS, tick: 1, timestamp: 2000 });

  assert.notDeepEqual(first.nodes.map((node) => node.measured), next.nodes.map((node) => node.measured));
  first.nodes.forEach((node, index) => {
    if (node.measured !== null && next.nodes[index].measured !== null) {
      assert.ok(Math.abs(node.measured - next.nodes[index].measured) <= 0.01);
    }
  });
  assert.equal(SENSOR_GROUPS[0].rows[0].value, '0.40');
});

test('returns null for invalid or offline readings', () => {
  const sensorGroups = [{ name: '水位计', rows: [{ name: 'WL-01', location: '渠①', value: '--', unit: 'm', state: '离线' }] }];
  const snapshot = buildWaterProfileSnapshot({ gates: [], sensorGroups, tick: 0, timestamp: 1000 });

  assert.equal(snapshot.nodes.find((node) => node.id === 'WL-01')?.measured, null);
});

test('creates an asynchronous injectable source with advancing snapshots', async () => {
  const source = createMockWaterProfileSource({ gates: GATES, sensorGroups: SENSOR_GROUPS, now: () => 1234 });
  const first = await source();
  const next = await source();

  assert.equal(first.timestamp, 1234);
  assert.notDeepEqual(first.nodes.map((node) => node.measured), next.nodes.map((node) => node.measured));
});
