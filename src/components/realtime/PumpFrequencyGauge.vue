<template>
  <div
    ref="chartElement"
    class="pump-frequency-gauge"
    role="img"
    :aria-label="`水泵当前频率 ${displayValue} 赫兹`"
  ></div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { GaugeChart } from 'echarts/charts';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([GaugeChart, CanvasRenderer]);

const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 50 },
});

const chartElement = ref(null);
const displayValue = computed(() => normalizeValue());
let chart = null;
let resizeObserver = null;

function normalizeValue() {
  const maximum = Number.isFinite(props.max) && props.max > 0 ? props.max : 50;
  const value = Number.isFinite(props.value) ? props.value : 0;
  return Math.min(maximum, Math.max(0, value));
}

function buildGaugeOption() {
  const maximum = Number.isFinite(props.max) && props.max > 0 ? props.max : 50;

  return {
    animationDuration: 650,
    animationDurationUpdate: 650,
    animationEasingUpdate: 'cubicInOut',
    series: [{
      type: 'gauge',
      min: 0,
      max: maximum,
      splitNumber: 5,
      startAngle: 180,
      endAngle: 0,
      center: ['50%', '78%'],
      radius: '126%',
      progress: {
        show: true,
        roundCap: true,
        width: 10,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#05fcfd' },
              { offset: 0.58, color: '#05b9ff' },
              { offset: 1, color: '#1677ff' },
            ],
          },
          shadowBlur: 7,
          shadowColor: 'rgba(8, 189, 255, 0.72)',
        },
      },
      axisLine: {
        roundCap: true,
        lineStyle: {
          width: 10,
          color: [[1, 'rgba(86, 105, 126, 0.58)']],
        },
      },
      pointer: {
        show: true,
        showAbove: false,
        length: '57%',
        width: 5,
        itemStyle: {
          color: '#16b9ff',
          shadowBlur: 6,
          shadowColor: 'rgba(5, 252, 253, 0.82)',
        },
      },
      anchor: {
        show: true,
        size: 9,
        itemStyle: {
          color: '#16b9ff',
          borderColor: '#a5efff',
          borderWidth: 1,
          shadowBlur: 5,
          shadowColor: '#05fcfd',
        },
      },
      axisTick: {
        distance: 3,
        splitNumber: 4,
        length: 4,
        lineStyle: { color: '#4c7899', width: 1 },
      },
      splitLine: {
        distance: 3,
        length: 7,
        lineStyle: { color: '#6f9dbd', width: 1 },
      },
      axisLabel: {
        distance: 12,
        color: '#7798b0',
        fontSize: 9,
      },
      title: {
        offsetCenter: [0, '-22%'],
        color: '#e3edf3',
        fontSize: 11,
        textBorderColor: 'rgba(2, 27, 47, 0.94)',
        textBorderWidth: 2,
        textShadowBlur: 3,
        textShadowColor: 'rgba(0, 0, 0, 0.72)',
      },
      detail: {
        offsetCenter: [0, '-42%'],
        color: '#ffd45c',
        fontSize: 23,
        fontWeight: 700,
        valueAnimation: true,
        formatter: (value) => Number(value).toFixed(0),
      },
      data: [{ value: normalizeValue(), name: '当前频率' }],
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

  chart.setOption(buildGaugeOption(), { notMerge: true });
}

onMounted(renderChart);
watch(() => [props.value, props.max], renderChart);
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<style scoped>
.pump-frequency-gauge {
  width: 100%;
  height: 146px;
}
</style>
