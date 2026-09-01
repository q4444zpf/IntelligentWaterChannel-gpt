export const DOSING_PROTOTYPE_DEVICES = Object.freeze([
  Object.freeze({ id: 'TUB-01', name: '前馈浊度仪', type: '浊度仪', location: '扰动池', unit: 'NTU' }),
  Object.freeze({ id: 'TUB-02', name: '后馈浊度仪', type: '浊度仪', location: '清水池', unit: 'NTU' }),
  Object.freeze({ id: 'PAC-01', name: 'PAC计量泵', type: 'PAC泵', location: 'PAC加药间', unit: '%' }),
  Object.freeze({ id: 'PAC-TANK', name: 'PAC配药箱水位', type: '液位计', location: 'PAC加药间', unit: 'mm' }),
]);

export const DOSING_PROTOTYPE_DEFAULT_DEVICE_IDS = Object.freeze(['TUB-01', 'TUB-02', 'PAC-TANK']);
export const DOSING_PROTOTYPE_ALARM_NAME = 'PAC配药箱水位过低';

export const DOSING_PROTOTYPE_ALARM_DEVICES = Object.freeze(
  DOSING_PROTOTYPE_DEVICES.filter((device) => device.id === 'PAC-TANK'),
);

const HISTORY_PROFILES = Object.freeze({
  'TUB-01': { metric: '前馈浊度', base: 42, amplitude: 5.2, precision: 1 },
  'TUB-02': { metric: '后馈浊度', base: 16, amplitude: 1.4, precision: 1 },
  'PAC-01': { metric: '输出比例', base: 48, amplitude: 6, precision: 0 },
  'PAC-TANK': { metric: '配药箱水位', base: 820, amplitude: 42, precision: 0 },
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

function historyValue(deviceId, index, total) {
  const profile = HISTORY_PROFILES[deviceId];
  const wave = Math.sin(index * 0.58) * profile.amplitude;
  const drift = deviceId === 'PAC-TANK' ? -(index / Math.max(1, total - 1)) * 58 : 0;
  return Number((profile.base + wave + drift).toFixed(profile.precision));
}

export function buildDosingPrototypeHistoryPage({ start, end, intervalSeconds, deviceIds } = {}) {
  const now = Date.now();
  const startTime = parseTime(start, now - 3_600_000);
  const endTime = Math.max(startTime, parseTime(end, now));
  const selectedIds = new Set((deviceIds || DOSING_PROTOTYPE_DEFAULT_DEVICE_IDS).map(String));
  const devices = DOSING_PROTOTYPE_DEVICES.filter((device) => selectedIds.has(device.id));
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
    value: historyValue(device.id, index, timestamps.length),
    unit: device.unit,
  }))).sort((left, right) => right.timestamp.localeCompare(left.timestamp, 'zh-CN'));

  return { current: 1, size: Math.max(1, records.length), total: records.length, records };
}

function todayAt(time) {
  const now = new Date();
  const [hour, minute, second] = time.split(':').map(Number);
  now.setHours(hour, minute, second, 0);
  return formatDateTime(now.getTime());
}

const ALARM_TIMES = ['09:42:18', '09:18:36', '08:55:02', '08:31:49', '07:58:15', '07:24:41', '06:52:07', '06:20:33'];

function createAlarmRecords() {
  return ALARM_TIMES.map((time, index) => ({
    id: `PAC-ALM-${String(index + 1).padStart(3, '0')}`,
    uid: 'PAC-TANK',
    code: `ALM-PAC-${String(index + 1).padStart(3, '0')}`,
    warnTime: todayAt(time),
    deviceName: 'PAC配药箱水位',
    deviceSn: 'PAC-TANK-01',
    deviceType: '液位计',
    location: 'PAC加药间',
    warnConfigName: DOSING_PROTOTYPE_ALARM_NAME,
    content: `PAC配药箱当前水位 ${118 - index * 4} mm，低于 150 mm 安全下限`,
    grade: 'warn',
    gradeName: '告警',
    handlingStatus: index > 2 ? 1 : 0,
    handlingRemark: index > 2 ? '已检查配药箱并完成补液' : '',
    handlingUser: index > 2 ? '值班员' : '',
  }));
}

function filterAlarmRecords(query = {}) {
  const startTime = parseTime(query.start, Number.NEGATIVE_INFINITY);
  const endTime = parseTime(query.end, Number.POSITIVE_INFINITY);
  const handlingStatusSpecified = query.handlingStatus === 0 || query.handlingStatus === 1;
  return createAlarmRecords().filter((record) => {
    const timestamp = parseTime(record.warnTime, 0);
    return timestamp >= startTime
      && timestamp <= endTime
      && (!query.warnConfigName || record.warnConfigName.includes(query.warnConfigName))
      && (!query.grade || record.grade === query.grade)
      && (!query.content || record.content.includes(query.content))
      && (!query.deviceType || query.deviceType === '全部' || record.deviceType === query.deviceType)
      && (!query.deviceName || record.deviceName === query.deviceName)
      && (!handlingStatusSpecified || record.handlingStatus === query.handlingStatus)
      && (!query.channel || query.channel === '全部' || record.location === query.channel);
  });
}

export function buildDosingPrototypeAlarmPage(query = {}, current = 1, size = 20) {
  const records = filterAlarmRecords(query);
  const safeSize = Math.max(1, Number(size) || 20);
  const safeCurrent = Math.max(1, Number(current) || 1);
  const startIndex = (safeCurrent - 1) * safeSize;
  return {
    current: safeCurrent,
    size: safeSize,
    total: records.length,
    records: records.slice(startIndex, startIndex + safeSize),
  };
}

export function buildDosingPrototypeAlarmStatistics(query = {}) {
  const records = filterAlarmRecords(query);
  const handled = records.filter((record) => record.handlingStatus === 1).length;
  return {
    total: records.length,
    unhandled: records.length - handled,
    handled,
    fatal: 0,
    offline: 0,
    waterLevel: records.length,
    gate: 0,
  };
}
