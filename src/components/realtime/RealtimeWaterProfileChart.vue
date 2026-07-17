<template>
  <div class="water-profile-shell" :aria-busy="loading || refreshing">
    <div v-if="loading" class="profile-state profile-loading"><span></span>正在加载节点水位数据</div>
    <div v-else-if="isEmpty" class="profile-state">当前没有可用的节点水位数据</div>
    <div v-show="!loading && !isEmpty" ref="chartElement" class="water-profile-chart" role="img" aria-label="节点水位沿程实测与模拟曲线"></div>
    <div v-if="error && !loading" class="profile-error" role="status">{{ error }}</div>
    <div v-if="refreshing" class="profile-refreshing"><span></span>数据更新中</div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { buildRealtimeWaterProfileOption } from '../../realtime-water-profile-option.js';

echarts.use([
  LineChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer
]);

const props = defineProps({
  snapshot: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  refreshing: { type: Boolean, default: false },
  error: { type: String, default: '' }
});

const chartElement = ref(null);
const isEmpty = computed(() => !props.snapshot?.nodes?.some((node) => node.measured !== null || node.simulated !== null));
let chart = null;
let resizeObserver = null;

async function renderChart() {
  if (props.loading || isEmpty.value) return;
  await nextTick();
  if (!chartElement.value) return;
  if (!chart) {
    chart = echarts.init(chartElement.value, null, { renderer: 'canvas' });
    resizeObserver = new ResizeObserver(() => chart?.resize());
    resizeObserver.observe(chartElement.value);
  }
  chart.setOption(buildRealtimeWaterProfileOption(props.snapshot), true);
  chart.resize();
}

function resetZoom() {
  chart?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
}

defineExpose({ resetZoom });
onMounted(renderChart);
watch(() => [props.snapshot, props.loading], renderChart, { deep: true });
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<style scoped>
.water-profile-shell { position: relative; flex: 1; min-width: 0; min-height: 180px; margin: 4px 12px 10px; overflow: hidden; border: 1px solid rgba(54, 135, 190, .2); border-radius: 6px; background: rgba(2, 16, 29, .72); }
.water-profile-chart { width: 100%; height: 100%; }
.profile-state { position: absolute; inset: 0; z-index: 3; display: flex; align-items: center; justify-content: center; gap: 9px; color: #7798b7; font-size: 13px; }
.profile-loading span, .profile-refreshing span { width: 12px; height: 12px; border: 2px solid rgba(57, 246, 255, .25); border-top-color: #39f6ff; border-radius: 50%; animation: spin .8s linear infinite; }
.profile-error { position: absolute; left: 12px; top: 42px; z-index: 4; padding: 5px 9px; border: 1px solid rgba(255, 117, 104, .38); border-radius: 4px; color: #ffaaa2; background: rgba(60, 17, 20, .88); font-size: 12px; }
.profile-refreshing { position: absolute; right: 12px; top: 42px; z-index: 4; display: flex; align-items: center; gap: 6px; color: #8edce7; font-size: 11px; }
:global(.profile-tooltip-time) { margin: 3px 0 7px; color: #7ea2bf; font-size: 11px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
