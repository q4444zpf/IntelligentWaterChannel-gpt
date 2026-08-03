import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGroupTreeUnder,
  findNearestSelectableGroup,
  isolateSelectableGroup,
  restoreSelectableGroupVisibility,
} from '../src/components/realtime/smart-water-flume-preview/web-topo-scene-tree.js';

test('builds a tree containing only groups below the named model group', () => {
  const scene = {
    type: 'Scene',
    children: [
      {
        type: 'Group',
        uuid: 'other-root',
        name: '其他',
        children: [{ type: 'Group', uuid: 'outside', name: '不应展示' }],
      },
      {
        type: 'Group',
        uuid: 'model-root',
        name: '模型',
        children: [
          {
            type: 'Group',
            uuid: 'channel',
            name: '渠道',
            children: [
              { type: 'Mesh', uuid: 'channel-mesh', name: '渠道网格' },
              { type: 'Group', uuid: 'gate', name: '闸门', children: [] },
            ],
          },
          {
            type: 'Mesh',
            uuid: 'container-mesh',
            children: [{ type: 'Group', uuid: 'sensor', name: '传感器', children: [] }],
          },
        ],
      },
    ],
  };

  assert.deepEqual(buildGroupTreeUnder(scene, '模型'), [
    {
      uuid: 'channel',
      name: '渠道',
      children: [{ uuid: 'gate', name: '闸门', children: [] }],
    },
    { uuid: 'sensor', name: '传感器', children: [] },
  ]);
});

test('returns an empty tree when the named group does not exist', () => {
  assert.deepEqual(buildGroupTreeUnder({ type: 'Scene', children: [] }, '模型'), []);
});

test('excludes initially hidden groups and their descendants', () => {
  const scene = {
    type: 'Scene',
    children: [{
      type: 'Group',
      uuid: 'model-root',
      name: '模型',
      children: [
        { type: 'Group', uuid: 'visible', name: '可见分组', children: [] },
        {
          type: 'Group',
          uuid: 'hidden',
          name: '隐藏分组',
          visible: false,
          children: [
            { type: 'Group', uuid: 'hidden-child', name: '隐藏子分组', children: [] },
          ],
        },
      ],
    }],
  };

  assert.deepEqual(buildGroupTreeUnder(scene, '模型'), [
    { uuid: 'visible', name: '可见分组', children: [] },
  ]);
});

test('returns no menu items when the model root group is initially hidden', () => {
  const scene = {
    type: 'Scene',
    children: [{
      type: 'Group',
      uuid: 'model-root',
      name: '模型',
      visible: false,
      children: [{ type: 'Group', uuid: 'channel', name: '渠道', children: [] }],
    }],
  };

  assert.deepEqual(buildGroupTreeUnder(scene, '模型'), []);
});

test('filters menu data without changing lights or other scene objects', () => {
  const light = { type: 'DirectionalLight', uuid: 'sun', visible: true, children: [] };
  const environment = { type: 'Group', uuid: 'environment', name: '环境', children: [] };
  const model = {
    type: 'Group',
    uuid: 'model-root',
    name: '模型',
    children: [{ type: 'Group', uuid: 'channel', name: '渠道', children: [] }],
  };
  const scene = { type: 'Scene', children: [light, environment, model] };
  const originalChildren = [...scene.children];

  assert.deepEqual(buildGroupTreeUnder(scene, '模型'), [
    { uuid: 'channel', name: '渠道', children: [] },
  ]);
  assert.deepEqual(scene.children, originalChildren);
  assert.equal(light.visible, true);
});

test('resolves a raycast hit to its nearest selectable parent group', () => {
  const outerGroup = { type: 'Group', uuid: 'outer' };
  const innerGroup = { type: 'Group', uuid: 'inner', parent: outerGroup };
  const mesh = { type: 'Mesh', uuid: 'mesh', parent: innerGroup };

  assert.equal(
    findNearestSelectableGroup(mesh, new Set(['outer', 'inner'])),
    innerGroup,
  );
  assert.equal(findNearestSelectableGroup(mesh, new Set(['outer'])), outerGroup);
  assert.equal(findNearestSelectableGroup(mesh, new Set()), null);
});

test('isolates a selected group branch and restores every prior visibility state', () => {
  const modelRoot = { type: 'Group', uuid: 'model-root', visible: true };
  const channel = { type: 'Group', uuid: 'channel', visible: true, parent: modelRoot };
  const gate = { type: 'Group', uuid: 'gate', visible: true, parent: channel };
  const hiddenSensor = { type: 'Group', uuid: 'sensor', visible: false, parent: channel };
  const pump = { type: 'Group', uuid: 'pump', visible: true, parent: modelRoot };
  const light = { type: 'DirectionalLight', uuid: 'sun', visible: true };
  const objects = new Map([
    ['channel', channel],
    ['gate', gate],
    ['sensor', hiddenSensor],
    ['pump', pump],
    ['sun', light],
  ]);
  const selectableUuids = new Set(['channel', 'gate', 'sensor', 'pump']);

  const snapshot = isolateSelectableGroup(channel, selectableUuids, objects);

  assert.equal(channel.visible, true);
  assert.equal(gate.visible, true);
  assert.equal(hiddenSensor.visible, false);
  assert.equal(pump.visible, false);
  assert.equal(light.visible, true);

  restoreSelectableGroupVisibility(snapshot, objects);
  assert.equal(channel.visible, true);
  assert.equal(gate.visible, true);
  assert.equal(hiddenSensor.visible, false);
  assert.equal(pump.visible, true);
  assert.equal(light.visible, true);
});

test('keeps selectable ancestors visible when isolating a nested group', () => {
  const modelRoot = { type: 'Group', uuid: 'model-root', visible: true };
  const channel = { type: 'Group', uuid: 'channel', visible: false, parent: modelRoot };
  const gate = { type: 'Group', uuid: 'gate', visible: true, parent: channel };
  const pump = { type: 'Group', uuid: 'pump', visible: true, parent: modelRoot };
  const objects = new Map([
    ['channel', channel],
    ['gate', gate],
    ['pump', pump],
  ]);

  const snapshot = isolateSelectableGroup(
    gate,
    new Set(['channel', 'gate', 'pump']),
    objects,
  );

  assert.equal(channel.visible, true);
  assert.equal(gate.visible, true);
  assert.equal(pump.visible, false);

  restoreSelectableGroupVisibility(snapshot, objects);
  assert.equal(channel.visible, false);
  assert.equal(gate.visible, true);
  assert.equal(pump.visible, true);
});
