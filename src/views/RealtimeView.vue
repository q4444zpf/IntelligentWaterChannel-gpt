<template>
  <section class="page page-realtime active">
    <div class="scene-stage">
      <FiveStageDosingProcess
        v-if="showProcessPrototype && activeScene === 'dosing'"
        :pre-turbidity="realtimeDisplay.preTurbidity"
        :post-turbidity="realtimeDisplay.postTurbidity"
        :pump-percent="realtimeDisplay.pumpPercent"
        :pump-running="realtimeDisplay.pumpRunning"
      />

      <AerationProcess
        v-else-if="showProcessPrototype"
        :do-value="aerationDisplay.doValue"
        :air-flow="aerationDisplay.airFlow"
        :blower-percent="aerationDisplay.blowerPercent"
        :blower-running="aerationDisplay.blowerRunning"
        :target-min="aerationTrendTargetRange[0]"
        :target-max="aerationTrendTargetRange[1]"
      />

      <!-- 原三维组件继续保留，后续接入真实模型时切换展示状态即可。 -->
      <SmartWaterFlumePreview
        v-else
        :key="activeSceneConfig.webTopoId"
        ref="previewRef"
        :web-topo-id="activeSceneConfig.webTopoId"
        :alarm-topic="alarmNotificationTopic"
        performance-mode
        @mqtt-data="handleMqttData"
        @alarm-notification="handleAlarmNotification"
      />
    </div>

    <header class="preview-console">
      <div class="preview-title">
        <span class="preview-title__arrow preview-title__arrow--left" aria-hidden="true"></span>
        <h1>三维工艺实时监控</h1>
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
      <div class="process-status" aria-label="工艺运行状态">
        <template v-if="activeScene === 'dosing'">
          <span><i class="status-dot"></i>自动闭环</span>
          <span>MQTT 实时遥测</span>
          <span>PAC 配药箱液位正常</span>
        </template>
        <template v-else>
          <span><i class="status-dot"></i>DO-PI / PID 自动闭环</span>
          <span>MQTT 实时遥测</span>
          <span>实时数据由设备组定义</span>
        </template>
      </div>
    </header>

    <aside class="left-stack">
      <template v-if="activeScene === 'dosing'">
        <DecorativePanel class="panel sensor-data-panel dosing-sensor-data-panel" title="传感器实时数据">
          <SensorRealtimeBars
            :items="activeSensorItems"
            aria-label="实时监控数据"
          />
        </DecorativePanel>

        <DecorativePanel class="panel trend-panel" title="实时趋势分析">
          <RealtimeTrendChart :data="activeTrendDisplay" />
        </DecorativePanel>
      </template>

      <template v-else>
        <DecorativePanel class="panel sensor-data-panel" title="传感器实时数据">
          <SensorRealtimeBars
            :items="activeSensorItems"
            aria-label="实时监控数据"
          />
        </DecorativePanel>

        <DecorativePanel class="panel trend-panel" title="实时趋势分析">
          <RealtimeTrendChart :data="activeTrendDisplay" />
        </DecorativePanel>
      </template>
    </aside>

    <aside class="right-stack">
      <template v-if="activeScene === 'dosing'">
        <DecorativePanel class="panel pac-control-panel dosing-control-panel dual-device-control-panel" direction="left" title="设备控制">
        <section class="pac-control-card">
          <header class="pac-control-card__head">
            <div>
              <span class="device-code">PAC-01</span>
              <h2>PAC 计量泵</h2>
            </div>
            <div class="pump-switch-control">
              <span>{{ dosingControl.pumpRunning ? '开' : '关' }}</span>
              <button
                type="button"
                class="pump-switch"
                role="switch"
                :aria-checked="dosingControl.pumpRunning"
                :aria-label="dosingControl.pumpRunning ? '关闭PAC泵' : '开启PAC泵'"
                :class="{ 'is-checked': dosingControl.pumpRunning }"
                @click="togglePacPump"
              ><span aria-hidden="true"></span></button>
            </div>
          </header>

          <PumpFrequencyGauge
            :value="activeControlPumpPercent"
            :max="100"
            label="当前输出"
            unit="%"
            gauge-center-y="88%"
            gauge-radius="151%"
          />

          <div class="control-value-row">
            <span>输出设定</span>
            <strong>{{ dosingControl.pumpPercent }}<small>%</small></strong>
          </div>
          <input
            class="pump-range"
            type="range"
            min="0"
            max="100"
            step="1"
            :value="dosingControl.pumpPercent"
            :style="{ '--range-progress': `${dosingControl.pumpPercent}%` }"
            aria-label="PAC泵输出百分比"
            @input="handlePumpPercentInput"
          />
          <div class="range-scale" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>

          <section class="inlet-pump-control" aria-label="进水泵控制">
            <header class="inlet-pump-control__head">
              <div>
                <span class="device-code">PMP-IN-01</span>
                <h3>进水泵</h3>
              </div>
              <div class="pump-switch-control">
                <span>{{ dosingControl.inletPumpRunning ? '开' : '关' }}</span>
                <button
                  type="button"
                  class="pump-switch"
                  role="switch"
                  :aria-checked="dosingControl.inletPumpRunning"
                  :aria-label="dosingControl.inletPumpRunning ? '关闭进水泵' : '开启进水泵'"
                  :class="{ 'is-checked': dosingControl.inletPumpRunning }"
                  @click="toggleDosingInletPump"
                ><span aria-hidden="true"></span></button>
              </div>
            </header>
            <PumpFrequencyGauge
              :value="activeControlDosingInletPumpFrequency"
              :max="50"
              label="当前频率"
              unit="Hz"
              gauge-center-y="88%"
              gauge-radius="151%"
            />
            <div class="control-value-row control-value-row--inlet-pump">
              <span>频率设定</span>
              <strong>{{ dosingControl.inletPumpFrequency }}<small>Hz</small></strong>
            </div>
            <input
              class="pump-range inlet-pump-range"
              type="range"
              min="0"
              max="50"
              step="1"
              :value="dosingControl.inletPumpFrequency"
              :style="{ '--range-progress': `${dosingControl.inletPumpFrequency * 2}%` }"
              aria-label="进水泵频率"
              @input="handleDosingInletPumpFrequencyInput"
            />
            <div class="range-scale inlet-pump-scale" aria-hidden="true"><span>0 Hz</span><span>25 Hz</span><span>50 Hz</span></div>
          </section>

        </section>
        </DecorativePanel>

        <DecorativePanel class="panel target-control-panel dosing-target-control-panel dual-target-control-panel" direction="left" title="目标区间设置">
        <section class="target-control">
          <div class="target-control__value">
            <span>目标浊度范围</span>
            <strong>{{ dosingControl.targetMin }} - {{ dosingControl.targetMax }}<small>NTU</small></strong>
          </div>
          <div class="target-inputs">
            <label>
              <span>下限</span>
              <div><input type="number" min="0" max="80" step="1" :value="dosingControl.targetMin" @change="handleTargetInput('targetMin', $event)" /><b>NTU</b></div>
            </label>
            <label>
              <span>上限</span>
              <div><input type="number" min="0" max="80" step="1" :value="dosingControl.targetMax" @change="handleTargetInput('targetMax', $event)" /><b>NTU</b></div>
            </label>
          </div>
          <a-slider
            class="target-range-slider"
            range
            :min="0"
            :max="80"
            :step="1"
            :value="[dosingControl.targetMin, dosingControl.targetMax]"
            aria-label="目标浊度范围"
            @change="handleTargetRangeChange"
          />
          <div class="target-scale__labels" aria-hidden="true"><span>0</span><span>40</span><span>80 NTU</span></div>
        </section>
        </DecorativePanel>
      </template>

      <template v-else>
        <DecorativePanel class="panel pac-control-panel aeration-control-panel dual-device-control-panel" direction="left" title="设备控制">
          <section class="pac-control-card">
            <header class="pac-control-card__head">
              <div>
                <span class="device-code">BLW-01</span>
                <h2>曝气风机</h2>
              </div>
              <div class="pump-switch-control">
                <span>{{ aerationControl.blowerRunning ? '开' : '关' }}</span>
                <button
                  type="button"
                  class="pump-switch"
                  role="switch"
                  :aria-checked="aerationControl.blowerRunning"
                  :aria-label="aerationControl.blowerRunning ? '关闭曝气风机' : '开启曝气风机'"
                  :class="{ 'is-checked': aerationControl.blowerRunning }"
                  @click="toggleAerationBlower"
                ><span aria-hidden="true"></span></button>
              </div>
            </header>

            <PumpFrequencyGauge
              :value="activeControlBlowerPercent"
              :max="100"
              label="当前输出"
              unit="%"
              gauge-center-y="88%"
              gauge-radius="151%"
            />

            <div class="control-value-row">
              <span>输出设定</span>
              <strong>{{ aerationControl.blowerPercent }}<small>%</small></strong>
            </div>
            <input
              class="pump-range"
              type="range"
              min="0"
              max="100"
              step="1"
              :value="aerationControl.blowerPercent"
              :style="{ '--range-progress': `${aerationControl.blowerPercent}%` }"
              aria-label="曝气风机输出百分比"
              @input="handleBlowerPercentInput"
            />
            <div class="range-scale" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>

            <section class="inlet-pump-control" aria-label="进水泵控制">
              <header class="inlet-pump-control__head">
                <div>
                  <span class="device-code">PMP-IN-01</span>
                  <h3>进水泵</h3>
                </div>
                <div class="pump-switch-control">
                  <span>{{ aerationControl.inletPumpRunning ? '开' : '关' }}</span>
                  <button
                    type="button"
                    class="pump-switch"
                    role="switch"
                    :aria-checked="aerationControl.inletPumpRunning"
                    :aria-label="aerationControl.inletPumpRunning ? '关闭进水泵' : '开启进水泵'"
                    :class="{ 'is-checked': aerationControl.inletPumpRunning }"
                    @click="toggleAerationInletPump"
                  ><span aria-hidden="true"></span></button>
                </div>
              </header>
              <PumpFrequencyGauge
                :value="activeControlInletPumpFrequency"
                :max="50"
                label="当前频率"
                unit="Hz"
                gauge-center-y="88%"
                gauge-radius="151%"
              />
              <div class="control-value-row control-value-row--inlet-pump">
                <span>频率设定</span>
                <strong>{{ aerationControl.inletPumpFrequency }}<small>Hz</small></strong>
              </div>
              <input
                class="pump-range inlet-pump-range"
                type="range"
                min="0"
                max="50"
                step="1"
                :value="aerationControl.inletPumpFrequency"
                :style="{ '--range-progress': `${aerationControl.inletPumpFrequency * 2}%` }"
                aria-label="进水泵频率"
                @input="handleInletPumpFrequencyInput"
              />
              <div class="range-scale inlet-pump-scale" aria-hidden="true"><span>0 Hz</span><span>25 Hz</span><span>50 Hz</span></div>
            </section>
          </section>
        </DecorativePanel>

        <DecorativePanel class="panel target-control-panel aeration-target-control-panel dual-target-control-panel" direction="left" title="目标区间设置">
          <section class="target-control">
            <div class="target-control__value">
              <span>DO目标范围</span>
              <strong>{{ aerationControl.targetMin }} - {{ aerationControl.targetMax }}</strong>
            </div>
            <div class="target-inputs target-inputs--unitless">
              <label>
                <span>下限</span>
                <div><input type="number" min="0" max="10" step="0.1" :value="aerationControl.targetMin" @change="handleAerationTargetInput('targetMin', $event)" /></div>
              </label>
              <label>
                <span>上限</span>
                <div><input type="number" min="0" max="10" step="0.1" :value="aerationControl.targetMax" @change="handleAerationTargetInput('targetMax', $event)" /></div>
              </label>
            </div>
            <a-slider
              class="target-range-slider"
              range
              :min="0"
              :max="10"
              :step="0.1"
              :value="[aerationControl.targetMin, aerationControl.targetMax]"
              aria-label="DO目标范围"
              @change="handleAerationTargetRangeChange"
            />
            <div class="target-scale__labels" aria-hidden="true"><span>0</span><span>5</span><span>10</span></div>
          </section>
        </DecorativePanel>
      </template>
    </aside>
  </section>
</template>

<script setup>
import { Slider as ASlider } from 'ant-design-vue';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { getBigWaterChannelAlarmNotificationTopic } from '../api/alarm.js';
import { getRealtimeGroupDevices } from '../api/realtime.js';
import DecorativePanel from '../components/common/DecorativePanel.vue';
import AerationProcess from '../components/realtime/AerationProcess.vue';
import FiveStageDosingProcess from '../components/realtime/FiveStageDosingProcess.vue';
import PumpFrequencyGauge from '../components/realtime/PumpFrequencyGauge.vue';
import RealtimeTrendChart from '../components/realtime/RealtimeTrendChart.vue';
import SensorRealtimeBars from '../components/realtime/SensorRealtimeBars.vue';
import SmartWaterFlumePreview from '../components/realtime/smart-water-flume-preview/SmartWaterFlumePreview.vue';
import { PROTOTYPE_ACCESS_TOKEN } from '../constants/auth.js';
import { VIEW_ACTIONS } from '../data/monitoring-data.js';
import { getWebTopoSceneConfig } from '../config/webTopoConfig.js';
import { getToken } from '../utils/auth.js';

const props = defineProps({
  monitoringScene: { type: String, default: 'dosing' },
  sceneTarget: { type: Object, default: null },
  prototypeData: { type: Object, default: null },
});

const emit = defineEmits([
  'pump-control-change',
  'dosing-inlet-pump-control-change',
  'target-range-change',
  'blower-control-change',
  'inlet-pump-control-change',
  'aeration-target-range-change',
  'realtime-data',
]);
const previewRef = ref(null);
const showProcessPrototype = ref(false);
const alarmNotificationTopic = ref('');
const activeScene = computed(() => props.monitoringScene === 'aeration' ? 'aeration' : 'dosing');
const activeSceneConfig = computed(() => getWebTopoSceneConfig(activeScene.value));
const sceneDevices = ref([]);
const sceneTelemetry = reactive({ dosing: {}, aeration: {} });

const MAX_TREND_POINTS = 60;

const dosingControl = reactive({
  inletPumpFrequency: 38,
  inletPumpRunning: true,
  pumpPercent: 48,
  pumpRunning: true,
  targetMin: 10,
  targetMax: 20,
});

const aerationControl = reactive({
  inletPumpFrequency: 42,
  inletPumpRunning: true,
  blowerPercent: 54,
  blowerRunning: true,
  targetMin: 0,
  targetMax: 2,
});

const mqttTrend = reactive({
  dosing: { times: [], values: {} },
  aeration: { times: [], values: {} },
});

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

const realtimeDisplay = computed(() => {
  const source = sceneTelemetry.dosing;
  return {
    inletPumpFrequency: Math.min(50, Math.max(0, finiteNumber(source.inletPumpFrequency, 0))),
    inletPumpRunning: source.inletPumpRunning === true,
    rawWaterPh: Math.min(14, Math.max(0, finiteNumber(source.rawWaterPh, 0))),
    inletFlow: Math.min(180, Math.max(0, finiteNumber(source.inletFlow, 0))),
    preTurbidity: finiteNumber(source.preTurbidity, 0),
    postTurbidity: finiteNumber(source.postTurbidity, 0),
    pacDose: Math.min(72, Math.max(0, finiteNumber(source.pacDose, 0))),
    pumpFlow: Math.min(420, Math.max(0, finiteNumber(source.pumpFlow, 0))),
    pumpPercent: Math.min(100, Math.max(0, finiteNumber(source.pumpPercent, finiteNumber(source.pumpFlow, 0) / 10))),
    pumpRunning: typeof source.pumpRunning === 'boolean' ? source.pumpRunning : finiteNumber(source.pumpFlow, 0) > 0,
  };
});

const aerationDisplay = computed(() => {
  const source = sceneTelemetry.aeration;
  return {
    inletPumpFrequency: Math.min(50, Math.max(0, finiteNumber(source.inletPumpFrequency, 0))),
    inletPumpRunning: source.inletPumpRunning === true,
    doValue: Math.min(10, Math.max(0, finiteNumber(source.doValue, 0))),
    airFlow: Math.min(40, Math.max(0, finiteNumber(source.airFlow, source.inletFlow))),
    blowerPercent: Math.min(100, Math.max(0, finiteNumber(source.blowerPercent, finiteNumber(source.blowerHz, 0) * 2))),
    blowerRunning: typeof source.blowerRunning === 'boolean' ? source.blowerRunning : finiteNumber(source.blowerHz, 0) > 0,
  };
});

const activePumpPercent = computed(() => (
  realtimeDisplay.value.pumpRunning ? realtimeDisplay.value.pumpPercent : 0
));
const activeDosingInletPumpFrequency = computed(() => (
  realtimeDisplay.value.inletPumpRunning ? realtimeDisplay.value.inletPumpFrequency : 0
));
const activeBlowerPercent = computed(() => (
  aerationDisplay.value.blowerRunning ? aerationDisplay.value.blowerPercent : 0
));
const activeInletPumpFrequency = computed(() => (
  aerationDisplay.value.inletPumpRunning ? aerationDisplay.value.inletPumpFrequency : 0
));
const activeControlPumpPercent = computed(() => (
  dosingControl.pumpRunning ? dosingControl.pumpPercent : 0
));
const activeControlDosingInletPumpFrequency = computed(() => (
  dosingControl.inletPumpRunning ? dosingControl.inletPumpFrequency : 0
));
const activeControlBlowerPercent = computed(() => (
  aerationControl.blowerRunning ? aerationControl.blowerPercent : 0
));
const activeControlInletPumpFrequency = computed(() => (
  aerationControl.inletPumpRunning ? aerationControl.inletPumpFrequency : 0
));

const activeSensorItems = computed(() => sceneDevices.value
  .filter((device) => device?.viewField && Number.isFinite(Number(device.displayMax)))
  .map((device) => ({
    key: device.viewField,
    label: device.label || device.deviceName || device.viewField,
    value: finiteNumber(sceneTelemetry[activeScene.value][device.viewField], 0),
    max: Number(device.displayMax),
    unit: device.unit || '',
    precision: Number(device.displayPrecision) || 0,
    color: device.displayColor,
  })));

const activeTrendDevices = computed(() => sceneDevices.value
  .filter((device) => device?.trendEnabled && device?.viewField));

const activeTrendDisplay = computed(() => ({
  times: mqttTrend[activeScene.value].times,
  series: activeTrendDevices.value.map((device) => ({
    ...device,
    values: mqttTrend[activeScene.value].values[device.viewField] || [],
  })),
}));

function updatePacPump(patch) {
  Object.assign(dosingControl, patch);
  publishPacPumpCommand();
  emit('pump-control-change', patch);
}

function publishPacPumpCommand() {
  const mlh = dosingControl.pumpRunning
    ? Math.round(dosingControl.pumpPercent * 4.2 * 10) / 10
    : 0;
  previewRef.value?.publishMqttCommand('pacPlc', { action: 'mode', mode: 'manual' });
  previewRef.value?.publishMqttCommand('pacPump', { action: 'manual', mlh });
}

function togglePacPump() {
  updatePacPump({ pumpRunning: !dosingControl.pumpRunning });
}

function handlePumpPercentInput(event) {
  updatePacPump({ pumpPercent: finiteNumber(event.target?.value, dosingControl.pumpPercent) });
}

function updateDosingInletPump(patch) {
  Object.assign(dosingControl, patch);
  publishDosingInletPumpCommand();
  emit('dosing-inlet-pump-control-change', patch);
}

function publishDosingInletPumpCommand() {
  previewRef.value?.publishMqttCommand('inletPump', {
    action: 'configure',
    running: dosingControl.inletPumpRunning,
    frequency: dosingControl.inletPumpFrequency,
  });
}

function toggleDosingInletPump() {
  updateDosingInletPump({ inletPumpRunning: !dosingControl.inletPumpRunning });
}

function handleDosingInletPumpFrequencyInput(event) {
  const inletPumpFrequency = Math.min(50, Math.max(0, finiteNumber(event.target?.value, dosingControl.inletPumpFrequency)));
  updateDosingInletPump({ inletPumpFrequency });
}

function updateTargetRange(patch) {
  Object.assign(dosingControl, patch);
  emit('target-range-change', patch);
}

function handleTargetInput(field, event) {
  const value = Math.min(80, Math.max(0, finiteNumber(event.target?.value, dosingControl[field])));
  const patch = field === 'targetMin'
    ? { targetMin: Math.min(value, dosingControl.targetMax) }
    : { targetMax: Math.max(value, dosingControl.targetMin) };
  updateTargetRange(patch);
}

function handleTargetRangeChange(values) {
  updateTargetRange({ targetMin: values[0], targetMax: values[1] });
}

function updateAerationBlower(patch) {
  Object.assign(aerationControl, patch);
  publishAerationBlowerCommand();
  emit('blower-control-change', patch);
}

function publishAerationBlowerCommand() {
  const manualHz = aerationControl.blowerRunning
    ? Math.round(aerationControl.blowerPercent / 2 * 10) / 10
    : 0;
  previewRef.value?.publishMqttCommand('blower', {
    action: 'configure',
    mode: 'manual',
    manual_hz: manualHz,
  });
}

function toggleAerationBlower() {
  updateAerationBlower({ blowerRunning: !aerationControl.blowerRunning });
}

function handleBlowerPercentInput(event) {
  updateAerationBlower({ blowerPercent: finiteNumber(event.target?.value, aerationControl.blowerPercent) });
}

function updateAerationInletPump(patch) {
  Object.assign(aerationControl, patch);
  publishAerationInletPumpCommand();
  emit('inlet-pump-control-change', patch);
}

function publishAerationInletPumpCommand() {
  previewRef.value?.publishMqttCommand('inletPump', {
    action: 'configure',
    running: aerationControl.inletPumpRunning,
    frequency: aerationControl.inletPumpFrequency,
  });
}

function toggleAerationInletPump() {
  updateAerationInletPump({ inletPumpRunning: !aerationControl.inletPumpRunning });
}

function handleInletPumpFrequencyInput(event) {
  const inletPumpFrequency = Math.min(50, Math.max(0, finiteNumber(event.target?.value, aerationControl.inletPumpFrequency)));
  updateAerationInletPump({ inletPumpFrequency });
}

function updateAerationTargetRange(patch) {
  Object.assign(aerationControl, patch);
  emit('aeration-target-range-change', patch);
}

function handleAerationTargetInput(field, event) {
  const rawValue = Math.min(10, Math.max(0, finiteNumber(event.target?.value, aerationControl[field])));
  const value = Math.round(rawValue * 10) / 10;
  const patch = field === 'targetMin'
    ? { targetMin: Math.min(value, aerationControl.targetMax) }
    : { targetMax: Math.max(value, aerationControl.targetMin) };
  updateAerationTargetRange(patch);
}

function handleAerationTargetRangeChange(values) {
  updateAerationTargetRange({ targetMin: values[0], targetMax: values[1] });
}

function flattenRealtimeDevices(groups) {
  return groups.flatMap((group) => Array.isArray(group?.data) ? group.data : []);
}

async function loadRealtimeDevices() {
  try {
    const groups = await getRealtimeGroupDevices(activeSceneConfig.value.deviceGroupId);
    sceneDevices.value = flattenRealtimeDevices(groups);
  } catch (error) {
    sceneDevices.value = [];
    console.error('获取实时设备映射失败', error);
  }
}

function trendNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatMqttTime(payload) {
  const timestamp = Number(payload?.timestamp);
  const date = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function appendMqttTrend(scene, payload) {
  const trendDevices = activeTrendDevices.value;
  if (!trendDevices.length) return;
  const target = mqttTrend[scene];
  target.times.push(formatMqttTime(payload));
  trendDevices.forEach((device) => {
    const field = device.viewField;
    if (!target.values[field]) target.values[field] = [];
    target.values[field].push(trendNumber(sceneTelemetry[scene][field]));
  });
  if (target.times.length <= MAX_TREND_POINTS) return;
  target.times.shift();
  trendDevices.forEach((device) => target.values[device.viewField]?.shift());
}

function resetMqttData(scene) {
  Object.keys(sceneTelemetry[scene]).forEach((field) => delete sceneTelemetry[scene][field]);
  mqttTrend[scene].times.splice(0);
  Object.keys(mqttTrend[scene].values).forEach((field) => delete mqttTrend[scene].values[field]);
}

function handleMqttData(message) {
  const payload = message?.payload ?? message;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
  let hasTelemetryUpdate = false;

  const tagCounts = sceneDevices.value.reduce((counts, device) => {
    const tag = device?.tag;
    if (tag) counts.set(tag, (counts.get(tag) || 0) + 1);
    return counts;
  }, new Map());

  sceneDevices.value.forEach((device) => {
    const preciseTag = device?.deviceSn && device?.tag ? `${device.deviceSn}:${device.tag}` : '';
    const hasPreciseValue = preciseTag && Object.prototype.hasOwnProperty.call(payload || {}, preciseTag);
    // 同名 tag 必须使用设备编号限定，避免不同设备的测点覆盖彼此。
    const hasUniqueTagValue = device?.tag
      && tagCounts.get(device.tag) === 1
      && Object.prototype.hasOwnProperty.call(payload, device.tag);
    if (device?.viewField && (hasPreciseValue || hasUniqueTagValue)) {
      sceneTelemetry[activeScene.value][device.viewField] = hasPreciseValue
        ? payload[preciseTag]
        : payload[device.tag];
      hasTelemetryUpdate = true;
    }
  });
  if (hasTelemetryUpdate) appendMqttTrend(activeScene.value, payload);
  emit('realtime-data', payload);
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
  if (getToken() === PROTOTYPE_ACCESS_TOKEN) {
    alarmNotificationTopic.value = '';
    return;
  }
  try {
    alarmNotificationTopic.value = await getBigWaterChannelAlarmNotificationTopic();
  } catch (error) {
    console.error('获取告警通知主题失败', error);
  }
}

watch(() => props.sceneTarget, async (target) => {
  const channelName = typeof target?.channelName === 'string' ? target.channelName.trim() : '';
  if (!channelName || showProcessPrototype.value) return;
  await nextTick();
  previewRef.value?.focusSceneTreeGroupByName(channelName);
});

watch(activeSceneConfig, () => {
  sceneDevices.value = [];
  resetMqttData(activeScene.value);
  void loadRealtimeDevices();
}, { immediate: true });

onMounted(() => {
  void loadAlarmNotificationTopic();
});
</script>

<style scoped>
.page-realtime {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
}

.scene-stage {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.scene-stage > :deep(.process-wrap) { width: 100%; }
.scene-stage > :deep(.flume-preview) { position: absolute; inset: 0; }

.preview-console {
  position: absolute;
  top: 18px;
  left: 50%;
  z-index: 6;
  display: flex;
  width: min(720px, calc(100% - 760px));
  min-width: 450px;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  transform: translateX(-50%);
}

.preview-title { display: flex; min-height: 38px; align-items: center; justify-content: center; color: #fff; }
.preview-title h1 { margin: 0; padding: 0 10px; color: #fff; font-family: 'SimHei', 'Microsoft YaHei', sans-serif; font-size: 30px; font-weight: normal; line-height: 38px; text-shadow: 0 0 13px rgba(64, 195, 255, 0.42); white-space: nowrap; }
.preview-title__arrow { display: block; width: 53px; height: 36px; flex: 0 0 53px; background: url('../assets/preview-title.png') center / 100% 100% no-repeat; }
.preview-title__arrow--right { transform: scaleX(-1); }
.preview-actions { display: flex; width: max-content; max-width: 100%; height: 48px; align-items: center; justify-content: center; gap: 2px; padding: 0 24px; background: url('../assets/preview-actions.png') center / 100% 100% no-repeat; pointer-events: auto; }
.preview-actions button { position: relative; height: 32px; padding: 0 9px; border: 0; border-radius: 0; background: transparent; box-shadow: none; color: #caeaff; font-size: 13px; line-height: 32px; white-space: nowrap; }
.preview-actions button:hover, .preview-actions button:focus-visible { outline: 0; background: transparent; box-shadow: none; color: #28d9ff; }
.preview-actions button:hover::after, .preview-actions button:focus-visible::after { position: absolute; bottom: 0; left: 50%; width: 0; height: 0; border-top: 5px solid #28d9ff; border-right: 4px solid transparent; border-left: 4px solid transparent; content: ''; transform: translateX(-50%); }

.process-status { display: flex; height: 36px; align-items: center; justify-content: center; margin-top: 7px; padding: 0 20px; border: 1px solid rgba(54, 160, 219, 0.28); background: rgba(3, 36, 64, 0.72); color: #a9c9de; font-size: 11px; }
.process-status span { display: inline-flex; align-items: center; padding: 0 14px; white-space: nowrap; }
.process-status span + span { border-left: 1px solid rgba(76, 148, 191, 0.28); }
.status-dot { width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; background: #4be49d; box-shadow: 0 0 7px rgba(75, 228, 157, 0.84); }

.left-stack,
.right-stack { position: absolute; z-index: 5; top: 22px; bottom: 18px; display: flex; min-height: 0; flex-direction: column; gap: 10px; }
.left-stack {
  --stack-width: clamp(300px, 19vw, 370px);
  left: 0;
  width: var(--stack-width);
  min-width: var(--stack-width);
  max-width: var(--stack-width);
  flex: 0 0 var(--stack-width);
}
.right-stack {
  --stack-width: clamp(292px, 18vw, 352px);
  right: 0;
  width: var(--stack-width);
  min-width: var(--stack-width);
  max-width: var(--stack-width);
  flex: 0 0 var(--stack-width);
}
.panel { min-height: 0; background: rgba(1, 28, 55, 0.64); backdrop-filter: blur(3px); }
.turbidity-panel { flex: 0 0 28%; }
.pump-state-panel { flex: 0 0 25%; }
.sensor-data-panel { flex: 0 0 48%; }
.trend-panel { flex: 1 1 0; }
.turbidity-panel :deep(.decorative-panel__content),
.sensor-data-panel :deep(.decorative-panel__content),
.trend-panel :deep(.decorative-panel__content) { display: flex; min-height: 0; padding: 0 8px 7px; overflow: hidden; }
.pump-state-panel :deep(.decorative-panel__content) { display: flex; min-height: 0; flex-direction: column; padding: 0 8px 6px; overflow: hidden; }

.pump-state-head { display: flex; height: 30px; flex: 0 0 30px; align-items: center; justify-content: space-between; padding: 0 12px; border-bottom: 1px solid rgba(67, 143, 190, 0.2); }
.running-state { display: inline-flex; align-items: center; gap: 6px; color: #65e6a4; font-size: 11px; }
.running-state i { width: 7px; height: 7px; border-radius: 50%; background: #54df9c; box-shadow: 0 0 6px rgba(84, 223, 156, 0.74); }
.running-state.stopped { color: #ff8a81; }
.running-state.stopped i { background: #ff6e66; box-shadow: 0 0 6px rgba(255, 110, 102, 0.74); }
.pump-state-head > strong { color: #ffd268; font-size: 21px; font-weight: 700; }
.pump-state-head small { margin-left: 2px; color: #a9c9de; font-size: 11px; }

.pac-control-panel { flex: 1 1 0; }
.pac-control-panel :deep(.decorative-panel__content) { padding: 8px 14px 12px; overflow: hidden; }
.pac-control-card { display: flex; height: 100%; min-height: 0; flex-direction: column; }
.pac-control-card__head { display: flex; align-items: center; justify-content: space-between; padding: 8px 4px 14px; border-bottom: 1px solid rgba(70, 171, 228, 0.3); }
.device-code { color: #63dfff; font-size: 11px; }
.pac-control-card__head h2 { margin: 3px 0 0; padding: 0; color: #f2fbff; font-size: 18px; font-weight: 600; }
.pump-switch-control { display: inline-flex; align-items: center; gap: 7px; color: #cde8f7; font-size: 12px; }
.pump-switch { position: relative; width: 40px; height: 22px; padding: 0; border: 1px solid rgba(121, 158, 182, 0.72); border-radius: 11px; outline: 0; background: rgba(63, 83, 101, 0.78); cursor: pointer; }
.pump-switch > span { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #c7d4dc; transition: transform 0.2s ease; }
.pump-switch.is-checked { border-color: #4adce7; background: rgba(10, 156, 176, 0.82); box-shadow: 0 0 8px rgba(5, 252, 253, 0.35); }
.pump-switch.is-checked > span { transform: translateX(18px); background: #fff; }
.pump-switch:focus-visible { box-shadow: 0 0 0 2px rgba(100, 222, 255, 0.38); }

.pac-control-card :deep(.pump-frequency-gauge) { height: 180px; margin-top: 18px; flex: 0 0 180px; }
.control-value-row { display: flex; align-items: baseline; justify-content: space-between; margin: 6px 8px 3px; color: #8fb4cd; font-size: 12px; }
.control-value-row strong { color: #ffd268; font-size: 26px; }
.control-value-row small { margin-left: 2px; color: #d7e9f6; font-size: 12px; }

.pump-range { width: calc(100% - 16px); height: 18px; margin: 10px 8px 4px; appearance: none; outline: 0; background: transparent; }
.pump-range::-webkit-slider-runnable-track { height: 7px; border: 1px solid #0b9dcc; border-radius: 4px; background: linear-gradient(90deg, #30c6ec 0%, #087ebc var(--range-progress), rgba(3, 45, 78, 0.92) var(--range-progress), rgba(3, 45, 78, 0.92) 100%); }
.pump-range::-webkit-slider-thumb { width: 17px; height: 17px; margin-top: -6px; appearance: none; border: 2px solid #c5f4ff; border-radius: 50%; background: #57c9ef; box-shadow: 0 0 7px rgba(75, 201, 255, 0.8); }
.pump-range::-moz-range-track { height: 7px; border: 1px solid #0b9dcc; border-radius: 4px; background: linear-gradient(90deg, #30c6ec 0%, #087ebc var(--range-progress), rgba(3, 45, 78, 0.92) var(--range-progress), rgba(3, 45, 78, 0.92) 100%); }
.pump-range::-moz-range-thumb { width: 15px; height: 15px; border: 2px solid #c5f4ff; border-radius: 50%; background: #57c9ef; box-shadow: 0 0 7px rgba(75, 201, 255, 0.8); }
.range-scale { display: flex; justify-content: space-between; margin: 0 8px 18px; color: #62849d; font-size: 9px; }

.inlet-pump-control { margin-top: 8px; border-top: 1px solid rgba(70, 171, 228, 0.3); padding: 12px 4px 0; }
.inlet-pump-control__head { display: flex; align-items: center; justify-content: space-between; }
.inlet-pump-control__head h3 { margin: 3px 0 0; color: #f2fbff; font-size: 15px; font-weight: 600; }
.control-value-row--inlet-pump { margin-top: 8px; }
.control-value-row--inlet-pump strong { font-size: 22px; }
.inlet-pump-range { margin-top: 5px; }
.inlet-pump-scale { margin-bottom: 0; }

.dual-device-control-panel :deep(.decorative-panel__content) { padding: 5px 14px 6px; }
.dual-device-control-panel .pac-control-card__head { padding: 2px 4px 4px; }
.dual-device-control-panel .pac-control-card__head h2 { margin-top: 0; font-size: 16px; }
.dual-device-control-panel :deep(.pump-frequency-gauge) {
  height: clamp(112px, calc(100vh - 772px), 150px);
  margin-top: 0;
  flex: 0 0 clamp(112px, calc(100vh - 772px), 150px);
}
.dual-device-control-panel .control-value-row { margin-top: 0; line-height: 1; }
.dual-device-control-panel .pump-range { margin-top: 1px; margin-bottom: 1px; }
.dual-device-control-panel .range-scale { margin-bottom: 6px; }
.dual-device-control-panel .inlet-pump-control { margin-top: 0; padding-top: 4px; }
.dual-device-control-panel .inlet-pump-control__head h3 { margin-top: 0; font-size: 14px; }
.dual-device-control-panel .control-value-row--inlet-pump { margin-top: 0; }
.dual-device-control-panel .inlet-pump-scale { margin-bottom: 0; }

.control-summary { display: grid; gap: 1px; margin-top: 4px; border: 1px solid rgba(71, 151, 200, 0.25); background: rgba(2, 31, 55, 0.58); }
.control-summary div { display: flex; height: 40px; align-items: center; justify-content: space-between; padding: 0 12px; }
.control-summary div + div { border-top: 1px solid rgba(71, 151, 200, 0.18); }
.control-summary span { color: #8fb4cd; font-size: 11px; }
.control-summary strong { color: #5fe4a2; font-size: 12px; }
.control-summary strong.stopped { color: #ff8a81; }

.target-control-panel { flex: 0 0 230px; }
.dual-target-control-panel { flex-basis: max(190px, calc(100vh - 732px)); margin-bottom: 0; }
.target-control-panel :deep(.decorative-panel__content) { padding: 5px 14px 10px; overflow: hidden; }
.target-control { display: flex; height: 100%; min-height: 0; flex-direction: column; }
.target-control__value { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
.target-control__value > span { color: #8fb4cd; font-size: 11px; }
.target-control__value strong { color: #64e5a8; font-size: 21px; }
.target-control__value small { margin-left: 4px; color: #a9c9de; font-size: 10px; }
.target-inputs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.target-inputs label { display: grid; gap: 5px; min-width: 0; }
.target-inputs label > span { color: #789bb5; font-size: 10px; }
.target-inputs label > div { display: flex; min-width: 0; height: 34px; align-items: center; border: 1px solid rgba(73, 175, 232, 0.55); background: rgba(3, 43, 76, 0.88); }
.target-inputs input { width: 100%; min-width: 0; height: 100%; padding: 0 5px 0 9px; border: 0; outline: 0; background: transparent; color: #effaff; font-size: 14px; }
.target-inputs--unitless input { padding-right: 9px; }
.target-inputs b { padding-right: 7px; color: #789bb5; font-size: 9px; font-weight: 500; }
.target-range-slider { margin: 12px 6px 0; }
.target-range-slider :deep(.ant-slider-rail) { height: 7px; background: rgba(32, 75, 105, 0.82); }
.target-range-slider :deep(.ant-slider-track) { height: 7px; background: #52dfa2; box-shadow: 0 0 8px rgba(82, 223, 162, 0.55); }
.target-range-slider :deep(.ant-slider-handle) { width: 16px; height: 16px; margin-top: -1px; }
.target-range-slider :deep(.ant-slider-handle::after) { width: 16px; height: 16px; box-shadow: 0 0 0 2px #b9ffe0, 0 0 8px rgba(82, 223, 162, 0.78); }
.target-range-slider :deep(.ant-slider-handle:hover::after),
.target-range-slider :deep(.ant-slider-handle:focus::after) { box-shadow: 0 0 0 3px #d9ffec, 0 0 10px rgba(82, 223, 162, 0.9); }
.target-scale__labels { display: flex; justify-content: space-between; margin-top: 4px; color: #62849d; font-size: 9px; }
.prototype-note { margin: auto 2px 0; padding-top: 6px; color: #65859e; font-size: 9px; text-align: center; }

.dual-target-control-panel :deep(.decorative-panel__content) { padding: 8px 14px 12px; }
.dual-target-control-panel .target-control__value { margin-bottom: 10px; }
.dual-target-control-panel .target-inputs label { gap: 5px; }
.dual-target-control-panel .target-inputs label > div { height: 34px; }
.dual-target-control-panel .target-range-slider { margin: 12px 8px 0; }
.dual-target-control-panel .target-scale__labels { margin-top: 5px; }
.dual-target-control-panel .target-control { justify-content: center; }

@media (max-width: 1500px) {
  .left-stack { --stack-width: 300px; }
  .right-stack { --stack-width: 290px; }
  .preview-console { width: calc(100% - 660px); min-width: 430px; }
  .preview-title h1 { font-size: 26px; }
  .preview-actions button { padding: 0 5px; font-size: 11px; }
  .process-status span { padding: 0 8px; }
}

@media (max-height: 820px) {
  .turbidity-panel { flex-basis: 27%; }
  .pump-state-panel { flex-basis: 24%; }
  .sensor-data-panel { flex-basis: 46%; }
  .pac-control-card__head { padding-top: 4px; padding-bottom: 8px; }
  .pac-control-card :deep(.pump-frequency-gauge) { height: 115px; margin-top: 2px; flex-basis: 115px; }
  .control-value-row { margin-top: 2px; }
  .pump-range { margin-top: 4px; }
  .range-scale { margin-bottom: 8px; }
  .control-summary div { height: 28px; }
  .inlet-pump-control { margin-top: 3px; padding-top: 7px; }
  .control-value-row--inlet-pump { margin-top: 3px; }
  .inlet-pump-range { margin-top: 2px; margin-bottom: 1px; }
  .target-control-panel { flex-basis: 196px; }
  .dual-device-control-panel :deep(.decorative-panel__content) { padding: 1px 14px 2px; }
  .dual-device-control-panel :deep(.pump-frequency-gauge) { height: 112px; margin-top: -4px; flex-basis: 112px; }
  .dual-device-control-panel .pac-control-card__head { padding: 0 4px 2px; }
  .dual-device-control-panel .range-scale { margin-bottom: 0; }
  .dual-device-control-panel .inlet-pump-control { padding-top: 2px; }
  .dual-target-control-panel { flex-basis: 136px; margin-bottom: 0; }
  .dual-target-control-panel :deep(.decorative-panel__content) { padding: 2px 14px 0; }
  .dual-target-control-panel .target-control__value { margin-bottom: 2px; }
  .dual-target-control-panel .target-inputs label { gap: 2px; }
  .dual-target-control-panel .target-inputs label > div { height: 28px; }
  .dual-target-control-panel .target-range-slider { margin-top: 2px; }
  .dual-target-control-panel .target-scale__labels { margin-top: 2px; }
  .dual-target-control-panel .target-control { justify-content: flex-start; }
  .target-control__value { margin-bottom: 7px; }
  .target-range-slider { margin-top: 6px; }
  .prototype-note { padding-top: 3px; }
}
</style>
