import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyHtmlSpriteUserData,
  isHtmlSpriteHierarchyVisible,
  parseMqttPayload,
  updateHtmlSpriteData,
  updateHtmlSpriteDirectionArrow,
} from '../src/components/realtime/smart-water-flume-preview/web-topo-html-runtime.js';
import { updateDataLabelArrowPlus } from '../src/components/realtime/smart-water-flume-preview/html-objects/data-label-arrow-plus.js';
import {
  applyDataLabelArrowPlusCanvasValue,
  createDataLabelArrowPlusCanvasObject,
  disposeDataLabelArrowPlusCanvasObject,
  measureCanvasTextWidth,
  updateDataLabelArrowPlusCanvasObject,
} from '../src/components/realtime/smart-water-flume-preview/html-objects/data-label-arrow-plus-canvas.js';
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
      gap: 5,
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
    gap: '5px',
    padding: '0px 10px',
  });
});

test('applies arrow label data and projects its world direction to a CSS angle', () => {
  const dataLabel = createElement('dataLabelArrow');
  const prefix = createElement('labelPrefix');
  const value = createElement('labelValue');
  const unit = createElement('labelUnit');
  const arrow = createElement('directionArrow');
  const childOrder = [arrow, prefix, value, unit];
  dataLabel.prepend = (child) => {
    childOrder.splice(childOrder.indexOf(child), 1);
    childOrder.unshift(child);
  };
  dataLabel.append = (child) => {
    childOrder.splice(childOrder.indexOf(child), 1);
    childOrder.push(child);
  };
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
      arrowPosition: 'end',
      directionX: 1,
      directionY: 0,
      directionZ: 0,
      arrowColor: '#fff',
      arrowSize: 20,
      gap: 6,
      borderRadius: 6,
      borderWidth: 2,
    },
  };

  applyHtmlSpriteUserData(root, sprite);
  assert.equal(value.textContent, '东向');
  assert.equal(arrow.style.display, 'inline-block');
  assert.equal(arrow.style.color, '#fff');
  assert.equal(arrow.style.fontSize, '20px');
  assert.equal(dataLabel.style.gap, '6px');
  assert.equal(childOrder.at(-1), arrow);
  assert.equal(dataLabel.style.borderRadius, '6px');
  assert.equal(dataLabel.style.borderWidth, '2px');

  sprite.userData.arrowPosition = 'start';
  applyHtmlSpriteUserData(root, sprite);
  assert.equal(childOrder[0], arrow);

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

test('projects a fixed plane arrow in the plane local axes', () => {
  const arrow = createElement('directionArrow');
  const root = createRoot([arrow]);
  const fixedQuaternion = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    Math.PI / 2,
  );
  const plane = {
    type: 'CanvasLabelPlane',
    billboard: false,
    quaternion: fixedQuaternion.toArray(),
    userData: {
      showArrow: true,
      directionX: 1,
      directionY: 0,
      directionZ: 0,
    },
  };

  assert.equal(updateHtmlSpriteDirectionArrow(
    root,
    plane,
    new THREE.PerspectiveCamera(),
    200,
    100,
  ), true);
  const angle = Number.parseFloat(arrow.style.transform.match(/rotate\((.+)rad\)/)[1]);
  assert.ok(Math.abs(angle - Math.PI / 2) < 1e-10);
});

test('draws the Plus bottom border as one closed rounded path', () => {
  const path = {
    attributes: new Map(),
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
  };
  const overlay = {
    style: {},
    setAttribute(name, value) {
      this[name] = String(value);
    },
    querySelector(selector) {
      return selector === 'path' ? path : null;
    },
  };
  const dataLabel = {
    offsetWidth: 240,
    offsetHeight: 72,
    parentElement: null,
  };
  const root = {
    querySelector(selector) {
      if (selector === '#dataLabelArrow') return dataLabel;
      if (selector === '#bottomBorderOverlay') return overlay;
      return null;
    },
  };

  updateDataLabelArrowPlus(root, {
    borderColor: '#77c9ff',
    borderWidth: 4,
    borderRadius: 28,
    showBottomArrow: true,
    trianglePoint1X: -18,
    trianglePoint2X: 18,
    trianglePoint3X: 0,
    trianglePoint3Y: 56,
  });

  const pathData = path.attributes.get('d');
  assert.match(pathData, /^M /);
  assert.match(pathData, / L [^ ]+ [^ ]+ L [^ ]+ /);
  assert.match(pathData, / Z$/);
  assert.equal(path.attributes.get('stroke'), '#77c9ff');
});

test('normalizes an oversized CJK fallback width for Canvas labels', () => {
  const widths = new Map([
    ['渠1', 35.38],
    ['渠', 27.6],
    ['1', 7.78],
  ]);
  const context = {
    measureText(text) {
      return { width: widths.get(text) ?? 0 };
    },
  };

  assert.equal(measureCanvasTextWidth(context, '渠1', 14), 21.78);
  widths.set('渠', 14);
  widths.set('渠1', 21.78);
  assert.equal(measureCanvasTextWidth(context, '渠1', 14), 21.78);
});

test('replaces the Canvas texture after an MQTT value changes its width', () => {
  const fillTextValues = [];
  const context = {
    beginPath() {},
    clearRect() {},
    closePath() {},
    fill() {},
    fillText(value) { fillTextValues.push(String(value)); },
    lineTo() {},
    measureText(value) { return { width: String(value).length * 10 }; },
    moveTo() {},
    quadraticCurveTo() {},
    restore() {},
    rotate() {},
    save() {},
    setTransform() {},
    stroke() {},
    translate() {},
  };
  const canvas = {
    height: 0,
    style: {},
    width: 0,
    getContext: () => context,
  };
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.document = { createElement: () => canvas };
  globalThis.window = { devicePixelRatio: 1 };

  try {
    const sprite = {
      name: 'channel-1',
      position: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      scale: [0.01, 0.01, 0.01],
      type: 'CanvasLabelSprite',
      useCanvas: true,
      options: { key: 'Html dataLabelArrowPlus', paramField: 'wl2', paramValue: '1' },
      userData: { prefix: 'channel-1', value: '1', paramValue: '1', unit: 'm' },
    };
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 10);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const mesh = createDataLabelArrowPlusCanvasObject(sprite);

    updateDataLabelArrowPlusCanvasObject(mesh, sprite, camera);
    const initialTexture = mesh.material.map;
    const initialWidth = Number.parseFloat(canvas.style.width);
    applyDataLabelArrowPlusCanvasValue(sprite, '123.45');
    updateDataLabelArrowPlusCanvasObject(mesh, sprite, camera);

    assert.equal(sprite.options.paramValue, '123.45');
    assert.equal(sprite.userData.paramValue, '123.45');
    assert.equal(sprite.userData.value, '123.45');
    assert.ok(fillTextValues.includes('123.45'));
    assert.ok(Number.parseFloat(canvas.style.width) > initialWidth);
    assert.notEqual(mesh.material.map, initialTexture);
    disposeDataLabelArrowPlusCanvasObject(mesh);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
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

test('hides an HtmlSprite when itself or any ancestor is invisible', () => {
  const ancestors = new Map([
    ['scene-root', { visible: true }],
    ['label-group', { visible: false }],
  ]);
  const sprite = {
    visible: true,
    ancestorUuids: ['scene-root', 'label-group'],
  };

  assert.equal(isHtmlSpriteHierarchyVisible(sprite, ancestors), false);
  ancestors.get('label-group').visible = true;
  assert.equal(isHtmlSpriteHierarchyVisible(sprite, ancestors), true);
  sprite.visible = false;
  assert.equal(isHtmlSpriteHierarchyVisible(sprite, ancestors), false);
});
