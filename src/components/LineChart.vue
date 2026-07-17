<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([GridComponent, LegendComponent, TooltipComponent, LineChart, CanvasRenderer])

const props = defineProps({
  series: Array,
  labels: {
    type: Array,
    default: () => ['0', '50', '100', '150', '200', '250', '300', '350', '400', '450', '500', '550', '600', '650', '700', '750', '800']
  },
  height: {
    type: Number,
    default: 210
  }
})

const chartEl = ref(null)
let chart
let resizeObserver

const option = computed(() => ({
  animation: false,
  backgroundColor: 'transparent',
  color: props.series.map((item) => item.color),
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(5, 20, 34, 0.94)',
    borderColor: 'rgba(44, 194, 255, 0.45)',
    borderWidth: 1,
    textStyle: { color: '#eaf6ff' },
    axisPointer: {
      type: 'line',
      lineStyle: { color: 'rgba(44, 194, 255, 0.45)' }
    },
    formatter: (params) => {
      let result = `<div style="font-weight:bold;margin-bottom:8px;">距离 L: ${params[0].axisValue} m</div>`
      params.forEach(item => {
        result += `<div style="display:flex;align-items:center;margin:4px 0;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.color};margin-right:8px;"></span>
          <span>${item.seriesName}: <strong>${item.value.toFixed(2)} m</strong></span>
        </div>`
      })
      return result
    }
  },
  legend: {
    bottom: 0,
    left: 60,
    itemWidth: 14,
    itemHeight: 14,
    textStyle: { color: '#cfe7f4', fontSize: 13 },
    data: props.series.map((item) => item.name)
  },
  grid: {
    top: 36,
    left: 62,
    right: 20,
    bottom: 70,
    containLabel: false
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.labels,
    name: '距离 L (m)',
    nameLocation: 'middle',
    nameGap: 48,
    nameTextStyle: { color: '#9abbd0', fontSize: 13, padding: [0, 0, 8, 0] },
    axisLine: { lineStyle: { color: 'rgba(32, 139, 194, 0.75)' } },
    axisTick: { show: false },
    axisLabel: { color: '#9abbd0', fontSize: 12 },
    splitLine: { show: true, lineStyle: { color: 'rgba(32, 139, 194, 0.35)' } }
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 1.2,
    interval: 0.2,
    name: '水深 H (m)',
    nameLocation: 'middle',
    nameGap: 45,
    nameTextStyle: { color: '#9abbd0', fontSize: 13 },
    axisLine: { show: true, lineStyle: { color: 'rgba(32, 139, 194, 0.75)' } },
    axisTick: { show: false },
    axisLabel: { color: '#9abbd0', fontSize: 12 },
    splitLine: { show: true, lineStyle: { color: 'rgba(32, 139, 194, 0.35)' } }
  },
  series: props.series.map((item, index) => ({
    name: item.name,
    type: 'line',
    data: item.points,
    smooth: index === 0 ? 0 : 0.3,
    symbol: 'circle',
    symbolSize: 6,
    showSymbol: false,
    lineStyle: { 
      width: 3,
      type: index === 1 ? 'dashed' : 'solid'
    },
    emphasis: { focus: 'series' },
    markLine: {
      silent: true,
      lineStyle: {
        width: 2,
        type: 'dashed'
      },
      data: [
        { xAxis: '150', lineStyle: { color: '#ff4757' }, label: { formatter: 'G0', color: '#ff4757', fontSize: 11, position: 'end' } },
        { xAxis: '250', lineStyle: { color: '#ff6b81' }, label: { formatter: 'G1', color: '#ff6b81', fontSize: 11, position: 'end' } },
        { xAxis: '320', lineStyle: { color: '#2ed573' }, label: { formatter: 'G3', color: '#2ed573', fontSize: 11, position: 'end' } },
        { xAxis: '400', lineStyle: { color: '#ffa502' }, label: { formatter: 'G2', color: '#ffa502', fontSize: 11, position: 'end' } },
        { xAxis: '480', lineStyle: { color: '#2ed573' }, label: { formatter: 'G4', color: '#2ed573', fontSize: 11, position: 'end' } },
        { xAxis: '550', lineStyle: { color: '#ff4757' }, label: { formatter: 'G5', color: '#ff4757', fontSize: 11, position: 'end' } },
        { xAxis: '650', lineStyle: { color: '#2ed573' }, label: { formatter: 'G6(左侧)', color: '#2ed573', fontSize: 11, position: 'end' } },
        { xAxis: '700', lineStyle: { color: '#ff4757' }, label: { formatter: 'G6(右侧)', color: '#ff4757', fontSize: 11, position: 'end' } }
      ]
    }
  }))
}))

function renderChart() {
  if (!chartEl.value) return
  if (!chart) {
    chart = echarts.init(chartEl.value, null, { renderer: 'canvas' })
  }
  chart.setOption(option.value, true)
  requestAnimationFrame(resizeChart)
}

function resizeChart() {
  if (!chart || !chartEl.value) return
  const { width, height } = chartEl.value.getBoundingClientRect()
  chart.resize({
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height))
  })
}

onMounted(async () => {
  await nextTick()
  renderChart()
  resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(resizeChart)
  })
  resizeObserver.observe(chartEl.value)
})

watch(option, renderChart, { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  chart?.dispose()
})
</script>

<template>
  <div class="line-chart" :style="{ height: `${height}px` }">
    <div ref="chartEl" class="echarts-canvas" role="img" aria-label="趋势曲线"></div>
  </div>
</template>