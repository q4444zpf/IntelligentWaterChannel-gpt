<template>
  <div class="gate-status-chart">
    <div v-if="!gates.length" class="gate-status-chart__empty">{{ emptyText }}</div>
    <div
      v-show="gates.length"
      ref="chartElement"
      class="gate-status-chart__canvas"
      role="img"
      aria-label="闸门开度柱状图"
    ></div>
  </div>
</template>

<script setup>
import {nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {BarChart} from 'echarts/charts';
import {GridComponent, TooltipComponent} from 'echarts/components';
import * as echarts from 'echarts/core';
import {CanvasRenderer} from 'echarts/renderers';
import {buildGateStatusChartOption} from '../../gate-status-chart-option.js';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps({
  gates: {type: Array, default: () => []},
  emptyText: {type: String, default: '暂无闸门数据'},
});

const chartElement = ref(null);
let chart = null;
let resizeObserver = null;

async function renderChart() {
  if (!props.gates.length) return;
  await nextTick();
  if (!chartElement.value) return;
  if (!chart) {
    chart = echarts.init(chartElement.value, null, {renderer: 'canvas'});
    resizeObserver = new ResizeObserver(() => chart?.resize());
    resizeObserver.observe(chartElement.value);
  }
  chart.setOption(buildGateStatusChartOption(props.gates), {
    notMerge: false,
    lazyUpdate: false,
  });
}

onMounted(renderChart);
watch(() => props.gates, renderChart, {deep: true});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<style scoped>
.gate-status-chart {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
}

.gate-status-chart__canvas {
  width: 100%;
  height: 100%;
}

.gate-status-chart__empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #7f9db3;
  font-size: 11px;
}
</style>
