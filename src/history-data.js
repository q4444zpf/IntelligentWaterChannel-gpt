const device = (id, type, location, order, metric, unit, state, base, amplitude, precision) => Object.freeze({
  id,
  type,
  location,
  order,
  metric,
  unit,
  state,
  base,
  amplitude,
  precision
});

export const DEVICES = Object.freeze([
  device('WL-01', '水位计', '前池', 10, '水位', 'm', '在线', 0.402, 0.018, 3),
  device('PT-01', '压力计', '水泵出口', 15, '压力', 'MPa', '在线', 0.230, 0.012, 3),
  device('P1', '水泵', '前池', 18, '频率', 'Hz', '在线', 32.0, 2.4, 1),
  device('G0', '闸门', '前池出口', 20, '开度', '%', '在线', 60, 5, 1),
  device('WL-02', '水位计', '渠①', 30, '水位', 'm', '在线', 0.380, 0.015, 3),
  device('G1', '闸门', '渠①出口', 40, '开度', '%', '在线', 100, 2, 1),
  device('FM-01', '流量计', '渠②入口', 45, '流量', 'L/s', '在线', 18.2, 1.6, 2),
  device('WL-03', '水位计', '渠②', 50, '水位', 'm', '在线', 0.390, 0.017, 3),
  device('G2', '闸门', '渠②出口', 60, '开度', '%', '在线', 42, 8, 1),
  device('PT-02', '压力计', '倒虹吸①-②', 65, '压力', 'MPa', '在线', 0.120, 0.009, 3),
  device('WL-04', '水位计', '渠③', 70, '水位', 'm', '异常', 0.370, 0.028, 3),
  device('G3', '闸门', '渠③出口', 80, '开度', '%', '在线', 30, 7, 1),
  device('WL-05', '水位计', '渠④', 90, '水位', 'm', '在线', 0.350, 0.014, 3),
  device('G4', '闸门', '渠④出口', 100, '开度', '%', '离线', 25, 0, 1),
  device('PT-03', '压力计', '倒虹吸③-④', 105, '压力', 'MPa', '离线', 0.105, 0.006, 3),
  device('G5', '闸门', '渠⑤出口', 120, '开度', '%', '在线', 80, 6, 1),
  device('G6', '闸门', '渠⑥出口', 140, '开度', '%', '异常', 50, 12, 1),
  device('WL-06', '水位计', '集水池', 150, '水位', 'm', '在线', 0.320, 0.016, 3)
]);

export const DEFAULT_DEVICE_IDS = Object.freeze(['WL-01', 'WL-02', 'WL-03', 'G2', 'P1']);

export const HISTORY_DEVICE_TYPES = Object.freeze(['全部', '水位计', '流量计', '压力计', '闸门', '水泵']);

export const HISTORY_CHANNELS = Object.freeze([
  '全部', '前池', '渠①', '渠②', '渠③', '渠④', '渠⑤', '渠⑥', '集水池', '倒虹吸①-②', '倒虹吸③-④'
]);

const DEVICE_BY_ID = new Map(DEVICES.map((item) => [item.id, item]));
const formatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

function naturalCompare(left, right) {
  return left.localeCompare(right, 'zh-CN', { numeric: true });
}

export function sortDeviceIds(ids) {
  return [...new Set(ids)]
    .filter((id) => DEVICE_BY_ID.has(id))
    .sort((leftId, rightId) => {
      const left = DEVICE_BY_ID.get(leftId);
      const right = DEVICE_BY_ID.get(rightId);
      return left.order - right.order || naturalCompare(left.id, right.id);
    });
}
export function filterHistoryDevices({ deviceType = '全部', channel = '全部', keyword = '' } = {}) {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase('zh-CN');
  return DEVICES.filter((item) => {
    const matchesType = deviceType === '全部' || item.type === deviceType;
    const matchesChannel = channel === '全部' || item.location.includes(channel);
    const matchesKeyword = !normalizedKeyword
      || `${item.id} ${item.type} ${item.location}`.toLocaleLowerCase('zh-CN').includes(normalizedKeyword);
    return matchesType && matchesChannel && matchesKeyword;
  });
}

export function createTodayHistoryRange(current = new Date()) {
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, '0');
  const day = String(current.getDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  return {
    start: `${date}T00:00:00`,
    end: `${date}T23:59:59`,
  };
}

function formatLocalDateTime(timestamp) {
  const date = new Date(timestamp);
  const part = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}`
    + `T${part(date.getHours())}:${part(date.getMinutes())}:${part(date.getSeconds())}`;
}

export function buildAlarmHistoryQuery(alarm, devices, rangeMinutes = 5) {
  const rawTime = alarm?.warnTime || alarm?.time;
  const timestamp = new Date(String(rawTime || '').replace(' ', 'T')).getTime();
  if (!Number.isFinite(timestamp)) return null;

  const availableDevices = Array.isArray(devices) ? devices : [];
  const alarmUid = String(alarm?.uid || '').trim();
  const alarmDeviceName = String(alarm?.deviceName || alarm?.device || '').trim();
  const alarmMessage = String(alarm?.content || alarm?.message || '');
  const matchedDevice = availableDevices.find((device) => alarmUid && device.id === alarmUid)
    || availableDevices.find((device) => alarmDeviceName && device.name === alarmDeviceName)
    || availableDevices.find((device) => device.name && alarmMessage.includes(device.name));
  if (!matchedDevice) return null;

  const rangeMilliseconds = Math.max(0, Number(rangeMinutes) || 0) * 60_000;
  return {
    start: formatLocalDateTime(timestamp - rangeMilliseconds),
    end: formatLocalDateTime(timestamp + rangeMilliseconds),
    deviceIds: [matchedDevice.id],
    deviceType: matchedDevice.type || '全部',
    channel: matchedDevice.location || '全部',
    intervalSeconds: 5,
    status: '全部',
  };
}

export function validateHistoryQuery({ start, end, deviceIds }) {
  if (!deviceIds?.length) return '请至少选择一台设备';
  if (!start || !end) return '请选择完整的开始和结束时间';
  if (new Date(start).getTime() > new Date(end).getTime()) return '开始时间不能晚于结束时间';
  return '';
}

function formatTimestamp(timestamp) {
  return formatter.format(new Date(timestamp)).replaceAll('/', '-');
}

function buildValue(item, index) {
  if (item.state === '离线') return null;
  const wave = Math.sin(index / 3.2 + item.order * 0.07) * 0.72
    + Math.cos(index / 7.4 + item.order * 0.03) * 0.28;
  const value = item.base + item.amplitude * wave;
  if (item.unit === '%') return Math.max(0, Math.min(100, value));
  return Math.max(0, value);
}

export function buildHistoryResults({ start, end, deviceIds, intervalSeconds = 300 }) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const requestedStep = Math.max(1, Number(intervalSeconds) || 300) * 1000;
  const span = Math.max(0, endTime - startTime);
  const step = Math.max(requestedStep, Math.ceil(span / 239));

  return sortDeviceIds(deviceIds).map((id) => {
    const item = DEVICE_BY_ID.get(id);
    const points = [];
    let index = 0;
    for (let timestamp = startTime; timestamp <= endTime; timestamp += step) {
      const rawValue = buildValue(item, index);
      points.push({
        timestamp,
        label: formatTimestamp(timestamp),
        value: rawValue === null ? null : Number(rawValue.toFixed(item.precision))
      });
      index += 1;
    }
    if (points.at(-1)?.timestamp !== endTime) {
      const rawValue = buildValue(item, index);
      points.push({
        timestamp: endTime,
        label: formatTimestamp(endTime),
        value: rawValue === null ? null : Number(rawValue.toFixed(item.precision))
      });
    }
    return { device: item, points };
  });
}

export function buildHistoryRows(results) {
  return results
    .flatMap(({ device: item, points }) => points
      .filter((point) => point.value !== null)
      .map((point) => ({
        timestamp: point.label,
        timestampValue: point.timestamp,
        processOrder: item.order,
        type: item.type,
        name: item.id,
        location: item.location,
        metric: item.metric,
        value: point.value.toFixed(item.precision),
        unit: item.unit,
        state: item.state === '异常' ? '异常' : '正常'
      })))
    .sort((left, right) => right.timestampValue - left.timestampValue
      || left.processOrder - right.processOrder
      || naturalCompare(left.name, right.name));
}
