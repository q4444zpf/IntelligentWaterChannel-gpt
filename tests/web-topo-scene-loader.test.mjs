import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractHtmlSprites,
  extractLabelGroups,
  extractSceneBackgroundColor,
  extractSceneScripts,
} from '../src/components/realtime/smart-water-flume-preview/web-topo-scene-loader.js';
import * as THREE from 'three';

test('preserves an eight-digit package background color for renderer clearing', () => {
  assert.equal(extractSceneBackgroundColor({
    scene: { object: { userData: { __webtopoBackgroundColor: '#13E00038' } } },
  }), '#13E00038');
});

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

test('extracts CanvasLabelPlane cards as HTML labels', () => {
  const project = {
    type: 'Scene',
    uuid: 'scene-root',
    children: [{
      type: 'Group',
      uuid: 'label-group',
      children: [{
        type: 'CanvasLabelPlane',
        uuid: 'plus-label',
        matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 3, 4, 1],
        options: {
          htmlContent: '<div id="dataLabelArrowPlusRoot"></div>',
          key: 'Html dataLabelArrowPlus',
          paramField: 'wl2',
          userData: { value: '1' },
        },
      }],
    }],
  };

  const [sprite] = extractHtmlSprites(project);
  assert.equal(sprite.uuid, 'plus-label');
  assert.equal(sprite.options.key, 'Html dataLabelArrowPlus');
  assert.equal(sprite.options.paramField, 'wl2');
  assert.equal(sprite.html, '<div id="dataLabelArrowPlusRoot"></div>');
  assert.equal(sprite.type, 'CanvasLabelPlane');
  assert.equal(sprite.billboard, false);
  assert.equal(sprite.useCanvas, true);
  assert.deepEqual(sprite.position, [2, 3, 4]);
  assert.deepEqual(sprite.quaternion, [0, 0, 0, 1]);
  assert.deepEqual(sprite.scale, [1, 1, 1]);
  assert.deepEqual(sprite.ancestorUuids, ['scene-root', 'label-group']);
  assert.equal(project.children[0].children.length, 0);
});

test('distinguishes billboard and fixed HTML label objects', () => {
  const fixedQuaternion = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    Math.PI / 2,
  );
  const fixedMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(1, 2, 3),
    fixedQuaternion,
    new THREE.Vector3(2, 3, 4),
  );
  const project = {
    type: 'Scene',
    children: [{
      type: 'Group',
      uuid: 'label-group',
      children: [
        { type: 'HtmlSprite', uuid: 'html-sprite', options: { htmlContent: '<div></div>' } },
        { type: 'HtmlPlane', uuid: 'html-plane', options: { htmlContent: '<div></div>' } },
        { type: 'CanvasLabelSprite', uuid: 'canvas-sprite', options: { htmlContent: '<div></div>' } },
        { type: 'CanvasLabelPlane', uuid: 'canvas-plane', matrix: fixedMatrix.toArray(), options: { htmlContent: '<div></div>' } },
      ],
    }],
  };

  const labels = extractHtmlSprites(project);
  assert.deepEqual(labels.map((label) => [label.type, label.billboard]), [
    ['HtmlSprite', true],
    ['HtmlPlane', false],
    ['CanvasLabelSprite', true],
    ['CanvasLabelPlane', false],
  ]);
  const fixed = labels.at(-1);
  assert.deepEqual(fixed.position, [1, 2, 3]);
  assert.deepEqual(fixed.scale, [2, 3, 4]);
  assert.ok(Math.abs(fixed.quaternion[2] - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(fixed.quaternion[3] - Math.SQRT1_2) < 1e-12);
});

test('retains only executable object scripts from the scene package', () => {
  assert.deepEqual(extractSceneScripts({
    scripts: {
      gate: [{ name: 'open', source: 'function start() {}' }, { name: 'invalid' }],
      channel: [],
      invalid: 'not an array',
    },
  }), {
    gate: [{ name: 'open', source: 'function start() {}' }],
    channel: [],
  });
});
