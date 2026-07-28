import { setPixelStyle, setText } from './shared.js';

export const DATA_LABEL_KEY = 'Html dataLabel';

export function applyDataLabelUserData(element, userData, selector = '#dataLabel') {
  const dataLabel = element.querySelector(selector);
  if (!dataLabel) return false;

  setText(dataLabel.querySelector('#labelPrefix'), userData.prefix);
  setText(dataLabel.querySelector('#labelValue'), userData.value);
  setText(dataLabel.querySelector('#labelUnit'), userData.unit);
  if (userData.bgColor !== undefined) dataLabel.style.background = userData.bgColor;
  if (userData.textColor !== undefined) dataLabel.style.color = userData.textColor;
  if (userData.borderColor !== undefined) dataLabel.style.borderColor = userData.borderColor;
  setPixelStyle(dataLabel, 'borderRadius', userData.borderRadius);
  setPixelStyle(dataLabel, 'borderWidth', userData.borderWidth);
  if (userData.bold !== undefined) dataLabel.style.fontWeight = userData.bold ? 'bold' : 'normal';
  setPixelStyle(dataLabel, 'fontSize', userData.fontSize);
  if (userData.paddingTopBottom !== undefined && userData.paddingLeftRight !== undefined) {
    dataLabel.style.padding = `${Number(userData.paddingTopBottom)}px ${Number(userData.paddingLeftRight)}px`;
  }
  return true;
}

export const dataLabelHandler = {
  matches(element, key) {
    return key === DATA_LABEL_KEY || Boolean(element.querySelector('#dataLabel'));
  },
  apply(element, userData) {
    return applyDataLabelUserData(element, userData);
  },
};
