<template>
  <article class="combined-history-chart">
    <header class="combined-chart-head">
      <div>
        <strong>多设备趋势对比</strong>
        <p>{{ rangeLabel }}</p>
      </div>
      <div class="combined-chart-summary">
        <span>{{ results.length }} 台设备</span>
        <span>{{ model.yAxes.length }} 种量纲</span>
        <button type="button" title="恢复完整时间范围" @click="resetZoom">重置视图</button>
      </div>
    </header>
    <div v-if="results.length" ref="chartElement" class="combined-chart-canvas" role="img" aria-label="全部已选设备历史综合曲线"></div>
    <div v-else class="combined-chart-empty">当前条件下没有历史数据</div>
  </article>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { buildCombinedChartModel } from '../history-chart-options.js';

echarts.use([
  LineChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer
]);

const props = defineProps({
  results: { type: Array, required: true },
  rangeLabel: { type: String, required: true }
});

const chartElement = ref(null);
const model = computed(() => buildCombinedChartModel(props.results));
let chart = null;
let resizeObserver = null;

function tooltipFormatter(params) {
  if (!params?.length) return '';
  const time = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(new Date(params[0].axisValue)).replaceAll('/', '-');
  const rows = params.map((param) => {
    const item = model.value.series[param.seriesIndex];
    const value = param.value?.[1];
    const display = value === null || value === undefined
      ? '--'
      : `${Number(value).toFixed(item.precision)} ${item.unit}`;
    return `<div class="combined-tooltip-row">${param.marker}<span>${item.deviceId} ${item.metric}</span><b>${display}</b></div>`;
  });
  return `<strong>${time}</strong>${rows.join('')}`;
}

function chartOption() {
  return {
    animationDuration: 350,
    textStyle: { color: '#a9bdd5', fontFamily: 'Microsoft YaHei, sans-serif' },
    legend: {
      type: 'scroll',
      top: 9,
      left: 22,
      right: 22,
      data: model.value.legendNames,
      textStyle: { color: '#b4c9df' },
      pageTextStyle: { color: '#8eb5d8' },
      pageIconColor: '#36a8ff',
      pageIconInactiveColor: '#405873'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', label: { backgroundColor: '#1d5d8f' } },
      confine: true,
      backgroundColor: 'rgba(3, 20, 36, .97)',
      borderColor: '#297eb9',
      textStyle: { color: '#e8f4ff' },
      formatter: tooltipFormatter
    },
    grid: { ...model.value.grid, top: 68, bottom: 68 },
    xAxis: {
      type: 'time',
      name: '时间',
      nameGap: 24,
      splitNumber: 8,
      axisLine: { lineStyle: { color: '#47627e' } },
      axisLabel: { color: '#8da8c8', hideOverlap: true },
      splitLine: { show: false }
    },
    yAxis: model.value.yAxes,
    dataZoom: [
      { type: 'inside', filterMode: 'none', zoomOnMouseWheel: true, moveOnMouseMove: true },
      {
        type: 'slider', filterMode: 'none', height: 20, bottom: 10,
        borderColor: 'rgba(68, 135, 193, .3)',
        backgroundColor: 'rgba(3, 19, 34, .65)',
        fillerColor: 'rgba(38, 168, 255, .18)',
        handleStyle: { color: '#26a8ff' },
        textStyle: { color: '#7895b4' }
      }
    ],
    series: model.value.series
  };
}

function renderChart() {
  if (!chartElement.value || !props.results.length) return;
  if (!chart) chart = echarts.init(chartElement.value, null, { renderer: 'canvas' });
  chart.setOption(chartOption(), true);
}

function resetZoom() {
  chart?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
}

onMounted(async () => {
  await nextTick();
  renderChart();
  if (chartElement.value) {
    resizeObserver = new ResizeObserver(() => chart?.resize());
    resizeObserver.observe(chartElement.value);
  }
});

watch(() => props.results, async () => {
  await nextTick();
  renderChart();
}, { deep: true });

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<style scoped>
.combined-history-chart { min-width: 0; padding: 0 12px 12px; }
.combined-chart-head { min-height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 8px 12px; border: 1px solid rgba(67, 146, 217, .25); border-bottom: 0; border-radius: 6px 6px 0 0; background: rgba(3, 22, 39, .78); }
.combined-chart-head strong { color: #eff8ff; font-size: 15px; }
.combined-chart-head p { margin: 5px 0 0; color: #7898b8; font-size: 12px; }
.combined-chart-summary { display: flex; align-items: center; gap: 12px; color: #86a5c3; font-size: 12px; }
.combined-chart-summary button { padding: 5px 9px; font-size: 12px; }
.combined-chart-canvas { width: 100%; height: 430px; border: 1px solid rgba(67, 146, 217, .25); border-radius: 0 0 6px 6px; background: rgba(3, 22, 39, .78); }
.combined-chart-empty { min-height: 300px; display: grid; place-items: center; border: 1px dashed rgba(92, 149, 203, .26); color: #7892ad; }
:global(.combined-tooltip-row) { display: grid; grid-template-columns: auto minmax(110px, 1fr) auto; align-items: center; gap: 8px; margin-top: 7px; }
:global(.combined-tooltip-row b) { color: #fff; font-weight: 600; }
@media (max-width: 1100px) {
  .combined-chart-canvas { height: 500px; }
  .combined-chart-head { align-items: flex-start; }
  .combined-chart-summary { flex-wrap: wrap; justify-content: flex-end; }
}
</style>
