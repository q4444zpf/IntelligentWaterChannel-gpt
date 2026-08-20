import { setPixelStyle, setText } from './shared.js';
import { applyDataLabelUserData } from './data-label.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const triangleArrowElements = new WeakMap();

function numberValue(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getTriangleArrow(element) {
  const cached = triangleArrowElements.get(element);
  if (cached && element.contains?.(cached)) return cached;

  const currentArrow = element.querySelector('#bottomTriangleArrow');
  if (!currentArrow) return null;
  if (typeof SVGSVGElement !== 'undefined' && currentArrow instanceof SVGSVGElement) {
    triangleArrowElements.set(element, currentArrow);
    return currentArrow;
  }

  if (typeof document === 'undefined' || !document.createElementNS) return null;
  const arrow = document.createElementNS(SVG_NAMESPACE, 'svg');
  arrow.id = 'bottomTriangleArrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.setAttribute('viewBox', '0 0 24 14');
  arrow.setAttribute('preserveAspectRatio', 'none');
  arrow.setAttribute('style', currentArrow.getAttribute?.('style') || '');
  arrow.style.background = 'transparent';
  arrow.style.overflow = 'visible';
  const polygon = document.createElementNS(SVG_NAMESPACE, 'polygon');
  polygon.setAttribute('points', '0,0 24,0 12,14');
  const outline = document.createElementNS(SVG_NAMESPACE, 'polyline');
  outline.setAttribute('points', '0,0 12,14 24,0');
  outline.setAttribute('fill', 'none');
  outline.setAttribute('stroke-linecap', 'butt');
  outline.setAttribute('stroke-linejoin', 'round');
  arrow.append(polygon, outline);
  currentArrow.replaceWith?.(arrow);
  triangleArrowElements.set(element, arrow);
  return arrow;
}

function ensureRoot(element, dataLabel, arrow) {
  const existingRoot = element.querySelector('#dataLabelArrowPlusRoot');
  const parent = dataLabel?.parentElement;
  if (existingRoot) {
    if (dataLabel.parentElement !== existingRoot) {
      dataLabel.remove();
      existingRoot.insertBefore(dataLabel, existingRoot.firstChild);
    }
    if (arrow && arrow.parentElement !== existingRoot) {
      arrow.remove();
      existingRoot.appendChild(arrow);
    }
    return existingRoot;
  }
  if (!arrow || !parent || typeof document === 'undefined') return null;
  const root = document.createElement('div');
  root.id = 'dataLabelArrowPlusRoot';
  root.style.position = 'relative';
  root.style.display = 'inline-block';
  root.style.verticalAlign = 'top';
  root.style.overflow = 'visible';
  arrow.remove();
  parent.insertBefore(root, dataLabel);
  root.append(dataLabel, arrow);
  return root;
}

function ensureBottomBorderOverlay(element, root) {
  const existing = element.querySelector('#bottomBorderOverlay');
  if (existing || !root || typeof document === 'undefined' || !document.createElementNS) return existing;

  const overlay = document.createElementNS(SVG_NAMESPACE, 'svg');
  overlay.id = 'bottomBorderOverlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('preserveAspectRatio', 'none');
  Object.assign(overlay.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    overflow: 'visible',
    pointerEvents: 'none',
    zIndex: '1',
  });
  const path = document.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linecap', 'butt');
  path.setAttribute('stroke-linejoin', 'round');
  overlay.append(path);
  if (root.insertBefore) root.insertBefore(overlay, root.firstChild?.nextSibling || null);
  else root.appendChild(overlay);
  return overlay;
}

function updateTriangleArrow(element, userData) {
  const dataLabel = element.querySelector('#dataLabelArrow');
  const arrow = getTriangleArrow(element);
  if (!dataLabel || !arrow) return;

  const points = [
    [numberValue(userData.trianglePoint1X, -12), 0],
    [numberValue(userData.trianglePoint2X, 12), 0],
    [numberValue(userData.trianglePoint3X, 0), numberValue(userData.trianglePoint3Y, 14)],
  ];
  const minX = Math.min(...points.map(([x]) => x));
  const maxX = Math.max(...points.map(([x]) => x));
  const minY = Math.min(...points.map(([, y]) => y));
  const maxY = Math.max(...points.map(([, y]) => y));
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const computedStyle = typeof getComputedStyle === 'function' ? getComputedStyle(dataLabel) : {};
  const borderWidth = Math.max(numberValue(userData.borderWidth, Number.parseFloat(computedStyle.borderWidth) || 0), 0);

  arrow.style.left = `calc(50% + ${minX}px)`;
  arrow.style.top = `calc(100% - ${borderWidth / 2}px + ${minY}px)`;
  arrow.style.setProperty?.('position', 'absolute', 'important');
  if (!arrow.style.setProperty) arrow.style.position = 'absolute';
  arrow.style.width = `${width}px`;
  arrow.style.height = `${height}px`;
  arrow.setAttribute('viewBox', `0 0 ${width} ${height}`);
  arrow.setAttribute('width', String(width));
  arrow.setAttribute('height', String(height));

  const polygon = arrow.querySelector('polygon');
  const outline = arrow.querySelector('polyline');
  const svgPoints = points.map(([x, y]) => `${x - minX},${y - minY}`).join(' ');
  polygon?.setAttribute('points', svgPoints);
  outline?.setAttribute('points', `${points[0][0] - minX},${points[0][1] - minY} ${points[2][0] - minX},${points[2][1] - minY} ${points[1][0] - minX},${points[1][1] - minY}`);
  polygon?.setAttribute('fill', computedStyle.backgroundColor || String(userData.bgColor ?? '#1677a6'));
  // 三角描边由底边连续轮廓统一绘制，避免两段 SVG 在根部产生拼接缝隙。
  outline?.setAttribute('visibility', 'hidden');
  arrow.style.display = userData.showBottomArrow === false ? 'none' : 'block';
}

function updateBottomBorderOverlay(element, userData) {
  const dataLabel = element.querySelector('#dataLabelArrow');
  const overlay = element.querySelector('#bottomBorderOverlay');
  if (!dataLabel || !overlay) return;

  const computedStyle = typeof getComputedStyle === 'function' ? getComputedStyle(dataLabel) : {};
  const borderWidth = Math.max(numberValue(userData.borderWidth, Number.parseFloat(computedStyle.borderWidth) || 0), 0);
  const borderColor = String(userData.borderColor ?? '#0e5d83');
  const width = Math.max(Number(dataLabel.offsetWidth) || dataLabel.getBoundingClientRect?.().width || 1, 1);
  const height = Math.max(Number(dataLabel.offsetHeight) || dataLabel.getBoundingClientRect?.().height || 1, 1);
  const inset = borderWidth / 2;
  const left = inset;
  const top = inset;
  const right = width - inset;
  const bottom = height - inset;
  const radius = Math.min(
    Math.max(numberValue(userData.borderRadius, 6) - inset, 0),
    (right - left) / 2,
    (bottom - top) / 2,
  );
  const center = width / 2;
  const point1 = numberValue(userData.trianglePoint1X, -12);
  const point2 = numberValue(userData.trianglePoint2X, 12);
  const point3 = numberValue(userData.trianglePoint3X, 0);
  const point3Y = numberValue(userData.trianglePoint3Y, 14);
  const triangleLeft = center + Math.min(point1, point2);
  const triangleRight = center + Math.max(point1, point2);
  const triangleTipX = center + point3;
  const triangleTipY = bottom + point3Y;
  const leftEnd = Math.max(left + radius, Math.min(right - radius, triangleLeft));
  const rightStart = Math.max(left + radius, Math.min(right - radius, triangleRight));
  const path = overlay.querySelector('path');
  const topAndSides = radius > 0
    ? `M ${left + radius} ${top} H ${right - radius} Q ${right} ${top} ${right} ${top + radius} V ${bottom - radius} Q ${right} ${bottom} ${right - radius} ${bottom}`
    : `M ${left} ${top} H ${right} V ${bottom}`;
  const leftSide = radius > 0
    ? `H ${left + radius} Q ${left} ${bottom} ${left} ${bottom - radius} V ${top + radius} Q ${left} ${top} ${left + radius} ${top} Z`
    : `H ${left} V ${top} Z`;
  const roundedOutline = `${topAndSides} ${leftSide}`;
  const arrowOutline = `${topAndSides} H ${rightStart} L ${triangleTipX} ${triangleTipY} L ${leftEnd} ${bottom} ${leftSide}`;

  overlay.setAttribute('viewBox', `0 0 ${width} ${height}`);
  overlay.setAttribute('width', String(width));
  overlay.setAttribute('height', String(height));
  overlay.style.width = `${width}px`;
  overlay.style.height = `${height}px`;
  overlay.style.display = borderWidth > 0 ? 'block' : 'none';
  path?.setAttribute('d', userData.showBottomArrow === false ? roundedOutline : arrowOutline);
  path?.setAttribute('stroke', borderColor);
  path?.setAttribute('stroke-width', String(borderWidth));
}

export function updateDataLabelArrowPlus(element, userData = {}) {
  updateTriangleArrow(element, userData);
  updateBottomBorderOverlay(element, userData);
}

export const dataLabelArrowPlusHandler = {
  matches(element, key) {
    return key === 'Html dataLabelArrowPlus' || Boolean(element.querySelector('#dataLabelArrowPlusRoot'));
  },
  apply(element, userData) {
    if (!applyDataLabelUserData(element, userData, '#dataLabelArrow')) return false;
    const dataLabel = element.querySelector('#dataLabelArrow');
    const arrow = element.querySelector('#directionArrow');
    if (!dataLabel) return false;

    dataLabel.style.background = String(userData.bgColor ?? '#1677a6');
    dataLabel.style.color = String(userData.textColor ?? '#ffffff');
    // CSS 边框仅保留布局占位，实际轮廓由同一条 SVG 路径完整绘制。
    dataLabel.style.borderColor = 'transparent';
    dataLabel.style.borderRadius = `${numberValue(userData.borderRadius, 6)}px`;
    dataLabel.style.borderWidth = `${numberValue(userData.borderWidth, 2)}px`;
    dataLabel.style.fontWeight = userData.bold === false ? 'normal' : 'bold';
    dataLabel.style.fontSize = `${numberValue(userData.fontSize, 16)}px`;
    dataLabel.style.lineHeight = '1';
    dataLabel.style.gap = `${numberValue(userData.gap, 6)}px`;
    dataLabel.style.padding = `${numberValue(userData.paddingTopBottom, 4)}px ${numberValue(userData.paddingLeftRight, 10)}px`;
    setText(dataLabel.querySelector('#labelValue'), userData.value ?? userData.textValue);
    if (arrow) {
      if (userData.arrowPosition === 'end') dataLabel.append(arrow);
      else dataLabel.prepend(arrow);
      arrow.style.display = userData.showArrow === false ? 'none' : 'inline-block';
      arrow.style.visibility = '';
      arrow.style.color = String(userData.arrowColor ?? '#ffffff');
      setPixelStyle(arrow, 'fontSize', numberValue(userData.arrowSize, 20));
    }
    [
      dataLabel.querySelector('#labelPrefix'),
      dataLabel.querySelector('#labelValue'),
      dataLabel.querySelector('#labelUnit'),
    ].forEach((label) => {
      if (label?.style) {
        label.style.position = 'relative';
        label.style.top = '0.08em';
      }
    });
    const root = ensureRoot(element, dataLabel, getTriangleArrow(element));
    ensureBottomBorderOverlay(element, root);
    updateDataLabelArrowPlus(element, userData);
    return true;
  },
};
