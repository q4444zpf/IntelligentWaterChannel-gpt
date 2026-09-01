<template>
  <div
    ref="chartElement"
    class="metric-bar-chart"
    role="img"
    :aria-label="ariaLabel"
  ></div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps({
  items: { type: Array, default: () => [] },
  max: { type: Number, default: 100 },
  unit: { type: String, default: '' },
  ariaLabel: { type: String, default: '实时数据柱状图' },
});

const chartElement = ref(null);
let chart = null;
let resizeObserver = null;

function buildChartOption() {
  return {
    animationDuration: 650,
    grid: { top: 25, right: 16, bottom: 36, left: 42 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(2, 24, 45, 0.96)',
      borderColor: 'rgba(68, 191, 243, 0.62)',
      textStyle: { color: '#eaf8ff', fontSize: 12 },
      formatter: (params) => `${params[0]?.name || ''}<br/>${params[0]?.value ?? '--'} ${props.unit}`,
    },
    xAxis: {
      type: 'category',
      data: props.items.map((item) => item.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(87, 154, 198, 0.42)' } },
      axisLabel: { color: '#a9c9de', fontSize: 11, interval: 0 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: props.max,
      name: props.unit,
      nameTextStyle: { color: '#789bb5', fontSize: 10, padding: [0, 0, 0, -22] },
      splitNumber: 4,
      axisLabel: { color: '#789bb5', fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(95, 153, 190, 0.16)', type: 'dashed' } },
    },
    series: [{
      type: 'bar',
      barWidth: props.items.length === 1 ? '30%' : '34%',
      showBackground: true,
      backgroundStyle: { color: 'rgba(33, 85, 122, 0.2)', borderRadius: 2 },
      label: {
        show: true,
        position: 'top',
        color: '#f2fbff',
        fontSize: 12,
        formatter: ({ value }) => `${value} ${props.unit}`,
      },
      itemStyle: {
        borderRadius: [2, 2, 0, 0],
        color: (params) => props.items[params.dataIndex]?.color || '#28c9f5',
        shadowBlur: 8,
        shadowColor: 'rgba(36, 205, 255, 0.36)',
      },
      data: props.items.map((item) => item.value),
    }],
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
watch(() => [props.items, props.max, props.unit], renderChart, { deep: true });
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<style scoped>
.metric-bar-chart {
  width: 100%;
  height: 100%;
  min-height: 130px;
}
</style>
