import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGroupTreeUnder } from '../src/components/realtime/smart-water-flume-preview/web-topo-scene-tree.js';

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
