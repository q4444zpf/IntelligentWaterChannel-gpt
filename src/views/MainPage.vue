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

    <RealtimeAlarmNotificationModal
      v-if="realtimeAlarm"
      :alarm="realtimeAlarm"
      :queue-length="realtimeAlarmQueue.length"
      @handled="handleRealtimeAlarmHandled"
      @ignore="clearRealtimeAlarmQueue"
      @next="removeCurrentRealtimeAlarm"
      @view-all="openRealtimeAlarmList"
    />
  </AppShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import AlarmDetailModal from '../components/alarm/AlarmDetailModal.vue';
import RealtimeAlarmNotificationModal from '../components/alarm/RealtimeAlarmNotificationModal.vue';
import AppShell from '../layouts/AppShell.vue';
import AlarmView from './AlarmView.vue';
import HistoryView from './HistoryView.vue';
import RealtimeView from './RealtimeView.vue';

const activePage = ref('realtime');
const selectedAlarm = ref(null);
const alarmView = ref(null);
const historyAlarmContext = ref(null);
const realtimeSceneTarget = ref(null);
const realtimeAlarmQueue = ref([]);
const realtimeAlarm = computed(() => realtimeAlarmQueue.value[0] || null);
let realtimeAlarmSequence = 0;
let realtimeSceneTargetSequence = 0;

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
  realtimeAlarmQueue.value.push({
    ...alarm,
    notificationKey: ++realtimeAlarmSequence,
  });
  window.dispatchEvent(new Event('realtime-alarm-arrived'));
}

function removeCurrentRealtimeAlarm() {
  realtimeAlarmQueue.value.shift();
}

function clearRealtimeAlarmQueue() {
  realtimeAlarmQueue.value = [];
}

function handleRealtimeAlarmHandled() {
  removeCurrentRealtimeAlarm();
  void alarmView.value?.refresh();
  window.dispatchEvent(new Event('alarm-status-changed'));
}

function openRealtimeAlarmList() {
  clearRealtimeAlarmQueue();
  showPage('alarm');
}

onMounted(() => {
  window.addEventListener('alarm-notification', handleRealtimeAlarmNotification);
});

onBeforeUnmount(() => {
  window.removeEventListener('alarm-notification', handleRealtimeAlarmNotification);
});
</script>
