<template>
  <header class="topbar">
    <img class="topbar-background" :src="headerBackground" alt="" aria-hidden="true">

    <nav class="menu-area" aria-label="主导航">
      <button
        v-for="tab in PAGE_TABS"
        :key="tab.key"
        class="menu-item"
        :class="{ active: activePage === tab.key }"
        :aria-label="tab.key === 'alarm' && unhandledAlarmCount > 0 ? `报警数据，${unhandledAlarmCount}条未处理告警` : undefined"
        type="button"
        @click="$emit('navigate', tab.key)"
      >
        <component :is="PAGE_ICONS[tab.key]" aria-hidden="true" />
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.key === 'alarm' && unhandledAlarmCount > 0"
          class="alarm-badge"
          aria-hidden="true"
        >{{ unhandledAlarmDisplay }}</span>
      </button>
    </nav>

    <div class="brand">智能污水处理监控系统</div>

    <div class="scene-select-wrap">
      <ASelect
        class="scene-select"
        :value="monitoringScene"
        :options="MONITORING_SCENES"
        aria-label="监控场景"
        popup-class-name="header-scene-select-popup"
        @change="handleMonitoringSceneChange"
      />
    </div>

    <div class="header-status">
      <div class="plc-status" role="status">
        <span class="plc-status__dot" aria-hidden="true"></span>
        <span>PLC在线</span>
      </div>

      <div
        class="header-account"
        @focusout="handleAccountAreaFocusOut"
        @keydown.esc="accountMenuOpen = false"
      >
        <button
          class="account-trigger"
          type="button"
          aria-label="打开用户菜单"
          :aria-expanded="accountMenuOpen"
          @click="accountMenuOpen = !accountMenuOpen"
        >
          <svg class="account-trigger__user-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10,0C15.52,0,20,4.48,20,10C20,15.52,15.52,20,10,20C4.48,20,0,15.52,0,10C0,4.48,4.48,0,10,0ZM4.0233202,13.4163C5.4908299,15.606899,7.6951103,17,10.1597,17C12.6243,17,14.8286,15.606899,16.296101,13.4163C14.688499,11.9172,12.5312,11,10.1597,11C7.7882099,11,5.63095,11.9172,4.0233202,13.4163ZM10,9C11.6569,9,13,7.6568499,13,6C13,4.3431501,11.6569,3,10,3C8.3430996,3,7,4.3431501,7,6C7,7.6568499,8.3430996,9,10,9Z" />
          </svg>
          <span class="account-trigger__name">{{ username }}</span>
          <DownOutlined class="account-trigger__arrow" aria-hidden="true" />
        </button>

        <Transition name="menu-popover">
          <div v-if="accountMenuOpen" class="account-popover">
            <button class="logout-btn" type="button" :disabled="loggingOut" @click="handleLogout">
              <LogoutOutlined aria-hidden="true" />
              {{ loggingOut ? '退出中' : '退出登录' }}
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<script setup>
import {
  AlertOutlined,
  DashboardOutlined,
  DownOutlined,
  HistoryOutlined,
  LogoutOutlined,
} from '@ant-design/icons-vue';
import { Select as ASelect } from 'ant-design-vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import headerBackground from '../assets/bg-header.png';
import { getBigWaterChannelAlarmStatistics } from '../api/alarm.js';
import { normalizeAlarmStatistics } from '../alarm-data.js';
import { PROTOTYPE_ACCESS_TOKEN } from '../constants/auth.js';
import { getPrototypeSceneData } from '../data/prototype-scene-data.js';
import { PAGE_TABS } from '../data/monitoring-data.js';
import { authState, signOut } from '../stores/auth.js';
import { getToken } from '../utils/auth.js';

const PAGE_ICONS = {
  realtime: DashboardOutlined,
  history: HistoryOutlined,
  alarm: AlertOutlined,
};
const MONITORING_SCENES = Object.freeze([
  { value: 'dosing', label: '智能加药工艺监控' },
  { value: 'aeration', label: '智能曝气工艺监控' },
]);
const router = useRouter();

const props = defineProps({
  activePage: { type: String, required: true },
  monitoringScene: { type: String, default: 'dosing' },
});

const emit = defineEmits(['navigate', 'monitoring-scene-change']);

const loggingOut = ref(false);
const accountMenuOpen = ref(false);
const unhandledAlarmCount = ref(0);
const unhandledAlarmDisplay = computed(() => unhandledAlarmCount.value > 999 ? '999+' : unhandledAlarmCount.value);
const username = computed(() => {
  const user = authState.user.value;
  return user?.name || user?.username || user?.account || '用户';
});
let alarmRefreshTimer = null;

function handleAccountAreaFocusOut(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    accountMenuOpen.value = false;
  }
}

function handleMonitoringSceneChange(value) {
  const scene = value === 'aeration' ? 'aeration' : 'dosing';
  emit('monitoring-scene-change', scene);
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
    const source = getToken() === PROTOTYPE_ACCESS_TOKEN
      ? getPrototypeSceneData(props.monitoringScene).buildAlarmStatistics()
      : await getBigWaterChannelAlarmStatistics();
    const statistics = normalizeAlarmStatistics(source);
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

watch(() => props.monitoringScene, () => {
  void refreshUnhandledAlarmCount();
});

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
  display: flex;
  height: 40px;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
}

.menu-item {
  position: relative;
  display: inline-flex;
  height: 40px;
  min-width: 104px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  box-shadow: none;
  color: #b9d9ef;
  font-size: 15px;
}

.menu-item:hover,
.menu-item:focus-visible,
.menu-item.active {
  border-bottom-color: #58d8ff;
  outline: 0;
  background: linear-gradient(180deg, rgba(17, 119, 190, 0.08), rgba(17, 119, 190, 0.5));
  color: #fff;
  text-shadow: 0 0 8px rgba(72, 199, 255, 0.5);
}

.menu-item :deep(svg) {
  width: 18px;
  height: 18px;
  color: #6fd8ff;
}

.scene-select-wrap {
  position: absolute;
  top: 37px;
  left: calc(50% + 340px);
  z-index: 4;
  width: 202px;
  height: 40px;
  pointer-events: auto;
}

.scene-select {
  width: 100%;
  height: 100%;
}

.scene-select:deep(.ant-select-selector) {
  height: 40px;
  padding: 0 36px 0 14px;
  border: 1px solid rgba(101, 194, 255, 0.42);
  border-radius: 5px !important;
  background: rgba(2, 31, 62, 0.8) !important;
  box-shadow: inset 0 0 16px rgba(37, 142, 217, 0.15);
  color: #eaf8ff;
}

.scene-select:deep(.ant-select-selection-item) {
  align-self: center;
  color: #eaf8ff;
  font-size: 14px;
  line-height: 38px;
}

.scene-select:deep(.ant-select-arrow) {
  color: #6fd8ff;
}

.scene-select:hover:deep(.ant-select-selector),
.scene-select.ant-select-focused:deep(.ant-select-selector),
.scene-select.ant-select-open:deep(.ant-select-selector) {
  border-color: rgba(108, 219, 255, 0.85) !important;
  background: rgba(7, 65, 111, 0.9) !important;
  box-shadow: inset 0 0 18px rgba(58, 184, 255, 0.2), 0 0 14px rgba(43, 169, 255, 0.25);
}

.alarm-badge {
  position: absolute;
  top: -7px;
  right: -17px;
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
  box-shadow: 0 0 8px rgba(244, 82, 88, 0.9);
  pointer-events: none;
}

.header-status {
  position: absolute;
  top: 47px;
  right: 42px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 20px;
  pointer-events: auto;
}

.plc-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #f4fbff;
  font-size: 14px;
  line-height: 24px;
}

.plc-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #57e29b;
  box-shadow: 0 0 9px rgba(87, 226, 155, 0.75);
}

.header-account {
  position: relative;
}

.account-trigger {
  display: inline-flex;
  height: 28px;
  max-width: 190px;
  align-items: center;
  gap: 7px;
  border: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
  color: #f4fbff;
  font-size: 14px;
  line-height: 28px;
}

.account-trigger:hover,
.account-trigger:focus-visible,
.account-trigger[aria-expanded='true'] {
  outline: 0;
  color: #69dcff;
  text-shadow: 0 0 8px rgba(72, 199, 255, 0.5);
}

.account-trigger :deep(svg) {
  flex: 0 0 auto;
}

.account-trigger__user-icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.account-trigger__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-trigger__arrow {
  width: 11px;
  height: 11px;
  transition: transform 0.16s ease;
}

.account-trigger[aria-expanded='true'] .account-trigger__arrow {
  transform: rotate(180deg);
}

.account-popover {
  position: absolute;
  top: 34px;
  right: 0;
  width: 142px;
  padding: 6px;
  border: 1px solid rgba(81, 190, 246, 0.58);
  border-radius: 4px;
  background: rgba(2, 25, 49, 0.96);
  box-shadow: 0 12px 30px rgba(0, 8, 24, 0.5), inset 0 0 20px rgba(25, 147, 225, 0.08);
  backdrop-filter: blur(12px);
}

.logout-btn {
  display: inline-flex;
  width: 100%;
  height: 32px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgba(255, 104, 94, 0.42);
  border-radius: 3px;
  background: rgba(105, 24, 32, 0.48);
  color: #ffaaa4;
  font-size: 12px;
  white-space: nowrap;
}

.logout-btn:hover,
.logout-btn:focus-visible {
  border-color: rgba(255, 132, 122, 0.76);
  outline: 0;
  background: rgba(132, 31, 40, 0.68);
  color: #ffd2cf;
}

:global(.header-scene-select-popup .ant-select-item) {
  color: #b9d9ef;
}

:global(.header-scene-select-popup .ant-select-item-option-active:not(.ant-select-item-option-disabled)),
:global(.header-scene-select-popup .ant-select-item-option-selected:not(.ant-select-item-option-disabled)) {
  background: #0b4770;
  color: #fff;
}

@media (max-width: 1500px) {
  .brand {
    font-size: 38px;
  }

  .menu-area {
    left: 28px;
  }

  .scene-select-wrap {
    left: calc(50% + 280px);
    width: 188px;
  }

  .header-status {
    right: 10px;
  }
}
</style>
