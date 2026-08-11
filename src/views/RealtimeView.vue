<template>
  <section
    class="page page-realtime active"
    :class="{ 'is-center-fullscreen': isCenterFullscreen }"
  >
    <aside class="left-stack">
      <DecorativePanel class="panel gate-panel" title="闸门实时状态"><table class="data-table compact gate-status-table">
        <colgroup>
          <col style="width: 14%">
          <col style="width: 18%">
          <col style="width: 25%">
          <col style="width: 25%">
          <col style="width: 18%">
        </colgroup>
        <thead><tr><th>设备</th><th>开度(%)</th><th>闸前(mm)</th><th>闸后(mm)</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="gate in gates" :key="gate.id"><td><span class="device-chip" :class="`chip-${gate.color}`">{{ gate.id }}</span></td><td>{{ gate.open }}</td><td>{{ gate.before }}</td><td>{{ gate.after }}</td><td :class="gate.state === '在线' ? 'gate-status-online' : 'gate-status-offline'"><StatusText :value="gate.state" /></td></tr>
          <tr v-if="!gates.length"><td colspan="5" class="realtime-empty">{{ deviceMessage }}</td></tr>
        </tbody>
      </table></DecorativePanel>
      <DecorativePanel class="panel sensor-panel" title="传感器实时状态">
        <div class="sensor-list">
          <div v-for="group in sensorGroups" :key="group.name" class="sensor-section"><div class="sensor-title">{{ group.name }}</div><table class="data-table compact sensor-status-table"><tbody>
            <tr v-for="row in group.rows" :key="row.tag || row.name"><td>{{ row.name }}</td><td>{{ row.location }}</td><td>{{ row.value }}</td><td>{{ row.unit }}</td><td :class="row.state === '在线' ? 'sensor-status-online' : 'sensor-status-offline'"><StatusText :value="row.state" /></td></tr>
          </tbody></table></div>
          <div v-if="!sensorGroups.length" class="realtime-empty">{{ deviceMessage }}</div>
        </div>
      </DecorativePanel>
    </aside>

    <section class="center-stack">
      <section class="panel twin-panel">
        <div class="panel-head preview-head">
          <div class="preview-title">
            <span class="preview-title__arrow preview-title__arrow--left" aria-hidden="true"></span>
            <h2>三维水槽工艺监控</h2>
            <span class="preview-title__arrow preview-title__arrow--right" aria-hidden="true"></span>
          </div>
        </div>
        <div class="twin-stage">
          <div class="mini-actions preview-actions">
            <button
              v-for="action in VIEW_ACTIONS"
              :key="action"
              type="button"
              @click="handleViewAction(action)"
            >{{ action }}</button>
            <button
              type="button"
              :aria-pressed="isCenterFullscreen"
              :title="isCenterFullscreen ? '退出全屏' : '全屏显示'"
              @click="toggleCenterFullscreen"
            >{{ isCenterFullscreen ? '退出全屏' : '全屏' }}</button>
          </div>
          <img
            class="preview-border preview-border--left"
            src="../assets/preview-border.png"
            alt=""
            aria-hidden="true"
          >
          <img
            class="preview-border preview-border--right"
            src="../assets/preview-border.png"
            alt=""
            aria-hidden="true"
          >
          <SmartWaterFlumePreview
            ref="previewRef"
            :alarm-topic="alarmNotificationTopic"
            :performance-mode="isCenterFullscreen"
            @mqtt-data="handleMqttData"
            @alarm-notification="handleAlarmNotification"
          />
        </div>
      </section>
      <TrendAnalysis
        v-show="!isCenterFullscreen"
        :profile-nodes="profileNodes"
        :realtime-values="realtimeValues"
        :profile-loading="profileLoading"
        :profile-error="profileError"
        :profile-timestamp="latestMqttAt"
      />
    </section>

    <aside class="right-stack">
      <DecorativePanel class="panel control-panel" title="手动控制设备" direction="left">
        <div class="control-card">
          <h3>闸门控制</h3>
          <div class="form-grid"><label>设备类型<span>闸门</span></label><label>设备选择<span>G2</span></label><label>当前开度<span>42 %</span></label><label>目标开度<span>{{ targetGateOpening }} %</span></label></div>
          <input
            v-model.number="targetGateOpening"
            type="range"
            min="0"
            max="100"
            step="1"
            aria-label="目标开度"
            :style="{ '--range-progress': `${targetGateOpening}%` }"
          >
          <div class="button-row">
            <button class="control-command-button" type="button">
              <svg viewBox="0 0 12.963648796081543 13.333333015441895" aria-hidden="true"><path d="M7.3151498,16.523691415441895L7.3151498,26.666666015441894L5.6484833,26.666666015441894L5.6484833,16.523691415441895L1.1785165,20.993666215441895L0,19.815166515441895L6.4818168,13.333333015441895L12.963649,19.815166515441895L11.78515,20.993666215441895L7.3151498,16.523691415441895Z" fill="#0EA5E9" transform="matrix(1,0,0,-1,0,26.66666603088379)" /></svg>
              <span>下发指令</span>
            </button>
            <button class="control-command-button" type="button">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8,0C12.418221,0,16,3.5817778,16,8C16,12.418221,12.418221,16,8,16C3.5817778,16,0,12.418221,0,8C0,3.5817778,3.5817778,0,8,0ZM12.5,7L3.5,7C3.2238574,7,3,7.2238574,3,7.5L3,8.5C3,8.7761421,3.2238574,9,3.5,9L12.5,9C12.776142,9,13,8.7761421,13,8.5L13,7.5C13,7.2238574,12.776142,7,12.5,7Z" fill="#FE6262" /></svg>
              <span>停止</span>
            </button>
            <button class="control-command-button" type="button">
              <svg viewBox="0 0 13.333333015441895 13.333333015441895" aria-hidden="true"><path d="M6.6666665,1.3333333C4.9396667,1.3333333,3.4040396,2.1536865,2.428493,3.428493L4,5L0,5L0,1L1.4790865,2.4790864C2.7004066,0.96799988,4.5703869,0,6.6666665,0C10.348534,0,13.333333,2.9847665,13.333333,6.6666665L12,6.6666665C12,3.7211466,9.6121998,1.3333333,6.6666665,1.3333333ZM1.3333333,6.6666665C1.3333333,9.6121998,3.7211466,12,6.6666665,12C8.3936663,12,9.9293327,11.179667,10.904866,9.9048662L9.333333,8.333333L13.333333,8.333333L13.333333,12.333333L11.854267,10.854267C10.632933,12.365334,8.7629328,13.333333,6.6666665,13.333333C2.9847665,13.333333,0,10.348534,0,6.6666665L1.3333333,6.6666665Z" fill="#47FDB2" /></svg>
              <span>复位</span>
            </button>
          </div>
        </div>
        <div class="control-card">
          <h3>水泵控制</h3>
          <div class="form-grid"><label>设备选择<span>P1</span></label><label>当前频率<span>32 Hz</span></label><label>目标频率<span>{{ targetPumpFrequency }} Hz</span></label><label>运行状态<span>运行中</span></label></div>
          <input
            v-model.number="targetPumpFrequency"
            type="range"
            min="0"
            max="50"
            step="1"
            aria-label="目标频率"
            :style="{ '--range-progress': `${(targetPumpFrequency / 50) * 100}%` }"
          >
          <div class="button-row">
            <button class="control-command-button" type="button">
              <svg viewBox="0 0 16.061737060546875 16.06178092956543" aria-hidden="true"><path d="M8.0308228,0C3.6139693,0,0,3.613992,0,8.0308905C0,12.447788,3.613992,16.061781,8.0308228,16.061781C12.447721,16.061781,16.061737,12.447788,16.061737,8.0308905C16.061737,3.6139927,12.447721,0,8.0308228,0ZM6.4245539,11.644882L6.4245539,4.4168987L11.242884,8.0309124L6.4245539,11.644882Z" fill="#0D7CF6" /></svg>
              <span>启动</span>
            </button>
            <button class="control-command-button" type="button">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8,0C12.418221,0,16,3.5817778,16,8C16,12.418221,12.418221,16,8,16C3.5817778,16,0,12.418221,0,8C0,3.5817778,3.5817778,0,8,0ZM12.5,7L3.5,7C3.2238574,7,3,7.2238574,3,7.5L3,8.5C3,8.7761421,3.2238574,9,3.5,9L12.5,9C12.776142,9,13,8.7761421,13,8.5L13,7.5C13,7.2238574,12.776142,7,12.5,7Z" fill="#FE6262" /></svg>
              <span>停止</span>
            </button>
            <button class="control-command-button" type="button">
              <svg viewBox="0 0 15.705469131469727 11.285157203674316" aria-hidden="true"><path d="M5.8898439,0C6.1898441,0,6.4617186,0.18281269,6.5742188,0.46171856L9.8156252,8.5687494L11.095313,5.3695307C11.207664,5.0902433,11.478649,4.9074211,11.779688,4.9078121L14.969532,4.9078121C15.375,4.9078121,15.705469,5.2382812,15.705469,5.6437492C15.705469,6.0492182,15.375,6.3796864,14.969532,6.3796864L12.276562,6.3796864L10.497656,10.823438C10.385305,11.102727,10.11432,11.285548,9.8132811,11.285157C9.5132809,11.285157,9.2414064,11.102345,9.1289062,10.823438L5.8898439,2.71875L4.6101561,5.9179688C4.4978046,6.197257,4.226819,6.3800793,3.9257812,6.3796873L0.7359376,6.3796873C0.33046865,6.3796873,0,6.0492182,0,5.6437502C0,5.2382812,0.33046865,4.9078131,0.7359376,4.9078131L3.4265623,4.9078131L5.2054691,0.46406269C5.3179693,0.18281269,5.5875006,0,5.8898439,0Z" fill="#47FDB2" /></svg>
              <span>设置频率</span>
            </button>
          </div>
        </div>
        <p class="hint">安全提示：确认设备状态与现场安全后，再执行控制操作。</p>
      </DecorativePanel>
      <DecorativePanel
        class="panel alarm-mini"
        title="实时报警信息"
        direction="left"
        action-text="查看全部"
        @action-click="$emit('navigate', 'alarm')"
      >
        <div v-if="latestAlarms.length" class="alarm-list">
          <div
            v-for="alarm in latestAlarms"
            :key="alarm.key"
            class="alarm-item"
            :class="{ handled: alarm.handlingStatus === 1 }"
          >
            <div class="alarm-item__body">
              <time class="alarm-item__time">{{ miniAlarmTime(alarm.warnTime) }}</time>
              <strong class="alarm-item__title">{{ alarm.device }} {{ alarm.type }}</strong>
              <div class="alarm-item__details">{{ alarm.message }}</div>
            </div>
            <span class="state-pill">{{ alarm.handled }}</span>
          </div>
          <svg
            class="alarm-list__warning"
            viewBox="0 0 64.03543853759766 56.271446228027344"
            aria-hidden="true"
          >
            <path d="M34.651489,1.5213532L63.627319,51.708946C64.46743,53.163769,63.968891,55.024055,62.514069,55.863857C62.051735,56.130924,61.527042,56.271446,60.993237,56.271446L3.0416667,56.271446C1.3618152,56.271446,0,54.909691,0,53.229782C0,52.695656,0.14055556,52.171284,0.40752262,51.708946L29.38332,1.5213532C30.223125,0.066523835,32.083408,-0.43191364,33.538239,0.40801212C34.000572,0.67497915,34.384731,1.0589592,34.651489,1.5213532ZM8.3099852,50.188114L55.724762,50.188114L32.017406,9.1255207L8.3099852,50.188114ZM28.975739,41.063114L35.059071,41.063114L35.059071,47.146442L28.975739,47.146442L28.975739,41.063114ZM28.975739,19.771353L35.059071,19.771353L35.059071,34.979778L28.975739,34.979778L28.975739,19.771353Z" fill="#452929" />
          </svg>
        </div>
        <div v-if="latestAlarmsLoading" class="realtime-empty">正在加载最新告警...</div>
        <div v-else-if="latestAlarmsError" class="realtime-empty alarm-mini-error">{{ latestAlarmsError }}</div>
        <div v-else-if="!latestAlarms.length" class="realtime-empty">暂无告警数据</div>
      </DecorativePanel>
    </aside>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
  getBigWaterChannelAlarmNotificationTopic,
  getBigWaterChannelAlarms,
} from '../api/alarm.js';
import {
  getRealtimeGroupDevices,
  getRealtimeWaterProfileTopology,
} from '../api/realtime.js';
import { normalizeAlarmPage } from '../alarm-data.js';
import DecorativePanel from '../components/common/DecorativePanel.vue';
import StatusText from '../components/common/StatusText.vue';
import SmartWaterFlumePreview from '../components/realtime/smart-water-flume-preview/SmartWaterFlumePreview.vue';
import TrendAnalysis from '../components/realtime/trend/TrendAnalysis.vue';
import { VIEW_ACTIONS } from '../data/monitoring-data.js';
import { buildRealtimeTableData, mergeRealtimeValues } from '../realtime-device-data.js';

const props = defineProps({
  sceneTarget: { type: Object, default: null },
});

defineEmits(['navigate']);

const previewRef = ref(null);
const isCenterFullscreen = ref(false);
const targetGateOpening = ref(50);
const targetPumpFrequency = ref(35);
const deviceGroups = ref([]);
const deviceLoading = ref(true);
const deviceError = ref('');
const realtimeValues = reactive({});
const profileNodes = ref([]);
const profileLoading = ref(true);
const profileError = ref('');
const latestMqttAt = ref(null);
const alarmNotificationTopic = ref('');
const latestAlarms = ref([]);
const latestAlarmsLoading = ref(true);
const latestAlarmsError = ref('');
let latestAlarmRefreshTimer = null;
let realtimeUpdateTimer = null;
let pendingRealtimePayload = null;
const tableData = computed(() => buildRealtimeTableData(deviceGroups.value, realtimeValues));
const gates = computed(() => tableData.value.gates);
const sensorGroups = computed(() => tableData.value.sensorGroups);
const deviceMessage = computed(() => {
  if (deviceLoading.value) return '正在加载设备配置...';
  return deviceError.value || '暂无设备配置';
});

function flushRealtimePayload() {
  realtimeUpdateTimer = null;
  const payload = pendingRealtimePayload;
  pendingRealtimePayload = null;
  if (!payload) return;
  mergeRealtimeValues(realtimeValues, payload);
  latestMqttAt.value = Date.now();
}

function handleMqttData(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
  pendingRealtimePayload = { ...(pendingRealtimePayload || {}), ...payload };
  if (realtimeUpdateTimer === null) {
    realtimeUpdateTimer = window.setTimeout(flushRealtimePayload, 100);
  }
}

function handleViewAction(action) {
  if (action === '刷新') {
    void previewRef.value?.reload();
    return;
  }
  previewRef.value?.handleAction(action);
}

function toggleCenterFullscreen() {
  isCenterFullscreen.value = !isCenterFullscreen.value;
}

watch(() => props.sceneTarget, async (target) => {
  const channelName = typeof target?.channelName === 'string' ? target.channelName.trim() : '';
  if (!channelName) return;
  await nextTick();
  previewRef.value?.focusSceneTreeGroupByName(channelName);
});

function miniAlarmTime(value) {
  const text = String(value || '');
  return text.length >= 19 ? text.slice(11, 19) : text || '--';
}

async function loadAlarmNotificationTopic() {
  try {
    alarmNotificationTopic.value = await getBigWaterChannelAlarmNotificationTopic();
  } catch (error) {
    console.error('获取告警通知主题失败', error);
  }
}

async function loadLatestAlarms() {
  latestAlarmsLoading.value = !latestAlarms.value.length;
  latestAlarmsError.value = '';
  try {
    const page = await getBigWaterChannelAlarms({ current: 1, size: 3 });
    latestAlarms.value = normalizeAlarmPage(page).rows.slice(0, 3);
  } catch (error) {
    latestAlarmsError.value = error?.message || '获取最新告警失败';
  } finally {
    latestAlarmsLoading.value = false;
  }
}

function scheduleLatestAlarmRefresh() {
  if (latestAlarmRefreshTimer !== null) window.clearTimeout(latestAlarmRefreshTimer);
  latestAlarmRefreshTimer = window.setTimeout(() => {
    latestAlarmRefreshTimer = null;
    void loadLatestAlarms();
  }, 300);
}

function handleAlarmNotification(payload) {
  scheduleLatestAlarmRefresh();
  window.dispatchEvent(new CustomEvent('alarm-notification', { detail: payload }));
}

async function loadRealtimeDevices() {
  deviceLoading.value = true;
  deviceError.value = '';

  try {
    deviceGroups.value = await getRealtimeGroupDevices();
  } catch (error) {
    deviceError.value = error?.message || '获取实时设备配置失败';
  } finally {
    deviceLoading.value = false;
  }
}

async function loadRealtimeProfileTopology() {
  profileLoading.value = true;
  profileError.value = '';

  try {
    profileNodes.value = await getRealtimeWaterProfileTopology();
  } catch (error) {
    profileError.value = error?.message || '获取节点水位拓扑失败';
  } finally {
    profileLoading.value = false;
  }
}

onMounted(() => {
  void loadAlarmNotificationTopic();
  void loadLatestAlarms();
  void loadRealtimeDevices();
  void loadRealtimeProfileTopology();
  window.addEventListener('alarm-status-changed', scheduleLatestAlarmRefresh);
});

onBeforeUnmount(() => {
  if (latestAlarmRefreshTimer !== null) window.clearTimeout(latestAlarmRefreshTimer);
  if (realtimeUpdateTimer !== null) window.clearTimeout(realtimeUpdateTimer);
  realtimeUpdateTimer = null;
  pendingRealtimePayload = null;
  window.removeEventListener('alarm-status-changed', scheduleLatestAlarmRefresh);
});
</script>

<style scoped>
@font-face {
  font-family: 'YouSheTitle';
  src: url('../assets/优设标题黑.ttf') format('truetype');
  font-display: swap;
}

.twin-panel {
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.center-stack {
  overflow: visible;
}

.page-realtime.is-center-fullscreen {
  gap: 0;
}

.page-realtime.is-center-fullscreen > .left-stack,
.page-realtime.is-center-fullscreen > .right-stack {
  display: none;
}

.page-realtime.is-center-fullscreen > .center-stack {
  width: 100%;
  flex: 1 1 100%;
  overflow: hidden;
}

.preview-head {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: -20px;
  padding: 0;
}

.page-realtime.is-center-fullscreen .preview-head {
  margin-top: 0;
}

.preview-title {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  color: #fff;
}

.preview-title h2 {
  margin: 0;
  padding: 0 8px;
  color: #fff;
  font-family: 'YouSheTitle', 'Microsoft YaHei', sans-serif;
  font-size: 28px;
  font-weight: normal;
  line-height: 36px;
  white-space: nowrap;
}

.preview-title__arrow {
  display: block;
  flex: 0 0 53px;
  width: 53px;
  height: 36px;
  background: url('../assets/preview-title.png') center / 100% 100% no-repeat;
}

.preview-title__arrow--right {
  transform: scaleX(-1);
}

.preview-actions {
  position: absolute;
  z-index: 5;
  top: 6px;
  left: 50%;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  width: max-content;
  max-width: calc(100% - 20px);
  height: 54px;
  padding: 0 10px;
  box-sizing: border-box;
  gap: 2px;
  transform: translateX(-50%);
  background: url('../assets/preview-actions.png') center / 100% 100% no-repeat;
}

.preview-actions button {
  flex: 1 1 0;
  min-width: 0;
  height: 36px;
  padding: 0 4px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: #c9edff;
  font-size: 12px;
  line-height: 36px;
  white-space: nowrap;
}

.preview-actions button:hover {
  color: #0EC8FB;
  font-weight: 700;
}

.control-panel :deep(.decorative-panel__content) {
  padding: 10px 14px 12px;
  overflow: hidden;
}

.control-panel .control-card {
  margin: 0;
  padding: 6px 4px 12px;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.control-panel .control-card + .control-card {
  padding-top: 12px;
  border-top: 1px solid rgba(76, 169, 225, 0.45);
}

.control-panel .control-card h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  color: #e8f7ff;
  font-size: 13px;
  line-height: 18px;
}

.control-panel .control-card h3::before {
  width: 3px;
  height: 15px;
  flex: 0 0 3px;
  background: #0d9df5;
  box-shadow: 0 0 6px rgba(13, 157, 245, 0.7);
  content: '';
}

.control-panel .form-grid {
  gap: 6px 20px;
  padding: 0 4px;
  font-size: 12px;
}

.control-panel .form-grid label {
  display: flex;
  min-width: 0;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  line-height: 18px;
  white-space: nowrap;
}

.control-panel .form-grid span {
  display: inline;
  margin-top: 0;
  color: #f3fbff;
}

.control-panel .control-card input[type='range'] {
  width: calc(100% - 8px);
  height: 14px;
  margin: 11px 4px;
  appearance: none;
  outline: 0;
  background: transparent;
}

.control-panel .control-card input[type='range']::-webkit-slider-runnable-track {
  height: 9px;
  border: 1px solid #0bb7e8;
  border-radius: 5px;
  background: linear-gradient(90deg, #43b9e8 0%, #0e85c3 var(--range-progress), rgba(3, 45, 78, 0.9) var(--range-progress), rgba(3, 45, 78, 0.9) 100%);
  box-shadow: inset 0 1px 4px rgba(0, 25, 52, 0.7);
}

.control-panel .control-card input[type='range']::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  margin-top: -4px;
  appearance: none;
  border: 1px solid #74d7ff;
  border-radius: 50%;
  background: #62c6f4;
  box-shadow: 0 0 7px rgba(75, 201, 255, 0.8), inset 0 2px 3px rgba(255, 255, 255, 0.45);
}

.control-panel .control-card input[type='range']::-moz-range-track {
  height: 9px;
  border: 1px solid #0bb7e8;
  border-radius: 5px;
  background: linear-gradient(90deg, #43b9e8 0%, #0e85c3 var(--range-progress), rgba(3, 45, 78, 0.9) var(--range-progress), rgba(3, 45, 78, 0.9) 100%);
  box-shadow: inset 0 1px 4px rgba(0, 25, 52, 0.7);
}

.control-panel .control-card input[type='range']::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 1px solid #74d7ff;
  border-radius: 50%;
  background: #62c6f4;
  box-shadow: 0 0 7px rgba(75, 201, 255, 0.8), inset 0 2px 3px rgba(255, 255, 255, 0.45);
}

.control-panel .button-row {
  gap: 8px;
  padding: 0 4px;
}

.control-panel .control-command-button {
  display: inline-flex;
  min-width: 0;
  height: 32px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 5px;
  border: 1px solid rgba(103, 207, 255, 0.48);
  border-radius: 4px;
  background: url('../assets/status-item-bg.png') center / 100% 100% no-repeat;
  box-shadow: inset 0 4px 10px rgba(133, 192, 251, 0.5);
  color: #f4fbff;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.control-panel .control-command-button:hover,
.control-panel .control-command-button:focus-visible {
  border-color: rgba(103, 207, 255, 0.82);
  outline: 0;
  background: url('../assets/status-item-bg.png') center / 100% 100% no-repeat;
  box-shadow: inset 0 4px 10px rgba(133, 192, 251, 0.72), 0 0 10px rgba(14, 165, 233, 0.3);
}

.control-panel .control-command-button svg {
  display: block;
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
}

.gate-status-table {
  width: 100%;
  margin: 0;
  overflow: visible;
  border: 0;
  border-spacing: 0 1px;
  border-radius: 0;
  background: transparent;
}

.gate-status-table th,
.gate-status-table td {
  height: 32px;
  padding: 0 7px;
  border: 0;
  color: #b9d4e8;
  font-size: 12px;
}

.gate-status-table th {
  background: #206596;
  color: #dff3ff;
  font-weight: 600;
}

.gate-status-table tbody tr:nth-child(odd) td {
  background: transparent;
}

.gate-status-table tbody tr:nth-child(even) td {
  background: rgba(32, 101, 150, 0.2);
}

.gate-status-table .device-chip {
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #55cfff;
  font-weight: 600;
}

.gate-status-table .gate-status-online {
  color: #43ff86;
}

.gate-status-table .gate-status-offline {
  color: #ff5b55;
}

.sensor-section {
  margin: 0 0 10px;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.sensor-title {
  display: flex;
  height: 34px;
  align-items: center;
  padding: 0 14px;
  background: #206596 url('../assets/table-header.png') right center / auto 100% no-repeat;
  color: #e7f6ff;
  font-size: 13px;
  font-weight: 600;
}

.sensor-status-table {
  width: 100%;
  margin: 0;
  overflow: visible;
  border: 0;
  border-spacing: 0 1px;
  border-radius: 0;
  background: transparent;
}

.sensor-status-table td {
  height: 32px;
  padding: 0 7px;
  border: 0;
  color: #b9d4e8;
  font-size: 12px;
}

.sensor-status-table tbody tr:nth-child(odd) td {
  background: transparent;
}

.sensor-status-table tbody tr:nth-child(even) td {
  background: transparent;
}

.sensor-status-table .sensor-status-online {
  color: #43ff86;
}

.sensor-status-table .sensor-status-offline {
  color: #ff5b55;
}

.sensor-panel {
  display: flex;
  flex-direction: column;
}

.sensor-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.sensor-list::-webkit-scrollbar {
  display: none;
}

.realtime-empty {
  padding: 14px 8px;
  color: #7f9db3;
  text-align: center;
}

.alarm-mini :deep(.decorative-panel__content) {
  position: relative;
  padding: 6px 14px;
  overflow: hidden;
}

.alarm-list {
  position: relative;
  min-height: 100%;
  background: transparent;
}

.alarm-mini .alarm-item,
.alarm-mini .alarm-item.handled {
  position: relative;
  z-index: 1;
  display: block;
  margin: 10px 0;
  padding: 6px 8px;
  border: 0;
  border-radius: 0;
  background: transparent !important;
}

.alarm-mini .alarm-item + .alarm-item {
  border-top: 1px dotted rgba(74, 184, 231, 0.7);
}

.alarm-item__time {
  display: block;
  color: #dcecf6;
  font-size: 12px;
  font-style: normal;
  line-height: 18px;
  white-space: nowrap;
}

.alarm-item__body {
  min-width: 0;
  padding-right: 68px;
}

.alarm-mini .state-pill {
  position: absolute;
  top: 6px;
  right: 8px;
  display: inline-flex;
  width: 57.33px;
  height: 21.33px;
  flex: 0 0 57.33px;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 0;
  border-radius: 4px;
  background: #fff;
  box-shadow: inset 0 0 5px rgba(251, 15, 15, 0.5);
  color: #fb0f0f;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
}

.alarm-item__title {
  display: block;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #ff5353;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-item__details {
  min-width: 0;
  color: #899eac;
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.alarm-list__warning {
  position: absolute;
  z-index: 0;
  right: 8px;
  bottom: 8px;
  width: 64.04px;
  height: 56.27px;
  pointer-events: none;
}

.alarm-mini-error { color: #ff918a; }

.twin-panel .twin-stage {
  display: block;
  position: relative;
  flex: 1 1 auto;
  width: calc(100% - 20px);
  height: auto;
  min-height: 0;
  overflow: visible;
  background: transparent;
}

.twin-stage .preview-border {
  position: absolute;
  z-index: 0;
  inset: 0 auto 0 0;
  width: auto;
  height: calc(100% - 40px);
  object-fit: contain;
  filter: none;
  pointer-events: none;
  user-select: none;
}

.twin-stage .preview-border--left {
  left: 0;
}

.twin-stage .preview-border--right {
  inset: 0 0 0 auto;
  transform: scaleX(-1);
}

.preview-actions button {
  position: relative;
  flex: 0 0 auto;
  min-width: 0;
  padding-right: 8px;
  padding-left: 8px;
  font-size: 16px;
}

.preview-actions button:hover::after {
  position: absolute;
  left: 50%;
  bottom: -1px;
  width: 0;
  height: 0;
  border-right: 5px solid transparent;
  border-bottom: 0;
  border-left: 5px solid transparent;
  border-top: 6px solid #0EC8FB;
  content: '';
  transform: translateX(-50%);
}
</style>
