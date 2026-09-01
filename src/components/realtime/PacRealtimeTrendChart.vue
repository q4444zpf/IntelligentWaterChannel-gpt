<template>
  <div
    ref="chartElement"
    class="pac-trend-chart"
    role="img"
    aria-label="前馈浊度、后馈浊度与PAC配药箱水位实时趋势"
  ></div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, LegendComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps({
  data: {
    type: Object,
    default: () => ({ times: [], preTurbidity: [], postTurbidity: [], tankLevel: [] }),
  },
  targetRange: { type: Array, default: () => [10, 20] },
});

const chartElement = ref(null);
let chart = null;
let resizeObserver = null;

function buildChartOption() {
  const commonSeries = {
    type: 'line',
    smooth: 0.32,
    showSymbol: false,
    lineStyle: { width: 2 },
    emphasis: { focus: 'series' },
  };
  return {
    animationDuration: 650,
    color: ['#3de0ff', '#64e59b', '#ffc65c'],
    grid: { top: 46, right: 44, bottom: 30, left: 42 },
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
      axisLabel: { color: '#789bb5', fontSize: 9, interval: 2 },
    },
    yAxis: [
      {
        type: 'value',
        name: 'NTU',
        min: 0,
        max: 80,
        splitNumber: 4,
        nameTextStyle: { color: '#789bb5', fontSize: 9 },
        axisLabel: { color: '#789bb5', fontSize: 9 },
        splitLine: { lineStyle: { color: 'rgba(95, 153, 190, 0.16)', type: 'dashed' } },
      },
      {
        type: 'value',
        name: 'mm',
        min: 0,
        max: 1000,
        splitNumber: 4,
        nameTextStyle: { color: '#789bb5', fontSize: 9 },
        axisLabel: { color: '#789bb5', fontSize: 9 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        ...commonSeries,
        name: '前馈浊度',
        data: props.data.preTurbidity,
        markLine: {
          animation: false,
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#a7e8d1', width: 1, type: 'dashed', opacity: 0.78 },
          label: {
            show: true,
            position: 'insideEndTop',
            color: '#a7e8d1',
            fontSize: 9,
            formatter: ({ name }) => name,
          },
          data: [
            { name: `目标下限 ${props.targetRange[0]} NTU`, yAxis: props.targetRange[0] },
            { name: `目标上限 ${props.targetRange[1]} NTU`, yAxis: props.targetRange[1] },
          ],
        },
      },
      { ...commonSeries, name: '后馈浊度', data: props.data.postTurbidity },
      { ...commonSeries, name: '配药箱水位', yAxisIndex: 1, data: props.data.tankLevel },
    ],
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
watch(() => [props.data, props.targetRange], renderChart, { deep: true });
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<style scoped>
.pac-trend-chart {
  width: 100%;
  height: 100%;
  min-height: 170px;
}
</style>
