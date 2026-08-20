import * as THREE from 'three';

const canvasState = new WeakMap();
const direction = new THREE.Vector3();
const worldOrigin = new THREE.Vector3();
const worldTarget = new THREE.Vector3();
const screenOrigin = new THREE.Vector3();
const screenTarget = new THREE.Vector3();
const localDirection = new THREE.Vector3();
const objectQuaternion = new THREE.Quaternion();
const CJK_CHARACTER_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

function numberValue(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isBillboard(sprite) {
  return sprite?.billboard !== false
    && sprite?.type !== 'HtmlPlane'
    && sprite?.type !== 'CanvasLabelPlane';
}

export function measureCanvasTextWidth(context, text, fontSize) {
  const measuredWidth = context.measureText(text).width;
  const fallbackOverflow = Array.from(text).reduce((total, character) => {
    if (!CJK_CHARACTER_PATTERN.test(character)) return total;
    const characterWidth = context.measureText(character).width;
    // Windows Canvas 的西文字体回退可能把汉字 advance 计算为两倍字号。
    return characterWidth > fontSize * 1.5
      ? total + characterWidth - fontSize
      : total;
  }, 0);
  return Math.max(measuredWidth - fallbackOverflow, 0);
}

function getArrowAngle(sprite, camera) {
  const userData = sprite?.userData || {};
  if (userData.showArrow === false) return 0;
  direction.set(
    numberValue(userData.directionX, 1),
    numberValue(userData.directionY, 0),
    numberValue(userData.directionZ, 0),
  );
  if (direction.lengthSq() <= 1e-12) return null;

  if (isBillboard(sprite)) {
    worldOrigin.fromArray(sprite.position || [0, 0, 0]);
    worldTarget.copy(worldOrigin).add(direction.normalize());
    screenOrigin.copy(worldOrigin).project(camera);
    screenTarget.copy(worldTarget).project(camera);
    const dx = screenTarget.x - screenOrigin.x;
    const dy = -(screenTarget.y - screenOrigin.y);
    return dx * dx + dy * dy > 1e-10 ? Math.atan2(dy, dx) : null;
  }

  localDirection.copy(direction).normalize();
  objectQuaternion.fromArray(sprite.quaternion || [0, 0, 0, 1]).invert();
  localDirection.applyQuaternion(objectQuaternion);
  const dx = localDirection.x;
  const dy = -localDirection.y;
  return dx * dx + dy * dy > 1e-10 ? Math.atan2(dy, dx) : null;
}

function roundedRectPath(context, x, y, width, height, radius, point1, point2, point3, point3Y, withArrow) {
  const r = Math.min(Math.max(radius, 0), width / 2, height / 2);
  const bottom = y + height;
  const centerX = x + width / 2;
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, bottom - r);
  context.quadraticCurveTo(x + width, bottom, x + width - r, bottom);
  if (withArrow) {
    context.lineTo(centerX + Math.max(point1, point2), bottom);
    context.lineTo(centerX + point3, bottom + point3Y);
    context.lineTo(centerX + Math.min(point1, point2), bottom);
  }
  context.lineTo(x + r, bottom);
  context.quadraticCurveTo(x, bottom, x, bottom - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function replaceCanvasTexture(mesh, state) {
  const previousTexture = state.texture;
  const nextTexture = new THREE.CanvasTexture(state.canvas);
  nextTexture.colorSpace = THREE.SRGBColorSpace;
  nextTexture.generateMipmaps = false;
  nextTexture.minFilter = THREE.LinearFilter;
  nextTexture.magFilter = THREE.LinearFilter;
  nextTexture.anisotropy = previousTexture.anisotropy;
  nextTexture.needsUpdate = true;
  state.texture = nextTexture;
  mesh.material.map = nextTexture;
  mesh.material.needsUpdate = true;
  previousTexture.dispose();
}

function drawCanvas(mesh, sprite, arrowAngle, replaceTexture) {
  const data = sprite.userData || {};
  const state = canvasState.get(mesh);
  const canvas = state.canvas;
  const context = canvas.getContext('2d');
  if (!context) return;

  const dpr = Math.max(Math.ceil((window.devicePixelRatio || 1) * 2), 2);
  const fontSize = Math.max(numberValue(data.fontSize, 16), 1);
  const arrowSize = Math.max(numberValue(data.arrowSize, 20), 1);
  const horizontal = Math.max(numberValue(data.paddingLeftRight, 10), 0);
  const vertical = Math.max(numberValue(data.paddingTopBottom, 4), 0);
  const gap = Math.max(numberValue(data.gap, 6), 0);
  const fontFamily = String(data.fontFamily || 'Arial, sans-serif');
  const fontWeight = data.bold === false ? 'normal' : 'bold';
  const prefix = String(data.prefix ?? '');
  const value = String(data.value ?? data.textValue ?? data.paramValue ?? '');
  const unit = String(data.unit ?? '');
  const arrowText = '\u279c';
  const measure = (text, size) => {
    context.font = `${fontWeight} ${size}px ${fontFamily}`;
    return measureCanvasTextWidth(context, text, size);
  };
  const arrowWidth = data.showArrow === false ? 0 : Math.max(measure(arrowText, arrowSize), arrowSize);
  const parts = data.showArrow === false
    ? [[prefix, measure(prefix, fontSize), fontSize, false], [value, measure(value, fontSize), fontSize, false], [unit, measure(unit, fontSize), fontSize, false]]
    : data.arrowPosition === 'end'
      ? [[prefix, measure(prefix, fontSize), fontSize, false], [value, measure(value, fontSize), fontSize, false], [unit, measure(unit, fontSize), fontSize, false], [arrowText, arrowWidth, arrowSize, true]]
      : [[arrowText, arrowWidth, arrowSize, true], [prefix, measure(prefix, fontSize), fontSize, false], [value, measure(value, fontSize), fontSize, false], [unit, measure(unit, fontSize), fontSize, false]];
  const labelWidth = Math.ceil(horizontal * 2 + parts.reduce((total, part) => total + part[1], 0) + Math.max(parts.length - 1, 0) * gap);
  const labelHeight = Math.ceil((data.showArrow === false ? fontSize : Math.max(fontSize, arrowSize)) + vertical * 2);
  const point1 = numberValue(data.trianglePoint1X, -12);
  const point2 = numberValue(data.trianglePoint2X, 12);
  const point3 = numberValue(data.trianglePoint3X, 0);
  const point3Y = numberValue(data.trianglePoint3Y, 14);
  const radius = Math.max(numberValue(data.borderRadius, 6), 0);
  const borderWidth = Math.max(numberValue(data.borderWidth, 2), 0);
  const padding = Math.max(borderWidth / 2 + 1, 1);
  const triangleLeft = Math.min(point1, point2, point3);
  const triangleRight = Math.max(point1, point2, point3);
  const triangleTop = Math.min(point3Y, 0);
  const triangleBottom = Math.max(point3Y, 0);
  const offsetX = Math.max(-labelWidth / 2 - triangleLeft, 0);
  const rightOverflow = Math.max(triangleRight - labelWidth / 2, 0);
  const width = Math.ceil(labelWidth + offsetX + rightOverflow + padding * 2);
  const height = Math.ceil(labelHeight + triangleBottom - triangleTop + padding * 2);
  const x = padding + offsetX;
  const labelTop = padding - triangleTop;

  canvas.width = Math.max(Math.ceil(width * dpr), 1);
  canvas.height = Math.max(Math.ceil(height * dpr), 1);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  roundedRectPath(
    context,
    x,
    labelTop,
    labelWidth,
    labelHeight,
    radius,
    point1,
    point2,
    point3,
    point3Y,
    data.showBottomArrow !== false,
  );
  context.fillStyle = String(data.bgColor ?? '#1677a6');
  context.fill();
  if (borderWidth > 0) {
    context.lineWidth = borderWidth;
    context.strokeStyle = String(data.borderColor ?? '#0e5d83');
    context.lineJoin = 'round';
    context.stroke();
  }

  context.textBaseline = 'middle';
  let textX = x + horizontal;
  const textCenterY = labelTop + labelHeight / 2 + fontSize * 0.08;
  parts.forEach(([text, partWidth, size, isArrow], index) => {
    context.font = `${fontWeight} ${size}px ${fontFamily}`;
    context.fillStyle = isArrow ? String(data.arrowColor ?? data.textColor ?? '#ffffff') : String(data.textColor ?? '#ffffff');
    if (isArrow && arrowAngle !== null) {
      context.save();
      context.translate(textX + partWidth / 2, textCenterY);
      context.rotate(arrowAngle);
      context.fillText(text, -partWidth / 2, 0);
      context.restore();
    } else if (!isArrow) {
      context.fillText(text, textX, textCenterY);
    }
    textX += partWidth;
    if (index < parts.length - 1) textX += gap;
  });

  const geometry = new THREE.PlaneGeometry(width, height);
  geometry.translate(width / 2 - (x + labelWidth / 2), labelTop + labelHeight / 2 - height / 2, 0);
  mesh.geometry.dispose();
  mesh.geometry = geometry;
  mesh.userData.__canvasWidth = width;
  mesh.userData.__canvasHeight = height;
  state.signature = JSON.stringify(data);
  state.arrowAngle = arrowAngle;
  state.texture.needsUpdate = true;
  state.texture.image = canvas;
  state.texture.generateMipmaps = false;
  state.texture.minFilter = THREE.LinearFilter;
  state.texture.magFilter = THREE.LinearFilter;
  state.texture.source.needsUpdate = true;
  mesh.material.needsUpdate = true;
  if (replaceTexture) replaceCanvasTexture(mesh, state);
}

export function isCanvasDataLabelArrowPlus(sprite) {
  return Boolean(sprite?.useCanvas && sprite?.options?.key === 'Html dataLabelArrowPlus');
}

export function applyDataLabelArrowPlusCanvasValue(sprite, value) {
  if (!sprite) return;
  sprite.options = { ...(sprite.options || {}), paramValue: value };
  sprite.userData = { ...(sprite.userData || {}), paramValue: value, value };
}

export function createDataLabelArrowPlusCanvasObject(sprite) {
  if (typeof document === 'undefined' || !sprite) return null;
  const canvas = document.createElement('canvas');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.name = sprite.name || 'CanvasLabelPlane';
  mesh.position.fromArray(sprite.position || [0, 0, 0]);
  mesh.quaternion.fromArray(sprite.quaternion || [0, 0, 0, 1]);
  const scale = Array.isArray(sprite.scale) ? sprite.scale : [sprite.scale ?? 1, sprite.scale ?? 1, sprite.scale ?? 1];
  mesh.scale.fromArray(scale);
  mesh.frustumCulled = false;
  mesh.userData.__canvasDataLabelArrowPlus = true;
  canvasState.set(mesh, { canvas, texture, signature: '', arrowAngle: undefined });
  return mesh;
}

export function updateDataLabelArrowPlusCanvasObject(mesh, sprite, camera) {
  const state = canvasState.get(mesh);
  if (!state || !sprite || !camera) return;
  mesh.position.fromArray(sprite.position || [0, 0, 0]);
  const scale = Array.isArray(sprite.scale) ? sprite.scale : [sprite.scale ?? 1, sprite.scale ?? 1, sprite.scale ?? 1];
  mesh.scale.fromArray(scale);
  if (isBillboard(sprite)) mesh.quaternion.copy(camera.quaternion);
  else mesh.quaternion.fromArray(sprite.quaternion || [0, 0, 0, 1]);
  const arrowAngle = getArrowAngle(sprite, camera);
  const signature = JSON.stringify(sprite.userData || {});
  const dataChanged = state.signature !== signature;
  if (dataChanged || state.arrowAngle !== arrowAngle) {
    drawCanvas(mesh, sprite, arrowAngle, dataChanged);
  }
}

export function disposeDataLabelArrowPlusCanvasObject(mesh) {
  const state = canvasState.get(mesh);
  if (!state) return;
  state.texture.dispose();
  mesh.geometry.dispose();
  mesh.material.dispose();
  canvasState.delete(mesh);
}
