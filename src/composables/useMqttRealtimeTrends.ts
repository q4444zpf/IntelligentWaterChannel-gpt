import { computed, reactive, ref, watch, type Ref } from 'vue';
import {
  TREND_CONFIGS,
  type TimeRangeKey,
  type TrendDevice,
  type TrendType,
} from '../config/trendConfig.ts';
import {
  resolveTimeRange,
  summarizeSeries,
  type CustomTimeRange,
} from '../data/realtime-trend-data.ts';
import { createRealtimeMqttTrendBuffer } from '../realtime-mqtt-trend-buffer.ts';

const TREND_TYPES: TrendType[] = ['flow', 'level', 'pump', 'siphon'];

export interface InitialTrendQuery {
  type: TrendType;
  device: TrendDevice;
  startTime: number;
  endTime: number;
  intervalSeconds: number;
}

export function useMqttRealtimeTrends({
  devicesByType,
  realtimeValues,
  mqttTimestamp,
  loadInitial,
}: {
  devicesByType: Record<TrendType, TrendDevice[]>;
  realtimeValues: Ref<Record<string, unknown>>;
  mqttTimestamp: Ref<number | null>;
  loadInitial: (query: InitialTrendQuery) => Promise<readonly import('../config/trendConfig.ts').TrendPoint[]>;
}) {
  const trendType = ref<TrendType>('flow');
  const selectedByType = reactive<Record<TrendType, string>>({
    flow: '', level: '', pump: '', siphon: '',
  });
  const rangeByType = reactive<Record<TrendType, TimeRangeKey>>({
    flow: '10m', level: '10m', pump: '10m', siphon: '10m',
  });
  const customByType = reactive<Partial<Record<TrendType, CustomTimeRange>>>({});
  const paused = ref(false);
  const lastUpdated = ref<number | null>(null);
  const revision = ref(0);
  const initialLoading = ref(false);
  const initialError = ref('');
  const queryEndByType = reactive<Record<TrendType, number>>({
    flow: Date.now(), level: Date.now(), pump: Date.now(), siphon: Date.now(),
  });
  const buffer = createRealtimeMqttTrendBuffer();
  let initialRequestId = 0;

  const deviceCatalogKey = computed(() => TREND_TYPES
    .map((type) => devicesByType[type].map((device) => `${device.id}:${device.tag}`).join(','))
    .join('|'));

  function ensureSelections() {
    for (const type of TREND_TYPES) {
      const devices = devicesByType[type];
      if (!devices.some((device) => device.id === selectedByType[type])) {
        selectedByType[type] = devices[0]?.id || '';
      }
    }
  }

  function recordCurrent(timestamp = mqttTimestamp.value) {
    if (paused.value || !timestamp) return;
    if (buffer.record(devicesByType, realtimeValues.value, timestamp)) {
      lastUpdated.value = timestamp;
      revision.value += 1;
    }
  }

  watch(deviceCatalogKey, () => {
    ensureSelections();
    recordCurrent();
  }, { immediate: true });
  watch(mqttTimestamp, (timestamp) => recordCurrent(timestamp), { flush: 'sync' });

  const config = computed(() => TREND_CONFIGS[trendType.value]);
  const devices = computed(() => devicesByType[trendType.value]);
  const selectedDeviceId = computed(() => selectedByType[trendType.value]);
  const rangeKey = computed(() => rangeByType[trendType.value]);
  const customRange = computed(() => customByType[trendType.value]);
  const initialQueryKey = computed(() => {
    const type = trendType.value;
    const custom = customByType[type];
    return `${type}|${selectedByType[type]}|${rangeByType[type]}|${custom?.startTime || ''}|${custom?.endTime || ''}`;
  });

  async function reloadInitial() {
    const requestId = ++initialRequestId;
    const type = trendType.value;
    const device = devicesByType[type].find((item) => item.id === selectedByType[type]);
    if (!device) {
      initialLoading.value = false;
      initialError.value = '';
      return;
    }

    const endTime = rangeByType[type] === 'custom'
      ? customByType[type]?.endTime || Date.now()
      : Date.now();
    const range = resolveTimeRange(rangeByType[type], endTime, customByType[type]);
    queryEndByType[type] = range.endTime;
    initialLoading.value = true;
    initialError.value = '';
    try {
      const points = await loadInitial({
        type,
        device,
        startTime: range.startTime,
        endTime: range.endTime,
        intervalSeconds: Math.max(1, Math.round(range.sampleInterval / 1000)),
      });
      if (requestId !== initialRequestId) return;
      buffer.seed(type, device.id, points);
      const latestHistoryTime = points.at(-1)?.timestamp;
      if (latestHistoryTime && (!lastUpdated.value || latestHistoryTime > lastUpdated.value)) {
        lastUpdated.value = latestHistoryTime;
      }
      revision.value += 1;
    } catch (error: any) {
      if (requestId === initialRequestId) {
        initialError.value = error?.message || '获取趋势初始数据失败';
      }
    } finally {
      if (requestId === initialRequestId) initialLoading.value = false;
    }
  }

  watch(initialQueryKey, () => { void reloadInitial(); }, { immediate: true });
  const snapshot = computed(() => {
    revision.value;
    const type = trendType.value;
    const timestamp = Math.max(queryEndByType[type], mqttTimestamp.value || 0);
    const range = resolveTimeRange(rangeByType[type], timestamp, customByType[type]);
    const device = devicesByType[type].find((item) => item.id === selectedByType[type]);
    return buffer.snapshot(
      type,
      device,
      range.startTime,
      range.endTime,
      timestamp,
      range.sampleInterval,
    );
  });
  const statistics = computed(() => snapshot.value.series.map((series) => ({
    device: series.device,
    ...summarizeSeries(series),
  })));

  function setTrendType(type: TrendType) {
    trendType.value = type;
    ensureSelections();
  }

  function setSelectedDeviceId(id: string) {
    selectedByType[trendType.value] = id;
  }

  function setRange(key: TimeRangeKey, custom?: CustomTimeRange) {
    if (key === 'custom') resolveTimeRange(key, Date.now(), custom);
    rangeByType[trendType.value] = key;
    customByType[trendType.value] = custom;
  }

  function pause() {
    paused.value = true;
  }

  function resume() {
    paused.value = false;
    recordCurrent();
  }

  return {
    config,
    customRange,
    devices,
    initialError,
    initialLoading,
    lastUpdated,
    paused,
    rangeKey,
    selectedDeviceId,
    snapshot,
    statistics,
    setRange,
    setSelectedDeviceId,
    setTrendType,
    reloadInitial,
    pause,
    resume,
  };
}
