<template>
  <a-config-provider :locale="zhCN" :theme="alarmModalTheme">
    <div class="alarm-screen-flash" aria-hidden="true"></div>
    <a-modal
      :open="true"
      :title="alarm.title || '告警通知'"
      :width="600"
      :closable="!submitting"
      :keyboard="!submitting"
      :mask-closable="false"
      centered
      wrap-class-name="realtime-alarm-modal-wrap"
      @cancel="emit('ignore')"
    >
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

      <template #footer>
        <div class="alarm-modal-footer">
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
        </div>
      </template>
    </a-modal>
  </a-config-provider>
</template>

<script setup>
import {
  Alert as AAlert,
  Button as AButton,
  ConfigProvider as AConfigProvider,
  Descriptions as ADescriptions,
  DescriptionsItem as ADescriptionsItem,
  Modal as AModal,
  Tag as ATag,
  theme as antTheme,
} from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { handleAlarm } from '../../api/alarm.js';

const props = defineProps({
  alarm: { type: Object, required: true },
  queueLength: { type: Number, default: 1 },
});
const emit = defineEmits(['handled', 'ignore', 'next', 'view-all']);
const submitting = ref(false);
const error = ref('');
let alarmAudioContext;

function playAlarmSound() {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  alarmAudioContext ??= new AudioContextClass();

  const context = alarmAudioContext;
  const playTone = () => {
    const startTime = context.currentTime;
    const cycleCount = 4;
    const lowFrequency = 650;
    const highFrequency = 1550;
    const riseDuration = 0.16;
    const highFrequencyHoldDuration = 0;
    const fallDuration = 0.16;
    const lowFrequencyHoldDuration = 0;
    const cycleDuration = riseDuration + highFrequencyHoldDuration
      + fallDuration + lowFrequencyHoldDuration;
    const oscillator = context.createOscillator();
    const waveformGain = context.createGain();
    const lowPassFilter = context.createBiquadFilter();
    const masterGain = context.createGain();

    oscillator.type = 'square';
    waveformGain.gain.setValueAtTime(0.18, startTime);
    lowPassFilter.type = 'lowpass';
    lowPassFilter.frequency.setValueAtTime(4300, startTime);
    masterGain.gain.setValueAtTime(0.22, startTime);

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

    oscillator.connect(waveformGain);
    waveformGain.connect(lowPassFilter);
    lowPassFilter.connect(masterGain);
    masterGain.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + cycleCount * cycleDuration);
  };

  if (context.state === 'suspended') {
    void context.resume().then(playTone).catch(() => {});
  } else {
    playTone();
  }
}

watch(() => props.alarm.notificationKey, () => {
  error.value = '';
  submitting.value = false;
});

onMounted(() => {
  window.addEventListener('realtime-alarm-arrived', playAlarmSound);
});

onBeforeUnmount(() => {
  window.removeEventListener('realtime-alarm-arrived', playAlarmSound);
  if (alarmAudioContext) {
    void alarmAudioContext.close();
    alarmAudioContext = null;
  }
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
.alarm-screen-flash {
  position: fixed;
  z-index: 999;
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

:global(.realtime-alarm-modal-wrap) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:global(.realtime-alarm-modal-wrap .ant-modal) {
  top: auto;
  margin: 0;
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
  .alarm-modal-footer { align-items: stretch; flex-direction: column; }
  .alarm-modal-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
