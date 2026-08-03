import { dataLabelHandler } from './html-objects/data-label.js';
import {
  dataLabelArrowHandler,
  updateHtmlSpriteDirectionArrow,
} from './html-objects/data-label-arrow.js';
import { deviceHandler } from './html-objects/device.js';
import {
  applyGenericUserData,
  htmlObjectUserData,
  setText,
} from './html-objects/shared.js';

const HTML_OBJECT_HANDLERS = [
  dataLabelArrowHandler,
  dataLabelHandler,
  deviceHandler,
];

export { updateHtmlSpriteDirectionArrow };

export function isHtmlSpriteHierarchyVisible(sprite, objectByUuid) {
  if (!sprite || sprite.visible === false) return false;
  return (sprite.ancestorUuids || []).every((uuid) => objectByUuid?.get(uuid)?.visible !== false);
}

export function applyHtmlSpriteUserData(element, sprite) {
  if (!element || !sprite) return;
  const userData = htmlObjectUserData(sprite);
  const key = sprite.options?.key || sprite.options?.cardKey;
  const handler = HTML_OBJECT_HANDLERS.find((candidate) => candidate.matches(element, key));

  handler?.apply(element, userData);
  applyGenericUserData(element, userData);
}

function findBoundElement(element, field) {
  const explicitTarget = element.querySelector('[data-bind-id]');
  if (explicitTarget) return explicitTarget;

  const labelValue = element.querySelector('#labelValue');
  if (labelValue) return labelValue;

  return Array.from(element.querySelectorAll('[id]')).find((candidate) => (
    candidate.id === field || candidate.id.startsWith(`${field}-`)
  ));
}

export function updateHtmlSpriteData(element, sprite, field, value) {
  if (!element || !sprite || !field || sprite.options?.paramField !== field) return false;
  const target = findBoundElement(element, field);
  if (!target) return false;

  setText(target, value);
  sprite.userData = { ...htmlObjectUserData(sprite), value };
  return true;
}

export function parseMqttPayload(message) {
  const text = typeof message === 'string' ? message : message?.toString?.();
  if (!text) return null;

  try {
    const payload = JSON.parse(text);
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
  } catch {
    return null;
  }
}
