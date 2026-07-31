import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWaterProfileSnapshot } from '../src/realtime-water-profile.js';

const topology = [
  { key: 'level1', name: '水位计1', label: '前池', channel: '前池', unit: 'm', tag: 'Level_One' },
  { key: 'level2', name: '水位计2', label: '渠①', channel: '渠①', unit: 'm', tag: 'level_two' },
  { key: 'level3', name: '水位计3', label: '集水池', channel: '集水池', unit: 'm', tag: 'level_three' },
];

test('maps the latest MQTT values onto nodes in backend topology order', () => {
  const snapshot = buildWaterProfileSnapshot({
    topology,
    values: { level_one: '0.321', LEVEL_TWO: 0.456 },
    timestamp: 1000,
  });

  assert.equal(snapshot.timestamp, 1000);
  assert.deepEqual(snapshot.nodes.map((node) => node.label), ['前池', '渠①', '集水池']);
  assert.deepEqual(snapshot.nodes.map((node) => node.measured), [0.321, 0.456, null]);
  assert.deepEqual(snapshot.nodes.map((node) => node.order), [0, 1, 2]);
  assert.equal(snapshot.nodes[0].state, '在线');
  assert.equal(snapshot.nodes[2].state, '离线');
  assert.ok(snapshot.nodes.every((node) => !('simulated' in node)));
});

test('keeps topology nodes when MQTT values are missing or invalid', () => {
  const snapshot = buildWaterProfileSnapshot({
    topology,
    values: { level_one: '', level_two: 'invalid' },
  });

  assert.equal(snapshot.nodes.length, topology.length);
  assert.ok(snapshot.nodes.every((node) => node.measured === null));
});

test('handles an absent backend topology', () => {
  assert.deepEqual(buildWaterProfileSnapshot({ topology: null }).nodes, []);
});
