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

function escapeCsv(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toHistoryCsv(rows) {
  const header = ['时间', '设备类型', '设备名称', '所属渠道', '数据项', '数值', '单位', '状态'];
  const lines = rows.map((row) => [
    row.timestamp,
    row.type,
    row.name,
    row.location,
    row.metric,
    row.value,
    row.unit,
    row.state
  ].map(escapeCsv).join(','));
  return `\uFEFF${[header.join(','), ...lines].join('\r\n')}`;
}
