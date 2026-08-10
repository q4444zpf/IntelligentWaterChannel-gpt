<template>
  <section class="panel chart-panel trend-analysis">
    <div class="panel-head trend-analysis-head">
      <span class="trend-analysis-corner-mark" aria-hidden="true">
        <span class="trend-analysis-corner-line trend-analysis-corner-line--horizontal"></span>
        <span class="trend-analysis-corner-line trend-analysis-corner-line--vertical"></span>
      </span>
      <div class="trend-analysis-title">
        <h2>实时趋势分析</h2>
        <svg class="trend-analysis-title-icon" viewBox="0 0 41.25 19.14794921875" aria-hidden="true">
          <path
              d="M40.390625,10.603271L31.850586,10.572998Q31.52832,10.633545,31.23291,10.527588Q30.9375,10.421631,30.830078,10.23999L29.541016,7.9392085L25.512695,18.565186Q25.458984,19.140381,24.921875,19.140381L23.47168,19.140381Q23.149414,19.170654,22.854004,19.079834Q22.558594,18.989014,22.451172,18.807373L17.456055,4.9421387L13.696289,14.962646Q13.588867,15.144287,13.266602,15.265381Q12.944336,15.386475,12.568359,15.356201L11.279297,15.356201Q10.90332,15.416748,10.581055,15.310791Q10.258789,15.204834,10.205078,15.023193L7.6806641,10.603271L0.859375,10.603271Q0.48339844,10.603271,0.24169922,10.451904Q0,10.300537,0,10.118896L0,9.1501465Q0,8.9382324,0.24169922,8.802002Q0.48339844,8.6657715,0.859375,8.6657715L9.2919922,8.635498Q10.258789,8.6052246,10.366211,8.907959L11.708984,11.20874L15.361328,0.37084961Q15.576172,0.037841797,16.166992,0.037841797L17.993164,0.0075683594Q18.31543,-0.022705078,18.61084,0.068115234Q18.90625,0.15893555,19.013672,0.34057617L23.955078,14.084717L27.607422,4.2155762Q27.822266,3.7312012,28.520508,3.8220215L29.970703,3.8220215Q30.292969,3.7614746,30.615234,3.8674316Q30.9375,3.9733884,31.044922,4.1550293L33.515625,8.6657715L40.390625,8.6657715Q40.712891,8.6657715,40.981445,8.802002Q41.25,8.9382324,41.25,9.1501465L41.25,10.118896Q41.25,10.300537,40.981445,10.451904Q40.712891,10.603271,40.390625,10.603271Z"/>
        </svg>
      </div>
      <TrendTabs v-model:active-key="activeTab"/>
<!--      <div v-if="isNode" class="mini-actions profile-actions">-->
<!--        <span class="refresh-status" :title="nodeUpdatedLabel">MQTT 实时更新</span>-->
<!--      </div>-->
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
  </section>
</template>

<script setup lang="ts">
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
const nodeUpdatedLabel = computed(() => `最近更新：${timeLabel(props.profileTimestamp)}`);
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
@font-face {
  font-family: 'YouSheTitle';
  src: url('../../../assets/优设标题黑.ttf') format('truetype');
  font-display: swap;
}

.trend-analysis {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.trend-analysis-head {
  position: relative;
  z-index: 0;
  min-height: 41px;
  flex: 0 0 41px;
  padding: 0 10px 0 22px;
  isolation: isolate;
}

.trend-analysis-head::before,
.trend-analysis-head::after {
  position: absolute;
  z-index: -1;
  inset: 0;
  content: '';
  pointer-events: none;
}

.trend-analysis-head::before {
  height: 41px;
  border: 1px solid;
  border-image: linear-gradient(180deg, #1e7fc1 0%, rgba(30, 127, 193, 0) 100%) 1;
  background: linear-gradient(180deg, rgba(32, 105, 212, 0) 0%, rgba(110, 217, 247, 0.5) 100%);
}

.trend-analysis-head::after {
  background-image: url('../../../assets/panel-glow-placeholder.png');
  background-repeat: no-repeat;
  background-position: left center;
  background-size: contain;
  opacity: 0.9;
}

.trend-analysis-corner-mark {
  position: absolute;
  top: -1px;
  left: -1px;
  display: grid;
  width: 14px;
  height: 14px;
  grid-template-columns: 2px 1fr;
  grid-template-rows: 2px 1fr;
}

.trend-analysis-corner-line {
  display: block;
  background: #6ed9f7;
  box-shadow: 0 0 6px rgba(110, 217, 247, 0.65);
}

.trend-analysis-corner-line--horizontal {
  grid-column: 1 / -1;
  grid-row: 1;
}

.trend-analysis-corner-line--vertical {
  grid-column: 1;
  grid-row: 1 / -1;
}

.trend-analysis-title {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.trend-analysis-title h2 {
  margin: 0;
  padding: 0;
  color: #f4fbff;
  font-family: 'YouSheTitle', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 24px;
  font-weight: normal;
  letter-spacing: 0;
  line-height: 41px;
}

.trend-analysis-title-icon {
  width: 41.25px;
  height: 19.15px;
  flex: 0 0 auto;
  color: #01ddfc;
  fill: currentColor;
  filter: drop-shadow(0 0 5px rgba(1, 221, 252, 0.45));
}

.trend-analysis-head :deep(.trend-tabs) {
  margin-left: auto;
  gap: 6px;
}

.trend-analysis-head :deep(.trend-tabs button) {
  width: 83px;
  height: 28px;
  min-width: 83px;
  flex: 0 0 83px;
  padding: 0 6px;
  border: 0 solid #267da1;
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(197, 236, 243, 0.2) 0%, rgba(133, 192, 251, 0.5) 100%);
  box-shadow: inset 0 4px 10px 0 #4c9ef8;
  color: #e8f8ff;
  font-size: 12px;
  line-height: 26px;
}

.trend-analysis-head :deep(.trend-tabs button:hover) {
  border-color: #267da1;
  background: linear-gradient(180deg, rgba(197, 236, 243, 0.32) 0%, rgba(133, 192, 251, 0.68) 100%);
}

.trend-analysis-head :deep(.trend-tabs button.active) {
  border: 1px solid #267da1;
  background: linear-gradient(180deg, #9adfff 0%, #025acd 100%);
}

.trend-analysis-content {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  border: 1px solid transparent;
  border-image: linear-gradient(180deg, rgba(31, 157, 242, 0.18) 0%, #1f9df2 100%) 1;
  border-radius: 0;
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
  .trend-analysis-head {
    display: grid;
    min-height: 75px;
    flex-basis: 75px;
    grid-template-columns: auto 1fr;
    gap: 3px 7px;
    padding-bottom: 4px;
  }

  .trend-analysis-head :deep(.trend-tabs) {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-content: center;
  }

  .trend-analysis-head > .profile-actions {
    justify-self: end;
  }

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
