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
        :target-min="aerationDisplay.targetMin"
        :target-max="aerationDisplay.targetMax"
      />

      <!-- 原三维组件继续保留，后续接入真实模型时切换展示状态即可。 -->
      <SmartWaterFlumePreview
        v-else
        ref="previewRef"
        :alarm-topic="alarmNotificationTopic"
        performance-mode
        @mqtt-data="handleMqttData"
        @alarm-notification="handleAlarmNotification"
      />
    </div>

    <header class="preview-console">
      <div class="process-status" aria-label="工艺运行状态">
        <template v-if="activeScene === 'dosing'">
          <span><i class="status-dot"></i>自动闭环</span>
          <span>TUB-02 目标 {{ realtimeDisplay.targetMin }}-{{ realtimeDisplay.targetMax }} NTU</span>
          <span>PAC 配药箱液位正常</span>
        </template>
        <template v-else>
          <span><i class="status-dot"></i>DO-PI / PID 自动闭环</span>
          <span>DO-01 目标 {{ aerationDisplay.targetMin }}-{{ aerationDisplay.targetMax }}</span>
          <span>AFM-01 {{ aerationDisplay.airFlow }} Nm³/h</span>
        </template>
      </div>
    </header>

    <aside class="left-stack">
      <template v-if="activeScene === 'dosing'">
        <DecorativePanel class="panel sensor-data-panel dosing-sensor-data-panel" title="传感器实时数据">
          <SensorRealtimeBars
            :items="dosingSensorItems"
            aria-label="进水泵频率、原水箱PH值、进水流量、前馈浊度、后馈浊度、PAC配药箱水位和PAC泵计量"
          />
        </DecorativePanel>

        <DecorativePanel class="panel trend-panel" title="实时趋势分析">
          <PacRealtimeTrendChart
            :data="trendDisplay"
            :target-range="[realtimeDisplay.targetMin, realtimeDisplay.targetMax]"
          />
        </DecorativePanel>
      </template>

      <template v-else>
        <DecorativePanel class="panel sensor-data-panel" title="传感器实时数据">
          <SensorRealtimeBars
            :items="aerationSensorItems"
            aria-label="进水泵频率、DO溶解氧、进气量和风机设定值"
          />
        </DecorativePanel>

        <DecorativePanel class="panel trend-panel" title="实时趋势分析">
          <AerationRealtimeTrendChart
            :data="aerationTrendDisplay"
            :target-range="[aerationDisplay.targetMin, aerationDisplay.targetMax]"
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
            <div class="pump-switch-control">
              <span>{{ realtimeDisplay.pumpRunning ? '开' : '关' }}</span>
              <button
                type="button"
                class="pump-switch"
                role="switch"
                :aria-checked="realtimeDisplay.pumpRunning"
                :aria-label="realtimeDisplay.pumpRunning ? '关闭PAC泵' : '开启PAC泵'"
                :class="{ 'is-checked': realtimeDisplay.pumpRunning }"
                @click="togglePacPump"
              ><span aria-hidden="true"></span></button>
            </div>
          </header>

          <PumpFrequencyGauge
            :value="activePumpPercent"
            :max="100"
            label="当前输出"
            unit="%"
            gauge-center-y="88%"
            gauge-radius="151%"
          />

          <div class="control-value-row">
            <span>输出设定</span>
            <strong>{{ realtimeDisplay.pumpPercent }}<small>%</small></strong>
          </div>
          <input
            class="pump-range"
            type="range"
            min="0"
            max="100"
            step="1"
            :value="realtimeDisplay.pumpPercent"
            :style="{ '--range-progress': `${realtimeDisplay.pumpPercent}%` }"
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
                <span>{{ realtimeDisplay.inletPumpRunning ? '开' : '关' }}</span>
                <button
                  type="button"
                  class="pump-switch"
                  role="switch"
                  :aria-checked="realtimeDisplay.inletPumpRunning"
                  :aria-label="realtimeDisplay.inletPumpRunning ? '关闭进水泵' : '开启进水泵'"
                  :class="{ 'is-checked': realtimeDisplay.inletPumpRunning }"
                  @click="toggleDosingInletPump"
                ><span aria-hidden="true"></span></button>
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
              <strong>{{ realtimeDisplay.inletPumpFrequency }}<small>Hz</small></strong>
            </div>
            <input
              class="pump-range inlet-pump-range"
              type="range"
              min="0"
              max="50"
              step="1"
              :value="realtimeDisplay.inletPumpFrequency"
              :style="{ '--range-progress': `${realtimeDisplay.inletPumpFrequency * 2}%` }"
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
            <strong>{{ realtimeDisplay.targetMin }} - {{ realtimeDisplay.targetMax }}<small>NTU</small></strong>
          </div>
          <div class="target-inputs">
            <label>
              <span>下限</span>
              <div><input type="number" min="0" max="80" step="1" :value="realtimeDisplay.targetMin" @change="handleTargetInput('targetMin', $event)" /><b>NTU</b></div>
            </label>
            <label>
              <span>上限</span>
              <div><input type="number" min="0" max="80" step="1" :value="realtimeDisplay.targetMax" @change="handleTargetInput('targetMax', $event)" /><b>NTU</b></div>
            </label>
          </div>
          <a-slider
            class="target-range-slider"
            range
            :min="0"
            :max="80"
            :step="1"
            :value="[realtimeDisplay.targetMin, realtimeDisplay.targetMax]"
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
                <span>{{ aerationDisplay.blowerRunning ? '开' : '关' }}</span>
                <button
                  type="button"
                  class="pump-switch"
                  role="switch"
                  :aria-checked="aerationDisplay.blowerRunning"
                  :aria-label="aerationDisplay.blowerRunning ? '关闭曝气风机' : '开启曝气风机'"
                  :class="{ 'is-checked': aerationDisplay.blowerRunning }"
                  @click="toggleAerationBlower"
                ><span aria-hidden="true"></span></button>
              </div>
            </header>

            <PumpFrequencyGauge
              :value="activeBlowerPercent"
              :max="100"
              label="当前输出"
              unit="%"
              gauge-center-y="88%"
              gauge-radius="151%"
            />

            <div class="control-value-row">
              <span>输出设定</span>
              <strong>{{ aerationDisplay.blowerPercent }}<small>%</small></strong>
            </div>
            <input
              class="pump-range"
              type="range"
              min="0"
              max="100"
              step="1"
              :value="aerationDisplay.blowerPercent"
              :style="{ '--range-progress': `${aerationDisplay.blowerPercent}%` }"
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
                  <span>{{ aerationDisplay.inletPumpRunning ? '开' : '关' }}</span>
                  <button
                    type="button"
                    class="pump-switch"
                    role="switch"
                    :aria-checked="aerationDisplay.inletPumpRunning"
                    :aria-label="aerationDisplay.inletPumpRunning ? '关闭进水泵' : '开启进水泵'"
                    :class="{ 'is-checked': aerationDisplay.inletPumpRunning }"
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
                <strong>{{ aerationDisplay.inletPumpFrequency }}<small>Hz</small></strong>
              </div>
              <input
                class="pump-range inlet-pump-range"
                type="range"
                min="0"
                max="50"
                step="1"
                :value="aerationDisplay.inletPumpFrequency"
                :style="{ '--range-progress': `${aerationDisplay.inletPumpFrequency * 2}%` }"
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
              <strong>{{ aerationDisplay.targetMin }} - {{ aerationDisplay.targetMax }}</strong>
            </div>
            <div class="target-inputs target-inputs--unitless">
              <label>
                <span>下限</span>
                <div><input type="number" min="0" max="10" step="0.1" :value="aerationDisplay.targetMin" @change="handleAerationTargetInput('targetMin', $event)" /></div>
              </label>
              <label>
                <span>上限</span>
                <div><input type="number" min="0" max="10" step="0.1" :value="aerationDisplay.targetMax" @change="handleAerationTargetInput('targetMax', $event)" /></div>
              </label>
            </div>
            <a-slider
              class="target-range-slider"
              range
              :min="0"
              :max="10"
              :step="0.1"
              :value="[aerationDisplay.targetMin, aerationDisplay.targetMax]"
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
import DecorativePanel from '../components/common/DecorativePanel.vue';
import AerationProcess from '../components/realtime/AerationProcess.vue';
import AerationRealtimeTrendChart from '../components/realtime/AerationRealtimeTrendChart.vue';
import FiveStageDosingProcess from '../components/realtime/FiveStageDosingProcess.vue';
import PacRealtimeTrendChart from '../components/realtime/PacRealtimeTrendChart.vue';
import PumpFrequencyGauge from '../components/realtime/PumpFrequencyGauge.vue';
import SensorRealtimeBars from '../components/realtime/SensorRealtimeBars.vue';
import SmartWaterFlumePreview from '../components/realtime/smart-water-flume-preview/SmartWaterFlumePreview.vue';
import { PROTOTYPE_ACCESS_TOKEN } from '../constants/auth.js';
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
const showProcessPrototype = ref(true);
const alarmNotificationTopic = ref('');
const activeScene = computed(() => props.monitoringScene === 'aeration' ? 'aeration' : 'dosing');

const prototypeState = reactive({
  inletPumpFrequency: 38,
  inletPumpRunning: true,
  rawWaterPh: 7.2,
  inletFlow: 100,
  preTurbidity: 42,
  postTurbidity: 16,
  tankLevel: 820,
  pumpPercent: 48,
  pumpRunning: true,
  targetMin: 10,
  targetMax: 20,
  trend: {
    times: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30', '10:35', '10:40', '10:45', '10:50', '10:55'],
    preTurbidity: [36, 38, 41, 45, 48, 46, 44, 43, 45, 44, 43, 42],
    postTurbidity: [18.2, 17.8, 17.4, 17.1, 16.8, 16.5, 16.2, 15.8, 15.7, 15.8, 15.9, 16],
    tankLevel: [910, 902, 895, 884, 872, 860, 850, 842, 836, 830, 824, 820],
  },
});

const aerationPrototypeState = reactive({
  inletPumpFrequency: 42,
  inletPumpRunning: true,
  doValue: 6.4,
  airFlow: 23,
  blowerPercent: 54,
  blowerRunning: true,
  targetMin: 0,
  targetMax: 2,
  trend: {
    times: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30', '10:35', '10:40', '10:45', '10:50', '10:55'],
    dissolvedOxygen: [5.8, 5.9, 6, 6.1, 6.25, 6.35, 6.5, 6.62, 6.55, 6.48, 6.43, 6.4],
    airFlow: [16, 17, 18.2, 19.5, 21, 22.4, 23.8, 24.6, 24.2, 23.8, 23.4, 23],
  },
});

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

const realtimeDisplay = computed(() => {
  const source = props.prototypeData || prototypeState;
  return {
    inletPumpFrequency: Math.min(50, Math.max(0, finiteNumber(source.inletPumpFrequency, prototypeState.inletPumpFrequency))),
    inletPumpRunning: typeof source.inletPumpRunning === 'boolean' ? source.inletPumpRunning : prototypeState.inletPumpRunning,
    rawWaterPh: Math.min(14, Math.max(0, finiteNumber(source.rawWaterPh, prototypeState.rawWaterPh))),
    inletFlow: Math.min(180, Math.max(0, finiteNumber(source.inletFlow, prototypeState.inletFlow))),
    preTurbidity: finiteNumber(source.preTurbidity, prototypeState.preTurbidity),
    postTurbidity: finiteNumber(source.postTurbidity, prototypeState.postTurbidity),
    tankLevel: Math.min(1000, Math.max(0, finiteNumber(source.tankLevel, prototypeState.tankLevel))),
    pumpPercent: Math.min(100, Math.max(0, finiteNumber(source.pumpPercent, prototypeState.pumpPercent))),
    pumpRunning: typeof source.pumpRunning === 'boolean' ? source.pumpRunning : prototypeState.pumpRunning,
    targetMin: Math.min(80, Math.max(0, finiteNumber(source.targetMin, prototypeState.targetMin))),
    targetMax: Math.min(80, Math.max(0, finiteNumber(source.targetMax, prototypeState.targetMax))),
    trend: source.trend || prototypeState.trend,
  };
});

const aerationDisplay = computed(() => {
  const source = props.prototypeData?.aeration || aerationPrototypeState;
  return {
    inletPumpFrequency: Math.min(50, Math.max(0, finiteNumber(source.inletPumpFrequency, aerationPrototypeState.inletPumpFrequency))),
    inletPumpRunning: typeof source.inletPumpRunning === 'boolean' ? source.inletPumpRunning : aerationPrototypeState.inletPumpRunning,
    doValue: Math.min(10, Math.max(0, finiteNumber(source.doValue, aerationPrototypeState.doValue))),
    airFlow: Math.min(40, Math.max(0, finiteNumber(source.airFlow, aerationPrototypeState.airFlow))),
    blowerPercent: Math.min(100, Math.max(0, finiteNumber(source.blowerPercent, aerationPrototypeState.blowerPercent))),
    blowerRunning: typeof source.blowerRunning === 'boolean' ? source.blowerRunning : aerationPrototypeState.blowerRunning,
    targetMin: Math.min(10, Math.max(0, finiteNumber(source.targetMin, aerationPrototypeState.targetMin))),
    targetMax: Math.min(10, Math.max(0, finiteNumber(source.targetMax, aerationPrototypeState.targetMax))),
    trend: source.trend || aerationPrototypeState.trend,
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

const dosingSensorItems = computed(() => [
  { key: 'inlet-pump-frequency', label: '进水泵频率', value: activeDosingInletPumpFrequency.value, max: 50, unit: 'Hz', precision: 0, color: '#39d8ff' },
  { key: 'raw-water-ph', label: '原水箱PH值', value: realtimeDisplay.value.rawWaterPh, max: 14, unit: '', precision: 1, color: '#64e59b' },
  { key: 'inlet-flow', label: '进水流量', value: realtimeDisplay.value.inletFlow, max: 180, unit: 'L/h', precision: 0, color: '#ffc65c' },
  { key: 'pre-turbidity', label: '前馈浊度', value: realtimeDisplay.value.preTurbidity, max: 80, unit: 'NTU', precision: 1, color: '#4f93ff' },
  { key: 'post-turbidity', label: '后馈浊度', value: realtimeDisplay.value.postTurbidity, max: 80, unit: 'NTU', precision: 1, color: '#33d4c8' },
  { key: 'pac-tank-level', label: 'PAC配药箱水位', value: realtimeDisplay.value.tankLevel, max: 1000, unit: 'mm', precision: 0, color: '#ff9f5a' },
  { key: 'pac-metering', label: 'PAC泵计量', value: activePumpPercent.value, max: 100, unit: '%', precision: 0, color: '#ff6e66' },
]);

const aerationSensorItems = computed(() => [
  { key: 'inlet-pump-frequency', label: '进水泵频率', value: activeInletPumpFrequency.value, max: 50, unit: 'Hz', precision: 0, color: '#39d8ff' },
  { key: 'dissolved-oxygen', label: 'DO溶解氧', value: aerationDisplay.value.doValue, max: 10, unit: '', precision: 1, color: '#64e59b' },
  { key: 'air-flow', label: '进气量', value: aerationDisplay.value.airFlow, max: 40, unit: 'Nm³/h', precision: 1, color: '#ffc65c' },
  { key: 'blower-setpoint', label: '风机设定值', value: aerationDisplay.value.blowerPercent, max: 100, unit: '%', precision: 0, color: '#4f93ff' },
]);

const trendDisplay = computed(() => {
  const trend = realtimeDisplay.value.trend;
  const tankLevelValues = [...(trend.tankLevel || [])];
  if (tankLevelValues.length) tankLevelValues[tankLevelValues.length - 1] = realtimeDisplay.value.tankLevel;
  return {
    times: trend.times || [],
    preTurbidity: trend.preTurbidity || [],
    postTurbidity: trend.postTurbidity || [],
    tankLevel: tankLevelValues,
  };
});

const aerationTrendDisplay = computed(() => {
  const trend = aerationDisplay.value.trend;
  const doValues = [...(trend.dissolvedOxygen || [])];
  const airValues = [...(trend.airFlow || [])];
  if (doValues.length) doValues[doValues.length - 1] = aerationDisplay.value.doValue;
  if (airValues.length) airValues[airValues.length - 1] = aerationDisplay.value.airFlow;
  return {
    times: trend.times || [],
    dissolvedOxygen: doValues,
    airFlow: airValues,
  };
});

function updatePacPump(patch) {
  if (props.prototypeData) {
    emit('pump-control-change', patch);
    return;
  }
  Object.assign(prototypeState, patch);
  emit('pump-control-change', { ...patch, prototype: true });
}

function togglePacPump() {
  updatePacPump({ pumpRunning: !realtimeDisplay.value.pumpRunning });
}

function handlePumpPercentInput(event) {
  updatePacPump({ pumpPercent: finiteNumber(event.target?.value, realtimeDisplay.value.pumpPercent) });
}

function updateDosingInletPump(patch) {
  if (props.prototypeData) {
    emit('dosing-inlet-pump-control-change', patch);
    return;
  }
  Object.assign(prototypeState, patch);
  emit('dosing-inlet-pump-control-change', { ...patch, prototype: true });
}

function toggleDosingInletPump() {
  updateDosingInletPump({ inletPumpRunning: !realtimeDisplay.value.inletPumpRunning });
}

function handleDosingInletPumpFrequencyInput(event) {
  const inletPumpFrequency = Math.min(50, Math.max(0, finiteNumber(event.target?.value, realtimeDisplay.value.inletPumpFrequency)));
  updateDosingInletPump({ inletPumpFrequency });
}

function updateTargetRange(patch) {
  if (props.prototypeData) {
    emit('target-range-change', patch);
    return;
  }
  Object.assign(prototypeState, patch);
  emit('target-range-change', { ...patch, prototype: true });
}

function handleTargetInput(field, event) {
  const value = Math.min(80, Math.max(0, finiteNumber(event.target?.value, realtimeDisplay.value[field])));
  const patch = field === 'targetMin'
    ? { targetMin: Math.min(value, realtimeDisplay.value.targetMax) }
    : { targetMax: Math.max(value, realtimeDisplay.value.targetMin) };
  updateTargetRange(patch);
}

function handleTargetRangeChange(values) {
  updateTargetRange({ targetMin: values[0], targetMax: values[1] });
}

function updateAerationBlower(patch) {
  if (props.prototypeData?.aeration) {
    emit('blower-control-change', patch);
    return;
  }
  Object.assign(aerationPrototypeState, patch);
  emit('blower-control-change', { ...patch, prototype: true });
}

function toggleAerationBlower() {
  updateAerationBlower({ blowerRunning: !aerationDisplay.value.blowerRunning });
}

function handleBlowerPercentInput(event) {
  updateAerationBlower({ blowerPercent: finiteNumber(event.target?.value, aerationDisplay.value.blowerPercent) });
}

function updateAerationInletPump(patch) {
  if (props.prototypeData?.aeration) {
    emit('inlet-pump-control-change', patch);
    return;
  }
  Object.assign(aerationPrototypeState, patch);
  emit('inlet-pump-control-change', { ...patch, prototype: true });
}

function toggleAerationInletPump() {
  updateAerationInletPump({ inletPumpRunning: !aerationDisplay.value.inletPumpRunning });
}

function handleInletPumpFrequencyInput(event) {
  const inletPumpFrequency = Math.min(50, Math.max(0, finiteNumber(event.target?.value, aerationDisplay.value.inletPumpFrequency)));
  updateAerationInletPump({ inletPumpFrequency });
}

function updateAerationTargetRange(patch) {
  if (props.prototypeData?.aeration) {
    emit('aeration-target-range-change', patch);
    return;
  }
  Object.assign(aerationPrototypeState, patch);
  emit('aeration-target-range-change', { ...patch, prototype: true });
}

function handleAerationTargetInput(field, event) {
  const rawValue = Math.min(10, Math.max(0, finiteNumber(event.target?.value, aerationDisplay.value[field])));
  const value = Math.round(rawValue * 10) / 10;
  const patch = field === 'targetMin'
    ? { targetMin: Math.min(value, aerationDisplay.value.targetMax) }
    : { targetMax: Math.max(value, aerationDisplay.value.targetMin) };
  updateAerationTargetRange(patch);
}

function handleAerationTargetRangeChange(values) {
  updateAerationTargetRange({ targetMin: values[0], targetMax: values[1] });
}

function handleMqttData(payload) {
  emit('realtime-data', payload);
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
  top: 126px;
  right: clamp(300px, 19vw, 372px);
  bottom: 24px;
  left: clamp(310px, 20vw, 392px);
  z-index: 1;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
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
  .scene-stage { right: 300px; left: 310px; }
  .preview-console { width: calc(100% - 660px); min-width: 430px; }
  .process-status span { padding: 0 8px; }
}

@media (max-height: 820px) {
  .scene-stage { top: 110px; bottom: 10px; }
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
