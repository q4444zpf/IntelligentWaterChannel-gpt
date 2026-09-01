import {
  AERATION_PROTOTYPE_ALARM_DEVICES,
  AERATION_PROTOTYPE_DEFAULT_DEVICE_IDS,
  AERATION_PROTOTYPE_DEVICES,
  buildAerationPrototypeAlarmPage,
  buildAerationPrototypeAlarmStatistics,
  buildAerationPrototypeHistoryPage,
} from './aeration-prototype-data.js';
import {
  DOSING_PROTOTYPE_ALARM_DEVICES,
  DOSING_PROTOTYPE_ALARM_NAME,
  DOSING_PROTOTYPE_DEFAULT_DEVICE_IDS,
  DOSING_PROTOTYPE_DEVICES,
  buildDosingPrototypeAlarmPage,
  buildDosingPrototypeAlarmStatistics,
  buildDosingPrototypeHistoryPage,
} from './dosing-prototype-data.js';

const PROTOTYPE_SCENE_DATA = Object.freeze({
  dosing: Object.freeze({
    devices: DOSING_PROTOTYPE_DEVICES,
    defaultDeviceIds: DOSING_PROTOTYPE_DEFAULT_DEVICE_IDS,
    alarmDevices: DOSING_PROTOTYPE_ALARM_DEVICES,
    alarmTypes: Object.freeze([DOSING_PROTOTYPE_ALARM_NAME]),
    buildHistoryPage: buildDosingPrototypeHistoryPage,
    buildAlarmPage: buildDosingPrototypeAlarmPage,
    buildAlarmStatistics: buildDosingPrototypeAlarmStatistics,
  }),
  aeration: Object.freeze({
    devices: AERATION_PROTOTYPE_DEVICES,
    defaultDeviceIds: AERATION_PROTOTYPE_DEFAULT_DEVICE_IDS,
    alarmDevices: AERATION_PROTOTYPE_ALARM_DEVICES,
    alarmTypes: Object.freeze([]),
    buildHistoryPage: buildAerationPrototypeHistoryPage,
    buildAlarmPage: buildAerationPrototypeAlarmPage,
    buildAlarmStatistics: buildAerationPrototypeAlarmStatistics,
  }),
});

export function normalizePrototypeScene(scene) {
  return scene === 'aeration' ? 'aeration' : 'dosing';
}

export function getPrototypeSceneData(scene) {
  return PROTOTYPE_SCENE_DATA[normalizePrototypeScene(scene)];
}
