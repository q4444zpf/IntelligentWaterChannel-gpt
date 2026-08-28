<template>
  <DecorativePanel class="panel chart-panel trend-analysis" title="实时趋势分析">
    <div class="trend-analysis-tabs">
      <span class="trend-analysis-time">
        <ClockCircleOutlined aria-hidden="true" />
        {{ activeUpdatedLabel }}
      </span>
      <TrendTabs v-model:active-key="activeTab" />
    </div>

    <div class="trend-analysis-content">
      <RealtimeWaterProfileChart v-if="isNode" ref="profileChart" :snapshot="nodeSnapshot" :loading="profileLoading"
                                 :error="profileError"/>

      <div v-else class="trend-workbench">
        <div class="trend-main">
          <div class="trend-toolbar">
            <TrendDeviceSelect :devices="devices" :model-value="selectedDeviceId" :loading="trendDevicesLoading"
                               :error="trendDevicesError" @update:model-value="setSelectedDeviceId"/>
            <TimeRangePicker :range-key="rangeKey" :custom-range="customRange" @change="setRange"/>
            <div class="trend-live-status">
              <span class="refresh-status" :title="trendUpdatedLabel">MQTT 实时更新</span>
            </div>
            <div v-if="config.showStatistics" class="trend-statistics">
              <span v-for="item in statistics" :key="item.device.id"><b
                  :style="{ color: item.device.color }">{{ item.device.name }}</b> 当前 {{ formatStat(item.current) }}<template
                  v-if="item.min !== null"> / {{ formatStat(item.min) }}–{{ formatStat(item.max) }}</template><i
                  v-if="item.running !== undefined" :class="{ stopped: !item.running }">{{
                  item.running ? '运行' : '停止'
                }}</i></span>
            </div>
            <button class="trend-polling-toggle" type="button" @click="toggleTrendPolling">
              {{ trendPaused ? '继续' : '暂停' }}
            </button>
          </div>
          <TrendChart ref="trendChart" :config="config" :snapshot="trendSnapshot" :loading="trendDevicesLoading"
                      :error="trendDevicesError" compact/>
        </div>
      </div>
    </div>
  </DecorativePanel>
</template>

<script setup lang="ts">
import {ClockCircleOutlined} from '@ant-design/icons-vue';
import {computed, onMounted, reactive, ref, toRef, watch} from 'vue';
import {getBigWaterChannelHistory} from '../../../api/history.js';
import {getRealtimeTrendDevices} from '../../../api/realtime.js';
import {
  normalizeRealtimeTrendDevices,
  type TrendDevice,
  type TrendTabKey,
  type TrendType,
} from '../../../config/trendConfig.ts';
import {useMqttRealtimeTrends} from '../../../composables/useMqttRealtimeTrends.ts';
import {buildWaterProfileSnapshot} from '../../../realtime-water-profile.js';
import {
  formatTrendHistoryDateTime,
  normalizeTrendHistoryPoints,
} from '../../../realtime-trend-history.ts';
import DecorativePanel from '../../common/DecorativePanel.vue';
import RealtimeWaterProfileChart from '../RealtimeWaterProfileChart.vue';
import TimeRangePicker from './TimeRangePicker.vue';
import TrendChart from './TrendChart.vue';
import TrendDeviceSelect from './TrendDeviceSelect.vue';
import TrendTabs from './TrendTabs.vue';

interface ProfileNode {
  key?: string;
  name?: string;
  label?: string;
  channel?: string;
  unit?: string;
  tag?: string;
}

const props = withDefaults(defineProps<{
  profileNodes?: ProfileNode[];
  realtimeValues?: Record<string, unknown>;
  profileLoading?: boolean;
  profileError?: string;
  profileTimestamp?: number | null;
}>(), {
  profileNodes: () => [],
  realtimeValues: () => ({}),
  profileLoading: false,
  profileError: '',
  profileTimestamp: null,
});

const activeTab = ref<TrendTabKey>('node');
const profileChart = ref<InstanceType<typeof RealtimeWaterProfileChart> | null>(null);
const trendChart = ref<InstanceType<typeof TrendChart> | null>(null);
const trendTypes: TrendType[] = ['flow', 'level', 'pump', 'siphon'];
const trendDevicesByType = reactive<Record<TrendType, TrendDevice[]>>({
  flow: [], level: [], pump: [], siphon: [],
});
const trendLoadingByType = reactive<Record<TrendType, boolean>>({
  flow: true, level: true, pump: true, siphon: true,
});
const trendErrorByType = reactive<Record<TrendType, string>>({
  flow: '', level: '', pump: '', siphon: '',
});
const nodeSnapshot = computed(() => buildWaterProfileSnapshot({
  topology: props.profileNodes,
  values: props.realtimeValues,
  timestamp: props.profileTimestamp,
}));
const {
  snapshot: trendSnapshot,
  paused: trendPaused,
  lastUpdated: trendUpdated,
  initialLoading: trendInitialLoading,
  initialError: trendInitialError,
  rangeKey,
  customRange,
  selectedDeviceId,
  config,
  devices,
  statistics,
  setTrendType,
  setSelectedDeviceId,
  setRange,
  pause: trendPause,
  resume: trendResume
} = useMqttRealtimeTrends({
  devicesByType: trendDevicesByType,
  realtimeValues: toRef(props, 'realtimeValues'),
  mqttTimestamp: toRef(props, 'profileTimestamp'),
  loadInitial: async ({type, device, startTime, endTime, intervalSeconds}) => {
    const page = await getBigWaterChannelHistory({
      current: 1,
      size: -1,
      start: formatTrendHistoryDateTime(startTime),
      end: formatTrendHistoryDateTime(endTime),
      intervalSeconds,
      deviceIds: [device.id],
    });
    return normalizeTrendHistoryPoints(page.records, type, device.id);
  },
});
const isNode = computed(() => activeTab.value === 'node');
const trendDevicesLoading = computed(() => trendLoadingByType[config.value.key] || trendInitialLoading.value);
const trendDevicesError = computed(() => trendErrorByType[config.value.key] || trendInitialError.value);
const timeLabel = (value: number | null) => value ? new Date(value).toLocaleTimeString('zh-CN', {hour12: false}) : '等待首次数据';
const dateTimeLabel = (value: number | null) => value ? new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(new Date(value)).replaceAll('/', '-') : '等待首次数据';
const activeUpdatedLabel = computed(() => dateTimeLabel(
  isNode.value ? props.profileTimestamp : trendUpdated.value,
));
const trendUpdatedLabel = computed(() => `最近更新：${timeLabel(trendUpdated.value)}`);

async function loadTrendDevices(type: TrendType) {
  trendLoadingByType[type] = true;
  trendErrorByType[type] = '';
  try {
    const rows = await getRealtimeTrendDevices(type);
    trendDevicesByType[type] = normalizeRealtimeTrendDevices(type, rows);
  } catch (error: any) {
    trendErrorByType[type] = error?.message || '获取趋势设备失败';
  } finally {
    trendLoadingByType[type] = false;
  }
}

watch(activeTab, (key) => {
  if (key !== 'node') setTrendType(key as TrendType);
});

function toggleTrendPolling() {
  trendPaused.value ? trendResume() : trendPause();
}

function formatStat(value: number | null) {
  return value === null ? '--' : `${value.toFixed(config.value.precision)}${config.value.unit}`;
}

onMounted(() => trendTypes.forEach((type) => {
  void loadTrendDevices(type);
}));
</script>

<style scoped>
.trend-analysis {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.trend-analysis :deep(.decorative-panel__content) {
  display: flex;
  min-height: 0;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.trend-analysis-tabs {
  display: flex;
  min-width: 0;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 9px;
  border-bottom: 1px solid rgba(31, 157, 242, 0.24);
}

.trend-analysis-tabs :deep(.trend-tabs) {
  flex: 0 0 auto;
  gap: 6px;
}

.trend-analysis-time {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  color: #8fb1c8;
  font-size: 10px;
  line-height: 28px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trend-analysis-time :deep(svg) {
  flex: 0 0 auto;
  color: #a9d7eb;
}

.trend-analysis-content {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  background: transparent;
}

.trend-analysis :deep(.water-profile-shell) {
  border: 0;
  border-radius: 0;
  background: transparent;
}

.trend-live-status {
  display: flex;
  gap: 5px;
  align-items: center;
  white-space: nowrap;
}

.trend-polling-toggle {
  flex: 0 0 auto;
  margin-left: auto;
  padding: 5px 8px;
  font-size: 10px;
}

.trend-workbench {
  flex: 1;
  min-width: 0;
  min-height: 0;
  margin: 0 10px 10px;
  overflow: hidden;
  border: 0;
  border-radius: 0;
}

.trend-main {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 6px;
  gap: 5px;
}

.trend-toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  min-height: 28px;
}

.fixed-device {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  color: #82a2bd;
  font-size: 10px;
}

.fixed-device b {
  padding: 6px 9px;
  border: 1px solid rgba(72, 151, 207, .35);
  border-radius: 4px;
  color: #d9ecff;
  background: rgba(2, 18, 32, .8);
  font-weight: 500;
}

.trend-statistics {
  display: flex;
  gap: 5px;
  min-width: 0;
  overflow-x: auto;
}

.trend-statistics > span {
  flex: 0 0 auto;
  color: #7898b4;
  font-size: 8px;
  white-space: nowrap;
}

.trend-statistics b {
  margin-right: 3px;
}

.trend-statistics i {
  margin-left: 4px;
  color: #55dc83;
  font-style: normal;
}

.trend-statistics i.stopped {
  color: #8b99a8;
}

@media (max-width: 1400px) {
  .trend-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .trend-polling-toggle {
    align-self: flex-end;
    margin-left: 0;
  }
}
</style>
