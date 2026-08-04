import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  applyModelExpansionProgress,
  createHtmlSpriteExpansionLayout,
  createTopLevelGroupExpansionLayout,
} from '../src/components/realtime/smart-water-flume-preview/web-topo-model-expansion.js';

function addBox(group) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  group.add(mesh);
  return mesh;
}

function assertVectorClose(actual, expected) {
  assert.ok(actual.distanceTo(expected) < 1e-8, `${actual.toArray()} != ${expected.toArray()}`);
}

test('expands only top-level model groups and restores their original positions', () => {
  const scene = new THREE.Scene();
  const modelRoot = new THREE.Group();
  modelRoot.name = '模型';
  scene.add(modelRoot);

  const leftGroup = new THREE.Group();
  leftGroup.position.set(-3, 0, 0);
  addBox(leftGroup);
  modelRoot.add(leftGroup);

  const nestedGroup = new THREE.Group();
  nestedGroup.position.set(1, 0, 1);
  addBox(nestedGroup);
  leftGroup.add(nestedGroup);

  const rightGroup = new THREE.Group();
  rightGroup.position.set(3, 0, 0);
  addBox(rightGroup);
  modelRoot.add(rightGroup);

  scene.updateMatrixWorld(true);
  const leftPosition = leftGroup.position.clone();
  const rightPosition = rightGroup.position.clone();
  const nestedPosition = nestedGroup.position.clone();
  const leftWorldPosition = leftGroup.getWorldPosition(new THREE.Vector3());
  const rightWorldPosition = rightGroup.getWorldPosition(new THREE.Vector3());

  const layout = createTopLevelGroupExpansionLayout(
    modelRoot,
    [leftGroup, rightGroup],
    0.2,
  );
  applyModelExpansionProgress(layout, 1);
  scene.updateMatrixWorld(true);

  assert.equal(layout.size, 2);
  assert.ok(leftGroup.getWorldPosition(new THREE.Vector3()).x < leftWorldPosition.x);
  assert.ok(rightGroup.getWorldPosition(new THREE.Vector3()).x > rightWorldPosition.x);
  assertVectorClose(nestedGroup.position, nestedPosition);

  applyModelExpansionProgress(layout, 0);
  scene.updateMatrixWorld(true);
  assertVectorClose(leftGroup.position, leftPosition);
  assertVectorClose(rightGroup.position, rightPosition);
  assertVectorClose(nestedGroup.position, nestedPosition);
});

test('scales expansion distance linearly with distance from the model center', () => {
  const modelRoot = new THREE.Group();
  const leftAnchor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  leftAnchor.position.x = -5;
  modelRoot.add(leftAnchor);

  const nearGroup = new THREE.Group();
  nearGroup.position.x = 1;
  addBox(nearGroup);
  modelRoot.add(nearGroup);

  const farGroup = new THREE.Group();
  farGroup.position.x = 5;
  addBox(farGroup);
  modelRoot.add(farGroup);
  modelRoot.updateMatrixWorld(true);

  const expansionRatio = 0.9;
  const nearBefore = nearGroup.getWorldPosition(new THREE.Vector3());
  const farBefore = farGroup.getWorldPosition(new THREE.Vector3());
  const layout = createTopLevelGroupExpansionLayout(
    modelRoot,
    [nearGroup, farGroup],
  );

  applyModelExpansionProgress(layout, 1);
  modelRoot.updateMatrixWorld(true);
  const nearDistance = nearGroup.getWorldPosition(new THREE.Vector3()).distanceTo(nearBefore);
  const farDistance = farGroup.getWorldPosition(new THREE.Vector3()).distanceTo(farBefore);

  assert.ok(Math.abs(nearDistance - 1 * expansionRatio) < 1e-8);
  assert.ok(Math.abs(farDistance - 5 * expansionRatio) < 1e-8);
  assert.ok(Math.abs(farDistance / nearDistance - 5) < 1e-8);
});

test('expands narrower model axes farther in inverse proportion to their width', () => {
  const modelRoot = new THREE.Group();
  modelRoot.add(new THREE.Mesh(new THREE.BoxGeometry(10, 2, 2)));

  const xGroup = new THREE.Group();
  xGroup.position.x = 1;
  modelRoot.add(xGroup);

  const yGroup = new THREE.Group();
  yGroup.position.y = 1;
  modelRoot.add(yGroup);
  modelRoot.updateMatrixWorld(true);

  const xBefore = xGroup.position.clone();
  const yBefore = yGroup.position.clone();
  const layout = createTopLevelGroupExpansionLayout(
    modelRoot,
    [xGroup, yGroup],
    1,
  );

  applyModelExpansionProgress(layout, 1);

  const xDisplacement = xGroup.position.distanceTo(xBefore);
  const yDisplacement = yGroup.position.distanceTo(yBefore);
  assert.ok(Math.abs(xDisplacement - 1) < 1e-8);
  assert.ok(Math.abs(yDisplacement - 5) < 1e-8);
  assert.ok(Math.abs(yDisplacement / xDisplacement - 5) < 1e-8);
});

test('expands every HtmlSprite independently from its own world position', () => {
  const modelRoot = new THREE.Group();
  modelRoot.add(new THREE.Mesh(new THREE.BoxGeometry(10, 2, 2)));

  const xLabel = { uuid: 'x-label', position: [1, 0, 0] };
  const yLabel = { uuid: 'y-label', position: [0, 1, 0] };
  const layout = createHtmlSpriteExpansionLayout(
    modelRoot,
    [xLabel, yLabel],
    1,
  );

  applyModelExpansionProgress(layout, 0.5);
  assertVectorClose(new THREE.Vector3().fromArray(xLabel.position), new THREE.Vector3(1.5, 0, 0));
  assertVectorClose(new THREE.Vector3().fromArray(yLabel.position), new THREE.Vector3(0, 3.5, 0));

  applyModelExpansionProgress(layout, 0);
  assert.deepEqual(xLabel.position, [1, 0, 0]);
  assert.deepEqual(yLabel.position, [0, 1, 0]);
});
