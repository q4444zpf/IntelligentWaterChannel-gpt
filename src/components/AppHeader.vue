<template>
  <header class="topbar">
    <img class="topbar-background" :src="headerBackground" alt="" aria-hidden="true">

    <div
      class="menu-area"
      @focusout="handleUserAreaFocusOut"
      @keydown.esc="userMenuOpen = false"
    >
      <button
        class="menu-trigger"
        type="button"
        aria-label="打开系统菜单"
        :aria-expanded="userMenuOpen"
        @click="userMenuOpen = !userMenuOpen"
      >
        <MenuOutlined aria-hidden="true" />
        <span>菜单</span>
        <span v-if="unhandledAlarmCount > 0" class="badge">{{ unhandledAlarmDisplay }}</span>
      </button>

      <Transition name="menu-popover">
        <nav v-if="userMenuOpen" class="menu-popover" aria-label="主导航">
          <button
            v-for="tab in PAGE_TABS"
            :key="tab.key"
            class="menu-item"
            :class="{ active: activePage === tab.key }"
            type="button"
            @click="$emit('navigate', tab.key); userMenuOpen = false"
          >
            <component :is="PAGE_ICONS[tab.key]" aria-hidden="true" />
            <span>{{ tab.label }}</span>
            <span v-if="tab.key === 'alarm' && unhandledAlarmCount > 0" class="menu-item__count">
              {{ unhandledAlarmDisplay }}
            </span>
          </button>

          <div class="menu-account">
            <span class="menu-account__name">{{ username }}</span>
            <button class="logout-btn" type="button" :disabled="loggingOut" @click="handleLogout">
              <LogoutOutlined aria-hidden="true" />
              {{ loggingOut ? '退出中' : '退出登录' }}
            </button>
          </div>
        </nav>
      </Transition>
    </div>

    <div class="brand">智能水槽监控系统</div>

    <div class="plc-status" role="status">
      <span class="plc-status__dot" aria-hidden="true"></span>
      <span>PLC在线</span>
    </div>
  </header>
</template>

<script setup>
import {
  AlertOutlined,
  DashboardOutlined,
  HistoryOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons-vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import headerBackground from '../assets/bg-header.png';
import { getBigWaterChannelAlarmStatistics } from '../api/alarm.js';
import { normalizeAlarmStatistics } from '../alarm-data.js';
import { PAGE_TABS } from '../data/monitoring-data.js';
import { authState, signOut } from '../stores/auth.js';

const PAGE_ICONS = {
  realtime: DashboardOutlined,
  history: HistoryOutlined,
  alarm: AlertOutlined,
};
const router = useRouter();

defineProps({
  activePage: { type: String, required: true },
});

defineEmits(['navigate']);

const loggingOut = ref(false);
const userMenuOpen = ref(false);
const unhandledAlarmCount = ref(0);
const unhandledAlarmDisplay = computed(() => unhandledAlarmCount.value > 999 ? '999+' : unhandledAlarmCount.value);
const username = computed(() => {
  const user = authState.user.value;
  return user?.name || user?.username || user?.account || '用户';
});
let alarmRefreshTimer = null;

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
  z-index: 20;
  width: 100%;
  height: 96px;
  min-height: 96px;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  pointer-events: none;
}

.topbar-background {
  position: absolute;
  top: -4px;
  left: 50%;
  z-index: 0;
  width: min(100%, 1920px);
  height: 96px;
  object-fit: fill;
  transform: translateX(-50%);
  pointer-events: none;
}

.brand {
  position: absolute;
  top: 6px;
  left: 50%;
  z-index: 2;
  color: #fff;
  font-family: 'SimHei', 'Microsoft YaHei', sans-serif;
  font-size: 46px;
  line-height: 54px;
  text-shadow: 0 2px 0 #78cfff, 0 0 18px rgba(50, 174, 255, 0.48);
  transform: translateX(-50%);
  white-space: nowrap;
}

.menu-area {
  position: absolute;
  top: 38px;
  left: 38px;
  z-index: 4;
  pointer-events: auto;
}

.menu-trigger {
  display: inline-flex;
  height: 40px;
  min-width: 110px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 14px;
  border: 1px solid rgba(101, 194, 255, 0.42);
  border-radius: 5px;
  background: rgba(2, 31, 62, 0.72);
  box-shadow: inset 0 0 16px rgba(37, 142, 217, 0.15);
  color: #f2f9ff;
  font-size: 17px;
}

.menu-trigger:hover,
.menu-trigger:focus-visible,
.menu-trigger[aria-expanded='true'] {
  border-color: rgba(108, 219, 255, 0.85);
  outline: 0;
  background: rgba(7, 65, 111, 0.9);
  box-shadow: inset 0 0 18px rgba(58, 184, 255, 0.2), 0 0 14px rgba(43, 169, 255, 0.25);
}

.menu-trigger :deep(svg) {
  width: 20px;
  height: 20px;
}

.badge {
  display: inline-grid;
  min-width: 25px;
  height: 20px;
  place-items: center;
  padding: 0 6px;
  border-radius: 10px;
  background: #f45258;
  color: #fff;
  font-size: 11px;
  line-height: 20px;
}

.menu-popover {
  position: absolute;
  top: 48px;
  left: 0;
  display: grid;
  width: 230px;
  padding: 8px;
  border: 1px solid rgba(81, 190, 246, 0.58);
  border-radius: 5px;
  background: rgba(2, 25, 49, 0.96);
  box-shadow: 0 16px 40px rgba(0, 8, 24, 0.58), inset 0 0 24px rgba(25, 147, 225, 0.1);
  backdrop-filter: blur(14px);
}

.menu-item {
  display: grid;
  min-height: 42px;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 0 12px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  box-shadow: none;
  color: #b9d9ef;
  text-align: left;
}

.menu-item:hover,
.menu-item.active {
  background: linear-gradient(90deg, rgba(17, 119, 190, 0.52), rgba(17, 119, 190, 0.08));
  box-shadow: inset 2px 0 #58d8ff;
  color: #fff;
}

.menu-item :deep(svg) {
  width: 18px;
  height: 18px;
  color: #6fd8ff;
}

.menu-item__count {
  min-width: 22px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: rgba(244, 82, 88, 0.9);
  color: #fff;
  font-size: 10px;
  line-height: 18px;
  text-align: center;
}

.menu-account {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 7px;
  padding: 10px 8px 2px;
  border-top: 1px solid rgba(72, 158, 216, 0.3);
}

.menu-account__name {
  min-width: 0;
  overflow: hidden;
  color: #8fb9d4;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  border-color: rgba(255, 104, 94, 0.42);
  background: rgba(105, 24, 32, 0.48);
  color: #ffaaa4;
  font-size: 11px;
  white-space: nowrap;
}

.plc-status {
  position: absolute;
  top: 47px;
  right: 42px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #f4fbff;
  font-size: 14px;
  line-height: 24px;
  pointer-events: auto;
}

.plc-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #57e29b;
  box-shadow: 0 0 9px rgba(87, 226, 155, 0.75);
}

.menu-popover-enter-active,
.menu-popover-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.menu-popover-enter-from,
.menu-popover-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

@media (max-width: 1500px) {
  .brand {
    font-size: 38px;
  }

  .menu-area {
    left: 28px;
  }

  .plc-status {
    right: 30px;
  }
}
</style>
