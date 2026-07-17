<template>
  <article class="device-chart-card">
    <header class="device-chart-head">
      <div>
        <div class="device-chart-title">
          <strong>{{ result.device.id }}</strong>
          <span>{{ result.device.type }}</span>
          <i :class="statusClass">{{ result.device.state }}</i>
        </div>
        <p>{{ result.device.location }} · {{ result.device.metric }}（{{ result.device.unit }}）</p>
      </div>
      <button type="button" title="恢复完整时间范围" @click="resetZoom">重置视图</button>
    </header>

    <div class="device-chart-meta">
      <span>{{ rangeLabel }}</span>
      <span>{{ validPointCount }} 个数据点</span>
      <span>最新值 <b>{{ latestValue }}</b></span>
    </div>

    <div v-if="validPointCount" ref="chartElement" class="device-chart-canvas" role="img" :aria-label="chartLabel"></div>
    <div v-else class="device-chart-empty">该设备在当前时段没有可用数据</div>
  </article>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  TooltipComponent
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  DataZoomComponent,
  GridComponent,
  TooltipComponent,
  CanvasRenderer
]);

const props = defineProps({
  result: { type: Object, required: true },
  rangeLabel: { type: String, required: true }
});

const chartElement = ref(null);
let chart = null;
let resizeObserver = null;

const validPoints = computed(() => props.result.points.filter((point) => point.value !== null));
const validPointCount = computed(() => validPoints.value.length);
const latestValue = computed(() => {
  const point = validPoints.value.at(-1);
  return point ? `${point.value.toFixed(props.result.device.precision)} ${props.result.device.unit}` : '--';
});
const chartLabel = computed(() => `${props.result.device.id}${props.result.device.metric}历史变化曲线`);
const statusClass = computed(() => ({
  在线: 'online',
  异常: 'warning',
  离线: 'offline'
}[props.result.device.state] || 'offline'));

const chartColors = {
  水位计: '#26a8ff',
  流量计: '#24c98a',
  压力计: '#e4b549',
  闸门: '#ff8a4c',
  水泵: '#bd7dff'
};

function chartOption() {
  const { device, points } = props.result;
  const color = chartColors[device.type] || '#26a8ff';
  return {
    animationDuration: 350,
    textStyle: { color: '#a9bdd5', fontFamily: 'Microsoft YaHei, sans-serif' },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(3, 20, 36, .96)',
      borderColor: color,
      textStyle: { color: '#e8f4ff' },
      valueFormatter: (value) => value === null ? '--' : `${Number(value).toFixed(device.precision)} ${device.unit}`
    },
    grid: { left: 58, right: 20, top: 24, bottom: 60 },
    xAxis: {
      type: 'time',
      name: '时间',
      nameGap: 24,
      axisLine: { lineStyle: { color: '#47627e' } },
      axisLabel: { color: '#8da8c8', hideOverlap: true },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      name: `${device.metric} (${device.unit})`,
      scale: device.unit !== '%',
      min: device.unit === '%' ? 0 : undefined,
      max: device.unit === '%' ? 100 : undefined,
      nameTextStyle: { color: '#b9cee6', padding: [0, 0, 5, 0] },
      axisLabel: { color: '#8da8c8' },
      axisLine: { show: true, lineStyle: { color: '#47627e' } },
      splitLine: { lineStyle: { color: 'rgba(93, 139, 181, .16)' } }
    },
    dataZoom: [
      { type: 'inside', filterMode: 'none', zoomOnMouseWheel: true, moveOnMouseMove: true },
      {
        type: 'slider',
        filterMode: 'none',
        height: 18,
        bottom: 8,
        borderColor: 'rgba(68, 135, 193, .3)',
        backgroundColor: 'rgba(3, 19, 34, .65)',
        fillerColor: 'rgba(38, 168, 255, .18)',
        handleStyle: { color },
        textStyle: { color: '#7895b4' }
      }
    ],
    series: [{
      name: `${device.id} ${device.metric}`,
      type: 'line',
      showSymbol: false,
      connectNulls: false,
      smooth: 0.18,
      lineStyle: { width: 2, color },
      areaStyle: { color, opacity: 0.07 },
      data: points.map((point) => [point.timestamp, point.value])
    }]
  };
}

function renderChart() {
  if (!chartElement.value || !validPointCount.value) return;
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

watch(() => props.result, async () => {
  await nextTick();
  if (!validPointCount.value && chart) {
    chart.dispose();
    chart = null;
    return;
  }
  renderChart();
}, { deep: true });

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<style scoped>
.device-chart-card { min-width: 0; border: 1px solid rgba(67, 146, 217, .28); border-radius: 6px; background: rgba(3, 22, 39, .78); overflow: hidden; }
.device-chart-head { min-height: 66px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px 14px 8px; border-bottom: 1px solid rgba(71, 137, 198, .14); }
.device-chart-title { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.device-chart-title strong { color: #f0f7ff; font-size: 16px; }
.device-chart-title span { color: #83a9cb; font-size: 13px; }
.device-chart-title i { padding: 2px 6px; border-radius: 3px; font-size: 11px; font-style: normal; }
.device-chart-title i.online { color: #65ea8b; background: rgba(37, 165, 78, .18); }
.device-chart-title i.warning { color: #ffb94b; background: rgba(214, 123, 20, .2); }
.device-chart-title i.offline { color: #9daabc; background: rgba(117, 131, 151, .18); }
.device-chart-head p { margin: 5px 0 0; color: #88a5c3; font-size: 12px; }
.device-chart-head button { flex: 0 0 auto; padding: 5px 9px; font-size: 12px; }
.device-chart-meta { min-height: 30px; display: flex; align-items: center; flex-wrap: wrap; gap: 6px 14px; padding: 5px 14px; color: #7492b1; font-size: 11px; }
.device-chart-meta span:first-child { flex: 1 1 180px; }
.device-chart-meta b { color: #dcecff; font-weight: 600; }
.device-chart-canvas { width: 100%; height: 250px; }
.device-chart-empty { height: 250px; display: grid; place-items: center; color: #8099b5; font-size: 13px; }
</style>
