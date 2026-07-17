<template>
  <div class="trend-chart-shell" :aria-busy="loading || refreshing">
    <div v-if="loading" class="trend-chart-state"><span class="trend-spinner"></span>正在加载趋势数据</div>
    <div v-else-if="isEmpty" class="trend-chart-state">{{ error || '当前条件下没有趋势数据' }}</div>
    <div v-show="!loading && !isEmpty" ref="chartElement" class="trend-chart-canvas" role="img" :aria-label="`${config.label}多设备曲线`"></div>
    <div v-if="error && snapshot" class="trend-chart-error" role="status">{{ error }}</div>
    <div v-if="refreshing" class="trend-chart-refresh"><span class="trend-spinner"></span>更新中</div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';
import { LineChart } from 'echarts/charts';
import { BrushComponent, DataZoomComponent, GridComponent, LegendComponent, MarkAreaComponent, ToolboxComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import type { TrendConfig, TrendSnapshot } from '../../../config/trendConfig.ts';
import { buildRealtimeTrendOption } from '../../../realtime-trend-option.ts';

echarts.use([LineChart, BrushComponent, DataZoomComponent, GridComponent, LegendComponent, MarkAreaComponent, ToolboxComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps({
  config: { type: Object as PropType<TrendConfig>, required: true },
  snapshot: { type: Object as PropType<TrendSnapshot | null>, default: null },
  loading: { type: Boolean, default: false },
  refreshing: { type: Boolean, default: false },
  error: { type: String, default: '' },
  compact: { type: Boolean, default: false }
});
const chartElement = ref<HTMLElement | null>(null);
const isEmpty = computed(() => !props.snapshot?.series.some((series) => series.points.some((point) => point.value !== null)));
let chart: ReturnType<typeof echarts.init> | null = null;
let resizeObserver: ResizeObserver | null = null;

async function renderChart() {
  if (props.loading || isEmpty.value || !props.snapshot) return;
  await nextTick();
  if (!chartElement.value) return;
  if (!chart) {
    chart = echarts.init(chartElement.value, null, { renderer: 'canvas' });
    resizeObserver = new ResizeObserver(() => chart?.resize());
    resizeObserver.observe(chartElement.value);
  }
  chart.setOption(buildRealtimeTrendOption(props.config, props.snapshot, props.compact), true);
  chart.resize();
}
function resetZoom() { chart?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 }); chart?.dispatchAction({ type: 'brush', command: 'clear', areas: [] }); }
defineExpose({ resetZoom });
onMounted(renderChart);
watch(() => [props.snapshot, props.loading, props.config], renderChart, { deep: true });
onBeforeUnmount(() => { resizeObserver?.disconnect(); chart?.dispose(); });
</script>

<style scoped>
.trend-chart-shell { position: relative; flex: 1; min-width: 0; min-height: 180px; overflow: hidden; border: 1px solid rgba(54, 135, 190, .2); border-radius: 5px; background: rgba(2, 16, 29, .72); }
.trend-chart-canvas { width: 100%; height: 100%; }
.trend-chart-state { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px; color: #7898b6; font-size: 12px; }
.trend-spinner { display: inline-block; width: 11px; height: 11px; border: 2px solid rgba(57, 246, 255, .25); border-top-color: #39f6ff; border-radius: 50%; animation: trend-spin .8s linear infinite; }
.trend-chart-error { position: absolute; left: 10px; top: 42px; z-index: 4; padding: 4px 7px; border: 1px solid rgba(255, 117, 104, .35); border-radius: 4px; color: #ffaaa2; background: rgba(60, 17, 20, .88); font-size: 11px; }
.trend-chart-refresh { position: absolute; right: 10px; top: 39px; z-index: 4; display: flex; gap: 5px; align-items: center; color: #8edce7; font-size: 10px; }
:global(.trend-tooltip-row) { display: grid; grid-template-columns: auto minmax(110px, 1fr) auto auto; gap: 7px; align-items: center; margin-top: 6px; }
:global(.trend-tooltip-row b) { color: #fff; }
@keyframes trend-spin { to { transform: rotate(360deg); } }
@media (max-width: 1400px) { .trend-chart-shell { min-height: 150px; } }
</style>
