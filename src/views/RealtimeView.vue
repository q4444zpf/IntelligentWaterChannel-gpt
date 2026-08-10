<template>
  <section class="page page-realtime active">
    <aside class="left-stack">
      <DecorativePanel class="panel gate-panel" title="闸门实时状态"><table class="data-table compact gate-status-table">
        <thead><tr><th>设备</th><th>开度(%)</th><th>闸前(mm)</th><th>闸后(mm)</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="gate in gates" :key="gate.id"><td><span class="device-chip" :class="`chip-${gate.color}`">{{ gate.id }}</span></td><td>{{ gate.open }}</td><td>{{ gate.before }}</td><td>{{ gate.after }}</td><td :class="gate.state === '在线' ? 'gate-status-online' : 'gate-status-offline'"><StatusText :value="gate.state" /></td></tr>
          <tr v-if="!gates.length"><td colspan="5" class="realtime-empty">{{ deviceMessage }}</td></tr>
        </tbody>
      </table></DecorativePanel>
      <DecorativePanel class="panel sensor-panel" title="传感器实时状态">
        <div class="sensor-list">
          <div v-for="group in sensorGroups" :key="group.name" class="sensor-section"><div class="sensor-title">{{ group.name }}</div><table class="data-table compact sensor-status-table"><tbody>
            <tr v-for="row in group.rows" :key="row.tag || row.name"><td>{{ row.name }}</td><td>{{ row.location }}</td><td>{{ row.value }}</td><td>{{ row.unit }}</td><td :class="row.state === '在线' ? 'sensor-status-online' : 'sensor-status-offline'"><StatusText :value="row.state" /></td></tr>
          </tbody></table></div>
          <div v-if="!sensorGroups.length" class="realtime-empty">{{ deviceMessage }}</div>
        </div>
      </DecorativePanel>
    </aside>

    <section class="center-stack">
      <section class="panel twin-panel">
        <div class="panel-head preview-head">
          <div class="preview-title">
            <span class="preview-title__arrow preview-title__arrow--left" aria-hidden="true"></span>
            <h2>三维水槽工艺监控</h2>
            <span class="preview-title__arrow preview-title__arrow--right" aria-hidden="true"></span>
          </div>
        </div>
        <div class="twin-stage">
          <div class="mini-actions preview-actions">
            <button
              v-for="action in VIEW_ACTIONS"
              :key="action"
              type="button"
              @click="handleViewAction(action)"
            >{{ action }}</button>
          </div>
          <img
            class="preview-border preview-border--left"
            src="../assets/preview-border.png"
            alt=""
            aria-hidden="true"
          >
          <img
            class="preview-border preview-border--right"
            src="../assets/preview-border.png"
            alt=""
            aria-hidden="true"
          >
          <SmartWaterFlumePreview
            ref="previewRef"
            :alarm-topic="alarmNotificationTopic"
            @mqtt-data="handleMqttData"
            @alarm-notification="handleAlarmNotification"
          />
        </div>
      </section>
      <TrendAnalysis
        :profile-nodes="profileNodes"
        :realtime-values="realtimeValues"
        :profile-loading="profileLoading"
        :profile-error="profileError"
        :profile-timestamp="latestMqttAt"
      />
    </section>

    <aside class="right-stack">
      <DecorativePanel class="panel control-panel" title="手动控制设备" direction="left">
        <div class="control-card"><h3>闸门控制</h3><div class="form-grid"><label>设备类型<span>闸门</span></label><label>设备选择<span>G2</span></label><label>当前开度<span>42 %</span></label><label>目标开度<span>50 %</span></label></div><input type="range" value="50"><div class="state-line"><span class="ok-text">连接状态：在线</span><span>控制模式：手动</span><span class="ok-text">执行状态：待命</span></div><div class="button-row"><button class="primary">下发指令</button><button class="danger">停止</button><button>复位</button></div></div>
        <div class="control-card"><h3>水泵控制</h3><div class="form-grid"><label>设备选择<span>P1</span></label><label>当前频率<span>32 Hz</span></label><label>目标频率<span>35 Hz</span></label><label>运行状态<span>运行中</span></label></div><input type="range" value="70"><div class="button-row"><button class="success">启动</button><button class="danger">停止</button><button class="primary">设置频率</button></div></div>
        <p class="hint">安全提示：确认设备状态与现场安全后，再执行控制操作。</p>
      </DecorativePanel>
      <DecorativePanel
        class="panel alarm-mini"
        title="实时报警信息"
        direction="left"
        action-text="查看全部"
        @action-click="$emit('navigate', 'alarm')"
      >
        <div v-for="alarm in latestAlarms" :key="alarm.key" class="alarm-item" :class="{ handled: alarm.handlingStatus === 1 }"><span>{{ miniAlarmTime(alarm.warnTime) }}</span><div><strong>{{ alarm.device }} {{ alarm.type }}</strong><small>{{ alarm.message }}</small></div><span class="state-pill">{{ alarm.handled }}</span></div>
        <div v-if="latestAlarmsLoading" class="realtime-empty">正在加载最新告警...</div>
        <div v-else-if="latestAlarmsError" class="realtime-empty alarm-mini-error">{{ latestAlarmsError }}</div>
        <div v-else-if="!latestAlarms.length" class="realtime-empty">暂无告警数据</div>
      </DecorativePanel>
    </aside>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
  getBigWaterChannelAlarmNotificationTopic,
  getBigWaterChannelAlarms,
} from '../api/alarm.js';
import {
  getRealtimeGroupDevices,
  getRealtimeWaterProfileTopology,
} from '../api/realtime.js';
import { normalizeAlarmPage } from '../alarm-data.js';
import DecorativePanel from '../components/common/DecorativePanel.vue';
import StatusText from '../components/common/StatusText.vue';
import SmartWaterFlumePreview from '../components/realtime/smart-water-flume-preview/SmartWaterFlumePreview.vue';
import TrendAnalysis from '../components/realtime/trend/TrendAnalysis.vue';
import { VIEW_ACTIONS } from '../data/monitoring-data.js';
import { buildRealtimeTableData, mergeRealtimeValues } from '../realtime-device-data.js';

const props = defineProps({
  sceneTarget: { type: Object, default: null },
});

defineEmits(['navigate']);

const previewRef = ref(null);
const deviceGroups = ref([]);
const deviceLoading = ref(true);
const deviceError = ref('');
const realtimeValues = reactive({});
const profileNodes = ref([]);
const profileLoading = ref(true);
const profileError = ref('');
const latestMqttAt = ref(null);
const alarmNotificationTopic = ref('');
const latestAlarms = ref([]);
const latestAlarmsLoading = ref(true);
const latestAlarmsError = ref('');
let latestAlarmRefreshTimer = null;
let realtimeUpdateTimer = null;
let pendingRealtimePayload = null;
const tableData = computed(() => buildRealtimeTableData(deviceGroups.value, realtimeValues));
const gates = computed(() => tableData.value.gates);
const sensorGroups = computed(() => tableData.value.sensorGroups);
const deviceMessage = computed(() => {
  if (deviceLoading.value) return '正在加载设备配置...';
  return deviceError.value || '暂无设备配置';
});

function flushRealtimePayload() {
  realtimeUpdateTimer = null;
  const payload = pendingRealtimePayload;
  pendingRealtimePayload = null;
  if (!payload) return;
  mergeRealtimeValues(realtimeValues, payload);
  latestMqttAt.value = Date.now();
}

function handleMqttData(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
  pendingRealtimePayload = { ...(pendingRealtimePayload || {}), ...payload };
  if (realtimeUpdateTimer === null) {
    realtimeUpdateTimer = window.setTimeout(flushRealtimePayload, 100);
  }
}

function handleViewAction(action) {
  if (action === '刷新') {
    void previewRef.value?.reload();
    return;
  }
  previewRef.value?.handleAction(action);
}

watch(() => props.sceneTarget, async (target) => {
  const channelName = typeof target?.channelName === 'string' ? target.channelName.trim() : '';
  if (!channelName) return;
  await nextTick();
  previewRef.value?.focusSceneTreeGroupByName(channelName);
});

function miniAlarmTime(value) {
  const text = String(value || '');
  return text.length >= 19 ? text.slice(11, 19) : text || '--';
}

async function loadAlarmNotificationTopic() {
  try {
    alarmNotificationTopic.value = await getBigWaterChannelAlarmNotificationTopic();
  } catch (error) {
    console.error('获取告警通知主题失败', error);
  }
}

async function loadLatestAlarms() {
  latestAlarmsLoading.value = !latestAlarms.value.length;
  latestAlarmsError.value = '';
  try {
    const page = await getBigWaterChannelAlarms({ current: 1, size: 3 });
    latestAlarms.value = normalizeAlarmPage(page).rows.slice(0, 3);
  } catch (error) {
    latestAlarmsError.value = error?.message || '获取最新告警失败';
  } finally {
    latestAlarmsLoading.value = false;
  }
}

function scheduleLatestAlarmRefresh() {
  if (latestAlarmRefreshTimer !== null) window.clearTimeout(latestAlarmRefreshTimer);
  latestAlarmRefreshTimer = window.setTimeout(() => {
    latestAlarmRefreshTimer = null;
    void loadLatestAlarms();
  }, 300);
}

function handleAlarmNotification(payload) {
  scheduleLatestAlarmRefresh();
  window.dispatchEvent(new CustomEvent('alarm-notification', { detail: payload }));
}

async function loadRealtimeDevices() {
  deviceLoading.value = true;
  deviceError.value = '';

  try {
    deviceGroups.value = await getRealtimeGroupDevices();
  } catch (error) {
    deviceError.value = error?.message || '获取实时设备配置失败';
  } finally {
    deviceLoading.value = false;
  }
}

async function loadRealtimeProfileTopology() {
  profileLoading.value = true;
  profileError.value = '';

  try {
    profileNodes.value = await getRealtimeWaterProfileTopology();
  } catch (error) {
    profileError.value = error?.message || '获取节点水位拓扑失败';
  } finally {
    profileLoading.value = false;
  }
}

onMounted(() => {
  void loadAlarmNotificationTopic();
  void loadLatestAlarms();
  void loadRealtimeDevices();
  void loadRealtimeProfileTopology();
  window.addEventListener('alarm-status-changed', scheduleLatestAlarmRefresh);
});

onBeforeUnmount(() => {
  if (latestAlarmRefreshTimer !== null) window.clearTimeout(latestAlarmRefreshTimer);
  if (realtimeUpdateTimer !== null) window.clearTimeout(realtimeUpdateTimer);
  realtimeUpdateTimer = null;
  pendingRealtimePayload = null;
  window.removeEventListener('alarm-status-changed', scheduleLatestAlarmRefresh);
});
</script>

<style scoped>
@font-face {
  font-family: 'YouSheTitle';
  src: url('../assets/优设标题黑.ttf') format('truetype');
  font-display: swap;
}

.twin-panel {
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.center-stack {
  overflow: visible;
}

.preview-head {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: -20px;
  padding: 0;
}

.preview-title {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  color: #fff;
}

.preview-title h2 {
  margin: 0;
  padding: 0 8px;
  color: #fff;
  font-family: 'YouSheTitle', 'Microsoft YaHei', sans-serif;
  font-size: 28px;
  font-weight: normal;
  line-height: 36px;
  white-space: nowrap;
}

.preview-title__arrow {
  display: block;
  flex: 0 0 53px;
  width: 53px;
  height: 36px;
  background: url('../assets/preview-title.png') center / 100% 100% no-repeat;
}

.preview-title__arrow--right {
  transform: scaleX(-1);
}

.preview-actions {
  position: absolute;
  z-index: 5;
  top: 6px;
  left: 50%;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  width: max-content;
  max-width: calc(100% - 20px);
  height: 54px;
  padding: 0 10px;
  box-sizing: border-box;
  gap: 2px;
  transform: translateX(-50%);
  background: url('../assets/preview-actions.png') center / 100% 100% no-repeat;
}

.preview-actions button {
  flex: 1 1 0;
  min-width: 0;
  height: 36px;
  padding: 0 4px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: #c9edff;
  font-size: 12px;
  line-height: 36px;
  white-space: nowrap;
}

.preview-actions button:hover {
  color: #0EC8FB;
  font-weight: 700;
}

.gate-status-table {
  width: 100%;
  margin: 0;
  overflow: visible;
  border: 0;
  border-spacing: 0 1px;
  border-radius: 0;
  background: transparent;
}

.gate-status-table th,
.gate-status-table td {
  height: 32px;
  padding: 0 7px;
  border: 0;
  color: #b9d4e8;
  font-size: 12px;
}

.gate-status-table th {
  background: #206596;
  color: #dff3ff;
  font-weight: 600;
}

.gate-status-table tbody tr:nth-child(odd) td {
  background: transparent;
}

.gate-status-table tbody tr:nth-child(even) td {
  background: rgba(32, 101, 150, 0.2);
}

.gate-status-table .device-chip {
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #55cfff;
  font-weight: 600;
}

.gate-status-table .gate-status-online {
  color: #43ff86;
}

.gate-status-table .gate-status-offline {
  color: #ff5b55;
}

.sensor-section {
  margin: 0 0 10px;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.sensor-title {
  display: flex;
  height: 34px;
  align-items: center;
  padding: 0 14px;
  background: #206596 url('../assets/table-header.png') right center / auto 100% no-repeat;
  color: #e7f6ff;
  font-size: 13px;
  font-weight: 600;
}

.sensor-status-table {
  width: 100%;
  margin: 0;
  overflow: visible;
  border: 0;
  border-spacing: 0 1px;
  border-radius: 0;
  background: transparent;
}

.sensor-status-table td {
  height: 32px;
  padding: 0 7px;
  border: 0;
  color: #b9d4e8;
  font-size: 12px;
}

.sensor-status-table tbody tr:nth-child(odd) td {
  background: transparent;
}

.sensor-status-table tbody tr:nth-child(even) td {
  background: rgba(32, 101, 150, 0.2);
}

.sensor-status-table .sensor-status-online {
  color: #43ff86;
}

.sensor-status-table .sensor-status-offline {
  color: #ff5b55;
}

.sensor-panel {
  display: flex;
  flex-direction: column;
}

.sensor-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.sensor-list::-webkit-scrollbar {
  display: none;
}

.realtime-empty {
  padding: 14px 8px;
  color: #7f9db3;
  text-align: center;
}

.alarm-mini-error { color: #ff918a; }

.twin-panel .twin-stage {
  display: block;
  position: relative;
  flex: 1 1 auto;
  width: calc(100% - 20px);
  height: auto;
  min-height: 0;
  overflow: visible;
  background: transparent;
}

.twin-stage .preview-border {
  position: absolute;
  z-index: 0;
  inset: 0 auto 0 0;
  width: auto;
  height: calc(100% - 40px);
  object-fit: contain;
  filter: none;
  pointer-events: none;
  user-select: none;
}

.twin-stage .preview-border--left {
  left: 0;
}

.twin-stage .preview-border--right {
  inset: 0 0 0 auto;
  transform: scaleX(-1);
}

.preview-actions button {
  position: relative;
  flex: 0 0 auto;
  min-width: 0;
  padding-right: 8px;
  padding-left: 8px;
  font-size: 16px;
}

.preview-actions button:hover::after {
  position: absolute;
  left: 50%;
  bottom: -1px;
  width: 0;
  height: 0;
  border-right: 5px solid transparent;
  border-bottom: 0;
  border-left: 5px solid transparent;
  border-top: 6px solid #0EC8FB;
  content: '';
  transform: translateX(-50%);
}
</style>
