export function setText(element, value) {
  if (element && value !== undefined) element.textContent = value == null ? '' : String(value);
}

export function setPixelStyle(element, property, value) {
  if (element && value !== undefined && Number.isFinite(Number(value))) {
    element.style[property] = `${Number(value)}px`;
  }
}

export function htmlObjectUserData(sprite) {
  return {
    ...(sprite?.options?.userData || {}),
    ...(sprite?.userData || {}),
  };
}

export function applyGenericUserData(element, userData) {
  const elementsWithIds = element.querySelectorAll('[id]');
  for (const [key, value] of Object.entries(userData)) {
    const target = Array.from(elementsWithIds).find((candidate) => candidate.id === key);
    setText(target, value);
  }
}
