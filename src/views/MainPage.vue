<template>
  <AppShell :active-page="activePage" @navigate="showPage">
    <RealtimeView
      v-show="activePage === 'realtime'"
      :scene-target="realtimeSceneTarget"
      @navigate="showPage"
    />
    <HistoryView
      v-if="activePage === 'history'"
      :alarm-context="historyAlarmContext"
      @alarm-context-consumed="historyAlarmContext = null"
    />
    <AlarmView
      v-if="activePage === 'alarm'"
      ref="alarmView"
      @navigate="showPage"
      @open-alarm="openAlarm"
      @view-history="openAlarmHistory"
    />

    <AlarmDetailModal
      v-if="selectedAlarm"
      :alarm="selectedAlarm"
      @close="closeAlarm"
      @handled="handleAlarmHandled"
      @locate="navigateFromAlarm('realtime')"
      @view-history="openAlarmHistory"
    />

    <!-- [临时禁用] 实时告警弹窗，改为顶部铃铛气泡通知
    <RealtimeAlarmNotificationModal
      v-if="realtimeAlarm"
      :alarm="realtimeAlarm"
      :alarm-audio-context="alarmAudioContext"
      :alarm-sound-enabled="alarmSoundEnabled"
      :queue-length="realtimeAlarmQueue.length"
      @handled="handleRealtimeAlarmHandled"
      @ignore="clearRealtimeAlarmQueue"
      @next="removeCurrentRealtimeAlarm"
      @view-all="openRealtimeAlarmList"
    />
    -->

    <a-config-provider :theme="alarmSoundPromptTheme">
      <a-modal
        :open="alarmSoundPromptOpen"
        :closable="false"
        :keyboard="false"
        :mask-closable="false"
        centered
        title="开启告警声音"
        ok-text="开启声音"
        cancel-text="暂不开启"
        wrap-class-name="alarm-sound-prompt-wrap"
        @ok="enableAlarmSound"
        @cancel="disableAlarmSound"
      >
        <p>系统将在收到实时告警时播放提示音。</p>
      </a-modal>
    </a-config-provider>
  </AppShell>
</template>

<script setup>
import { ConfigProvider as AConfigProvider, Modal as AModal, theme as antTheme } from 'ant-design-vue';
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import AlarmDetailModal from '../components/alarm/AlarmDetailModal.vue';
// import RealtimeAlarmNotificationModal from '../components/alarm/RealtimeAlarmNotificationModal.vue';
import AppShell from '../layouts/AppShell.vue';
import AlarmView from './AlarmView.vue';
import HistoryView from './HistoryView.vue';
import RealtimeView from './RealtimeView.vue';

const activePage = ref('realtime');
const selectedAlarm = ref(null);
const alarmView = ref(null);
const historyAlarmContext = ref(null);
const realtimeSceneTarget = ref(null);
// const realtimeAlarmQueue = ref([]);
// const realtimeAlarm = computed(() => realtimeAlarmQueue.value[0] || null);
const alarmSoundPromptOpen = ref(false);
const alarmSoundEnabled = ref(false);
const alarmAudioContext = shallowRef(null);
const alarmSoundPromptTheme = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    borderRadius: 6,
    colorBgBase: '#010f1e',
    colorBgContainer: '#061a2d',
    colorBorder: '#315a80',
    colorPrimary: '#1677ff',
    colorText: '#eff7ff',
    colorTextSecondary: '#8faccc',
  },
};
let realtimeSceneTargetSequence = 0;
// let realtimeAlarmSequence = 0;

function enableAlarmSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    alarmSoundPromptOpen.value = false;
    return;
  }

  const context = new AudioContextClass();
  const enable = () => {
    alarmAudioContext.value = context;
    alarmSoundEnabled.value = true;
    alarmSoundPromptOpen.value = false;
  };

  if (context.state === 'running') {
    enable();
  } else {
    void context.resume().then(enable).catch(() => {
      void context.close();
      alarmAudioContext.value = null;
    });
  }
}

function disableAlarmSound() {
  alarmSoundPromptOpen.value = false;
}

function playAlarmSound() {
  const context = alarmAudioContext.value;
  if (!alarmSoundEnabled.value || !context || context.state !== 'running') return;
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

function showPage(page, options) {
  activePage.value = page;
  const channelName = typeof options?.channelName === 'string' ? options.channelName.trim() : '';
  if (page === 'realtime' && channelName) {
    realtimeSceneTarget.value = {
      channelName,
      sequence: ++realtimeSceneTargetSequence,
    };
  }
}

function openAlarm(alarm) {
  selectedAlarm.value = alarm;
}

function closeAlarm() {
  selectedAlarm.value = null;
}

function handleAlarmHandled() {
  closeAlarm();
  void alarmView.value?.refresh();
  window.dispatchEvent(new Event('alarm-status-changed'));
}

function navigateFromAlarm(page) {
  const alarm = selectedAlarm.value;
  closeAlarm();
  const channelName = typeof alarm?.location === 'string' ? alarm.location.trim() : '';
  showPage(page, page === 'realtime' && channelName && channelName !== '--'
    ? { channelName }
    : undefined);
}

function openAlarmHistory(alarm = selectedAlarm.value) {
  historyAlarmContext.value = alarm ? { ...alarm } : null;
  closeAlarm();
  showPage('history');
}

function handleRealtimeAlarmNotification(event) {
  const payload = event.detail;
  const alarm = payload && typeof payload === 'object'
    ? { ...payload }
    : { title: '告警通知', content: String(payload || '收到新的告警通知') };

  playAlarmSound();

  window.dispatchEvent(new CustomEvent('alarm-bubble', { detail: alarm }));

  /* [临时禁用] 原队列弹窗逻辑
  realtimeAlarmQueue.value.push({
    ...alarm,
    notificationKey: ++realtimeAlarmSequence,
  });
  void nextTick(() => window.dispatchEvent(new Event('realtime-alarm-arrived')));
  */
}

// [临时禁用] 原队列弹窗辅助函数
// function removeCurrentRealtimeAlarm() {
//   realtimeAlarmQueue.value.shift();
// }
//
// function clearRealtimeAlarmQueue() {
//   realtimeAlarmQueue.value = [];
// }
//
// function handleRealtimeAlarmHandled() {
//   removeCurrentRealtimeAlarm();
//   void alarmView.value?.refresh();
//   window.dispatchEvent(new Event('alarm-status-changed'));
// }
//
// function openRealtimeAlarmList() {
//   clearRealtimeAlarmQueue();
//   showPage('alarm');
// }

onMounted(() => {
  window.addEventListener('alarm-notification', handleRealtimeAlarmNotification);
  void nextTick(() => {
    alarmSoundPromptOpen.value = true;
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('alarm-notification', handleRealtimeAlarmNotification);
  if (alarmAudioContext.value) {
    void alarmAudioContext.value.close();
    alarmAudioContext.value = null;
  }
});
</script>

<style scoped>
:global(.alarm-sound-prompt-wrap .ant-modal-content) {
  overflow: hidden;
  padding: 0;
  border: 1px solid rgba(55, 151, 235, 0.62);
  background: #061a2d;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.7), 0 0 32px rgba(0, 126, 255, 0.2);
}

:global(.alarm-sound-prompt-wrap .ant-modal-header) {
  margin: 0;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(72, 155, 230, 0.3);
  background: rgba(9, 47, 78, 0.72);
}

:global(.alarm-sound-prompt-wrap .ant-modal-title) {
  color: #eff7ff;
  font-size: 16px;
}

:global(.alarm-sound-prompt-wrap .ant-modal-body) {
  padding: 18px 20px;
  color: #b9d6ed;
}

:global(.alarm-sound-prompt-wrap .ant-modal-body p) {
  margin: 0;
}

:global(.alarm-sound-prompt-wrap .ant-modal-footer) {
  margin: 0;
  padding: 12px 20px;
  border-top: 1px solid rgba(72, 155, 230, 0.24);
  background: rgba(1, 13, 25, 0.5);
}
</style>