<template>
  <section class="panel chart-panel large replay-card">
    <div class="panel-head replay-profile-head">
      <h2>节点水位空间剖面（按水槽拓扑顺序）</h2>
      <div class="legend">
        <span>当前时刻：{{ currentRow?.timestamp || '--' }}</span>
        <span>上一时刻：{{ previousRow?.timestamp || '--' }}</span>
        <span class="limit-red">上限 0.50 m</span>
        <span class="limit-yellow">下限 0.20 m</span>
      </div>
    </div>
    <div v-if="loading" class="replay-profile-empty">正在加载节点水位数据...</div>
    <div v-else-if="currentRow && nodes.length" ref="chartElement" class="replay-profile-chart" role="img" aria-label="节点水位空间剖面图"></div>
    <div v-else class="replay-profile-empty">当前条件下没有节点水位数据</div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { parseReplayValue } from '../../history-replay-data.js';

echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const props = defineProps({
  nodes: { type: Array, required: true },
  currentRow: { type: Object, default: null },
  previousRow: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const chartElement = ref(null);
let chart = null;
let resizeObserver = null;

const labels = computed(() => props.nodes.map((node) => node.label));
const currentValues = computed(() => props.nodes
  .map((node) => parseReplayValue(props.currentRow?.[node.key])));
const previousValues = computed(() => props.nodes
  .map((node) => parseReplayValue(props.previousRow?.[node.key])));

function chartOption() {
  return {

    textStyle: { color: '#a9bdd5', fontFamily: 'Microsoft YaHei, sans-serif' },
    legend: {
      top: 8,
      data: ['当前时刻', '上一时刻'],
      textStyle: { color: '#b4c9df' },
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: 'rgba(3, 20, 36, .97)',
      borderColor: '#297eb9',
      textStyle: { color: '#e8f4ff' },
      valueFormatter: (value) => value === null || value === undefined
        ? '--'
        : `${Number(value).toFixed(3)} m`,
    },
    grid: { left: 58, right: 30, top: 50, bottom: 66 },
    xAxis: {
      type: 'category',
      name: '水槽拓扑节点',
      nameLocation: 'middle',
      nameGap: 42,
      boundaryGap: false,
      data: labels.value,
      axisLine: { lineStyle: { color: '#47627e' } },
      axisLabel: { color: '#a9bdd5', interval: 0, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      name: '水位 (m)',
      min: 0,
      axisLine: { show: true, lineStyle: { color: '#47627e' } },
      axisLabel: { color: '#8da8c8', formatter: (value) => Number(value).toFixed(2) },
      splitLine: { lineStyle: { color: 'rgba(93, 139, 181, .16)' } },
    },
    series: [
      {
        id: 'previous-frame',
        name: '上一时刻',
        type: 'line',
        animation: true,
        animationDurationUpdate: 650,
        animationEasingUpdate: 'cubicInOut',
        data: previousValues.value,
        connectNulls: false,
        showSymbol: true,
        symbolSize: 6,
        lineStyle: { width: 1.5, type: 'dashed', color: '#7d9ab8' },
        itemStyle: { color: '#7d9ab8' },
      },
      {
        id: 'current-frame',
        name: '当前时刻',
        type: 'line',
        animation: true,
        animationDurationUpdate: 650,
        animationEasingUpdate: 'cubicInOut',
        data: currentValues.value,
        connectNulls: false,
        showSymbol: true,
        symbolSize: 8,
        lineStyle: { width: 2.5, color: '#2aa1ff' },
        itemStyle: { color: '#39b3ff' },
        label: {
          show: true,
          position: 'top',
          color: '#dcecff',
          formatter: ({ value }) => value === null || value === undefined
            ? ''
            : Number(value).toFixed(3),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          label: { show: false },
          data: [
            { yAxis: 0.5, lineStyle: { color: '#ff5148', type: 'dashed' } },
            { yAxis: 0.2, lineStyle: { color: '#ffd21f', type: 'dashed' } },
          ],
        },
      },
    ],
  };
}

function disposeChart() {
  chart?.dispose();
  chart = null;
}

function renderChart() {
  if (!chartElement.value || !props.currentRow || !props.nodes.length) {
    disposeChart();
    return;
  }
  if (!chart) {
    chart = echarts.init(chartElement.value, null, { renderer: 'canvas' });
    chart.setOption(chartOption(), true);
    return;
  }
  chart.setOption({
    series: [
      { id: 'previous-frame', data: previousValues.value, },
      { id: 'current-frame', data: currentValues.value },
    ],
  });
}

function observeChartElement() {
  resizeObserver?.disconnect();
  if (!chartElement.value) return;
  resizeObserver = new ResizeObserver(() => chart?.resize());
  resizeObserver.observe(chartElement.value);
}

onMounted(async () => {
  await nextTick();
  renderChart();
  observeChartElement();
});

watch(
  () => [props.nodes, props.currentRow, props.previousRow, props.loading],
  async () => {
    await nextTick();
    renderChart();
    observeChartElement();
  },
  { deep: true },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  disposeChart();
});
</script>

<style scoped>
.replay-profile-head { align-items: flex-start; gap: 18px; }
.replay-profile-head h2 { flex: 0 0 auto; }
.replay-profile-head .legend { flex-wrap: wrap; justify-content: flex-end; gap: 8px 24px; }
.replay-profile-chart { width: 100%; height: 330px; }
.replay-profile-empty { min-height: 330px; display: grid; place-items: center; color: #7892ad; }
@media (max-width: 1100px) {
  .replay-profile-head { flex-direction: column; }
  .replay-profile-head .legend { justify-content: flex-start; }
}
</style>
