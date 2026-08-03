import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractHtmlSprites,
  extractLabelGroups,
} from '../src/components/realtime/smart-water-flume-preview/web-topo-scene-loader.js';

test('extracts only direct subgroup metadata from the label group', () => {
  const project = {
    type: 'Scene',
    children: [
      {
        type: 'Group',
        name: '设备',
        children: [{ type: 'HtmlSprite', uuid: 'outside-label' }],
      },
      {
        type: 'Group',
        name: '标签',
        children: [
          {
            type: 'Group',
            uuid: 'channel-group',
            name: '渠道及编号',
            children: [
              { type: 'HtmlSprite', uuid: 'channel-1' },
              {
                type: 'Group',
                name: '内嵌子组',
                children: [{ type: 'HtmlSprite', uuid: 'channel-2' }],
              },
            ],
          },
          {
            type: 'Group',
            uuid: 'gate-group',
            name: '闸门及编号',
            children: [{ type: 'HtmlSprite', uuid: 'gate-1' }],
          },
        ],
      },
    ],
  };

  assert.deepEqual(extractLabelGroups(project), [
    {
      uuid: 'channel-group',
      name: '渠道及编号',
    },
    {
      uuid: 'gate-group',
      name: '闸门及编号',
    },
  ]);
});

test('returns no controls when the project has no label group', () => {
  assert.deepEqual(extractLabelGroups({ type: 'Scene', children: [] }), []);
});

test('keeps the HtmlSprite visibility and ancestor chain when extracting it from the scene', () => {
  const project = {
    type: 'Scene',
    uuid: 'scene-root',
    children: [{
      type: 'Group',
      uuid: 'parent-group',
      children: [{
        type: 'HtmlSprite',
        uuid: 'label-1',
        visible: false,
      }],
    }],
  };

  const [sprite] = extractHtmlSprites(project);
  assert.equal(sprite.visible, false);
  assert.deepEqual(sprite.ancestorUuids, ['scene-root', 'parent-group']);
});
