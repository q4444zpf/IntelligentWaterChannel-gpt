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
          <div class="sensor-tabs__bg"></div>
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
              <thead>
                <tr>
                  <th class="col-status">状态</th>
                  <th class="col-name">水位</th>
                  <th class="col-location">所属渠道</th>
                  <th class="col-value">计量</th>
                  <th class="col-locate">三维定位</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in selectedSensorGroup.rows" :key="row.tag || row.name">
                  <td :class="sensorStatusClass(sensorRowState(row))">
                    <span class="status-dot" :class="sensorStatusDotClass(sensorRowState(row))"></span>
                  </td>
                  <td>{{ row.name }}</td>
                  <td>{{ row.location }}</td>
                  <td>{{ row.value }} {{ row.unit }}</td>
                  <td>
                    <button type="button" class="locate-btn" title="三维定位" @click="handleLocate(row)">
                      <LocateIcon />
                    </button>
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
      <DecorativePanel class="panel control-panel" title="设备控制">
        <template #heading-action>
          <button
            type="button"
            class="control-mode-switch"
            role="switch"
            :aria-checked="manualControl"
            :aria-label="manualControl ? '切换为自动控制' : '切换为手动控制'"
            :disabled="modeSwitching || !gateList.length || !pump?.uid"
            @click="toggleControlMode"
          >
            <span>{{ manualControl ? '手动' : '自动' }}</span>
            <i aria-hidden="true"></i>
          </button>
        </template>
        <section class="control-section gate-control-section">
          <div class="gate-header">
            <h2 class="gate-title">闸门</h2>
            <div class="gate-tabs" role="tablist" aria-label="闸门列表">
              <button
                v-for="gate in gateList"
                :key="gate.id"
                type="button"
                role="tab"
                :aria-selected="selectedGate?.id === gate.id"
                :class="{ active: selectedGate?.id === gate.id }"
                @click="selectedGate = gate"
              >
                {{ gate.openingTag || gate.name }}
              </button>
            </div>
          </div>
          <div class="gate-display" v-if="selectedGate">
            <button type="button" class="gate-arrow gate-arrow--left" @click="cycleGate(-1)" aria-label="上一个闸门">
              <img src="../assets/arrow.png" alt="" />
            </button>
            <div class="gate-value-display">
              <div class="gate-value-bg"></div>
              <div class="gate-value-content">
                <span class="gate-value-number">{{ selectedGateDisplayOpening }}</span>
                <span class="gate-value-label">当前开度(mm)</span>
              </div>
            </div>
            <button type="button" class="gate-arrow gate-arrow--right" @click="cycleGate(1)" aria-label="下一个闸门">
              <img src="../assets/arrow.png" alt="" />
            </button>
          </div>
          <div class="gate-actions">
            <button type="button" class="gate-action-btn" @click="handleGateLocate">
              <LocateIcon />
              <span>三维定位</span>
            </button>
            <ControlValueSettingPopover
              :value="selectedGateOpening"
              :max="selectedGateMaxOpening"
              label="目标开度："
              unit="mm"
              :submit="confirmGateSetting"
            >
            <button type="button" class="gate-action-btn gate-action-btn--setting" :disabled="!manualControl || !selectedGate?.uid">
                <GateOpeningSettingIcon />
                <span>设置开度</span>
              </button>
            </ControlValueSettingPopover>
          </div>
        </section>

        <section class="control-section pump-control-section">
          <div class="gate-header pump-header">
            <h2 class="gate-title">{{ pump?.name || '水泵' }}</h2>
            <div class="pump-switch-control">
              <span>{{ pumpRunning ? '开' : '关' }}</span>
              <button
                type="button"
                class="pump-switch"
                role="switch"
                :aria-checked="pumpRunning"
                :aria-label="pumpRunning ? '关闭水泵' : '开启水泵'"
                :class="{ 'is-checked': pumpRunning }"
                :disabled="!manualControl || !pump?.uid || pumpControlSubmitting"
                @click="togglePumpRunning"
              >
                <span aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <PumpFrequencyGauge
            :value="pumpRunning ? pumpFrequency : 0"
            :max="pumpMaxFrequency"
            unit="Hz"
          />

          <div class="gate-actions pump-actions">
            <button
              type="button"
              class="gate-action-btn"
              :disabled="!pump?.location"
              @click="handlePumpLocate"
            >
              <LocateIcon />
              <span>三维定位</span>
            </button>
            <ControlValueSettingPopover
              :value="pumpFrequency"
              :max="pumpMaxFrequency"
              label="目标频率："
              unit="Hz"
              :submit="confirmPumpFrequency"
            >
              <button
                type="button"
                class="gate-action-btn pump-frequency-action"
                :disabled="!manualControl || !pump?.uid || pumpControlSubmitting"
              >
                <PumpFrequencySettingIcon />
                <span>设置频率</span>
              </button>
            </ControlValueSettingPopover>
          </div>
        </section>

        <section class="control-section valve-control-section">
          <div class="gate-header valve-header">
            <h2 class="gate-title">阀门</h2>
            <div class="gate-tabs" role="tablist" aria-label="阀门列表">
              <button
                v-for="valve in valves"
                :key="valve.id"
                type="button"
                role="tab"
                :aria-selected="selectedValve?.id === valve.id"
                :class="{ active: selectedValve?.id === valve.id }"
                @click="selectedValve = valve"
              >
                {{ valve.label }}
              </button>
            </div>
          </div>

          <PumpFrequencyGauge
            :value="selectedValveOpening"
            :max="selectedValveMaxOpening"
            label="当前开度"
            unit="%"
          />

          <div class="gate-actions valve-actions">
            <button
              type="button"
              class="gate-action-btn"
              :disabled="!selectedValve?.location"
              @click="handleValveLocate"
            >
              <LocateIcon />
              <span>三维定位</span>
            </button>
            <ControlValueSettingPopover
              :value="selectedValveOpening"
              :max="selectedValveMaxOpening"
              label="目标开度："
              unit="%"
              :submit="confirmValveSetting"
            >
              <button
                type="button"
                class="gate-action-btn gate-action-btn--setting"
                :disabled="!selectedValve?.uid || valveControlSubmitting"
              >
                <ValveOpeningSettingIcon />
                <span>设置开度</span>
              </button>
            </ControlValueSettingPopover>
          </div>
        </section>
      </DecorativePanel>
    </aside>
  </section>

</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, watchEffect } from 'vue';
import { message } from 'ant-design-vue';
import { getBigWaterChannelAlarmNotificationTopic } from '../api/alarm.js';
import {
  getRealtimeGroupDevices,
  getRealtimeWaterProfileTopology,
  setGateAutoControl,
  setGateOpening,
  setPumpAutoControl,
  setPumpControl,
  setValveOpening,
} from '../api/realtime.js';
import DecorativePanel from '../components/common/DecorativePanel.vue';
import GateOpeningSettingIcon from '../components/common/GateOpeningSettingIcon.vue';
import LocateIcon from '../components/common/LocateIcon.vue';
import PumpFrequencySettingIcon from '../components/common/PumpFrequencySettingIcon.vue';
import ValveOpeningSettingIcon from '../components/common/ValveOpeningSettingIcon.vue';
import ControlValueSettingPopover from '../components/realtime/ControlValueSettingPopover.vue';
import GateStatusChart from '../components/realtime/GateStatusChart.vue';
import PumpFrequencyGauge from '../components/realtime/PumpFrequencyGauge.vue';
import SmartWaterFlumePreview from '../components/realtime/smart-water-flume-preview/SmartWaterFlumePreview.vue';
import TrendAnalysis from '../components/realtime/trend/TrendAnalysis.vue';
import { VIEW_ACTIONS } from '../data/monitoring-data.js';
import { buildRealtimeTableData, mergeRealtimeValues } from '../realtime-device-data.js';

const props = defineProps({
  sceneTarget: { type: Object, default: null },
});

const previewRef = ref(null);
const targetGateOpening = ref(50);
const pumpControlSubmitting = ref(false);
const valveControlSubmitting = ref(false);
const manualControl = ref(false);
const modeSwitching = ref(false);
const deviceGroups = ref([]);
const deviceLoading = ref(true);
const deviceError = ref('');
const realtimeValues = reactive({});
const profileNodes = ref([]);
const profileLoading = ref(true);
const profileError = ref('');
const latestMqttAt = ref(null);
const alarmNotificationTopic = ref('');
const alarmDeviceKeys = reactive(new Set());
let realtimeUpdateTimer = null;
let pendingRealtimePayload = null;

const tableData = computed(() => buildRealtimeTableData(deviceGroups.value, realtimeValues));
const gates = computed(() => tableData.value.gates);
const gateList = computed(() => tableData.value.gateList || []);
const pump = computed(() => tableData.value.pump);
const pumpRunning = computed(() => pump.value?.running ?? false);
const pumpFrequency = computed(() => pump.value?.frequency ?? 0);
const pumpMaxFrequency = computed(() => pump.value?.maxFrequency ?? 50);
const valves = computed(() => tableData.value.valves || []);
const selectedValve = ref(null);
const selectedValveOpening = computed(() => selectedValve.value?.opening ?? 0);
const selectedValveMaxOpening = computed(() => selectedValve.value?.maxOpening ?? 100);
const selectedGate = ref(null);
const selectedGateOpening = computed(() => {
  const gate = selectedGate.value;
  if (!gate) return 0;
  const val = parseFloat(gate.open);
  return Number.isNaN(val) ? 0 : Math.round(val * 1000) / 1000;
});
const selectedGateDisplayOpening = computed(() => Math.round(selectedGateOpening.value));
const selectedGateMaxOpening = computed(() => selectedGate.value?.maxOpening ?? 90);
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
  for (const record of alarmRecords(payload)) {
    const uid = normalizedAlarmIdentifier(record?.uid);
    const deviceSn = normalizedAlarmIdentifier(record?.deviceSn);
    if (uid) alarmDeviceKeys.add(`uid:${uid}`);
    if (deviceSn) alarmDeviceKeys.add(`deviceSn:${deviceSn}`);
  }
  window.dispatchEvent(new CustomEvent('alarm-notification', { detail: payload }));
}

function alarmRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.records)) return payload.records;
  if (Array.isArray(payload.values)) return payload.values;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && typeof payload.data === 'object') return [payload.data];
  return [payload];
}

function normalizedAlarmIdentifier(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function sensorRowState(row) {
  const uid = normalizedAlarmIdentifier(row?.uid);
  const deviceSn = normalizedAlarmIdentifier(row?.deviceSn);
  if ((uid && alarmDeviceKeys.has(`uid:${uid}`))
    || (deviceSn && alarmDeviceKeys.has(`deviceSn:${deviceSn}`))) {
    return '报警';
  }
  return row?.state || '离线';
}

function handleLocate(row) {
  if (row?.location) {
    previewRef.value?.focusSceneTreeGroupByName(row.location);
  }
}

function sensorStatusClass(state) {
  if (state === '在线') return 'status-online';
  if (state === '报警') return 'status-alarm';
  return 'status-offline';
}

function sensorStatusDotClass(state) {
  if (state === '在线') return 'dot-online';
  if (state === '报警') return 'dot-alarm';
  return 'dot-offline';
}

function cycleGate(direction) {
  if (!gateList.value.length) return;
  const idx = gateList.value.findIndex((g) => g.id === selectedGate.value?.id);
  const next = (idx + direction + gateList.value.length) % gateList.value.length;
  selectedGate.value = gateList.value[next];
}

function handleGateLocate() {
  if (selectedGate.value?.name) {
    previewRef.value?.focusSceneTreeGroupByName(selectedGate.value.name);
  }
}

async function confirmGateSetting(value) {
  if (!manualControl.value) {
    const error = new Error('请先切换到手动控制模式');
    message.warning(error.message);
    throw error;
  }
  const gate = selectedGate.value;
  if (!gate?.uid) {
    const error = new Error('当前闸门缺少设备标识，无法下发开度');
    message.error(error.message);
    throw error;
  }

  try {
    await setGateOpening(gate.uid, value);
    targetGateOpening.value = value;
    message.success(`${gate.name}目标开度已设置为 ${value} mm`);
  } catch (error) {
    message.error(error?.message || '闸门开度设置失败');
    throw error;
  }
}

async function togglePumpRunning() {
  const currentPump = pump.value;
  if (!manualControl.value || !currentPump?.uid || pumpControlSubmitting.value) return;

  const nextRunning = !pumpRunning.value;
  pumpControlSubmitting.value = true;
  try {
    await setPumpControl(currentPump.uid, {
      running: nextRunning,
      frequency: pumpFrequency.value,
    });
    message.success(`${currentPump.name}已${nextRunning ? '开启' : '关闭'}`);
  } catch (error) {
    message.error(error?.message || '水泵开关控制失败');
  } finally {
    pumpControlSubmitting.value = false;
  }
}

async function confirmPumpFrequency(value) {
  if (!manualControl.value) {
    const error = new Error('请先切换到手动控制模式');
    message.warning(error.message);
    throw error;
  }
  const currentPump = pump.value;
  if (!currentPump?.uid) {
    const error = new Error('当前水泵缺少设备标识，无法下发频率');
    message.error(error.message);
    throw error;
  }

  pumpControlSubmitting.value = true;
  try {
    await setPumpControl(currentPump.uid, {
      running: pumpRunning.value,
      frequency: value,
    });
    message.success(`${currentPump.name}目标频率已设置为 ${value} Hz`);
  } catch (error) {
    message.error(error?.message || '水泵频率设置失败');
    throw error;
  } finally {
    pumpControlSubmitting.value = false;
  }
}

async function toggleControlMode() {
  if (modeSwitching.value) return;

  const nextManual = !manualControl.value;
  const currentGates = gateList.value.filter((gate) => gate.uid);
  const currentPump = pump.value;
  if (!currentGates.length || !currentPump?.uid) {
    message.warning('设备配置尚未加载完成');
    return;
  }

  modeSwitching.value = true;
  try {
    if (nextManual) {
      await Promise.all([
        ...currentGates.map((gate) => setGateOpening(gate.uid, gateOpeningValue(gate))),
        setPumpControl(currentPump.uid, {
          running: currentPump.running,
          frequency: currentPump.frequency,
        }),
      ]);
    } else {
      await Promise.all([
        ...currentGates.map((gate) => setGateAutoControl(gate.uid)),
        setPumpAutoControl(currentPump.uid),
      ]);
    }
    manualControl.value = nextManual;
    message.success(nextManual ? '已切换为手动控制' : '已切换为自动控制');
  } catch (error) {
    message.error(error?.message || '控制模式切换失败');
  } finally {
    modeSwitching.value = false;
  }
}

function gateOpeningValue(gate) {
  const value = Number.parseFloat(gate?.open);
  return Number.isFinite(value) ? value : 0;
}

async function confirmValveSetting(value) {
  const currentValve = selectedValve.value;
  if (!currentValve?.uid) {
    const error = new Error('当前阀门缺少设备标识，无法下发开度');
    message.error(error.message);
    throw error;
  }

  valveControlSubmitting.value = true;
  try {
    await setValveOpening(currentValve.uid, value);
    realtimeValues[currentValve.tag] = {
      [currentValve.openingField]: value,
    };
    message.success(`${currentValve.name}目标开度已设置为 ${value}%`);
  } catch (error) {
    message.error(error?.message || '阀门开度设置失败');
    throw error;
  } finally {
    valveControlSubmitting.value = false;
  }
}

function handlePumpLocate() {
  if (pump.value?.location) {
    previewRef.value?.focusSceneTreeGroupByName(pump.value.location);
  }
}

function handleValveLocate() {
  if (selectedValve.value?.location) {
    previewRef.value?.focusSceneTreeGroupByName(selectedValve.value.location);
  }
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

watch(gateList, (list) => {
  if (!list?.length) {
    selectedGate.value = null;
    return;
  }

  const selectedGateId = selectedGate.value?.id;
  selectedGate.value = list.find((gate) => gate.id === selectedGateId) || list[0];
}, { immediate: true });

watch(valves, (list) => {
  if (!list?.length) {
    selectedValve.value = null;
    return;
  }

  const selectedValveId = selectedValve.value?.id;
  selectedValve.value = list.find((valve) => valve.id === selectedValveId) || list[0];
}, { immediate: true });

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
  flex: 1 1 0;
}

.realtime-info-panel {
  flex: 0 0 268px;
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
  color: #8b98a8 !important;
}

.status-alarm {
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
  position: relative;
  display: flex;
  min-width: 0;
  flex: 0 0 31px;
  align-items: center;
  margin-bottom: 4px;
  padding: 0;
}

.sensor-tabs__bg {
  position: absolute;
  inset: 0;
  background: url('../assets/table-header.png') center / 100% 100% no-repeat, #206596;
  pointer-events: none;
}

.sensor-tabs button {
  position: relative;
  min-width: 0;
  height: 31px;
  flex: 1 1 0;
  overflow: hidden;
  border: 0;
  outline: none;
  box-shadow: none;
  padding: 0 5px;
  background: transparent;
  color: #8ebbd6;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.2s ease;
}

.sensor-tabs button:hover {
  color: #dff8ff;
  outline: none;
  box-shadow: none;
}

.sensor-tabs button.active {
  color: #ffffff;
  font-weight: 600;
  text-shadow: 0 0 8px rgba(110, 234, 255, 0.6);
}

.sensor-tabs button.active::after {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 20px;
  height: 3px;
  background: #6eeaff;
  border-radius: 2px 2px 0 0;
  box-shadow: 0 0 8px rgba(110, 234, 255, 0.8);
  content: '';
  transform: translateX(-50%);
}

.sensor-section {
  margin: 0;
  border: 0;
  background: transparent;
}

.sensor-status-table th:nth-child(1),
.sensor-status-table td:nth-child(1) { width: 12%; }
.sensor-status-table th:nth-child(2),
.sensor-status-table td:nth-child(2) { width: 22%; }
.sensor-status-table th:nth-child(3),
.sensor-status-table td:nth-child(3) { width: 22%; }
.sensor-status-table th:nth-child(4),
.sensor-status-table td:nth-child(4) { width: 26%; }
.sensor-status-table th:nth-child(5),
.sensor-status-table td:nth-child(5) { width: 18%; }

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.dot-online {
  background: #43ff86;
  box-shadow: 0 0 6px rgba(67, 255, 134, 0.8);
}

.status-dot.dot-offline {
  background: #8b98a8;
  box-shadow: 0 0 6px rgba(139, 152, 168, 0.8);
}

.status-dot.dot-alarm {
  background: #ff6862;
  box-shadow: 0 0 6px rgba(255, 104, 98, 0.8);
}

.locate-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  outline: none;
  box-shadow: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  transition: filter 0.2s ease;
}

.locate-btn:hover {
  outline: none;
  box-shadow: none;
  filter: brightness(1.3) drop-shadow(0 0 4px rgba(110, 234, 255, 0.8));
}

.locate-btn svg {
  width: 18px;
  height: 16px;
}

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

.control-mode-switch {
  position: absolute;
  top: 8px;
  right: 18px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 70px;
  height: 25px;
  border: 1px solid rgba(76, 194, 239, 0.64);
  border-radius: 13px;
  padding: 0 7px 0 9px;
  background: rgba(6, 52, 85, 0.82);
  color: #cdeeff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.control-mode-switch i {
  position: relative;
  display: block;
  width: 22px;
  height: 12px;
  border-radius: 6px;
  background: rgba(100, 133, 153, 0.82);
  transition: background 0.2s ease;
}

.control-mode-switch i::after {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e1f7ff;
  box-shadow: 0 0 6px rgba(223, 247, 255, 0.78);
  content: '';
  transition: transform 0.2s ease;
}

.control-mode-switch[aria-checked='true'] {
  border-color: rgba(67, 239, 190, 0.84);
  color: #d9fff2;
}

.control-mode-switch[aria-checked='true'] i {
  background: #18aa7c;
}

.control-mode-switch[aria-checked='true'] i::after {
  transform: translateX(10px);
}

.control-mode-switch:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.control-panel :deep(.decorative-panel__content) {
  display: grid;
  min-height: 0;
  grid-template-rows: repeat(3, minmax(0, 1fr));
  padding: 2px 14px 7px;
  overflow: hidden;
}

.control-section {
  min-height: 0;
  padding: 11px 2px 13px;
  overflow-y: auto;
}

/* Gate control section */
.gate-control-section {
  padding: 8px 2px 10px;
}

.gate-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.gate-title {
  margin: 0;
  padding: 0;
  flex-shrink: 0;
  background: linear-gradient(180deg, #ffffff 48%, #05fcfd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}

.gate-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.gate-tabs button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #5A7E9B;
  border-radius: 50%;
  background: #47657D;
  box-sizing: border-box;
  color: #cfe3f4;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gate-tabs button:hover {
  border-color: #6fb4e8;
  color: #eaf8ff;
}

.gate-tabs button.active {
  border-color: #6fb4e8;
  background: #2a7ab0;
  color: #eaf8ff;
}

.gate-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
}

.gate-arrow {
  width: 75px;
  height: 98px;
  border: 0;
  outline: none;
  box-shadow: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  opacity: 0.75;
  transition: opacity 0.2s ease;
}

.gate-arrow:hover {
  opacity: 1;
}

.gate-arrow img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.gate-arrow--right img {
  transform: scaleX(-1);
}

.gate-value-display {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gate-value-bg {
  position: absolute;
  inset: 0;
  background: url('../assets/value_bg.png') center / contain no-repeat;
}

.gate-value-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 8px;
}

.gate-value-number {
  position: relative;
  display: inline-block;
  min-width: 2ch;
  background: linear-gradient(180deg, #facb64 0%, #ffffff 55%, #e0a115 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

.gate-value-label {
  margin-top: 4px;
  color: #8fb4cd;
  font-size: 11px;
}

.gate-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.gate-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 16px;
  border: 1px solid rgba(103, 207, 255, 0.42);
  border-radius: 16px;
  background: rgba(17, 78, 121, 0.62);
  color: #eaf8ff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gate-action-btn:hover {
  border-color: rgba(103, 219, 255, 0.86);
  background: rgba(15, 104, 163, 0.82);
}

.gate-action-btn:disabled,
.pump-switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.gate-action-btn:disabled:hover {
  border-color: rgba(103, 207, 255, 0.42);
  background: rgba(17, 78, 121, 0.62);
}

.gate-action-btn svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.gate-action-btn--setting svg {
  width: 20px;
  height: 20px;
}

/* End gate control section */

.pump-control-section,
.valve-control-section {
  padding: 8px 2px 12px;
}

.pump-header,
.valve-header {
  margin-bottom: 0;
}

.pump-switch-control {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
  color: #cde8f7;
  font-size: 12px;
}

.pump-switch {
  position: relative;
  width: 36px;
  height: 20px;
  padding: 0;
  flex: 0 0 36px;
  border: 1px solid rgba(121, 158, 182, 0.72);
  border-radius: 10px;
  outline: 0;
  background: rgba(63, 83, 101, 0.78);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.pump-switch span {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #c7d4dc;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.34);
  transition: transform 0.2s ease, background 0.2s ease;
}

.pump-switch.is-checked {
  border-color: #4adce7;
  background: rgba(10, 156, 176, 0.82);
  box-shadow: 0 0 8px rgba(5, 252, 253, 0.35);
}

.pump-switch.is-checked span {
  transform: translateX(16px);
  background: #ffffff;
}

.pump-switch:focus-visible {
  box-shadow: 0 0 0 2px rgba(100, 222, 255, 0.38);
}

.pump-actions,
.valve-actions {
  margin-top: -5px;
}

.pump-frequency-action svg {
  width: 20px;
  height: 20px;
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
    flex-basis: 0;
  }

  .realtime-info-panel {
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
