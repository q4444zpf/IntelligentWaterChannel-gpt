<template>
  <section class="page page-realtime active">
    <aside class="left-stack">
      <section class="panel gate-panel"><h2>闸门实时状态</h2><table class="data-table compact">
        <thead><tr><th>设备</th><th>开度</th><th>闸前(m)</th><th>闸后(m)</th><th>状态</th></tr></thead>
        <tbody><tr v-for="gate in GATES" :key="gate.id"><td><span class="device-chip" :class="`chip-${gate.color}`">{{ gate.id }}</span></td><td>{{ gate.open }}</td><td>{{ gate.before }}</td><td>{{ gate.after }}</td><td><StatusText :value="gate.state" /></td></tr></tbody>
      </table></section>
      <section class="panel sensor-panel"><h2>传感器实时状态</h2>
        <div v-for="group in SENSOR_GROUPS" :key="group.name" class="sensor-section"><div class="sensor-title">{{ group.name }}</div><table class="data-table compact"><tbody>
          <tr v-for="row in group.rows" :key="row.name"><td>{{ row.name }}</td><td>{{ row.location }}</td><td>{{ row.value }}</td><td>{{ row.unit }}</td><td><StatusText :value="row.state" /></td></tr>
        </tbody></table></div>
      </section>
    </aside>

    <section class="center-stack">
      <section class="panel twin-panel">
        <div class="panel-head"><h2>三维水槽工艺监控</h2><div class="mini-actions"><button v-for="action in VIEW_ACTIONS" :key="action">{{ action }}</button></div></div>
        <div class="twin-stage">
          <img src="/智能水槽系统设计图与说明/00_原始三维水槽工艺图.png" alt="智能水槽三维工艺图">
          <span class="flow-arrow a1"></span><span class="flow-arrow a2"></span><span class="flow-arrow a3"></span>
          <div class="float-tag t1">渠①水位<br><b>0.40 m</b></div>
          <div class="float-tag t2">G2 <span class="dot ok"></span><br>闸前 0.38 m<br>闸后 0.35 m<br>开度 42%</div>
          <div class="float-tag t3">FM-01 流量计<br><b>18.2 L/s</b></div><div class="float-tag t4">渠⑥水位<br><b>0.32 m</b></div>
          <div class="float-tag t5">P1 运行中 <span class="dot ok"></span><br>频率 32 Hz<br>压力 0.23 MPa</div><div class="float-tag alarm t6">G6 闸门异常<br><b>反馈超时</b></div>
        </div>
      </section>
      <section class="panel chart-panel"><div class="panel-head realtime-chart-head"><h2>实时趋势分析</h2>
        <div class="tabs small-tabs"><button v-for="tab in REALTIME_CHART_TABS" :key="tab" :class="{ active: activeTrendTab === tab }" @click="selectTrendTab(tab)">{{ tab }}</button></div>
        <div v-if="isWaterProfile" class="mini-actions profile-actions">
          <span class="refresh-status" :title="lastUpdatedLabel">5秒刷新</span>
          <button type="button" @click="togglePolling">{{ paused ? '继续' : '暂停' }}</button>
          <button v-for="action in REALTIME_PROFILE_ACTIONS" :key="action" type="button" :disabled="refreshing && action === '立即刷新'" @click="runProfileAction(action)">{{ action }}</button>
        </div>
        <div v-else class="mini-actions"><button v-for="(action, index) in REALTIME_CHART_ACTIONS" :key="action" :class="{ active: index === 0 }">{{ action }}</button></div>
      </div>
        <RealtimeWaterProfileChart v-if="isWaterProfile" ref="profileChart" :snapshot="snapshot" :loading="loading" :refreshing="refreshing" :error="error" />
        <canvas v-else ref="realtimeChart" height="210"></canvas>
      </section>
    </section>

    <aside class="right-stack">
      <section class="panel control-panel"><h2>手动控制设备</h2>
        <div class="control-card"><h3>闸门控制</h3><div class="form-grid"><label>设备类型<span>闸门</span></label><label>设备选择<span>G2</span></label><label>当前开度<span>42 %</span></label><label>目标开度<span>50 %</span></label></div><input type="range" value="50"><div class="state-line"><span class="ok-text">连接状态：在线</span><span>控制模式：手动</span><span class="ok-text">执行状态：待命</span></div><div class="button-row"><button class="primary">下发指令</button><button class="danger">停止</button><button>复位</button></div></div>
        <div class="control-card"><h3>水泵控制</h3><div class="form-grid"><label>设备选择<span>P1</span></label><label>当前频率<span>32 Hz</span></label><label>目标频率<span>35 Hz</span></label><label>运行状态<span>运行中</span></label></div><input type="range" value="70"><div class="button-row"><button class="success">启动</button><button class="danger">停止</button><button class="primary">设置频率</button></div></div>
        <p class="hint">安全提示：确认设备状态与现场安全后，再执行控制操作。</p>
      </section>
      <section class="panel alarm-mini"><div class="panel-head"><h2>实时报警信息</h2><button class="link-btn" @click="$emit('navigate', 'alarm')">查看全部</button></div>
        <div v-for="(alarm, index) in ALARMS.slice(0, 3)" :key="alarm.time" class="alarm-item" :class="{ handled: index === 2 }"><span>{{ alarm.time }}</span><div><strong>{{ alarm.device }} {{ alarm.type }}</strong><small>{{ alarm.message }}</small></div><span class="state-pill">{{ alarm.handled }}</span></div>
      </section>
    </aside>
  </section>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue';
import StatusText from '../components/common/StatusText.vue';
import RealtimeWaterProfileChart from '../components/realtime/RealtimeWaterProfileChart.vue';
import { useCanvasChart } from '../composables/useCanvasChart.js';
import { useRealtimeWaterProfile } from '../composables/useRealtimeWaterProfile.js';
import { ALARMS, GATES, REALTIME_CHART_ACTIONS, REALTIME_CHART_TABS, REALTIME_PROFILE_ACTIONS, SENSOR_GROUPS, VIEW_ACTIONS } from '../data/monitoring-data.js';
import { createMockWaterProfileSource } from '../realtime-water-profile.js';
import { drawRealtimeChart } from '../utils/canvas-charts.js';

defineEmits(['navigate']);
const activeTrendTab = ref(REALTIME_CHART_TABS[0]);
const profileChart = ref(null);
const source = createMockWaterProfileSource({ gates: GATES, sensorGroups: SENSOR_GROUPS });
const { snapshot, loading, refreshing, error, paused, lastUpdated, refresh, pause, resume } = useRealtimeWaterProfile({ source });
const { canvasRef: realtimeChart, redraw } = useCanvasChart(drawRealtimeChart);
const isWaterProfile = computed(() => activeTrendTab.value === REALTIME_CHART_TABS[0]);
const lastUpdatedLabel = computed(() => lastUpdated.value
  ? `最近更新：${new Date(lastUpdated.value).toLocaleTimeString('zh-CN', { hour12: false })}`
  : '等待首次数据');

async function selectTrendTab(tab) {
  activeTrendTab.value = tab;
  if (tab !== REALTIME_CHART_TABS[0]) {
    await nextTick();
    redraw();
  }
}

function togglePolling() {
  if (paused.value) resume();
  else pause();
}

function runProfileAction(action) {
  if (action === '立即刷新') refresh();
  if (action === '复位') profileChart.value?.resetZoom();
}
</script>
