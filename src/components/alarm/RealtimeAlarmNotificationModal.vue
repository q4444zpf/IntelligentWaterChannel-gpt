<template>
  <a-config-provider :locale="zhCN" :theme="alarmModalTheme">
    <teleport to="body">
      <div class="realtime-alarm-modal-layer">
        <div class="realtime-alarm-modal-mask" aria-hidden="true"></div>
        <div class="alarm-screen-flash" aria-hidden="true"></div>

        <section
          class="realtime-alarm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="realtime-alarm-modal-title"
          :aria-busy="submitting"
          tabindex="-1"
          autofocus
          @keydown.esc="!submitting && emit('ignore')"
        >
          <h2 id="realtime-alarm-modal-title" class="realtime-alarm-modal-title">
            {{ alarm.title || '告警通知' }}
          </h2>

          <div class="realtime-alarm-modal-body">
            <transition name="alarm-content-switch" mode="out-in">
              <div :key="alarm.notificationKey" class="alarm-notification-body">
                <div class="alarm-summary">
                  <div class="alarm-indicator" aria-hidden="true">!</div>
                  <div class="alarm-summary-text">
                    <strong>{{ alarm.deviceName || '未知设备' }}</strong>
                    <span>{{ alarm.deviceSn || '--' }}</span>
                  </div>
                  <a-tag color="red">{{ alarm.grade || '告警' }}</a-tag>
                </div>

                <a-descriptions :column="1" size="small" bordered>
                  <a-descriptions-item label="告警时间">{{ alarm.warnTime || '--' }}</a-descriptions-item>
                  <a-descriptions-item label="设备名称">{{ alarm.deviceName || '--' }}</a-descriptions-item>
                  <a-descriptions-item label="设备编号">{{ alarm.deviceSn || '--' }}</a-descriptions-item>
                  <a-descriptions-item label="当前值">{{ alarm.value ?? '--' }}</a-descriptions-item>
                </a-descriptions>

                <section class="alarm-content">
                  <span>告警信息</span>
                  <p>{{ alarm.content || '收到新的告警通知' }}</p>
                </section>

                <a-alert v-if="error" class="quick-handle-error" type="error" show-icon :message="error" />
              </div>
            </transition>
          </div>

          <footer class="alarm-modal-footer">
            <span class="queue-description">
              <template v-if="queueLength > 1">队列中还有 <strong>{{ queueLength - 1 }}</strong> 条告警</template>
              <template v-else>当前为最后一条告警</template>
            </span>
            <div class="alarm-modal-actions">
              <a-button :disabled="submitting" @click="emit('ignore')">忽略</a-button>
              <a-button :disabled="submitting" @click="emit('view-all')">查看全部告警</a-button>
              <a-button :disabled="submitting || queueLength <= 1" @click="emit('next')">下一条</a-button>
              <a-button type="primary" danger :loading="submitting" :disabled="!alarm.id" @click="quickHandle">
                快速处理
              </a-button>
            </div>
          </footer>
        </section>
      </div>
    </teleport>
  </a-config-provider>
</template>

<script setup>
import {
  Alert as AAlert,
  Button as AButton,
  ConfigProvider as AConfigProvider,
  Descriptions as ADescriptions,
  DescriptionsItem as ADescriptionsItem,
  Tag as ATag,
  theme as antTheme,
} from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { handleAlarm } from '../../api/alarm.js';

const props = defineProps({
  alarm: { type: Object, required: true },
  alarmAudioContext: { type: Object, default: null },
  alarmSoundEnabled: { type: Boolean, default: false },
  queueLength: { type: Number, default: 1 },
});
const emit = defineEmits(['handled', 'ignore', 'next', 'view-all']);
const submitting = ref(false);
const error = ref('');

function playAlarmSound() {
  const context = props.alarmAudioContext;
  if (!props.alarmSoundEnabled || !context || context.state !== 'running') return;
  const playTone = () => {
    const startTime = context.currentTime;
    const cycleCount = 4;
    const lowFrequency = 650;
    const highFrequency = 1550;
    const riseDuration = 0.16;
    const highFrequencyHoldDuration = 0.02;
    const fallDuration = 0.16;
    const lowFrequencyHoldDuration = 0.02;
    const cycleDuration = riseDuration + highFrequencyHoldDuration
      + fallDuration + lowFrequencyHoldDuration;
    const squareOscillator = context.createOscillator();
    const sineOscillator = context.createOscillator();
    const squareWaveformGain = context.createGain();
    const sineWaveformGain = context.createGain();
    const lowPassFilter = context.createBiquadFilter();
    const masterGain = context.createGain();

    squareOscillator.type = 'square';
    sineOscillator.type = 'sine';
    squareWaveformGain.gain.setValueAtTime(0.18, startTime);
    sineWaveformGain.gain.setValueAtTime(0.18, startTime);
    lowPassFilter.type = 'lowpass';
    lowPassFilter.frequency.setValueAtTime(4300, startTime);
    masterGain.gain.setValueAtTime(0.22, startTime);

    const scheduleFrequencySweep = (oscillator) => {
      for (let cycleIndex = 0; cycleIndex < cycleCount; cycleIndex += 1) {
        const cycleStartTime = startTime + cycleIndex * cycleDuration;
        const highFrequencyStartTime = cycleStartTime + riseDuration;
        const fallStartTime = highFrequencyStartTime + highFrequencyHoldDuration;
        const lowFrequencyStartTime = fallStartTime + fallDuration;
        const cycleEndTime = lowFrequencyStartTime + lowFrequencyHoldDuration;
        oscillator.frequency.setValueAtTime(lowFrequency, cycleStartTime);
        oscillator.frequency.linearRampToValueAtTime(highFrequency, highFrequencyStartTime);
        oscillator.frequency.setValueAtTime(highFrequency, fallStartTime);
        oscillator.frequency.linearRampToValueAtTime(lowFrequency, lowFrequencyStartTime);
        oscillator.frequency.setValueAtTime(lowFrequency, cycleEndTime);
      }
    };

    scheduleFrequencySweep(squareOscillator);
    scheduleFrequencySweep(sineOscillator);
    squareOscillator.connect(squareWaveformGain);
    squareWaveformGain.connect(lowPassFilter);
    sineOscillator.connect(sineWaveformGain);
    sineWaveformGain.connect(lowPassFilter);
    lowPassFilter.connect(masterGain);
    masterGain.connect(context.destination);
    squareOscillator.start(startTime);
    sineOscillator.start(startTime);
    squareOscillator.stop(startTime + cycleCount * cycleDuration);
    sineOscillator.stop(startTime + cycleCount * cycleDuration);
  };

  playTone();
}

watch(() => props.alarm.notificationKey, () => {
  error.value = '';
  submitting.value = false;
});

watch(() => props.alarmSoundEnabled, (enabled) => {
  if (enabled) playAlarmSound();
});

onMounted(() => {
  window.addEventListener('realtime-alarm-arrived', playAlarmSound);
});

onBeforeUnmount(() => {
  window.removeEventListener('realtime-alarm-arrived', playAlarmSound);
});

const alarmModalTheme = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    colorPrimary: '#ff4d4f',
    colorBgBase: '#010f1e',
    colorBgContainer: '#061a2d',
    colorBorder: '#315a80',
    colorText: '#eff7ff',
    borderRadius: 5,
    controlHeight: 34,
    fontSize: 13,
  },
};

async function quickHandle() {
  if (!props.alarm.id || submitting.value) return;
  submitting.value = true;
  error.value = '';
  try {
    await handleAlarm({ id: props.alarm.id, handlingRemark: '快速处理' });
    emit('handled');
  } catch (requestError) {
    error.value = requestError?.message || '快速处理失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
@font-face {
  font-family: 'YouSheBiaoTiHei';
  src: url('../../assets/优设标题黑.ttf') format('truetype');
  font-display: swap;
}

.realtime-alarm-modal-layer {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  padding: 24px;
  place-items: center;
}

.realtime-alarm-modal-mask {
  position: absolute;
  z-index: 0;
  inset: 0;
  background: rgba(0, 0, 0, 0.58);
}

.alarm-screen-flash {
  position: absolute;
  z-index: 1;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 52%, rgba(255, 0, 0, 0.15) 100%);
  box-shadow:
    inset 0 0 18px 4px rgba(255, 0, 0, 0.9),
    inset 0 0 72px 18px rgba(255, 0, 0, 0.55),
    inset 0 0 150px 34px rgba(255, 0, 0, 0.36);
  opacity: 0.5;
  animation: realtime-alarm-screen-flash 0.82s ease-in-out infinite;
}

.realtime-alarm-dialog {
  position: relative;
  z-index: 2;
  display: flex;
  width: min(600px, calc(100vw - 32px));
  max-height: calc(100dvh - 48px);
  flex-direction: column;
  overflow: hidden;
  outline: none;
  background-image:
    url('../../assets/alarm-modal-bg.png'),
    url('../../assets/alarm-modal-bg.png');
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;
}

.realtime-alarm-modal-title {
  position: absolute;
  z-index: 2;
  top: 11px;
  right: 0;
  left: 0;
  display: grid;
  width: auto;
  margin: 0;
  place-items: center;
  color: #f2f9ff;
  font-family: 'YouSheBiaoTiHei', sans-serif;
  font-size: 18px;
  font-weight: 400;
  line-height: 28px;
  text-shadow: 0 0 10px rgba(102, 206, 255, 0.72);
}

.realtime-alarm-modal-body {
  min-height: 0;
  padding: 52px 24px 0;
  overflow-y: auto;
}

.alarm-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 77, 79, 0.45);
  border-radius: 5px;
  background: rgba(255, 77, 79, 0.08);
}

.alarm-indicator {
  display: grid;
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: #ff4d4f;
  color: #fff;
  font-size: 20px;
  font-weight: 800;
}

.alarm-summary-text {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.alarm-summary-text strong { color: #fff; font-size: 15px; }
.alarm-summary-text span { color: #8faccc; }
.alarm-summary .ant-tag { flex: none; margin: 0; }

.alarm-content { margin-top: 18px; }
.alarm-content > span { display: block; margin-bottom: 7px; color: #8faccc; }
.alarm-content p {
  min-height: 58px;
  margin: 0;
  padding: 12px 14px;
  border-left: 3px solid #ff4d4f;
  background: rgba(3, 25, 44, 0.86);
  color: #f3f8fd;
  line-height: 1.7;
}

.quick-handle-error { margin-top: 16px; }

@keyframes realtime-alarm-screen-flash {
  0%, 100% { opacity: 0.28; }
  50% { opacity: 0.9; }
}

.alarm-content-switch-enter-active,
.alarm-content-switch-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.alarm-content-switch-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.alarm-content-switch-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

.alarm-modal-footer {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 12px 24px 0;
  padding: 14px 0 24px;
  border-top: 1px solid rgba(72, 155, 230, 0.24);
  background: transparent;
}

.queue-description {
  display: inline-flex;
  flex: none;
  align-items: center;
  color: #8faccc;
  font-size: 12px;
}

.queue-description strong {
  display: inline-grid;
  min-width: 28px;
  height: 28px;
  margin: 0 5px;
  padding: 0 6px;
  place-items: center;
  border: 1px solid #ff7875;
  border-radius: 4px;
  background: #cf1322;
  box-shadow: 0 0 14px rgba(255, 77, 79, 0.55);
  color: #fff;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.alarm-modal-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: 8px;
}

@media (prefers-reduced-motion: reduce) {
  .alarm-screen-flash {
    animation: none;
    opacity: 0.62;
  }
}

@media (max-width: 640px) {
  .realtime-alarm-modal-layer { padding: 10px; }
  .realtime-alarm-dialog { width: calc(100vw - 20px); max-height: calc(100dvh - 20px); }
  .realtime-alarm-modal-body { padding: 48px 18px 0; }
  .realtime-alarm-modal-title { top: 9px; font-size: 16px; }
  .alarm-modal-footer { align-items: stretch; flex-direction: column; margin-inline: 18px; padding-bottom: 20px; }
  .alarm-modal-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
