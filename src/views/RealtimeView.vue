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
        @mqtt-connection="handleMqttConnectionChange"
        @alarm-notification="handleAlarmNotification"
      />
    </div>

    <header class="preview-console">
<!--      <div class="preview-title">-->
<!--        <span class="preview-title__arrow preview-title__arrow&#45;&#45;left" aria-hidden="true"></span>-->
<!--        <h1>三维工艺实时监控</h1>-->
<!--        <span class="preview-title__arrow preview-title__arrow&#45;&#45;right" aria-hidden="true"></span>-->
<!--      </div>-->
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
          <span :class="['process-status__item', `is-${dosingProcessStatus.tone}`]"><i class="status-dot"></i>{{ dosingProcessStatus.label }}</span>
          <span :class="['process-status__item', `is-${mqttTelemetryStatus.tone}`]"><i class="status-dot"></i>{{ mqttTelemetryStatus.label }}</span>
        </template>
        <template v-else>
          <span :class="['process-status__item', `is-${aerationProcessStatus.tone}`]"><i class="status-dot"></i>{{ aerationProcessStatus.label }}</span>
          <span :class="['process-status__item', `is-${aerationControlStatus.tone}`]"><i class="status-dot"></i>{{ aerationControlStatus.label }}</span>
          <span :class="['process-status__item', `is-${aerationBlowerStatus.tone}`]"><i class="status-dot"></i>{{ aerationBlowerStatus.label }}</span>
          <span :class="['process-status__item', `is-${mqttTelemetryStatus.tone}`]"><i class="status-dot"></i>{{ mqttTelemetryStatus.label }}</span>
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
          <PacRealtimeTrendChart
            :data="dosingTrendDisplay"
            :target-range="[dosingControl.targetMin, dosingControl.targetMax]"
          />
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
          <AerationRealtimeTrendChart
            :data="aerationTrendDisplay"
            :target-range="aerationTrendTargetRange"
          />
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
            <div class="inlet-pump-control__switches">
              <div class="auto-mode-switch-control">
                <span>自动投加</span>
                <button
                  type="button"
                  class="pump-switch"
                  role="switch"
                  :aria-checked="dosingControl.pacAutoMode"
                  :aria-label="dosingControl.pacAutoMode ? '退出PAC自动投加' : '进入PAC自动投加'"
                  :class="{ 'is-checked': dosingControl.pacAutoMode }"
                  @click="togglePacAutoMode"
                ><span aria-hidden="true"></span></button>
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
                :disabled="dosingControl.pacAutoMode"
                @click="togglePacPump"
              ><span aria-hidden="true"></span></button>
              </div>
            </div>
          </header>

          <PumpFrequencyGauge
            :value="activePumpFlow"
            :max="420"
            label="实时流量"
            unit="mL/h"
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
            :disabled="dosingControl.pacAutoMode"
            @input="handlePumpPercentInput"
          />
          <div class="range-scale" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>

          <section class="inlet-pump-control" aria-label="进水泵控制">
            <header class="inlet-pump-control__head">
              <div>
                <span class="device-code">PMP-IN-01</span>
                <h3>进水泵</h3>
              </div>
              <div class="inlet-pump-control__switches">
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
              </div>
            </header>
            <PumpFrequencyGauge
              :value="activeDosingInletPumpFrequency"
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
              <div class="inlet-pump-control__switches">
                <div class="auto-mode-switch-control">
                  <span>DO自动控制</span>
                  <button
                    type="button"
                    class="pump-switch"
                    role="switch"
                    :aria-checked="aerationControl.autoMode"
                    :aria-label="aerationControl.autoMode ? '退出DO自动控制' : '进入DO自动控制'"
                    :class="{ 'is-checked': aerationControl.autoMode }"
                    @click="toggleAerationAutoMode"
                  ><span aria-hidden="true"></span></button>
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
                    :disabled="aerationControl.autoMode"
                    @click="toggleAerationBlower"
                  ><span aria-hidden="true"></span></button>
                </div>
              </div>
            </header>

            <PumpFrequencyGauge
              :value="activeBlowerFrequency"
              :max="50"
              label="当前频率"
              unit="Hz"
              gauge-center-y="88%"
              gauge-radius="151%"
            />

            <div class="control-value-row">
              <span>频率设定</span>
              <strong>{{ aerationControl.blowerFrequency }}<small>Hz</small></strong>
            </div>
            <input
              class="pump-range"
              type="range"
              min="0"
              max="50"
              step="1"
            :value="aerationControl.blowerFrequency"
            :style="{ '--range-progress': `${aerationControl.blowerFrequency * 2}%` }"
            aria-label="曝气风机频率"
            :disabled="aerationControl.autoMode"
            @input="handleBlowerFrequencyInput"
            />
            <div class="range-scale" aria-hidden="true"><span>0 Hz</span><span>25 Hz</span><span>50 Hz</span></div>

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
                :value="activeInletPumpFrequency"
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
                <div><input type="number" min="0.5" max="4" step="0.1" :value="aerationControl.targetMin" @change="handleAerationTargetInput('targetMin', $event)" /></div>
              </label>
              <label>
                <span>上限</span>
                <div><input type="number" min="0.5" max="4" step="0.1" :value="aerationControl.targetMax" @change="handleAerationTargetInput('targetMax', $event)" /></div>
              </label>
            </div>
            <a-slider
              class="target-range-slider"
              range
              :min="0.5"
              :max="4"
              :step="0.1"
              :value="[aerationControl.targetMin, aerationControl.targetMax]"
              aria-label="DO目标范围"
              @change="handleAerationTargetRangeChange"
            />
            <div class="target-scale__labels" aria-hidden="true"><span>0.5</span><span>2</span><span>4 mg/L</span></div>
          </section>
        </DecorativePanel>
      </template>
    </aside>
  </section>
</template>

<script setup>
import { Slider as ASlider } from 'ant-design-vue';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { getBigWaterChannelAlarmNotificationTopic } from '../api/alarm.js';
import { getRealtimeGroupDevices, sendSimulationCommand } from '../api/realtime.js';
import DecorativePanel from '../components/common/DecorativePanel.vue';
import AerationProcess from '../components/realtime/AerationProcess.vue';
import FiveStageDosingProcess from '../components/realtime/FiveStageDosingProcess.vue';
import PacRealtimeTrendChart from '../components/realtime/PacRealtimeTrendChart.vue';
import PumpFrequencyGauge from '../components/realtime/PumpFrequencyGauge.vue';
import AerationRealtimeTrendChart from '../components/realtime/AerationRealtimeTrendChart.vue';
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
const MQTT_STALE_MS = 5000;
const mqttConnected = ref(false);
const lastMqttReceivedAt = ref(0);
const statusClock = ref(Date.now());
let statusClockTimer = null;

const dosingControl = reactive({
  inletPumpFrequency: 38,
  inletPumpRunning: true,
  pumpPercent: 48,
  pumpRunning: true,
  pacAutoMode: false,
  targetMin: 10,
  targetMax: 20,
});

const aerationControl = reactive({
  inletPumpFrequency: 42,
  inletPumpRunning: true,
  blowerFrequency: 27,
  blowerRunning: true,
  autoMode: true,
  targetMin: 0.5,
  targetMax: 2,
});

const lastDosingInletPumpFrequency = ref(dosingControl.inletPumpFrequency);
const lastAerationInletPumpFrequency = ref(aerationControl.inletPumpFrequency);
const simulationControlApiCodes = Object.freeze({
  dosing: Object.freeze({
    'inlet-pump-01': 'psim_cmd_inlet_pump',
    'pac-pump-01': 'psim_cmd_pump',
    'pac-plc-01': 'psim_cmd_plc',
  }),
  aeration: Object.freeze({
    'inlet-pump-01': 'asim_cmd_inlet_pump',
    'blower-01': 'asim_cmd_blower',
    'aeration-plc-01': 'asim_cmd_plc',
  }),
});
const simulationCommandQueues = new Map();

const mqttTrend = reactive({
  dosing: { times: [], values: {} },
  aeration: { times: [], values: {} },
});

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function booleanOrNull(value) {
  if (value === true || value === 1 || value === 'true' || value === '1') return true;
  if (value === false || value === 0 || value === 'false' || value === '0') return false;
  return null;
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
    pacAutoMode: booleanOrNull(source.pacAutoMode),
    pacTakeoverRequired: booleanOrNull(source.pacTakeoverRequired),
    pacOddInside: booleanOrNull(source.pacOddInside),
    pacCommFault: booleanOrNull(source.pacCommFault),
    pacLowLevel: booleanOrNull(source.pacLowLevel),
    targetMin: finiteNumber(source.dosingTargetMin, null),
    targetMax: finiteNumber(source.dosingTargetMax, null),
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
    mode: typeof source.aerationMode === 'string' ? source.aerationMode.trim().toLowerCase() : '',
    optimizing: booleanOrNull(source.aerationOptimizing),
    plcFault: booleanOrNull(source.aerationPlcFault),
    probeFault: booleanOrNull(source.aerationProbeFault),
    airFault: booleanOrNull(source.aerationAirFault),
    supervisorLevel: Math.max(0, finiteNumber(source.aerationSupervisorLevel, 0)),
    targetMin: finiteNumber(source.aerationTargetMin, null),
    targetMax: finiteNumber(source.aerationTargetMax, null),
    blowerHz: Math.min(50, Math.max(0, finiteNumber(source.blowerHz, 0))),
  };
});

const mqttTelemetryStatus = computed(() => {
  const elapsed = statusClock.value - lastMqttReceivedAt.value;
  if (!mqttConnected.value) return { tone: 'danger', label: 'MQTT 已断开' };
  if (!lastMqttReceivedAt.value) return { tone: 'warning', label: 'MQTT 等待遥测' };
  if (elapsed > MQTT_STALE_MS) return { tone: 'warning', label: 'MQTT 遥测超时' };
  return { tone: 'success', label: 'MQTT 实时遥测' };
});

const dosingProcessStatus = computed(() => {
  const telemetry = realtimeDisplay.value;
  if (telemetry.pacAutoMode === true) return { tone: 'success', label: '自动控制' };
  if (telemetry.pacAutoMode === false) return { tone: 'info', label: '手动控制' };
  return { tone: 'warning', label: '等待 PLC 状态' };
});

const aerationProcessStatus = computed(() => {
  const telemetry = aerationDisplay.value;
  if (telemetry.plcFault === true) return { tone: 'danger', label: '曝气 PLC 故障' };
  if (telemetry.probeFault === true) return { tone: 'danger', label: 'DO 探头故障' };
  if (telemetry.airFault === true) return { tone: 'warning', label: '曝气风量异常' };
  if (telemetry.supervisorLevel > 0) return { tone: 'warning', label: 'ODD安全接管中' };
  if (!telemetry.mode) return { tone: 'warning', label: '等待曝气设备状态' };
  return { tone: 'success', label: '曝气系统运行正常' };
});

const aerationControlStatus = computed(() => {
  const telemetry = aerationDisplay.value;
  if (telemetry.mode === 'optimize') return { tone: 'success', label: telemetry.optimizing === true ? 'DO自动寻优中' : 'DO自动控制' };
  if (telemetry.mode === 'fixed') return { tone: 'info', label: '固定DO控制' };
  if (telemetry.mode === 'manual') return { tone: 'info', label: '风机手动控制' };
  return { tone: 'warning', label: '等待曝气PLC状态' };
});

const aerationBlowerStatus = computed(() => {
  const telemetry = aerationDisplay.value;
  if (!telemetry.mode) return { tone: 'warning', label: '等待风机遥测' };
  if (!telemetry.blowerRunning) return { tone: 'warning', label: '曝气风机已停止' };
  return { tone: 'success', label: `风机运行 ${telemetry.blowerHz.toFixed(1)} Hz` };
});

const activePumpPercent = computed(() => (
  realtimeDisplay.value.pumpRunning ? realtimeDisplay.value.pumpPercent : 0
));
const activePumpFlow = computed(() => (
  realtimeDisplay.value.pumpRunning ? realtimeDisplay.value.pumpFlow : 0
));
const activeDosingInletPumpFrequency = computed(() => (
  realtimeDisplay.value.inletPumpFrequency
));
const activeBlowerPercent = computed(() => (
  aerationDisplay.value.blowerRunning ? aerationDisplay.value.blowerPercent : 0
));
const activeBlowerFrequency = computed(() => (
  aerationDisplay.value.blowerRunning ? aerationDisplay.value.blowerHz : 0
));
const activeInletPumpFrequency = computed(() => (
  aerationDisplay.value.inletPumpFrequency
));

const activeSensorItems = computed(() => sceneDevices.value
  .filter((device) => (
    device?.viewField
    && device.displayMax !== null
    && device.displayMax !== undefined
    && Number.isFinite(Number(device.displayMax))
  ))
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

const dosingTrendDisplay = computed(() => ({
  times: mqttTrend.dosing.times,
  preTurbidity: mqttTrend.dosing.values.preTurbidity || [],
  postTurbidity: mqttTrend.dosing.values.postTurbidity || [],
  pacDose: mqttTrend.dosing.values.pacDose || [],
  pumpFlow: mqttTrend.dosing.values.pumpFlow || [],
}));

const aerationTrendDisplay = computed(() => ({
  times: mqttTrend.aeration.times,
  dissolvedOxygen: mqttTrend.aeration.values.doValue || [],
  airFlow: mqttTrend.aeration.values.blowerHz || [],
}));

const aerationTrendTargetRange = computed(() => {
  const telemetry = aerationDisplay.value;
  return Number.isFinite(telemetry.targetMin)
    && Number.isFinite(telemetry.targetMax)
    && telemetry.targetMin <= telemetry.targetMax
    ? [telemetry.targetMin, telemetry.targetMax]
    : [aerationControl.targetMin, aerationControl.targetMax];
});

const activeTrendDisplay = computed(() => ({
  times: mqttTrend[activeScene.value].times,
  series: activeTrendDevices.value.map((device) => ({
    ...device,
    values: mqttTrend[activeScene.value].values[device.viewField] || [],
  })),
}));

function submitSimulationCommand(deviceSn, command) {
  const scene = activeScene.value;
  const apiCode = simulationControlApiCodes[scene]?.[deviceSn];
  const device = sceneDevices.value.find((item) => item?.deviceSn === deviceSn);
  if (!apiCode || !device?.uid) {
    const error = new Error(`未找到 ${deviceSn} 的物模型控制配置`);
    console.error('仿真设备控制下发失败', error);
    return Promise.resolve(false);
  }

  const queueKey = `${scene}:${deviceSn}`;
  const previous = simulationCommandQueues.get(queueKey) || Promise.resolve();
  // 同一设备的物模型控制按顺序执行，避免 MQTT 适配器并发下发时覆盖前一条命令。
  const current = previous
    .catch(() => undefined)
    .then(() => sendSimulationCommand(device.uid, apiCode, command));
  simulationCommandQueues.set(queueKey, current);
  current.then(
    () => {
      if (simulationCommandQueues.get(queueKey) === current) simulationCommandQueues.delete(queueKey);
    },
    (error) => {
      if (simulationCommandQueues.get(queueKey) === current) simulationCommandQueues.delete(queueKey);
      console.error('仿真设备控制下发失败', error);
    },
  );
  return current;
}

function updatePacPump(patch) {
  Object.assign(dosingControl, patch);
  publishPacPumpCommand();
  emit('pump-control-change', patch);
}

function publishPacPumpCommand() {
  const mlh = dosingControl.pumpRunning
    ? Math.round(dosingControl.pumpPercent * 4.2 * 10) / 10
    : 0;
  void submitSimulationCommand('pac-pump-01', { action: 'manual', mlh });
}

function togglePacPump() {
  updatePacPump({ pumpRunning: !dosingControl.pumpRunning });
}

function togglePacAutoMode() {
  const pacAutoMode = !dosingControl.pacAutoMode;
  dosingControl.pacAutoMode = pacAutoMode;
  void submitSimulationCommand('pac-plc-01', {
    action: 'mode',
    mode: pacAutoMode ? 'auto' : 'manual',
  });
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
  void submitSimulationCommand('inlet-pump-01', {
    action: 'configure',
    running: dosingControl.inletPumpRunning,
    frequency: dosingControl.inletPumpFrequency,
  });
}

function toggleDosingInletPump() {
  const inletPumpRunning = !dosingControl.inletPumpRunning;
  updateDosingInletPump({
    inletPumpRunning,
    inletPumpFrequency: inletPumpRunning ? lastDosingInletPumpFrequency.value : 0,
  });
}

function handleDosingInletPumpFrequencyInput(event) {
  const inletPumpFrequency = Math.min(50, Math.max(0, finiteNumber(event.target?.value, dosingControl.inletPumpFrequency)));
  if (inletPumpFrequency > 0) lastDosingInletPumpFrequency.value = inletPumpFrequency;
  updateDosingInletPump({ inletPumpFrequency, inletPumpRunning: inletPumpFrequency > 0 });
}

function updateTargetRange(patch) {
  Object.assign(dosingControl, patch);
  void submitSimulationCommand('pac-plc-01', {
    action: 'target',
    targetMin: dosingControl.targetMin,
    targetMax: dosingControl.targetMax,
  });
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
  const manualHz = aerationControl.blowerRunning ? aerationControl.blowerFrequency : 0;
  void submitSimulationCommand('blower-01', {
    action: 'configure',
    mode: 'manual',
    manual_hz: manualHz,
    // 风机手动操作即确认 ODD 人工接管，允许更新被保护的手动频率。
    manual_command: true,
  });
}

function toggleAerationAutoMode() {
  const autoMode = !aerationControl.autoMode;
  aerationControl.autoMode = autoMode;
  const manualHz = aerationControl.blowerRunning ? aerationControl.blowerFrequency : 0;
  void submitSimulationCommand('aeration-plc-01', {
    action: 'configure',
    config: autoMode ? { mode: 'optimize' } : { mode: 'manual', manual_hz: manualHz },
  });
}

function toggleAerationBlower() {
  updateAerationBlower({ blowerRunning: !aerationControl.blowerRunning });
}

function handleBlowerFrequencyInput(event) {
  const blowerFrequency = Math.min(50, Math.max(0, finiteNumber(event.target?.value, aerationControl.blowerFrequency)));
  updateAerationBlower({ blowerFrequency, blowerRunning: blowerFrequency > 0 });
}

function updateAerationInletPump(patch) {
  Object.assign(aerationControl, patch);
  publishAerationInletPumpCommand();
  emit('inlet-pump-control-change', patch);
}

function publishAerationInletPumpCommand() {
  void submitSimulationCommand('inlet-pump-01', {
    action: 'configure',
    running: aerationControl.inletPumpRunning,
    frequency: aerationControl.inletPumpFrequency,
  });
}

function toggleAerationInletPump() {
  const inletPumpRunning = !aerationControl.inletPumpRunning;
  updateAerationInletPump({
    inletPumpRunning,
    inletPumpFrequency: inletPumpRunning ? lastAerationInletPumpFrequency.value : 0,
  });
}

function handleInletPumpFrequencyInput(event) {
  const inletPumpFrequency = Math.min(50, Math.max(0, finiteNumber(event.target?.value, aerationControl.inletPumpFrequency)));
  if (inletPumpFrequency > 0) lastAerationInletPumpFrequency.value = inletPumpFrequency;
  updateAerationInletPump({ inletPumpFrequency, inletPumpRunning: inletPumpFrequency > 0 });
}

function updateAerationTargetRange(patch) {
  Object.assign(aerationControl, patch);
  void submitSimulationCommand('aeration-plc-01', {
    action: 'target',
    targetMin: aerationControl.targetMin,
    targetMax: aerationControl.targetMax,
  });
  emit('aeration-target-range-change', patch);
}

function handleAerationTargetInput(field, event) {
  const rawValue = Math.min(4, Math.max(0.5, finiteNumber(event.target?.value, aerationControl[field])));
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
  const trendDevices = getTrendDevices(scene);
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

function getTrendDevices(scene) {
  const devices = [...activeTrendDevices.value];
  if (scene !== 'dosing') return devices;

  // 兼容后端尚未刷新趋势标记的存量设备配置，仍以服务端返回的设备映射为准。
  const pumpFlowDevice = sceneDevices.value.find(
    (device) => device?.deviceSn === 'pac-pump-01'
      && device?.tag === 'actualMLH'
      && device?.viewField === 'pumpFlow'
  );
  if (pumpFlowDevice && !devices.some((device) => device.viewField === pumpFlowDevice.viewField)) {
    devices.push(pumpFlowDevice);
  }
  return devices;
}

function resetMqttData(scene) {
  Object.keys(sceneTelemetry[scene]).forEach((field) => delete sceneTelemetry[scene][field]);
  mqttTrend[scene].times.splice(0);
  Object.keys(mqttTrend[scene].values).forEach((field) => delete mqttTrend[scene].values[field]);
}

function handleMqttData(message) {
  const payload = message?.payload ?? message;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
  if (message?.isRealtimeTelemetry !== false) lastMqttReceivedAt.value = Date.now();
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

function handleMqttConnectionChange(connected) {
  mqttConnected.value = connected === true;
  if (!mqttConnected.value) lastMqttReceivedAt.value = 0;
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
  lastMqttReceivedAt.value = 0;
  void loadRealtimeDevices();
}, { immediate: true });

watch(() => realtimeDisplay.value.pacAutoMode, (pacAutoMode) => {
  // 自动状态以加药 PLC 的 MQTT 遥测为准，避免命令未送达时界面误判。
  if (pacAutoMode !== null) dosingControl.pacAutoMode = pacAutoMode;
});

watch(() => [realtimeDisplay.value.targetMin, realtimeDisplay.value.targetMax], ([targetMin, targetMax]) => {
  if (Number.isFinite(targetMin) && Number.isFinite(targetMax) && targetMin <= targetMax) {
    dosingControl.targetMin = targetMin;
    dosingControl.targetMax = targetMax;
  }
});

watch(() => aerationDisplay.value.mode, (mode) => {
  if (mode === 'optimize') aerationControl.autoMode = true;
  if (mode === 'fixed' || mode === 'manual') aerationControl.autoMode = false;
});

watch(() => [aerationDisplay.value.targetMin, aerationDisplay.value.targetMax], ([targetMin, targetMax]) => {
  if (Number.isFinite(targetMin) && Number.isFinite(targetMax) && targetMin <= targetMax) {
    aerationControl.targetMin = targetMin;
    aerationControl.targetMax = targetMax;
  }
});

onMounted(() => {
  statusClockTimer = window.setInterval(() => {
    statusClock.value = Date.now();
  }, 1000);
  void loadAlarmNotificationTopic();
});

onBeforeUnmount(() => {
  if (statusClockTimer !== null) window.clearInterval(statusClockTimer);
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
.process-status__item.is-success { color: #83edb8; }
.process-status__item.is-info { color: #a9c9de; }
.process-status__item.is-warning { color: #ffd168; }
.process-status__item.is-danger { color: #ff8e85; }
.status-dot { width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; background: #4be49d; box-shadow: 0 0 7px rgba(75, 228, 157, 0.84); }
.process-status__item.is-info .status-dot { background: #69c8f2; box-shadow: 0 0 7px rgba(105, 200, 242, 0.84); }
.process-status__item.is-warning .status-dot { background: #ffd168; box-shadow: 0 0 7px rgba(255, 209, 104, 0.84); }
.process-status__item.is-danger .status-dot { background: #ff756d; box-shadow: 0 0 7px rgba(255, 117, 109, 0.84); }

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
.inlet-pump-control__switches { display: inline-flex; align-items: center; gap: 10px; }
.auto-mode-switch-control { display: inline-flex; align-items: center; gap: 7px; color: #cde8f7; font-size: 12px; }
.pump-switch { position: relative; width: 40px; height: 22px; padding: 0; border: 1px solid rgba(121, 158, 182, 0.72); border-radius: 11px; outline: 0; background: rgba(63, 83, 101, 0.78); cursor: pointer; }
.pump-switch > span { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #c7d4dc; transition: transform 0.2s ease; }
.pump-switch.is-checked { border-color: #4adce7; background: rgba(10, 156, 176, 0.82); box-shadow: 0 0 8px rgba(5, 252, 253, 0.35); }
.pump-switch.is-checked > span { transform: translateX(18px); background: #fff; }
.pump-switch:focus-visible { box-shadow: 0 0 0 2px rgba(100, 222, 255, 0.38); }
.pump-switch:disabled { cursor: not-allowed; opacity: 0.45; }

.pac-control-card :deep(.pump-frequency-gauge) { height: 180px; margin-top: 18px; flex: 0 0 180px; }
.control-value-row { display: flex; align-items: baseline; justify-content: space-between; margin: 6px 8px 3px; color: #8fb4cd; font-size: 12px; }
.control-value-row strong { color: #ffd268; font-size: 26px; }
.control-value-row small { margin-left: 2px; color: #d7e9f6; font-size: 12px; }

.pump-range { width: calc(100% - 16px); height: 18px; margin: 10px 8px 4px; appearance: none; outline: 0; background: transparent; }
.pump-range::-webkit-slider-runnable-track { height: 7px; border: 1px solid #0b9dcc; border-radius: 4px; background: linear-gradient(90deg, #30c6ec 0%, #087ebc var(--range-progress), rgba(3, 45, 78, 0.92) var(--range-progress), rgba(3, 45, 78, 0.92) 100%); }
.pump-range::-webkit-slider-thumb { width: 17px; height: 17px; margin-top: -6px; appearance: none; border: 2px solid #c5f4ff; border-radius: 50%; background: #57c9ef; box-shadow: 0 0 7px rgba(75, 201, 255, 0.8); }
.pump-range::-moz-range-track { height: 7px; border: 1px solid #0b9dcc; border-radius: 4px; background: linear-gradient(90deg, #30c6ec 0%, #087ebc var(--range-progress), rgba(3, 45, 78, 0.92) var(--range-progress), rgba(3, 45, 78, 0.92) 100%); }
.pump-range::-moz-range-thumb { width: 15px; height: 15px; border: 2px solid #c5f4ff; border-radius: 50%; background: #57c9ef; box-shadow: 0 0 7px rgba(75, 201, 255, 0.8); }
.pump-range:disabled { cursor: not-allowed; opacity: 0.45; }
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
