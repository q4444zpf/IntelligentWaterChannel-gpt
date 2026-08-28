<template>
  <DecorativePanel class="panel chart-panel trend-analysis" title="实时趋势分析">
    <template #heading-action>
      <button
        ref="settingsButtonRef"
        class="trend-settings-trigger"
        type="button"
        title="趋势设置"
        aria-label="趋势设置"
        :aria-expanded="settingsOpen"
        @click="settingsOpen = !settingsOpen"
      >
        <SettingOutlined aria-hidden="true" />
      </button>
    </template>

    <Transition name="trend-settings-popover">
      <section
        v-if="settingsOpen"
        ref="settingsPanelRef"
        class="trend-settings-popover"
        role="dialog"
        aria-labelledby="trend-settings-title"
        @keydown.esc.stop="closeTrendSettings"
      >
        <header class="trend-settings-head">
          <strong id="trend-settings-title">趋势设置</strong>
          <button type="button" title="关闭" aria-label="关闭趋势设置" @click="closeTrendSettings">
            <CloseOutlined aria-hidden="true" />
          </button>
        </header>
        <div v-if="isNode" class="trend-settings-static">
          <span>设备<b>全部水位节点</b></span>
          <span>时间<b>实时数据</b></span>
        </div>
        <div v-else class="trend-settings-form">
          <TrendDeviceSelect :devices="devices" :model-value="selectedDeviceId" :loading="trendDevicesLoading"
                             :error="trendDevicesError" @update:model-value="setSelectedDeviceId"/>
          <TimeRangePicker :range-key="rangeKey" :custom-range="customRange" @change="setRange"/>
          <label class="trend-update-setting">
            <span>自动更新</span>
            <input type="checkbox" :checked="!trendPaused" @change="toggleTrendPolling">
          </label>
        </div>
      </section>
    </Transition>

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
          <div v-if="config.showStatistics" class="trend-toolbar">
            <div class="trend-statistics">
              <span v-for="item in statistics" :key="item.device.id"><b
                  :style="{ color: item.device.color }">{{ item.device.name }}</b> 当前 {{ formatStat(item.current) }}<template
                  v-if="item.min !== null"> / {{ formatStat(item.min) }}–{{ formatStat(item.max) }}</template><i
                  v-if="item.running !== undefined" :class="{ stopped: !item.running }">{{
                  item.running ? '运行' : '停止'
                }}</i></span>
            </div>
          </div>
          <TrendChart ref="trendChart" :config="config" :snapshot="trendSnapshot" :loading="trendDevicesLoading"
                      :error="trendDevicesError" compact/>
        </div>
      </div>
    </div>
  </DecorativePanel>
</template>

<script setup lang="ts">
import {ClockCircleOutlined, CloseOutlined, SettingOutlined} from '@ant-design/icons-vue';
import {computed, onBeforeUnmount, onMounted, reactive, ref, toRef, watch} from 'vue';
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
const settingsOpen = ref(false);
const settingsButtonRef = ref<HTMLButtonElement | null>(null);
const settingsPanelRef = ref<HTMLElement | null>(null);
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
const dateTimeLabel = (value: number | null) => value ? new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(new Date(value)).replaceAll('/', '-') : '等待首次数据';
const activeUpdatedLabel = computed(() => dateTimeLabel(
  isNode.value ? props.profileTimestamp : trendUpdated.value,
));

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

function closeTrendSettings() {
  settingsOpen.value = false;
  settingsButtonRef.value?.focus();
}

function handleSettingsPointerDown(event: PointerEvent) {
  const target = event.target as Node;
  if (settingsButtonRef.value?.contains(target) || settingsPanelRef.value?.contains(target)) return;
  settingsOpen.value = false;
}

function formatStat(value: number | null) {
  return value === null ? '--' : `${value.toFixed(config.value.precision)}${config.value.unit}`;
}

onMounted(() => {
  trendTypes.forEach((type) => {
    void loadTrendDevices(type);
  });
  document.addEventListener('pointerdown', handleSettingsPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleSettingsPointerDown);
});
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

.trend-settings-trigger {
  position: absolute;
  top: 7px;
  right: 12px;
  z-index: 2;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
  color: #b9dcf1;
}

.trend-settings-trigger:hover,
.trend-settings-trigger:focus-visible,
.trend-settings-trigger[aria-expanded='true'] {
  outline: 0;
  background: rgba(28, 119, 177, 0.34);
  box-shadow: 0 0 10px rgba(47, 190, 242, 0.24);
  color: #ffffff;
}

.trend-settings-trigger :deep(svg) {
  width: 16px;
  height: 16px;
}

.trend-settings-popover {
  position: absolute;
  top: 38px;
  right: 8px;
  z-index: 20;
  width: 276px;
  border: 1px solid rgba(72, 178, 235, 0.58);
  padding: 7px;
  background: rgba(2, 25, 49, 0.97);
  box-shadow: 0 14px 32px rgba(0, 8, 22, 0.58), inset 0 0 20px rgba(25, 147, 225, 0.08);
  backdrop-filter: blur(12px);
}

.trend-settings-head {
  display: flex;
  height: 28px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(72, 158, 216, 0.28);
  padding: 0 2px 6px 7px;
}

.trend-settings-head strong {
  color: #e9f8ff;
  font-size: 12px;
  font-weight: 600;
}

.trend-settings-head button {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
  color: #8fb6cf;
}

.trend-settings-head button:hover,
.trend-settings-head button:focus-visible {
  outline: 0;
  background: rgba(35, 127, 183, 0.28);
  color: #ffffff;
}

.trend-settings-form,
.trend-settings-static {
  display: grid;
  gap: 9px;
  padding: 10px 7px 5px;
}

.trend-settings-form :deep(.trend-device-select),
.trend-settings-form :deep(.range-select),
.trend-update-setting,
.trend-settings-static > span {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  color: #82a2bd;
  font-size: 10px;
}

.trend-settings-form :deep(.trend-device-select select),
.trend-settings-form :deep(.range-select select) {
  width: 100%;
}

.trend-settings-static b {
  color: #d9ecff;
  font-weight: 500;
}

.trend-update-setting input {
  justify-self: end;
  width: 30px;
  height: 16px;
  margin: 0;
  accent-color: #27b9ed;
  cursor: pointer;
}

.trend-settings-popover-enter-active,
.trend-settings-popover-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.trend-settings-popover-enter-from,
.trend-settings-popover-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

</style>
