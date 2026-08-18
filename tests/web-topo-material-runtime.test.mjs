import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  collectWebTopoMaterialAnimations,
  updateWebTopoMaterialAnimations,
} from '../src/components/realtime/smart-water-flume-preview/web-topo-material-runtime.js';

function sceneWithMaterials(...materials) {
  const scene = new THREE.Scene();
  materials.forEach((material) => {
    scene.add(new THREE.Mesh(new THREE.BufferGeometry(), material));
  });
  return scene;
}

function animatedMaterial(name, time = 0) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: time } },
  });
  material.name = name;
  return material;
}

test('collects exported shader materials by their material name', () => {
  const slow = animatedMaterial('CircleGridShaderMaterial');
  const fast = animatedMaterial('PipelineWaterFlowRefractionShaderMaterial');

  const animations = collectWebTopoMaterialAnimations(sceneWithMaterials(slow, fast));
  updateWebTopoMaterialAnimations(animations, 1 / 60);

  assert.equal(animations.length, 2);
  assert.ok(Math.abs(slow.uniforms.uTime.value - 0.01) < 1e-12);
  assert.ok(Math.abs(fast.uniforms.uTime.value - 0.02) < 1e-12);
});

test('uses exported class metadata when a material was renamed', () => {
  const material = animatedMaterial('Custom display name', 3);
  const animations = collectWebTopoMaterialAnimations(sceneWithMaterials(material), {
    _ShaderMaterialClassMap: { WaterShaderMaterial: material.uuid },
  });

  updateWebTopoMaterialAnimations(animations, 1 / 60);

  assert.equal(animations.length, 1);
  assert.ok(Math.abs(material.uniforms.uTime.value - 3.02) < 1e-12);
});

test('updates a shared material once and ignores unrelated shaders', () => {
  const shared = animatedMaterial('StreamerWallShaderMaterial');
  const unrelated = animatedMaterial('UnrelatedShaderMaterial');
  const scene = sceneWithMaterials(shared, shared, unrelated);
  const animations = collectWebTopoMaterialAnimations(scene);

  updateWebTopoMaterialAnimations(animations, 1 / 60);

  assert.equal(animations.length, 1);
  assert.ok(Math.abs(shared.uniforms.uTime.value - 0.01) < 1e-12);
  assert.equal(unrelated.uniforms.uTime.value, 0);
});

test('caps long frame gaps to avoid animation jumps after tab suspension', () => {
  const material = animatedMaterial('FireShaderMaterial');
  const animations = collectWebTopoMaterialAnimations(sceneWithMaterials(material));

  updateWebTopoMaterialAnimations(animations, 10);

  assert.ok(Math.abs(material.uniforms.uTime.value - 0.12) < 1e-12);
});
