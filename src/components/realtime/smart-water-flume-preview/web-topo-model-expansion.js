import * as THREE from 'three';

function createExpansionContext(modelRoot, expansionRatio) {
  if (!modelRoot) return null;

  modelRoot.updateWorldMatrix(true, true);
  const modelBounds = new THREE.Box3().setFromObject(modelRoot);
  if (modelBounds.isEmpty()) return null;

  const modelCenter = modelBounds.getCenter(new THREE.Vector3());
  const modelSize = modelBounds.getSize(new THREE.Vector3());
  const referenceWidth = Math.max(modelSize.x, modelSize.y, modelSize.z);
  const minimumWidth = Math.max(referenceWidth * 1e-6, Number.EPSILON);
  const axisExpansionScale = new THREE.Vector3(
    referenceWidth / Math.max(modelSize.x, minimumWidth),
    referenceWidth / Math.max(modelSize.y, minimumWidth),
    referenceWidth / Math.max(modelSize.z, minimumWidth),
  ).multiplyScalar(expansionRatio);

  return { modelCenter, axisExpansionScale };
}

function expandedPositionFrom(position, context) {
  const expansionOffset = position.clone()
    .sub(context.modelCenter)
    .multiply(context.axisExpansionScale);
  return position.clone().add(expansionOffset);
}

export function createTopLevelGroupExpansionLayout(
  modelRoot,
  topLevelGroups,
  expansionRatio = 0.9,
) {
  const layout = new Map();
  const groups = topLevelGroups.filter(Boolean);
  if (!modelRoot || !groups.length) return layout;

  const context = createExpansionContext(modelRoot, expansionRatio);
  if (!context) return layout;

  groups.forEach((object) => {
    const groupBounds = new THREE.Box3().setFromObject(object);
    const groupCenter = groupBounds.isEmpty()
      ? object.getWorldPosition(new THREE.Vector3())
      : groupBounds.getCenter(new THREE.Vector3());
    const expansionOffset = expandedPositionFrom(groupCenter, context).sub(groupCenter);
    const expandedWorldPosition = object.getWorldPosition(new THREE.Vector3())
      .add(expansionOffset);
    const expandedPosition = object.parent
      ? object.parent.worldToLocal(expandedWorldPosition.clone())
      : expandedWorldPosition;
    layout.set(object.uuid, {
      object,
      collapsedPosition: object.position.clone(),
      expandedPosition,
      currentPosition: new THREE.Vector3(),
    });
  });

  return layout;
}

export function createHtmlSpriteExpansionLayout(
  modelRoot,
  htmlSprites,
  expansionRatio = 0.9,
) {
  const layout = new Map();
  const sprites = htmlSprites.filter((sprite) => (
    sprite?.uuid && Array.isArray(sprite.position) && sprite.position.length >= 3
  ));
  if (!sprites.length) return layout;

  const context = createExpansionContext(modelRoot, expansionRatio);
  if (!context) return layout;

  sprites.forEach((sprite) => {
    const collapsedPosition = new THREE.Vector3().fromArray(sprite.position);
    layout.set(`html-sprite:${sprite.uuid}`, {
      sprite,
      collapsedPosition,
      expandedPosition: expandedPositionFrom(collapsedPosition, context),
      currentPosition: new THREE.Vector3(),
    });
  });

  return layout;
}

export function applyModelExpansionProgress(layout, progress) {
  const value = THREE.MathUtils.clamp(progress, 0, 1);
  layout.forEach(({
    object,
    sprite,
    collapsedPosition,
    expandedPosition,
    currentPosition,
  }) => {
    currentPosition.lerpVectors(collapsedPosition, expandedPosition, value);
    if (object) {
      object.position.copy(currentPosition);
      object.updateMatrix();
    } else if (sprite) {
      currentPosition.toArray(sprite.position);
    }
  });
}
