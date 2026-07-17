<template>
  <AppShell :active-page="activePage" @navigate="showPage">
    <RealtimeView v-if="activePage === 'realtime'" @navigate="showPage" />
    <HistoryView v-else-if="activePage === 'history'" />
    <AlarmView v-else @navigate="showPage" @open-alarm="openAlarm" />

    <AlarmDetailModal
      v-if="selectedAlarm"
      :alarm="selectedAlarm"
      @close="closeAlarm"
      @confirm="closeAlarm"
      @locate="navigateFromAlarm('realtime')"
      @view-history="navigateFromAlarm('history')"
    />
  </AppShell>
</template>

<script setup>
import { ref } from 'vue';
import AlarmDetailModal from './components/alarm/AlarmDetailModal.vue';
import AppShell from './layouts/AppShell.vue';
import AlarmView from './views/AlarmView.vue';
import HistoryView from './views/HistoryView.vue';
import RealtimeView from './views/RealtimeView.vue';

const activePage = ref('realtime');
const selectedAlarm = ref(null);

function showPage(page) {
  activePage.value = page;
}

function openAlarm(alarm) {
  selectedAlarm.value = alarm;
}

function closeAlarm() {
  selectedAlarm.value = null;
}

function navigateFromAlarm(page) {
  closeAlarm();
  showPage(page);
}
</script>
