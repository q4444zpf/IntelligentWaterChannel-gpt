export const AERATION_PROTOTYPE_DEVICES = Object.freeze([
  Object.freeze({ id: 'DO-01', name: 'DO溶解氧传感器', type: '溶解氧传感器', location: '好氧池', unit: '' }),
  Object.freeze({ id: 'AFM-01', name: '曝气气量计', type: '气体流量计', location: '曝气管路', unit: 'Nm³/h' }),
  Object.freeze({ id: 'BLW-01', name: '曝气风机', type: '曝气风机', location: '曝气执行模块', unit: '%' }),
]);

export const AERATION_PROTOTYPE_DEFAULT_DEVICE_IDS = Object.freeze(['DO-01', 'AFM-01', 'BLW-01']);
export const AERATION_PROTOTYPE_ALARM_DEVICES = Object.freeze([]);

const HISTORY_PROFILES = Object.freeze({
  'DO-01': { metric: 'DO', base: 6.4, amplitude: 0.35, precision: 1, phase: 0 },
  'AFM-01': { metric: '曝气气量', base: 23, amplitude: 2.8, precision: 1, phase: 0.8 },
  'BLW-01': { metric: '风机输出', base: 54, amplitude: 5, precision: 0, phase: 1.4 },
});

function parseTime(value, fallback) {
  const timestamp = new Date(String(value || '').replace(' ', 'T')).getTime();
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  const part = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}`
    + ` ${part(date.getHours())}:${part(date.getMinutes())}:${part(date.getSeconds())}`;
}

function historyValue(deviceId, index) {
  const profile = HISTORY_PROFILES[deviceId];
  const value = profile.base + Math.sin(index * 0.55 + profile.phase) * profile.amplitude;
  return Number(value.toFixed(profile.precision));
}

export function buildAerationPrototypeHistoryPage({ start, end, intervalSeconds, deviceIds } = {}) {
  const now = Date.now();
  const startTime = parseTime(start, now - 3_600_000);
  const endTime = Math.max(startTime, parseTime(end, now));
  const selectedIds = new Set((deviceIds || AERATION_PROTOTYPE_DEFAULT_DEVICE_IDS).map(String));
  const devices = AERATION_PROTOTYPE_DEVICES.filter((device) => selectedIds.has(device.id));
  const requestedStep = Math.max(1, Number(intervalSeconds) || 300) * 1000;
  const displayStep = Math.max(requestedStep, Math.ceil((endTime - startTime) / 23));
  const timestamps = [];

  for (let timestamp = startTime; timestamp <= endTime; timestamp += displayStep) {
    timestamps.push(timestamp);
  }
  if (timestamps.at(-1) !== endTime) timestamps.push(endTime);

  const records = devices.flatMap((device) => timestamps.map((timestamp, index) => ({
    uid: device.id,
    timestamp: formatDateTime(timestamp),
    type: device.type,
    name: device.name,
    location: device.location,
    metric: HISTORY_PROFILES[device.id].metric,
    value: historyValue(device.id, index),
    unit: device.unit,
  }))).sort((left, right) => right.timestamp.localeCompare(left.timestamp, 'zh-CN'));

  return { current: 1, size: Math.max(1, records.length), total: records.length, records };
}

export function buildAerationPrototypeAlarmPage(_query = {}, current = 1, size = 20) {
  return {
    current: Math.max(1, Number(current) || 1),
    size: Math.max(1, Number(size) || 20),
    total: 0,
    records: [],
  };
}

export function buildAerationPrototypeAlarmStatistics() {
  return {
    total: 0,
    unhandled: 0,
    handled: 0,
    fatal: 0,
    offline: 0,
    waterLevel: 0,
    gate: 0,
  };
}
