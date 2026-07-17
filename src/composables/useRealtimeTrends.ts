import { computed, onBeforeUnmount, onMounted, reactive, toRefs } from 'vue';
import { TREND_CONFIGS, TREND_DEVICES, type TimeRangeKey, type TrendType } from '../config/trendConfig.ts';
import { summarizeSeries, type CustomTimeRange, type TrendQuery } from '../data/realtime-trend-data.ts';
import { createRealtimeTrendController, type RealtimeTrendState } from '../realtime-trend-controller.ts';
import type { TrendSnapshot } from '../config/trendConfig.ts';

export function useRealtimeTrends({ source, intervalMs = 5000 }: {
  source: (query: TrendQuery) => Promise<TrendSnapshot>;
  intervalMs?: number;
}) {
  const initial: RealtimeTrendState = {
    trendType: 'flow', selectedDeviceId: '', rangeKey: '10m', snapshot: null,
    loading: true, refreshing: false, error: '', paused: false, lastUpdated: null
  };
  const state = reactive(initial);
  const controller = createRealtimeTrendController({ source, intervalMs, onChange: (next) => Object.assign(state, next) });
  Object.assign(state, controller.state);
  onMounted(controller.start);
  onBeforeUnmount(controller.dispose);

  const setTrendType = async (type: TrendType) => { controller.setTrendType(type); await controller.refresh(); };
  const setSelectedDeviceId = async (id: string) => { controller.setSelectedDeviceId(id); await controller.refresh(); };
  const setRange = async (key: TimeRangeKey, custom?: CustomTimeRange) => { controller.setRange(key, custom); await controller.refresh(); };

  return {
    ...toRefs(state),
    config: computed(() => TREND_CONFIGS[state.trendType]),
    devices: computed(() => TREND_DEVICES[state.trendType]),
    statistics: computed(() => state.snapshot?.series.map((series) => ({ device: series.device, ...summarizeSeries(series) })) ?? []),
    setTrendType,
    setSelectedDeviceId,
    setRange,
    refresh: controller.refresh,
    pause: controller.pause,
    resume: controller.resume
  };
}
