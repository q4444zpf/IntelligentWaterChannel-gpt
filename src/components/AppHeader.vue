<template>
  <header class="topbar">
    <img class="topbar-background" :src="headerBackground" alt="" aria-hidden="true">

    <div class="brand">智能水槽监控系统</div>

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

    <div class="header-right">
      <div class="status-strip">
        <span class="status ok">PLC 在线</span>
        <span class="status ok">WebSocket 已连接</span>
        <span class="status ok">数据库 正常</span>
      </div>

      <div class="header-meta">
        <span>工况：明满流混合实验</span>
        <span>实验编号：EXP-20260708-001</span>
        <span>模式：手动控制</span>
      </div>

      <div class="header-account">
        <div class="user-area" @focusout="handleUserAreaFocusOut" @keydown.esc="userMenuOpen = false">
          <svg class="user-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10,0C15.52,0,20,4.48,20,10C20,15.52,15.52,20,10,20C4.48,20,0,15.52,0,10C0,4.48,4.48,0,10,0ZM4.0233202,13.4163C5.4908299,15.606899,7.6951103,17,10.1597,17C12.6243,17,14.8286,15.606899,16.296101,13.4163C14.688499,11.9172,12.5312,11,10.1597,11C7.7882099,11,5.63095,11.9172,4.0233202,13.4163ZM10,9C11.6569,9,13,7.6568499,13,6C13,4.3431501,11.6569,3,10,3C8.3430996,3,7,4.3431501,7,6C7,7.6568499,8.3430996,9,10,9Z" />
          </svg>
          <span class="user-name">{{ username }}</span>
          <button
            class="user-menu-toggle"
            type="button"
            title="用户菜单"
            aria-label="打开用户菜单"
            :aria-expanded="userMenuOpen"
            @click="userMenuOpen = !userMenuOpen"
          >
            <svg width="10" height="5" viewBox="0 0 10 5" aria-hidden="true">
              <path d="M5,5L10,10L0,10L5,5Z" transform="matrix(1,0,0,-1,0,10)" />
            </svg>
          </button>
          <div v-if="userMenuOpen" class="user-menu">
            <button class="logout-btn" type="button" :disabled="loggingOut" @click="handleLogout">
              {{ loggingOut ? '退出中' : '退出登录' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import headerBackground from '../assets/bg-header.png';
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
const userMenuOpen = ref(false);
const unhandledAlarmCount = ref(0);
const unhandledAlarmDisplay = computed(() => unhandledAlarmCount.value > 999 ? '999+' : unhandledAlarmCount.value);
let alarmRefreshTimer = null;
const username = computed(() => {
  const user = authState.user.value;
  return user?.name || user?.username || user?.account || '用户';
});

function handleUserAreaFocusOut(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    userMenuOpen.value = false;
  }
}

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

function scheduleUnhandledAlarmRefresh() {
  if (alarmRefreshTimer !== null) window.clearTimeout(alarmRefreshTimer);
  alarmRefreshTimer = window.setTimeout(() => {
    alarmRefreshTimer = null;
    void refreshUnhandledAlarmCount();
  }, 300);
}

onMounted(() => {
  void refreshUnhandledAlarmCount();
  window.addEventListener('alarm-notification', scheduleUnhandledAlarmRefresh);
  window.addEventListener('alarm-status-changed', refreshUnhandledAlarmCount);
});

onBeforeUnmount(() => {
  if (alarmRefreshTimer !== null) window.clearTimeout(alarmRefreshTimer);
  window.removeEventListener('alarm-notification', scheduleUnhandledAlarmRefresh);
  window.removeEventListener('alarm-status-changed', refreshUnhandledAlarmCount);
});
</script>

<style scoped>
.topbar {
  position: relative;
  display: block;
  width: 100%;
  height: 96px;
  min-height: 96px;
  padding: 0;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.topbar-background {
  position: absolute;
  top: -4px;
  left: 50%;
  z-index: 0;
  height: 96px;
  transform: translateX(-50%);
  pointer-events: none;
}

.brand {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 2;
  display: flex;
  height: 57px;
  align-items: center;
  justify-content: center;
  transform: translateX(-50%);
  background: linear-gradient(180deg, #ffffff 44%, #5dccff 100%);
  background-clip: text;
  color: transparent;
  font-size: 48px;
  font-variation-settings: 'opsz' auto;
  font-feature-settings: 'kern' on;
  font-weight: bold;
  letter-spacing: 0.1em;
  line-height: normal;
  text-shadow: 0 2px 12px #0b549d;
  white-space: nowrap;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.main-tabs {
  position: absolute;
  top: 37px;
  left: 87px;
  z-index: 3;
  display: flex;
  height: 40px;
  align-items: stretch;
  gap: 8px;
}

.nav-tab {
  min-width: 112px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(91, 205, 255, 0.78);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(53, 122, 175, 0.72), rgba(5, 45, 83, 0.88));
  color: #f4fbff;
  font-size: 16px;
  font-weight: 700;
  box-shadow: inset 0 0 10px rgba(91, 205, 255, 0.18);
}

.nav-tab:hover,
.nav-tab.active {
  border-color: #8bddff;
  background: linear-gradient(180deg, rgba(102, 190, 248, 0.92), rgba(18, 99, 166, 0.96));
  box-shadow: inset 0 0 14px rgba(255, 255, 255, 0.3), 0 0 16px rgba(38, 166, 255, 0.42);
}

.header-right {
  position: absolute;
  top: 33px;
  right: 40px;
  z-index: 2;
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  column-gap: 14px;
  row-gap: 6px;
}

.status-strip {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  gap: 6px;
}

.status {
  padding: 4px 8px;
  font-size: 12px;
}

.header-meta {
  grid-column: 1 / -1;
  grid-row: 2;
  display: flex;
  height: 30px;
  padding-right: 39px;
  align-items: center;
  justify-self: end;
  gap: 8px;
  background: url('../assets/status-bg.png') right center / auto 100% no-repeat;
  color: #a8d7f4;
  font-size: 14px;
  white-space: nowrap;
}

.header-meta span + span::before {
  margin-right: 8px;
  color: rgba(133, 211, 255, 0.58);
  content: '|';
}

.header-account {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-area {
  position: relative;
  display: flex;
  min-height: 24px;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-size: 14px;
  white-space: nowrap;
}

.user-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  fill: #ffffff;
}

.user-menu-toggle {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.user-menu-toggle:hover,
.user-menu-toggle:focus-visible {
  border: 0;
  outline: 1px solid rgba(111, 216, 255, 0.68);
  outline-offset: 1px;
  background: rgba(42, 142, 204, 0.24);
  box-shadow: none;
}

.user-menu-toggle svg {
  display: block;
  fill: #ffffff;
  transition: transform 0.18s ease;
}

.user-menu-toggle[aria-expanded='true'] svg {
  transform: rotate(180deg);
}

.user-menu {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  z-index: 8;
  min-width: 92px;
  padding: 4px;
  border: 1px solid rgba(81, 190, 246, 0.58);
  border-radius: 3px;
  background: rgba(3, 35, 66, 0.98);
  box-shadow: 0 8px 20px rgba(0, 8, 24, 0.48), 0 0 12px rgba(25, 147, 225, 0.2);
}

.logout-btn {
  width: 100%;
  padding: 5px 10px;
  border-color: rgba(255, 104, 94, 0.48);
  background: rgba(105, 24, 32, 0.56);
  color: #ffaaa4;
  white-space: nowrap;
}

@media (max-width: 1500px) {
  .header-meta {
    gap: 8px;
  }

  .header-meta span + span::before {
    margin-right: 8px;
  }
}
</style>
