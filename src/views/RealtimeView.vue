<template>
  <section class="page page-realtime active">
    <div class="scene-stage">
      <SmartWaterFlumePreview
        ref="previewRef"
        :alarm-topic="alarmNotificationTopic"
        performance-mode
        @mqtt-data="handleMqttData"
        @alarm-notification="handleAlarmNotification"
      />
    </div>

    <header class="preview-console">
      <div class="preview-title">
        <span class="preview-title__arrow preview-title__arrow--left" aria-hidden="true"></span>
        <h1>三维水槽工艺监控</h1>
        <span class="preview-title__arrow preview-title__arrow--right" aria-hidden="true"></span>
      </div>
      <div class="preview-actions" aria-label="三维视角控制">
        <button
          v-for="action in VIEW_ACTIONS"
          :key="action"
          type="button"
          @click="handleViewAction(action)"
        >{{ action }}</button>
      </div>
    </header>

    <aside class="left-stack">
      <DecorativePanel class="panel gate-panel" title="闸门实时状态">
        <GateStatusChart :gates="gates" :empty-text="deviceMessage" />
      </DecorativePanel>

      <DecorativePanel class="panel sensor-panel" title="传感器实时状态">
        <div v-if="sensorGroups.length" class="sensor-tabs" role="tablist" aria-label="传感器类型">
          <button
            v-for="group in sensorGroups"
            :key="group.name"
            type="button"
            role="tab"
            :aria-selected="selectedSensorGroup?.name === group.name"
            :class="{ active: selectedSensorGroup?.name === group.name }"
            @click="activeSensorGroup = group.name"
          >
            {{ group.name }}
          </button>
        </div>
        <div class="sensor-list">
          <div v-if="selectedSensorGroup" class="sensor-section" role="tabpanel">
            <table class="data-table compact sensor-status-table">
              <tbody>
                <tr v-for="row in selectedSensorGroup.rows" :key="row.tag || row.name">
                  <td>{{ row.name }}</td>
                  <td>{{ row.location }}</td>
                  <td>{{ row.value }} {{ row.unit }}</td>
                  <td :class="row.state === '在线' ? 'status-online' : 'status-offline'">
                    <StatusText :value="row.state" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="realtime-empty">{{ deviceMessage }}</div>
        </div>
      </DecorativePanel>

      <TrendAnalysis
        class="realtime-info-panel"
        :profile-nodes="profileNodes"
        :realtime-values="realtimeValues"
        :profile-loading="profileLoading"
        :profile-error="profileError"
        :profile-timestamp="latestMqttAt"
      />
    </aside>

    <aside class="right-stack">
      <DecorativePanel class="panel control-panel" title="手动控制设备">
        <section class="control-section">
          <div class="control-section__head">
            <h2><ControlOutlined aria-hidden="true" />闸门</h2>
            <span class="running-state"><span aria-hidden="true"></span>在线</span>
          </div>
          <div class="control-device-row">
            <label for="gate-device">设备</label>
            <select id="gate-device"><option>G2</option><option>G1</option><option>G3</option></select>
            <strong>当前 42%</strong>
          </div>
          <div class="control-value"><span>目标开度</span><b>{{ targetGateOpening }}<small>%</small></b></div>
          <input
            v-model.number="targetGateOpening"
            type="range"
            min="0"
            max="100"
            step="1"
            aria-label="闸门目标开度"
            :style="{ '--range-progress': `${targetGateOpening}%` }"
          >
          <div class="button-row">
            <button type="button"><SettingOutlined aria-hidden="true" /><span>设置开度</span></button>
            <button class="danger-command" type="button"><PauseCircleOutlined aria-hidden="true" /><span>停止</span></button>
            <button type="button"><ReloadOutlined aria-hidden="true" /><span>复位</span></button>
          </div>
        </section>

        <section class="control-section">
          <div class="control-section__head">
            <h2><PoweroffOutlined aria-hidden="true" />水泵</h2>
            <span class="running-state"><span aria-hidden="true"></span>运行中</span>
          </div>
          <div class="control-device-row">
            <label for="pump-device">设备</label>
            <select id="pump-device"><option>P1</option><option>P2</option></select>
            <strong>当前 32Hz</strong>
          </div>
          <div class="control-value"><span>目标频率</span><b>{{ targetPumpFrequency }}<small>Hz</small></b></div>
          <input
            v-model.number="targetPumpFrequency"
            type="range"
            min="0"
            max="50"
            step="1"
            aria-label="水泵目标频率"
            :style="{ '--range-progress': `${(targetPumpFrequency / 50) * 100}%` }"
          >
          <div class="button-row">
            <button type="button"><PlayCircleOutlined aria-hidden="true" /><span>启动</span></button>
            <button class="danger-command" type="button"><PauseCircleOutlined aria-hidden="true" /><span>停止</span></button>
            <button type="button"><SettingOutlined aria-hidden="true" /><span>设置频率</span></button>
          </div>
        </section>

        <section class="control-section">
          <div class="control-section__head">
            <h2><ControlOutlined aria-hidden="true" />阀门</h2>
            <span class="running-state"><span aria-hidden="true"></span>在线</span>
          </div>
          <div class="control-device-row">
            <label for="valve-device">设备</label>
            <select id="valve-device"><option>V3</option><option>V1</option><option>V2</option></select>
            <strong>当前 46%</strong>
          </div>
          <div class="control-value"><span>目标开度</span><b>{{ targetValveOpening }}<small>%</small></b></div>
          <input
            v-model.number="targetValveOpening"
            type="range"
            min="0"
            max="100"
            step="1"
            aria-label="阀门目标开度"
            :style="{ '--range-progress': `${targetValveOpening}%` }"
          >
          <div class="button-row">
            <button type="button"><SettingOutlined aria-hidden="true" /><span>设置开度</span></button>
            <button class="danger-command" type="button"><PauseCircleOutlined aria-hidden="true" /><span>停止</span></button>
            <button type="button"><ReloadOutlined aria-hidden="true" /><span>复位</span></button>
          </div>
        </section>
      </DecorativePanel>
    </aside>
  </section>
</template>

<script setup>
import {
  ControlOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { getBigWaterChannelAlarmNotificationTopic } from '../api/alarm.js';
import {
  getRealtimeGroupDevices,
  getRealtimeWaterProfileTopology,
} from '../api/realtime.js';
import DecorativePanel from '../components/common/DecorativePanel.vue';
import StatusText from '../components/common/StatusText.vue';
import GateStatusChart from '../components/realtime/GateStatusChart.vue';
import SmartWaterFlumePreview from '../components/realtime/smart-water-flume-preview/SmartWaterFlumePreview.vue';
import TrendAnalysis from '../components/realtime/trend/TrendAnalysis.vue';
import { VIEW_ACTIONS } from '../data/monitoring-data.js';
import { buildRealtimeTableData, mergeRealtimeValues } from '../realtime-device-data.js';

const props = defineProps({
  sceneTarget: { type: Object, default: null },
});

const previewRef = ref(null);
const targetGateOpening = ref(50);
const targetPumpFrequency = ref(35);
const targetValveOpening = ref(52);
const deviceGroups = ref([]);
const deviceLoading = ref(true);
const deviceError = ref('');
const realtimeValues = reactive({});
const profileNodes = ref([]);
const profileLoading = ref(true);
const profileError = ref('');
const latestMqttAt = ref(null);
const alarmNotificationTopic = ref('');
let realtimeUpdateTimer = null;
let pendingRealtimePayload = null;

const tableData = computed(() => buildRealtimeTableData(deviceGroups.value, realtimeValues));
const gates = computed(() => tableData.value.gates);
const sensorGroups = computed(() => tableData.value.sensorGroups);
const activeSensorGroup = ref('');
const selectedSensorGroup = computed(() => sensorGroups.value.find(
  (group) => group.name === activeSensorGroup.value,
) || sensorGroups.value[0] || null);
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

function handleAlarmNotification(payload) {
  window.dispatchEvent(new CustomEvent('alarm-notification', { detail: payload }));
}

async function loadAlarmNotificationTopic() {
  try {
    alarmNotificationTopic.value = await getBigWaterChannelAlarmNotificationTopic();
  } catch (error) {
    console.error('获取告警通知主题失败', error);
  }
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

watch(() => props.sceneTarget, async (target) => {
  const channelName = typeof target?.channelName === 'string' ? target.channelName.trim() : '';
  if (!channelName) return;
  await nextTick();
  previewRef.value?.focusSceneTreeGroupByName(channelName);
});

onMounted(() => {
  void loadAlarmNotificationTopic();
  void loadRealtimeDevices();
  void loadRealtimeProfileTopology();
});

onBeforeUnmount(() => {
  if (realtimeUpdateTimer !== null) window.clearTimeout(realtimeUpdateTimer);
  realtimeUpdateTimer = null;
  pendingRealtimePayload = null;
});
</script>

<style scoped>
.page-realtime {
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
}

.scene-stage {
  position: absolute;
  inset: 0;
}

.scene-stage {
  z-index: 0;
  overflow: hidden;
}

.scene-stage :deep(.flume-preview) {
  position: absolute;
  inset: 0;
}

.preview-console {
  position: absolute;
  top: 18px;
  left: 50%;
  z-index: 6;
  display: flex;
  width: min(720px, calc(100% - 840px));
  min-width: 430px;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  transform: translateX(-50%);
}

.preview-title {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.preview-title h1 {
  margin: 0;
  padding: 0 10px;
  color: #fff;
  font-family: 'SimHei', 'Microsoft YaHei', sans-serif;
  font-size: 30px;
  font-weight: normal;
  line-height: 38px;
  text-shadow: 0 0 13px rgba(64, 195, 255, 0.42);
  white-space: nowrap;
}

.preview-title__arrow {
  display: block;
  width: 53px;
  height: 36px;
  flex: 0 0 53px;
  background: url('../assets/preview-title.png') center / 100% 100% no-repeat;
}

.preview-title__arrow--right {
  transform: scaleX(-1);
}

.preview-actions {
  display: flex;
  width: max-content;
  max-width: 100%;
  height: 48px;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 24px;
  background: url('../assets/preview-actions.png') center / 100% 100% no-repeat;
  pointer-events: auto;
}

.preview-actions button {
  position: relative;
  height: 32px;
  padding: 0 9px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: #caeaff;
  font-size: 13px;
  line-height: 32px;
  white-space: nowrap;
}

.preview-actions button:hover,
.preview-actions button:focus-visible {
  outline: 0;
  background: transparent;
  box-shadow: none;
  color: #28d9ff;
}

.preview-actions button:hover::after,
.preview-actions button:focus-visible::after {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 0;
  border-top: 5px solid #28d9ff;
  border-right: 4px solid transparent;
  border-left: 4px solid transparent;
  content: '';
  transform: translateX(-50%);
}

.left-stack,
.right-stack {
  position: absolute;
  z-index: 5;
  top: 22px;
  bottom: 18px;
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
}

.left-stack {
  left: 0;
  width: clamp(340px, 20vw, 392px);
}

.right-stack {
  right: 0;
  width: clamp(336px, 19vw, 372px);
}

.panel,
.realtime-info-panel {
  min-height: 0;
  background: rgba(1, 28, 55, 0.54);
  backdrop-filter: blur(3px);
}

.gate-panel {
  flex: 0 0 214px;
}

.sensor-panel {
  flex: 0 0 268px;
}

.realtime-info-panel {
  flex: 1 1 0;
}

.sensor-panel :deep(.decorative-panel__content) {
  padding: 5px 10px 9px;
}

.gate-panel :deep(.decorative-panel__content) {
  display: flex;
  min-height: 0;
  padding: 0 10px 7px;
  overflow: hidden;
}

.sensor-panel :deep(.decorative-panel__content) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.data-table {
  width: 100%;
  margin: 0;
  border: 0;
  border-collapse: separate;
  border-spacing: 0 1px;
  border-radius: 0;
  background: transparent;
  table-layout: fixed;
}

.data-table th,
.data-table td {
  height: 30px;
  padding: 0 5px;
  overflow: hidden;
  border: 0;
  color: #b9d4e8;
  font-size: 11px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-table th {
  background: rgba(32, 101, 150, 0.82);
  color: #e7f6ff;
  font-weight: 600;
}

.data-table tbody tr:nth-child(even) td {
  background: rgba(32, 101, 150, 0.16);
}

.status-online {
  color: #43ff86 !important;
}

.status-offline {
  color: #ff6862 !important;
}

.sensor-list {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(55, 175, 237, 0.5) transparent;
}

.sensor-tabs {
  display: flex;
  min-width: 0;
  flex: 0 0 31px;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
  border-bottom: 1px solid rgba(31, 157, 242, 0.24);
}

.sensor-tabs button {
  min-width: 0;
  height: 26px;
  flex: 1 1 0;
  overflow: hidden;
  border: 1px solid rgba(49, 151, 214, 0.34);
  padding: 0 5px;
  background: rgba(7, 60, 99, 0.56);
  color: #8ebbd6;
  font: inherit;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.sensor-tabs button:hover {
  border-color: rgba(76, 210, 255, 0.68);
  color: #dff8ff;
}

.sensor-tabs button.active {
  border-color: #3ac9f5;
  background: rgba(21, 126, 180, 0.78);
  color: #ffffff;
  box-shadow: inset 0 -2px 0 #6eeaff, 0 0 8px rgba(30, 190, 242, 0.2);
}

.sensor-section {
  margin: 0;
  border: 0;
  background: transparent;
}

.sensor-status-table td:nth-child(1) { width: 29%; }
.sensor-status-table td:nth-child(2) { width: 20%; }
.sensor-status-table td:nth-child(3) { width: 31%; }
.sensor-status-table td:nth-child(4) { width: 20%; }

.realtime-empty {
  padding: 14px 8px;
  color: #7f9db3;
  text-align: center;
}

.realtime-info-panel :deep(.water-profile-shell) {
  min-height: 0;
}

.control-panel {
  height: 100%;
}

.control-panel :deep(.decorative-panel__content) {
  padding: 2px 14px 7px;
  overflow-y: auto;
}

.control-section {
  padding: 11px 2px 13px;
}

.control-section + .control-section {
  border-top: 1px solid rgba(70, 171, 228, 0.34);
}

.control-section__head,
.control-device-row,
.control-value {
  display: flex;
  align-items: center;
}

.control-section__head {
  justify-content: space-between;
  margin-bottom: 9px;
}

.control-section__head h2 {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  padding: 0;
  color: #eff9ff;
  font-size: 14px;
  line-height: 22px;
}

.control-section__head h2 :deep(svg) {
  color: #43cfff;
}

.running-state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #70e7a2;
  font-size: 11px;
}

.running-state > span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #58e29a;
  box-shadow: 0 0 7px rgba(88, 226, 154, 0.75);
}

.control-device-row {
  gap: 7px;
  color: #8fb4cd;
  font-size: 11px;
}

.control-device-row label {
  flex: 0 0 auto;
}

.control-device-row select {
  width: 78px;
  height: 28px;
  padding: 0 24px 0 8px;
  border: 1px solid rgba(73, 175, 232, 0.55);
  border-radius: 3px;
  outline: 0;
  background: rgba(3, 43, 76, 0.88);
  color: #e4f5ff;
  font-size: 11px;
}

.control-device-row strong {
  margin-left: auto;
  color: #dceeff;
  font-size: 11px;
  font-weight: 500;
}

.control-value {
  justify-content: space-between;
  margin: 7px 0 -1px;
  color: #8fb4cd;
  font-size: 11px;
}

.control-value b {
  color: #ffd45c;
  font-size: 24px;
  line-height: 28px;
}

.control-value small {
  margin-left: 3px;
  color: #d7e9f6;
  font-size: 11px;
  font-weight: 500;
}

.control-section input[type='range'] {
  width: 100%;
  height: 14px;
  margin: 7px 0 10px;
  appearance: none;
  outline: 0;
  background: transparent;
}

.control-section input[type='range']::-webkit-slider-runnable-track {
  height: 7px;
  border: 1px solid #0b9dcc;
  border-radius: 4px;
  background: linear-gradient(90deg, #30c6ec 0%, #087ebc var(--range-progress), rgba(3, 45, 78, 0.92) var(--range-progress), rgba(3, 45, 78, 0.92) 100%);
}

.control-section input[type='range']::-webkit-slider-thumb {
  width: 15px;
  height: 15px;
  margin-top: -5px;
  appearance: none;
  border: 1px solid #8be3ff;
  border-radius: 50%;
  background: #57c9ef;
  box-shadow: 0 0 7px rgba(75, 201, 255, 0.8);
}

.control-section input[type='range']::-moz-range-track {
  height: 7px;
  border: 1px solid #0b9dcc;
  border-radius: 4px;
  background: linear-gradient(90deg, #30c6ec 0%, #087ebc var(--range-progress), rgba(3, 45, 78, 0.92) var(--range-progress), rgba(3, 45, 78, 0.92) 100%);
}

.control-section input[type='range']::-moz-range-thumb {
  width: 15px;
  height: 15px;
  border: 1px solid #8be3ff;
  border-radius: 50%;
  background: #57c9ef;
  box-shadow: 0 0 7px rgba(75, 201, 255, 0.8);
}

.button-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.button-row button {
  display: inline-flex;
  min-width: 0;
  height: 30px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 4px;
  border: 1px solid rgba(103, 207, 255, 0.42);
  border-radius: 3px;
  background: rgba(17, 78, 121, 0.62);
  box-shadow: inset 0 3px 9px rgba(133, 192, 251, 0.26);
  color: #eaf8ff;
  font-size: 10px;
  white-space: nowrap;
}

.button-row button:hover,
.button-row button:focus-visible {
  border-color: rgba(103, 219, 255, 0.86);
  outline: 0;
  background: rgba(15, 104, 163, 0.82);
}

.button-row button :deep(svg) {
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
  color: #4fe1ff;
}

.button-row .danger-command :deep(svg) {
  color: #ff7b77;
}

@media (max-width: 1500px) {
  .left-stack {
    width: 330px;
  }

  .right-stack {
    width: 324px;
  }

  .preview-console {
    width: calc(100% - 720px);
    min-width: 390px;
  }

  .preview-title h1 {
    font-size: 26px;
  }

  .preview-actions button {
    padding: 0 5px;
    font-size: 11px;
  }
}

@media (max-height: 820px) {
  .gate-panel {
    flex-basis: 176px;
  }

  .sensor-panel {
    flex-basis: 210px;
  }

  .control-section {
    padding-top: 4px;
    padding-bottom: 5px;
  }

  .control-section__head {
    margin-bottom: 4px;
  }

  .control-device-row select {
    height: 24px;
  }

  .control-value {
    margin-top: 3px;
  }

  .control-section input[type='range'] {
    margin-top: 4px;
    margin-bottom: 6px;
  }

  .button-row button {
    height: 27px;
  }

  .control-value b {
    font-size: 20px;
  }
}
</style>
