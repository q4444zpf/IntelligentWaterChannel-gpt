<template>
  <section class="alarm-associated-chart">
    <header>
      <strong>关联曲线（{{ chartTitle }}）</strong>
      <span>告警前后 5 分钟</span>
    </header>
    <div v-if="loading" class="alarm-associated-state">正在加载关联曲线...</div>
    <div v-else-if="error" class="alarm-associated-state error">{{ error }}</div>
    <div v-else-if="result" ref="chartElement" class="alarm-associated-canvas" role="img" :aria-label="`${chartTitle}告警关联曲线`"></div>
    <div v-else class="alarm-associated-state">当前时段没有可用数据</div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { LineChart } from 'echarts/charts';
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { getBigWaterChannelHistory, getBigWaterChannelHistoryDevices } from '../../api/history.js';
import { buildAlarmHistoryChartOption } from '../../alarm-history-chart-option.js';
import { normalizeHistoryChartResults } from '../../history-chart-data.js';
import { normalizeHistoryDevices } from '../../history-device-data.js';
import { buildAlarmHistoryQuery } from '../../history-data.js';

echarts.use([LineChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps({ alarm: { type: Object, required: true } });
const loading = ref(true);
const error = ref('');
const result = ref(null);
const query = ref(null);
const chartElement = ref(null);
const alarmTimestamp = computed(() => new Date(String(props.alarm.warnTime || props.alarm.time || '').replace(' ', 'T')).getTime());
const chartTitle = computed(() => {
  const device = result.value?.device;
  return `${device?.name || props.alarm.device || '--'} ${device?.metric || props.alarm.type || ''}`.trim();
});
let chart = null;
let resizeObserver = null;

async function loadChart() {
  loading.value = true;
  error.value = '';
  try {
    const devices = normalizeHistoryDevices(await getBigWaterChannelHistoryDevices());
    query.value = buildAlarmHistoryQuery(props.alarm, devices);
    if (!query.value) throw new Error('未找到告警对应的历史设备或告警时间无效');
    const page = await getBigWaterChannelHistory({ current: 1, size: -1, ...query.value });
    const [matchedResult] = normalizeHistoryChartResults(page.records, devices, query.value.deviceIds);
    result.value = matchedResult?.points.length ? matchedResult : null;
  } catch (requestError) {
    error.value = requestError?.message || '加载关联曲线失败';
  } finally {
    loading.value = false;
  }
}

async function renderChart() {
  await nextTick();
  if (!chartElement.value || !result.value || !query.value) return;
  chart = echarts.init(chartElement.value, null, { renderer: 'canvas' });
  chart.setOption(buildAlarmHistoryChartOption(result.value, query.value, alarmTimestamp.value), true);
  resizeObserver = new ResizeObserver(() => chart?.resize());
  resizeObserver.observe(chartElement.value);
}

onMounted(async () => {
  await loadChart();
  await renderChart();
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<style scoped>
.alarm-associated-chart { margin: 0 20px 18px; overflow: hidden; border: 1px solid rgba(72, 155, 230, .24); border-radius: 5px; background: rgba(1, 13, 26, .58); }
.alarm-associated-chart header { min-height: 38px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border-bottom: 1px solid rgba(72, 155, 230, .2); }
.alarm-associated-chart header strong { color: #eaf5ff; font-size: 13px; }
.alarm-associated-chart header span { color: #7f9dbb; font-size: 11px; }
.alarm-associated-canvas { width: 100%; height: 250px; }
.alarm-associated-state { height: 180px; display: grid; place-items: center; color: #7895b2; font-size: 12px; }
.alarm-associated-state.error { color: #ff918a; }
@media (max-width: 760px) {
  .alarm-associated-chart { margin-inline: 12px; }
  .alarm-associated-chart header { align-items: flex-start; flex-direction: column; gap: 2px; }
  .alarm-associated-canvas { height: 230px; }
}
</style>
