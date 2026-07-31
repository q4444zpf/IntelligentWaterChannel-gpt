<template>
  <header class="topbar">
    <div class="brand"><span class="brand-mark"></span>智能水槽三维实时监控系统</div>
    <nav class="main-tabs" aria-label="主导航">
      <button
        v-for="tab in PAGE_TABS"
        :key="tab.key"
        class="nav-tab"
        :class="{ active: activePage === tab.key }"
        @click="$emit('navigate', tab.key)"
      >
        {{ tab.label }}
        <span v-if="tab.key === 'alarm' && unhandledAlarmCount > 0" class="badge">{{ unhandledAlarmDisplay }}</span>
      </button>
    </nav>
    <div class="meta">工况：明满流混合实验</div>
    <div class="meta">实验编号：EXP-20260708-001</div>
    <div class="meta">模式：手动控制</div>
    <div class="status-strip">
      <span class="status ok">PLC 在线</span>
      <span class="status ok">WebSocket 已连接</span>
      <span class="status ok">数据库 正常</span>
    </div>
    <time class="clock">09:35:21</time>
    <div class="user-area">
      <span class="user-name">{{ username }}</span>
      <button class="logout-btn" title="退出登录" :disabled="loggingOut" @click="handleLogout">
        {{ loggingOut ? '退出中' : '退出' }}
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getBigWaterChannelAlarmStatistics } from '../api/alarm.js';
import { normalizeAlarmStatistics } from '../alarm-data.js';
import { PAGE_TABS } from '../data/monitoring-data.js';
import { authState, signOut } from '../stores/auth.js';

const router = useRouter();

defineProps({
  activePage: { type: String, required: true }
});

defineEmits(['navigate']);

const loggingOut = ref(false);
const unhandledAlarmCount = ref(0);
const unhandledAlarmDisplay = computed(() => unhandledAlarmCount.value > 999 ? '999+' : unhandledAlarmCount.value);
let alarmRefreshTimer = null;
const username = computed(() => {
  const user = authState.user.value;
  return user?.name || user?.username || user?.account || '用户';
});

async function handleLogout() {
  if (loggingOut.value) return;

  loggingOut.value = true;
  try {
    await signOut();
  } catch (error) {
    console.error(error);
  } finally {
    await router.replace({ name: 'login' });
    loggingOut.value = false;
  }
}

async function refreshUnhandledAlarmCount() {
  try {
    const statistics = normalizeAlarmStatistics(await getBigWaterChannelAlarmStatistics());
    unhandledAlarmCount.value = statistics.unhandled;
  } catch (error) {
    console.error('获取未处理告警数量失败', error);
  }
}

onMounted(() => {
  void refreshUnhandledAlarmCount();
  alarmRefreshTimer = window.setInterval(refreshUnhandledAlarmCount, 30_000);
  window.addEventListener('alarm-status-changed', refreshUnhandledAlarmCount);
});

onBeforeUnmount(() => {
  if (alarmRefreshTimer !== null) window.clearInterval(alarmRefreshTimer);
  window.removeEventListener('alarm-status-changed', refreshUnhandledAlarmCount);
});
</script>
