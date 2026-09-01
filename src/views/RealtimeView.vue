<template>
  <section class="page page-realtime active">
    <div class="scene-stage">
      <FiveStageDosingProcess
        v-if="showProcessPrototype"
        :pre-turbidity="realtimeDisplay.preTurbidity"
        :post-turbidity="realtimeDisplay.postTurbidity"
        :pump-percent="realtimeDisplay.pumpPercent"
        :pump-running="realtimeDisplay.pumpRunning"
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
        <span class="preview-title__arrow preview-title__arrow--left" aria-hidden="true"></span>
        <h1>智能加药五段闭环工艺监控</h1>
        <span class="preview-title__arrow preview-title__arrow--right" aria-hidden="true"></span>
      </div>
      <div class="process-status" aria-label="工艺运行状态">
        <span><i class="status-dot"></i>自动闭环</span>
        <span>TUB-02 目标 10-20 NTU</span>
        <span>PAC 配药箱液位正常</span>
      </div>
    </header>

    <aside class="left-stack">
      <DecorativePanel class="panel turbidity-panel" title="浊度仪实时数据">
        <RealtimeMetricBarChart
          :items="turbidityItems"
          :max="80"
          unit="NTU"
          aria-label="前馈浊度仪和后馈浊度仪实时数据柱状图"
        />
      </DecorativePanel>

      <DecorativePanel class="panel pump-state-panel" title="PAC泵实时状态">
        <div class="pump-state-head">
          <span class="running-state" :class="{ stopped: !realtimeDisplay.pumpRunning }">
            <i></i>{{ realtimeDisplay.pumpRunning ? '运行中' : '已停止' }}
          </span>
          <strong>{{ activePumpPercent }}<small>%</small></strong>
        </div>
        <RealtimeMetricBarChart
          :items="pumpItems"
          :max="100"
          unit="%"
          aria-label="PAC泵实时状态柱状图"
        />
      </DecorativePanel>

      <DecorativePanel class="panel trend-panel" title="实时趋势分析">
        <PacRealtimeTrendChart :data="trendDisplay" />
      </DecorativePanel>
    </aside>

    <aside class="right-stack">
      <DecorativePanel class="panel control-panel" direction="left" title="PAC泵控制">
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

          <p class="prototype-note">当前为原型数据，控制操作仅更新页面状态。</p>
        </section>
      </DecorativePanel>
    </aside>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { getBigWaterChannelAlarmNotificationTopic } from '../api/alarm.js';
import DecorativePanel from '../components/common/DecorativePanel.vue';
import FiveStageDosingProcess from '../components/realtime/FiveStageDosingProcess.vue';
import PacRealtimeTrendChart from '../components/realtime/PacRealtimeTrendChart.vue';
import PumpFrequencyGauge from '../components/realtime/PumpFrequencyGauge.vue';
import RealtimeMetricBarChart from '../components/realtime/RealtimeMetricBarChart.vue';
import SmartWaterFlumePreview from '../components/realtime/smart-water-flume-preview/SmartWaterFlumePreview.vue';

const props = defineProps({
  sceneTarget: { type: Object, default: null },
  prototypeData: { type: Object, default: null },
});

const emit = defineEmits(['pump-control-change', 'realtime-data']);
const previewRef = ref(null);
const showProcessPrototype = ref(true);
const alarmNotificationTopic = ref('');

const prototypeState = reactive({
  preTurbidity: 42,
  postTurbidity: 16,
  pumpPercent: 48,
  pumpRunning: true,
  trend: {
    times: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30', '10:35', '10:40', '10:45', '10:50', '10:55'],
    preTurbidity: [36, 38, 41, 45, 48, 46, 44, 43, 45, 44, 43, 42],
    postTurbidity: [18.2, 17.8, 17.4, 17.1, 16.8, 16.5, 16.2, 15.8, 15.7, 15.8, 15.9, 16],
    pumpPercent: [40, 42, 45, 49, 54, 53, 51, 49, 50, 49, 48, 48],
  },
});

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

const realtimeDisplay = computed(() => {
  const source = props.prototypeData || prototypeState;
  return {
    preTurbidity: finiteNumber(source.preTurbidity, prototypeState.preTurbidity),
    postTurbidity: finiteNumber(source.postTurbidity, prototypeState.postTurbidity),
    pumpPercent: Math.min(100, Math.max(0, finiteNumber(source.pumpPercent, prototypeState.pumpPercent))),
    pumpRunning: typeof source.pumpRunning === 'boolean' ? source.pumpRunning : prototypeState.pumpRunning,
    trend: source.trend || prototypeState.trend,
  };
});

const activePumpPercent = computed(() => (
  realtimeDisplay.value.pumpRunning ? realtimeDisplay.value.pumpPercent : 0
));

const turbidityItems = computed(() => [
  { label: '前馈浊度仪', value: realtimeDisplay.value.preTurbidity, color: '#39d8ff' },
  { label: '后馈浊度仪', value: realtimeDisplay.value.postTurbidity, color: '#64e59b' },
]);

const pumpItems = computed(() => [
  { label: 'PAC泵', value: activePumpPercent.value, color: '#ffc65c' },
]);

const trendDisplay = computed(() => {
  const trend = realtimeDisplay.value.trend;
  const pumpValues = [...(trend.pumpPercent || [])];
  if (pumpValues.length) pumpValues[pumpValues.length - 1] = activePumpPercent.value;
  return {
    times: trend.times || [],
    preTurbidity: trend.preTurbidity || [],
    postTurbidity: trend.postTurbidity || [],
    pumpPercent: pumpValues,
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

function handleMqttData(payload) {
  emit('realtime-data', payload);
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
.preview-title__arrow { display: block; width: 53px; height: 36px; flex: 0 0 53px; background: url('../assets/preview-title.png') center / 100% 100% no-repeat; }
.preview-title__arrow--right { transform: scaleX(-1); }

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

.control-panel { height: 100%; }
.control-panel :deep(.decorative-panel__content) { padding: 8px 14px 12px; overflow: hidden; }
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
.prototype-note { margin: auto 4px 0; padding-top: 14px; color: #65859e; font-size: 10px; text-align: center; }

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
  .pac-control-card :deep(.pump-frequency-gauge) { height: 140px; margin-top: 5px; flex-basis: 140px; }
  .range-scale { margin-bottom: 8px; }
  .control-summary div { height: 33px; }
  .prototype-note { padding-top: 6px; }
}
</style>
