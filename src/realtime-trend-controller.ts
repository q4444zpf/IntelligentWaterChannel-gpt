import { getDefaultDeviceIds, sortDeviceIds, type TimeRangeKey, type TrendSnapshot, type TrendType } from './config/trendConfig.ts';
import { resolveTimeRange, type CustomTimeRange, type TrendQuery } from './data/realtime-trend-data.ts';

interface Scheduler {
  setInterval(callback: () => void, intervalMs: number): unknown;
  clearInterval(id: unknown): void;
}
interface Preference { selectedIds: string[]; rangeKey: TimeRangeKey; customRange?: CustomTimeRange }
export interface RealtimeTrendState {
  trendType: TrendType;
  selectedIds: string[];
  rangeKey: TimeRangeKey;
  customRange?: CustomTimeRange;
  snapshot: TrendSnapshot | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  paused: boolean;
  lastUpdated: number | null;
}

const defaultScheduler: Scheduler = {
  setInterval: (callback, intervalMs) => globalThis.setInterval(callback, intervalMs),
  clearInterval: (id) => globalThis.clearInterval(id as ReturnType<typeof setInterval>)
};

export function createRealtimeTrendController({
  source,
  intervalMs = 5000,
  scheduler = defaultScheduler,
  now = Date.now,
  onChange = () => {}
}: {
  source: (query: TrendQuery) => Promise<TrendSnapshot>;
  intervalMs?: number;
  scheduler?: Scheduler;
  now?: () => number;
  onChange?: (state: RealtimeTrendState) => void;
}) {
  const preferences = Object.fromEntries((['flow', 'level', 'pump', 'siphon'] as TrendType[]).map((type) => [type, {
    selectedIds: getDefaultDeviceIds(type), rangeKey: '10m' as TimeRangeKey
  }])) as Record<TrendType, Preference>;
  const state: RealtimeTrendState = {
    trendType: 'flow', selectedIds: [...preferences.flow.selectedIds], rangeKey: '10m', snapshot: null,
    loading: true, refreshing: false, error: '', paused: false, lastUpdated: null
  };
  let intervalId: unknown = null;
  let inFlight: Promise<void> | null = null;
  const notify = () => onChange({ ...state, selectedIds: [...state.selectedIds] });
  const stopInterval = () => { if (intervalId !== null) scheduler.clearInterval(intervalId); intervalId = null; };
  const startInterval = () => { stopInterval(); if (!state.paused) intervalId = scheduler.setInterval(() => { void refresh(); }, intervalMs); };

  function setTrendType(type: TrendType) {
    state.trendType = type;
    const preference = preferences[type];
    state.selectedIds = [...preference.selectedIds];
    state.rangeKey = preference.rangeKey;
    state.customRange = preference.customRange;
    state.snapshot = null;
    state.error = '';
    notify();
  }

  function setSelectedIds(ids: readonly string[]) {
    const sorted = sortDeviceIds(state.trendType, ids);
    state.selectedIds = sorted;
    preferences[state.trendType].selectedIds = [...sorted];
    notify();
  }

  function setRange(rangeKey: TimeRangeKey, customRange?: CustomTimeRange) {
    if (rangeKey === 'custom') resolveTimeRange(rangeKey, now(), customRange);
    state.rangeKey = rangeKey;
    state.customRange = customRange;
    preferences[state.trendType] = { ...preferences[state.trendType], rangeKey, customRange };
    notify();
  }

  function refresh(): Promise<void> {
    if (inFlight) return inFlight;
    if (!state.selectedIds.length) {
      state.loading = false;
      state.snapshot = null;
      state.error = '请至少选择一个设备';
      notify();
      return Promise.resolve();
    }
    const currentNow = now();
    const range = resolveTimeRange(state.rangeKey, currentNow, state.customRange);
    state.loading = state.snapshot === null;
    state.refreshing = state.snapshot !== null;
    state.error = '';
    notify();
    let result: Promise<TrendSnapshot>;
    try {
      result = source({ trendType: state.trendType, deviceIds: state.selectedIds, ...range, now: currentNow });
    } catch (error) {
      result = Promise.reject(error);
    }
    inFlight = Promise.resolve(result).then((snapshot) => {
      state.snapshot = snapshot;
      state.lastUpdated = snapshot.timestamp;
    }).catch(() => {
      state.error = '数据刷新失败，已保留上次有效数据';
    }).finally(() => {
      state.loading = false;
      state.refreshing = false;
      inFlight = null;
      notify();
    });
    return inFlight;
  }

  async function start() { await refresh(); startInterval(); }
  function pause() { state.paused = true; stopInterval(); notify(); }
  async function resume() { state.paused = false; notify(); await refresh(); startInterval(); }
  function dispose() { stopInterval(); }

  return { state, start, setTrendType, setSelectedIds, setRange, refresh, pause, resume, dispose };
}
