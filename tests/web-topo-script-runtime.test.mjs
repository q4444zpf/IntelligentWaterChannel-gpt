import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createWebTopoScriptRuntime } from '../src/components/realtime/smart-water-flume-preview/web-topo-script-runtime.js';

test('runs object script lifecycle callbacks with the preview context', () => {
  const previousWindow = globalThis.window;
  globalThis.window = globalThis;
  const scene = new THREE.Scene();
  const gate = new THREE.Group();
  scene.add(gate);
  let renderCount = 0;
  const runtime = createWebTopoScriptRuntime({
    scene,
    camera: new THREE.PerspectiveCamera(),
    controls: {},
    renderer: {},
    viewer: { render: () => { renderCount += 1; } },
    scripts: {
      [gate.uuid]: [{
        name: 'gate lifecycle',
        source: `
          function init() {
            this.userData.initialized = helper.objectByUuid(this.uuid) === this;
            window.emitter.on('waterLevel', (value) => {
              this.userData.waterLevel = value;
              window.viewer.render();
            });
          }
          function start() { this.userData.started = scene === helper.scene; }
          function update(frame) { this.userData.frame = frame; }
          function beforeDestroy() { this.userData.beforeDestroy = true; }
          function destroy() { this.userData.destroyed = true; }
        `,
      }],
    },
  });

  runtime.start();
  runtime.update();
  runtime.emit('waterLevel', 1.86);
  runtime.dispose();
  if (previousWindow === undefined) delete globalThis.window;
  else globalThis.window = previousWindow;

  assert.equal(gate.userData.initialized, true);
  assert.equal(gate.userData.started, true);
  assert.equal(typeof gate.userData.frame.time, 'number');
  assert.equal(gate.userData.waterLevel, 1.86);
  assert.equal(renderCount, 1);
  assert.equal(gate.userData.beforeDestroy, true);
  assert.equal(gate.userData.destroyed, true);
});
