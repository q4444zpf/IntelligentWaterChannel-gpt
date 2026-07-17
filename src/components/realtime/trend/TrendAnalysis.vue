<template>
  <section class="panel chart-panel trend-analysis">
    <div class="panel-head trend-analysis-head">
      <h2>实时趋势分析</h2>
      <TrendTabs v-model:active-key="activeTab" />
      <div v-if="isNode" class="mini-actions profile-actions">
        <span class="refresh-status" :title="nodeUpdatedLabel">5秒刷新</span>
        <button type="button" @click="toggleNodePolling">{{ nodePaused ? '继续' : '暂停' }}</button>
        <button type="button" :disabled="nodeRefreshing" @click="nodeRefresh">立即刷新</button>
        <button type="button" @click="profileChart?.resetZoom()">复位</button>
      </div>
      <div v-else class="trend-live-status">
        <span class="refresh-status" :title="trendUpdatedLabel">5秒刷新</span>
        <button type="button" @click="toggleTrendPolling">{{ trendPaused ? '继续' : '暂停' }}</button>
        <button type="button" :disabled="trendRefreshing" @click="trendRefresh">刷新</button>
        <button type="button" @click="trendChart?.resetZoom()">复位</button>
      </div>
    </div>

    <RealtimeWaterProfileChart v-if="isNode" ref="profileChart" :snapshot="nodeSnapshot || undefined" :loading="nodeLoading" :refreshing="nodeRefreshing" :error="nodeError" />

    <div v-else class="trend-workbench">
      <DeviceSelector :key="activeTab" :devices="devices" :selected-ids="selectedIds" :supports-region="config.supportsRegion" @update:selected-ids="setSelectedIds" />
      <div class="trend-main">
        <div class="trend-toolbar">
          <TimeRangePicker :range-key="rangeKey" :custom-range="customRange" @change="setRange" />
          <div v-if="config.showStatistics" class="trend-statistics">
            <span v-for="item in statistics" :key="item.device.id"><b :style="{ color: item.device.color }">{{ item.device.id }}</b> 当前 {{ formatStat(item.current) }}<template v-if="item.min !== null"> / {{ formatStat(item.min) }}–{{ formatStat(item.max) }}</template><i v-if="item.running !== undefined" :class="{ stopped: !item.running }">{{ item.running ? '运行' : '停止' }}</i></span>
          </div>
        </div>
        <TrendChart ref="trendChart" :config="config" :snapshot="trendSnapshot" :loading="trendLoading" :refreshing="trendRefreshing" :error="trendError" compact />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { TrendTabKey, TrendType } from '../../../config/trendConfig.ts';
import { createRealtimeTrendSource } from '../../../data/realtime-trend-data.ts';
import { GATES, SENSOR_GROUPS } from '../../../data/monitoring-data.js';
import { createMockWaterProfileSource } from '../../../realtime-water-profile.js';
import { useRealtimeWaterProfile } from '../../../composables/useRealtimeWaterProfile.js';
import { useRealtimeTrends } from '../../../composables/useRealtimeTrends.ts';
import RealtimeWaterProfileChart from '../RealtimeWaterProfileChart.vue';
import DeviceSelector from './DeviceSelector.vue';
import TimeRangePicker from './TimeRangePicker.vue';
import TrendChart from './TrendChart.vue';
import TrendTabs from './TrendTabs.vue';

const activeTab = ref<TrendTabKey>('node');
const profileChart = ref<InstanceType<typeof RealtimeWaterProfileChart> | null>(null);
const trendChart = ref<InstanceType<typeof TrendChart> | null>(null);
const nodeSource = createMockWaterProfileSource({ gates: GATES, sensorGroups: SENSOR_GROUPS });
const { snapshot: nodeSnapshot, loading: nodeLoading, refreshing: nodeRefreshing, error: nodeError, paused: nodePaused, lastUpdated: nodeUpdated, refresh: nodeRefresh, pause: nodePause, resume: nodeResume } = useRealtimeWaterProfile({ source: nodeSource });
const trendSource = createRealtimeTrendSource();
const { snapshot: trendSnapshot, loading: trendLoading, refreshing: trendRefreshing, error: trendError, paused: trendPaused, lastUpdated: trendUpdated, rangeKey, customRange, selectedIds, config, devices, statistics, setTrendType, setSelectedIds, setRange, refresh: trendRefresh, pause: trendPause, resume: trendResume } = useRealtimeTrends({ source: trendSource });
const isNode = computed(() => activeTab.value === 'node');
const timeLabel = (value: number | null) => value ? new Date(value).toLocaleTimeString('zh-CN', { hour12: false }) : '等待首次数据';
const nodeUpdatedLabel = computed(() => `最近更新：${timeLabel(nodeUpdated.value)}`);
const trendUpdatedLabel = computed(() => `最近更新：${timeLabel(trendUpdated.value)}`);

watch(activeTab, (key) => { if (key !== 'node') void setTrendType(key as TrendType); });
function toggleNodePolling() { nodePaused.value ? nodeResume() : nodePause(); }
function toggleTrendPolling() { trendPaused.value ? trendResume() : trendPause(); }
function formatStat(value: number | null) { return value === null ? '--' : `${value.toFixed(config.value.precision)}${config.value.unit}`; }
</script>

<style scoped>
.trend-analysis { display: flex; flex-direction: column; }
.trend-analysis-head { min-height: 48px; }
.trend-live-status { display: flex; gap: 5px; align-items: center; white-space: nowrap; }.trend-live-status button { padding: 5px 8px; font-size: 10px; }
.trend-workbench { flex: 1; display: grid; grid-template-columns: minmax(142px, 24%) minmax(0, 1fr); min-height: 0; margin: 0 10px 10px; overflow: hidden; border: 1px solid rgba(54, 135, 190, .2); border-radius: 5px; }
.trend-main { display: flex; flex-direction: column; min-width: 0; min-height: 0; padding: 6px; gap: 5px; }
.trend-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 6px; min-height: 28px; }
.trend-statistics { display: flex; gap: 5px; min-width: 0; overflow-x: auto; }.trend-statistics > span { flex: 0 0 auto; color: #7898b4; font-size: 8px; white-space: nowrap; }.trend-statistics b { margin-right: 3px; }.trend-statistics i { margin-left: 4px; color: #55dc83; font-style: normal; }.trend-statistics i.stopped { color: #8b99a8; }
@media (max-width: 1400px) {
  .trend-analysis-head { display: grid; grid-template-columns: auto 1fr; gap: 3px 7px; padding-bottom: 4px; }
  .trend-analysis-head :deep(.trend-tabs) { grid-column: 1 / -1; grid-row: 2; justify-content: center; }
  .trend-analysis-head > :last-child { justify-self: end; }
  .trend-workbench { grid-template-columns: 142px minmax(0, 1fr); }
  .trend-toolbar { align-items: flex-start; flex-direction: column; }
}
</style>
