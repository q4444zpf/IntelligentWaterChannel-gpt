import {
  TREND_DEVICES,
  type TimeRangeKey,
  type TrendDevice,
  type TrendPoint,
  type TrendSeries,
  type TrendSnapshot,
  type TrendType
} from '../config/trendConfig.ts';

export interface CustomTimeRange { startTime: number; endTime: number }
export interface ResolvedTimeRange extends CustomTimeRange { sampleInterval: number }
export interface TrendDeviceFilter { search: string; region: string }
export interface TrendQuery extends CustomTimeRange {
  trendType: TrendType;
  deviceIds: readonly string[];
  now?: number;
}
export interface SeriesSummary { current: number | null; min: number | null; max: number | null; running?: boolean }

const RANGE_SPANS: Record<Exclude<TimeRangeKey, 'custom'>, number> = {
  '10m': 600_000,
  '1h': 3_600_000,
  '24h': 86_400_000
};
const PRESET_INTERVALS: Record<Exclude<TimeRangeKey, 'custom'>, number> = {
  '10m': 10_000,
  '1h': 60_000,
  '24h': 1_200_000
};

export function resolveTimeRange(key: TimeRangeKey, now: number, custom?: CustomTimeRange): ResolvedTimeRange {
  if (key === 'custom') {
    if (!custom || custom.startTime >= custom.endTime) throw new Error('开始时间必须早于结束时间');
    return { ...custom, sampleInterval: Math.max(1000, Math.ceil((custom.endTime - custom.startTime) / 120)) };
  }
  return { startTime: now - RANGE_SPANS[key], endTime: now, sampleInterval: PRESET_INTERVALS[key] };
}

export function filterTrendDevices(devices: readonly TrendDevice[], filter: TrendDeviceFilter): TrendDevice[] {
  const search = filter.search.trim().toLocaleLowerCase('zh-CN');
  return devices.filter((item) => {
    const searchable = `${item.id} ${item.name} ${item.location}`.toLocaleLowerCase('zh-CN');
    return (!search || searchable.includes(search)) && (filter.region === '全部' || item.region === filter.region);
  });
}

export function toggleFilteredSelection(currentIds: readonly string[], filteredIds: readonly string[], selected: boolean): string[] {
  const result = new Set(currentIds);
  filteredIds.forEach((id) => selected ? result.add(id) : result.delete(id));
  return [...result];
}

function deviceSeed(id: string): number {
  return [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function pointValue(type: TrendType, seed: number, timestamp: number): { value: number; running?: boolean } {
  const phase = timestamp / 180_000 + seed * 0.37;
  const wave = Math.sin(phase) + Math.sin(phase * 0.31 + seed) * 0.35;
  if (type === 'flow') return { value: Number((16 + seed % 5 + wave * 1.4).toFixed(2)) };
  if (type === 'level') return { value: Number((0.31 + (seed % 9) * 0.009 + wave * 0.014).toFixed(3)) };
  if (type === 'siphon') return { value: Number((0.1 + (seed % 6) * 0.012 + wave * 0.008).toFixed(3)) };
  const running = Math.floor(timestamp / 300_000 + seed) % 9 !== 0;
  return { value: running ? Number((30 + seed % 7 + wave * 2.8).toFixed(1)) : 0, running };
}

function sampleInterval(span: number): number {
  if (span <= RANGE_SPANS['10m']) return PRESET_INTERVALS['10m'];
  if (span <= RANGE_SPANS['1h']) return PRESET_INTERVALS['1h'];
  if (span <= RANGE_SPANS['24h']) return PRESET_INTERVALS['24h'];
  return Math.max(1000, Math.ceil(span / 120));
}

export async function queryTrendData(query: TrendQuery): Promise<TrendSnapshot> {
  const span = query.endTime - query.startTime;
  if (span <= 0) throw new Error('开始时间必须早于结束时间');
  const interval = sampleInterval(span);
  const selected = new Set(query.deviceIds);
  const devices = TREND_DEVICES[query.trendType].filter((item) => selected.has(item.id));
  const series = devices.map((device): TrendSeries => {
    const seed = deviceSeed(device.id);
    const points: TrendPoint[] = [];
    for (let timestamp = query.startTime; timestamp <= query.endTime; timestamp += interval) {
      const generated = pointValue(query.trendType, seed, timestamp);
      points.push({ timestamp, value: device.state === '离线' ? null : generated.value, running: generated.running });
    }
    if (points.at(-1)?.timestamp !== query.endTime) {
      const generated = pointValue(query.trendType, seed, query.endTime);
      points.push({ timestamp: query.endTime, value: device.state === '离线' ? null : generated.value, running: generated.running });
    }
    return { device, points };
  });
  return { timestamp: query.now ?? query.endTime, series };
}

export function summarizeSeries(series: TrendSeries): SeriesSummary {
  const valid = series.points.filter((point) => point.value !== null);
  const values = valid.map((point) => point.value as number);
  const last = valid.at(-1);
  return {
    current: last?.value ?? null,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    ...(last?.running === undefined ? {} : { running: last.running })
  };
}

export function createRealtimeTrendSource() {
  return (query: TrendQuery) => queryTrendData(query);
}
