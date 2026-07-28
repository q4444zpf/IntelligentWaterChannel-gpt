import * as THREE from 'three';
import { applyDataLabelUserData } from './data-label.js';
import { htmlObjectUserData, setPixelStyle } from './shared.js';

export const DATA_LABEL_ARROW_KEY = 'Html dataLabelArrow';

const direction = new THREE.Vector3();
const directionOrigin = new THREE.Vector3();
const directionTarget = new THREE.Vector3();
const projectedOrigin = new THREE.Vector3();
const projectedTarget = new THREE.Vector3();

function applyDataLabelArrowUserData(element, userData) {
  if (!applyDataLabelUserData(element, userData, '#dataLabelArrow')) return false;

  const dataLabel = element.querySelector('#dataLabelArrow');
  const arrow = element.querySelector('#directionArrow');
  if (!dataLabel || !arrow) return true;
  if (userData.arrowPosition === 'end') dataLabel.append(arrow);
  else dataLabel.prepend(arrow);
  arrow.style.display = userData.showArrow === false ? 'none' : 'inline-block';
  if (userData.arrowColor !== undefined) arrow.style.color = userData.arrowColor;
  setPixelStyle(arrow, 'fontSize', userData.arrowSize);
  return true;
}

export const dataLabelArrowHandler = {
  matches(element, key) {
    return key === DATA_LABEL_ARROW_KEY || Boolean(element.querySelector('#dataLabelArrow'));
  },
  apply(element, userData) {
    return applyDataLabelArrowUserData(element, userData);
  },
};

export function updateHtmlSpriteDirectionArrow(element, sprite, camera, width, height) {
  const arrow = element?.querySelector?.('#directionArrow');
  if (!arrow || !sprite || !camera) return false;

  const userData = htmlObjectUserData(sprite);
  if (userData.showArrow === false) {
    arrow.style.display = 'none';
    return false;
  }

  direction.set(
    Number(userData.directionX ?? 1),
    Number(userData.directionY ?? 0),
    Number(userData.directionZ ?? 0),
  );
  if (![direction.x, direction.y, direction.z].every(Number.isFinite) || direction.lengthSq() <= 1e-12) {
    arrow.style.visibility = 'hidden';
    return false;
  }

  directionOrigin.fromArray(sprite.position || [0, 0, 0]);
  directionTarget.copy(directionOrigin).add(direction.normalize());
  projectedOrigin.copy(directionOrigin).project(camera);
  projectedTarget.copy(directionTarget).project(camera);

  const dx = (projectedTarget.x - projectedOrigin.x) * width * 0.5;
  const dy = -(projectedTarget.y - projectedOrigin.y) * height * 0.5;
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || dx * dx + dy * dy <= 1e-8) {
    arrow.style.visibility = 'hidden';
    return false;
  }

  arrow.style.display = 'inline-block';
  arrow.style.visibility = 'visible';
  arrow.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  return true;
}
