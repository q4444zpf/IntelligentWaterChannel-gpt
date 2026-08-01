<template>
  <AppShell :active-page="activePage" @navigate="showPage">
    <RealtimeView v-show="activePage === 'realtime'" @navigate="showPage" />
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
    />

    <AlarmDetailModal
      v-if="selectedAlarm"
      :alarm="selectedAlarm"
      @close="closeAlarm"
      @handled="handleAlarmHandled"
      @locate="navigateFromAlarm('realtime')"
      @view-history="openAlarmHistory"
    />
  </AppShell>
</template>

<script setup>
import { ref } from 'vue';
import AlarmDetailModal from '../components/alarm/AlarmDetailModal.vue';
import AppShell from '../layouts/AppShell.vue';
import AlarmView from './AlarmView.vue';
import HistoryView from './HistoryView.vue';
import RealtimeView from './RealtimeView.vue';

const activePage = ref('realtime');
const selectedAlarm = ref(null);
const alarmView = ref(null);
const historyAlarmContext = ref(null);

function showPage(page) {
  activePage.value = page;
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
  closeAlarm();
  showPage(page);
}

function openAlarmHistory() {
  historyAlarmContext.value = selectedAlarm.value ? { ...selectedAlarm.value } : null;
  closeAlarm();
  showPage('history');
}
</script>
