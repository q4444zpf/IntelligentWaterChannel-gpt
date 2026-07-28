import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyHtmlSpriteUserData,
  parseMqttPayload,
  updateHtmlSpriteData,
  updateHtmlSpriteDirectionArrow,
} from '../src/components/realtime/smart-water-flume-preview/web-topo-html-runtime.js';
import * as THREE from 'three';

function createElement(id = '') {
  return { id, style: {}, textContent: '' };
}

function createRoot(elements) {
  const byId = new Map(elements.filter((element) => element.id).map((element) => [element.id, element]));
  return {
    querySelector(selector) {
      if (selector === '[data-bind-id]') return elements.find((element) => element.dataBindId) || null;
      if (selector.startsWith('#')) return byId.get(selector.slice(1)) || null;
      return null;
    },
    querySelectorAll(selector) {
      return selector === '[id]' ? elements.filter((element) => element.id) : [];
    },
  };
}

test('applies serialized custom data to a data label', () => {
  const dataLabel = createElement('dataLabel');
  const prefix = createElement('labelPrefix');
  const value = createElement('labelValue');
  const unit = createElement('labelUnit');
  const labelChildren = new Map([
    ['#labelPrefix', prefix],
    ['#labelValue', value],
    ['#labelUnit', unit],
  ]);
  dataLabel.querySelector = (selector) => labelChildren.get(selector) || null;
  const root = createRoot([dataLabel, prefix, value, unit]);

  applyHtmlSpriteUserData(root, {
    options: { key: 'Html dataLabel' },
    userData: {
      prefix: '渠①',
      value: 1.25,
      unit: 'm',
      bgColor: '#fff',
      textColor: '#12507a',
      borderColor: '#12507a',
      borderRadius: 8,
      borderWidth: 3,
      bold: true,
      fontSize: 14,
      paddingTopBottom: 0,
      paddingLeftRight: 10,
    },
  });

  assert.equal(prefix.textContent, '渠①');
  assert.equal(value.textContent, '1.25');
  assert.equal(unit.textContent, 'm');
  assert.deepEqual(dataLabel.style, {
    background: '#fff',
    color: '#12507a',
    borderColor: '#12507a',
    borderRadius: '8px',
    borderWidth: '3px',
    fontWeight: 'bold',
    fontSize: '14px',
    padding: '0px 10px',
  });
});

test('applies arrow label data and projects its world direction to a CSS angle', () => {
  const dataLabel = createElement('dataLabelArrow');
  const prefix = createElement('labelPrefix');
  const value = createElement('labelValue');
  const unit = createElement('labelUnit');
  const arrow = createElement('directionArrow');
  const labelChildren = new Map([
    ['#labelPrefix', prefix],
    ['#labelValue', value],
    ['#labelUnit', unit],
  ]);
  dataLabel.querySelector = (selector) => labelChildren.get(selector) || null;
  const root = createRoot([dataLabel, prefix, value, unit, arrow]);
  const sprite = {
    position: [0, 0, 0],
    options: { key: 'Html dataLabelArrow' },
    userData: {
      prefix: '流向',
      value: '东向',
      unit: '',
      showArrow: true,
      directionX: 1,
      directionY: 0,
      directionZ: 0,
      arrowColor: '#fff',
      arrowSize: 20,
      borderRadius: 6,
      borderWidth: 2,
    },
  };

  applyHtmlSpriteUserData(root, sprite);
  assert.equal(value.textContent, '东向');
  assert.equal(arrow.style.display, 'inline-block');
  assert.equal(arrow.style.color, '#fff');
  assert.equal(arrow.style.fontSize, '20px');
  assert.equal(dataLabel.style.borderRadius, '6px');
  assert.equal(dataLabel.style.borderWidth, '2px');

  const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  assert.equal(updateHtmlSpriteDirectionArrow(root, sprite, camera, 200, 100), true);
  assert.ok(Math.abs(Number.parseFloat(arrow.style.transform.match(/rotate\((.+)rad\)/)[1])) < 1e-10);

  sprite.userData.directionX = 0;
  sprite.userData.directionY = 1;
  assert.equal(updateHtmlSpriteDirectionArrow(root, sprite, camera, 200, 100), true);
  assert.ok(Math.abs(Number.parseFloat(arrow.style.transform.match(/rotate\((.+)rad\)/)[1]) + Math.PI / 2) < 1e-10);
});

test('maps an MQTT field to the label bound by paramField', () => {
  const value = createElement('labelValue');
  value.dataBindId = '1785205589829';
  const root = createRoot([value]);
  const sprite = { options: { paramField: 'wl1' }, userData: { value: '' } };

  assert.equal(updateHtmlSpriteData(root, sprite, 'other', 3), false);
  assert.equal(updateHtmlSpriteData(root, sprite, 'wl1', 2.6), true);
  assert.equal(value.textContent, '2.6');
  assert.equal(sprite.userData.value, 2.6);
});

test('accepts only JSON object MQTT payloads', () => {
  assert.deepEqual(parseMqttPayload('{"wl1":2.6,"temp":18}'), { wl1: 2.6, temp: 18 });
  assert.equal(parseMqttPayload('[1,2]'), null);
  assert.equal(parseMqttPayload('not-json'), null);
});
