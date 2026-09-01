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
      <div class="preview-title">
        <button
          type="button"
          class="preview-title__arrow preview-title__arrow--left"
          aria-label="切换到上一个监控场景"
          title="上一个场景"
          @click="switchScene(-1)"
        ></button>
        <h1>{{ sceneTitle }}</h1>
        <button
          type="button"
          class="preview-title__arrow preview-title__arrow--right"
          aria-label="切换到下一个监控场景"
          title="下一个场景"
          @click="switchScene(1)"
        ></button>
      </div>
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
        <DecorativePanel class="panel turbidity-panel" title="浊度仪实时数据">
          <RealtimeMetricBarChart
            :items="turbidityItems"
            :max="80"
            unit="NTU"
            aria-label="前馈浊度仪和后馈浊度仪实时数据柱状图"
          />
        </DecorativePanel>

        <DecorativePanel class="panel pump-state-panel" title="PAC配药箱水位">
          <div class="pump-state-head">
            <span class="running-state" :class="{ stopped: realtimeDisplay.tankLevel < 150 }">
              <i></i>{{ realtimeDisplay.tankLevel < 150 ? '水位过低' : '水位正常' }}
            </span>
            <strong>{{ realtimeDisplay.tankLevel }}<small>mm</small></strong>
          </div>
          <RealtimeMetricBarChart
            :items="pumpItems"
            :max="1000"
            unit="mm"
            aria-label="PAC配药箱水位柱状图"
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
        <DecorativePanel class="panel turbidity-panel" title="DO溶解氧传感器实时数据">
          <RealtimeMetricBarChart
            :items="dissolvedOxygenItems"
            :max="10"
            unit=""
            aria-label="DO溶解氧传感器实时数据柱状图"
          />
        </DecorativePanel>

        <DecorativePanel class="panel pump-state-panel" title="气量实时数据">
          <div class="pump-state-head">
            <span class="running-state" :class="{ stopped: !aerationDisplay.blowerRunning }">
              <i></i>{{ aerationDisplay.blowerRunning ? '供气正常' : '供气停止' }}
            </span>
            <strong>{{ aerationDisplay.airFlow }}<small>Nm³/h</small></strong>
          </div>
          <RealtimeMetricBarChart
            :items="airFlowItems"
            :max="40"
            unit="Nm³/h"
            aria-label="曝气气量实时数据柱状图"
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
        <DecorativePanel class="panel pac-control-panel" direction="left" title="PAC泵控制">
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

          <div class="control-summary">
            <div><span>控制模式</span><strong>AUTO</strong></div>
            <div><span>运行状态</span><strong :class="{ stopped: !realtimeDisplay.pumpRunning }">{{ realtimeDisplay.pumpRunning ? '正常' : '停止' }}</strong></div>
            <div><span>配药箱液位</span><strong>正常</strong></div>
          </div>

        </section>
        </DecorativePanel>

        <DecorativePanel class="panel target-control-panel" direction="left" title="目标区间设置">
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
          <p class="prototype-note">当前为原型数据，设置操作仅更新页面状态。</p>
        </section>
        </DecorativePanel>
      </template>

      <template v-else>
        <DecorativePanel class="panel pac-control-panel" direction="left" title="曝气风机控制">
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

            <div class="control-summary">
              <div><span>控制模式</span><strong>AUTO</strong></div>
              <div><span>运行状态</span><strong :class="{ stopped: !aerationDisplay.blowerRunning }">{{ aerationDisplay.blowerRunning ? '正常' : '停止' }}</strong></div>
              <div><span>气量反馈</span><strong>{{ aerationDisplay.airFlow }} Nm³/h</strong></div>
            </div>
          </section>
        </DecorativePanel>

        <DecorativePanel class="panel target-control-panel" direction="left" title="目标区间设置">
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
            <p class="prototype-note">当前为原型数据，设置操作仅更新页面状态。</p>
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
import RealtimeMetricBarChart from '../components/realtime/RealtimeMetricBarChart.vue';
import SmartWaterFlumePreview from '../components/realtime/smart-water-flume-preview/SmartWaterFlumePreview.vue';
import { PROTOTYPE_ACCESS_TOKEN } from '../constants/auth.js';
import { getToken } from '../utils/auth.js';

const props = defineProps({
  sceneTarget: { type: Object, default: null },
  prototypeData: { type: Object, default: null },
});

const emit = defineEmits([
  'pump-control-change',
  'target-range-change',
  'blower-control-change',
  'aeration-target-range-change',
  'scene-change',
  'realtime-data',
]);
const previewRef = ref(null);
const showProcessPrototype = ref(true);
const alarmNotificationTopic = ref('');
const activeScene = ref('dosing');
const scenes = Object.freeze([
  { key: 'dosing', title: '智能加药五段闭环工艺监控' },
  { key: 'aeration', title: '智能曝气清水闭环工艺监控' },
]);

const prototypeState = reactive({
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
  doValue: 6.4,
  airFlow: 23,
  blowerPercent: 54,
  blowerRunning: true,
  targetMin: 6.7,
  targetMax: 7.5,
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

const sceneTitle = computed(() => scenes.find((scene) => scene.key === activeScene.value)?.title || scenes[0].title);

const realtimeDisplay = computed(() => {
  const source = props.prototypeData || prototypeState;
  return {
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
const activeBlowerPercent = computed(() => (
  aerationDisplay.value.blowerRunning ? aerationDisplay.value.blowerPercent : 0
));

const turbidityItems = computed(() => [
  { label: '前馈浊度仪', value: realtimeDisplay.value.preTurbidity, color: '#39d8ff' },
  { label: '后馈浊度仪', value: realtimeDisplay.value.postTurbidity, color: '#64e59b' },
]);

const pumpItems = computed(() => [
  { label: 'PAC配药箱', value: realtimeDisplay.value.tankLevel, color: '#ffc65c' },
]);

const dissolvedOxygenItems = computed(() => [
  { label: 'DO-01', value: aerationDisplay.value.doValue, color: '#39d8ff' },
]);

const airFlowItems = computed(() => [
  { label: 'AFM-01', value: aerationDisplay.value.airFlow, color: '#ffc65c' },
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

function switchScene(direction) {
  const currentIndex = scenes.findIndex((scene) => scene.key === activeScene.value);
  const nextIndex = (currentIndex + direction + scenes.length) % scenes.length;
  activeScene.value = scenes[nextIndex].key;
  emit('scene-change', activeScene.value);
}

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

.preview-title { display: flex; min-height: 38px; align-items: center; justify-content: center; color: #fff; }
.preview-title h1 {
  margin: 0;
  padding: 0 10px;
  color: #fff;
  font-family: 'SimHei', 'Microsoft YaHei', sans-serif;
  font-size: 29px;
  font-weight: normal;
  line-height: 38px;
  text-shadow: 0 0 13px rgba(64, 195, 255, 0.42);
  white-space: nowrap;
}
.preview-title__arrow {
  display: block;
  width: 53px;
  height: 36px;
  padding: 0;
  flex: 0 0 53px;
  border: 0;
  border-radius: 0;
  outline: 0;
  background: url('../assets/preview-title.png') center / 100% 100% no-repeat;
  box-shadow: none;
  cursor: pointer;
  pointer-events: auto;
  transition: filter 0.18s ease, transform 0.18s ease;
}
.preview-title__arrow:hover { border: 0; background-color: transparent; filter: brightness(1.35) drop-shadow(0 0 6px rgba(58, 204, 255, 0.7)); }
.preview-title__arrow:focus-visible { box-shadow: 0 0 0 2px rgba(100, 222, 255, 0.58); }
.preview-title__arrow--right { transform: scaleX(-1); }
.preview-title__arrow--left:hover { transform: translateX(-2px); }
.preview-title__arrow--right:hover { transform: translateX(2px) scaleX(-1); }

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
.trend-panel { flex: 1 1 0; }
.turbidity-panel :deep(.decorative-panel__content),
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

.control-summary { display: grid; gap: 1px; margin-top: 4px; border: 1px solid rgba(71, 151, 200, 0.25); background: rgba(2, 31, 55, 0.58); }
.control-summary div { display: flex; height: 40px; align-items: center; justify-content: space-between; padding: 0 12px; }
.control-summary div + div { border-top: 1px solid rgba(71, 151, 200, 0.18); }
.control-summary span { color: #8fb4cd; font-size: 11px; }
.control-summary strong { color: #5fe4a2; font-size: 12px; }
.control-summary strong.stopped { color: #ff8a81; }

.target-control-panel { flex: 0 0 230px; }
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

@media (max-width: 1500px) {
  .left-stack { --stack-width: 300px; }
  .right-stack { --stack-width: 290px; }
  .scene-stage { right: 300px; left: 310px; }
  .preview-console { width: calc(100% - 660px); min-width: 430px; }
  .preview-title h1 { font-size: 25px; }
  .process-status span { padding: 0 8px; }
}

@media (max-height: 820px) {
  .scene-stage { top: 110px; bottom: 10px; }
  .turbidity-panel { flex-basis: 27%; }
  .pump-state-panel { flex-basis: 24%; }
  .pac-control-card__head { padding-top: 4px; padding-bottom: 8px; }
  .pac-control-card :deep(.pump-frequency-gauge) { height: 115px; margin-top: 2px; flex-basis: 115px; }
  .control-value-row { margin-top: 2px; }
  .pump-range { margin-top: 4px; }
  .range-scale { margin-bottom: 8px; }
  .control-summary div { height: 28px; }
  .target-control-panel { flex-basis: 196px; }
  .target-control__value { margin-bottom: 7px; }
  .target-range-slider { margin-top: 6px; }
  .prototype-note { padding-top: 3px; }
}
</style>
