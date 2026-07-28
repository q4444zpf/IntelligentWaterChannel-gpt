import { setText } from './shared.js';

export const DEVICE_KEY = 'Html device';

export const deviceHandler = {
  matches(_element, key) {
    return key === DEVICE_KEY;
  },
  apply(element, userData) {
    setText(element.querySelector('#temp'), userData.temp);
    return true;
  },
};
