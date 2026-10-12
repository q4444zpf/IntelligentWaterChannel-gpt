<template>
  <div ref="chartElement" class="realtime-trend-chart" role="img" aria-label="实时趋势分析"></div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps({
  data: {
    type: Object,
    default: () => ({ times: [], series: [] }),
  },
});

const chartElement = ref(null);
let chart = null;
let resizeObserver = null;

function axisOptions() {
  const axes = new Map();
  props.data.series.forEach((item) => {
    const index = Number.isInteger(item.trendAxis) ? item.trendAxis : 0;
    if (!axes.has(index)) axes.set(index, item);
  });
  return [...axes.entries()].sort(([left], [right]) => left - right).map(([index, item]) => ({
    type: 'value',
    name: item.unit || '',
    min: 0,
    max: Number.isFinite(Number(item.displayMax)) ? Number(item.displayMax) : undefined,
    splitNumber: 4,
    position: index === 0 ? 'left' : 'right',
    nameTextStyle: { color: '#789bb5', fontSize: 9 },
    axisLabel: { color: '#789bb5', fontSize: 9 },
    splitLine: index === 0
      ? { lineStyle: { color: 'rgba(95, 153, 190, 0.16)', type: 'dashed' } }
      : { show: false },
  }));
}

function buildChartOption() {
  return {
    animationDuration: 650,
    color: props.data.series.map((item) => item.displayColor || '#39d8ff'),
    grid: { top: 46, right: 48, bottom: 52, left: 42 },
    legend: {
      top: 5,
      itemWidth: 18,
      itemHeight: 3,
      textStyle: { color: '#a9c9de', fontSize: 10 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(2, 24, 45, 0.96)',
      borderColor: 'rgba(68, 191, 243, 0.62)',
      textStyle: { color: '#eaf8ff', fontSize: 11 },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.data.times,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(87, 154, 198, 0.42)' } },
      axisLabel: {
        color: '#789bb5',
        fontSize: 9,
        interval: 2,
        rotate: 45,
        margin: 10,
      },
    },
    yAxis: axisOptions(),
    series: props.data.series.map((item) => ({
      type: 'line',
      name: item.label,
      data: item.values,
      yAxisIndex: Number.isInteger(item.trendAxis) ? item.trendAxis : 0,
      smooth: 0.32,
      showSymbol: false,
      lineStyle: { width: 2 },
      emphasis: { focus: 'series' },
    })),
  };
}

async function renderChart() {
  await nextTick();
  if (!chartElement.value) return;
  if (!chart) {
    chart = echarts.init(chartElement.value, null, { renderer: 'canvas' });
    resizeObserver = new ResizeObserver(() => chart?.resize());
    resizeObserver.observe(chartElement.value);
  }
  chart.setOption(buildChartOption(), { notMerge: true });
}

onMounted(renderChart);
watch(() => props.data, renderChart, { deep: true });
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<style scoped>
.realtime-trend-chart {
  width: 100%;
  height: 100%;
  min-height: 170px;
}
</style>
