<template>
  <section class="page page-realtime active">
    <aside class="left-stack">
      <section class="panel gate-panel"><h2>闸门实时状态</h2><table class="data-table compact">
        <thead><tr><th>设备</th><th>开度(%)</th><th>闸前(mm)</th><th>闸后(mm)</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="gate in gates" :key="gate.id"><td><span class="device-chip" :class="`chip-${gate.color}`">{{ gate.id }}</span></td><td>{{ gate.open }}</td><td>{{ gate.before }}</td><td>{{ gate.after }}</td><td><StatusText :value="gate.state" /></td></tr>
          <tr v-if="!gates.length"><td colspan="5" class="realtime-empty">{{ deviceMessage }}</td></tr>
        </tbody>
      </table></section>
      <section class="panel sensor-panel"><h2>传感器实时状态</h2>
        <div class="sensor-list">
          <div v-for="group in sensorGroups" :key="group.name" class="sensor-section"><div class="sensor-title">{{ group.name }}</div><table class="data-table compact"><tbody>
            <tr v-for="row in group.rows" :key="row.tag || row.name"><td>{{ row.name }}</td><td>{{ row.location }}</td><td>{{ row.value }}</td><td>{{ row.unit }}</td><td><StatusText :value="row.state" /></td></tr>
          </tbody></table></div>
          <div v-if="!sensorGroups.length" class="realtime-empty">{{ deviceMessage }}</div>
        </div>
      </section>
    </aside>

    <section class="center-stack">
      <section class="panel twin-panel">
        <div class="panel-head">
          <h2>三维水槽工艺监控</h2>
          <div class="mini-actions">
            <button
              v-for="action in VIEW_ACTIONS"
              :key="action"
              type="button"
              :class="{ active: action === '自动漫游' && autoRoaming }"
              :aria-pressed="action === '自动漫游' ? autoRoaming : undefined"
              @click="handleViewAction(action)"
            >{{ action }}</button>
          </div>
        </div>
        <div class="twin-stage">
          <SmartWaterFlumePreview
            ref="previewRef"
            :alarm-topic="alarmNotificationTopic"
            @mqtt-data="handleMqttData"
            @alarm-notification="handleAlarmNotification"
            @auto-roaming-change="autoRoaming = $event"
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
      <section class="panel control-panel"><h2>手动控制设备</h2>
        <div class="control-card"><h3>闸门控制</h3><div class="form-grid"><label>设备类型<span>闸门</span></label><label>设备选择<span>G2</span></label><label>当前开度<span>42 %</span></label><label>目标开度<span>50 %</span></label></div><input type="range" value="50"><div class="state-line"><span class="ok-text">连接状态：在线</span><span>控制模式：手动</span><span class="ok-text">执行状态：待命</span></div><div class="button-row"><button class="primary">下发指令</button><button class="danger">停止</button><button>复位</button></div></div>
        <div class="control-card"><h3>水泵控制</h3><div class="form-grid"><label>设备选择<span>P1</span></label><label>当前频率<span>32 Hz</span></label><label>目标频率<span>35 Hz</span></label><label>运行状态<span>运行中</span></label></div><input type="range" value="70"><div class="button-row"><button class="success">启动</button><button class="danger">停止</button><button class="primary">设置频率</button></div></div>
        <p class="hint">安全提示：确认设备状态与现场安全后，再执行控制操作。</p>
      </section>
      <section class="panel alarm-mini"><div class="panel-head"><h2>实时报警信息</h2><button class="link-btn" @click="$emit('navigate', 'alarm')">查看全部</button></div>
        <div v-for="alarm in latestAlarms" :key="alarm.key" class="alarm-item" :class="{ handled: alarm.handlingStatus === 1 }"><span>{{ miniAlarmTime(alarm.warnTime) }}</span><div><strong>{{ alarm.device }} {{ alarm.type }}</strong><small>{{ alarm.message }}</small></div><span class="state-pill">{{ alarm.handled }}</span></div>
        <div v-if="latestAlarmsLoading" class="realtime-empty">正在加载最新告警...</div>
        <div v-else-if="latestAlarmsError" class="realtime-empty alarm-mini-error">{{ latestAlarmsError }}</div>
        <div v-else-if="!latestAlarms.length" class="realtime-empty">暂无告警数据</div>
      </section>
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
const autoRoaming = ref(false);
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
const tableData = computed(() => buildRealtimeTableData(deviceGroups.value, realtimeValues));
const gates = computed(() => tableData.value.gates);
const sensorGroups = computed(() => tableData.value.sensorGroups);
const deviceMessage = computed(() => {
  if (deviceLoading.value) return '正在加载设备配置...';
  return deviceError.value || '暂无设备配置';
});

function handleMqttData(payload) {
  mergeRealtimeValues(realtimeValues, payload);
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    latestMqttAt.value = Date.now();
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
  window.removeEventListener('alarm-status-changed', scheduleLatestAlarmRefresh);
});
</script>

<style scoped>
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

.mini-actions button.active {
  border-color: #7bd4ff;
  background: #0a5d96;
  box-shadow: inset 0 0 0 1px rgba(123, 212, 255, 0.35), 0 0 10px rgba(47, 165, 255, 0.24);
  color: #fff;
}
</style>
