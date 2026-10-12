import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createWebTopoAnimationRuntime } from '../src/components/realtime/smart-water-flume-preview/web-topo-animation-runtime.js';

function createAnimatedScene() {
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  const clip = new THREE.AnimationClip('平移动画', 1, [
    new THREE.NumberKeyframeTrack('.position[x]', [0, 1], [0, 10]),
  ]);
  group.animations = [clip];
  scene.add(group);
  return { group, scene };
}

test('独立混合器播放对象自身的关键帧动画', () => {
  const { group, scene } = createAnimatedScene();
  const runtime = createWebTopoAnimationRuntime(scene);

  runtime.play();
  assert.equal(runtime.update(0.1), true);
  assert.equal(group.position.x, 1);

  runtime.dispose();
});

test('未播放的关键帧动画不会参与渲染更新', () => {
  const { group, scene } = createAnimatedScene();
  const runtime = createWebTopoAnimationRuntime(scene);

  assert.equal(runtime.update(0.5), false);
  assert.equal(group.position.x, 0);

  runtime.dispose();
});

test('长时间切回页面时限制单帧动画步长', () => {
  const { group, scene } = createAnimatedScene();
  const runtime = createWebTopoAnimationRuntime(scene);

  runtime.play();
  runtime.update(10);
  assert.equal(group.position.x, 1);

  runtime.dispose();
});
