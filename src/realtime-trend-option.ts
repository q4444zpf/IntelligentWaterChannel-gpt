import type { TrendConfig, TrendSeries, TrendSnapshot } from './config/trendConfig.ts';

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(timestamp)).replaceAll('/', '-');
}

function stoppedAreas(series: TrendSeries): Array<Array<Record<string, unknown>>> {
  const areas: Array<Array<Record<string, unknown>>> = [];
  let start: number | null = null;
  series.points.forEach((point, index) => {
    if (point.running === false && start === null) start = point.timestamp;
    const ends = start !== null && (point.running !== false || index === series.points.length - 1);
    if (ends) {
      areas.push([{ name: '停止', xAxis: start, itemStyle: { color: 'rgba(124, 139, 154, .10)' } }, { xAxis: point.timestamp }]);
      start = null;
    }
  });
  return areas;
}

export function buildRealtimeTrendOption(config: TrendConfig, snapshot: TrendSnapshot, compact = false): any {
  const tooltipFormatter = (params: any[]) => {
    if (!params?.length) return '';
    const timestamp = params[0].value?.[0];
    const rows = params.map((param) => {
      const item = snapshot.series[param.seriesIndex];
      const point = item?.points[param.dataIndex];
      const rawValue = point?.value ?? param.value?.[1];
      const value = rawValue === null || rawValue === undefined ? '--' : `${Number(rawValue).toFixed(config.precision)} ${config.unit}`;
      const running = point?.running === undefined ? '' : `<span>${point.running ? '运行' : '停止'}</span>`;
      return `<div class="trend-tooltip-row">${param.marker}<span>${item.device.id} ${item.device.location}</span><b>${value}</b>${running}</div>`;
    });
    return `<strong>${formatTime(timestamp)}</strong>${rows.join('')}`;
  };

  const series = snapshot.series.map((item) => ({
    name: item.device.id,
    type: 'line',
    smooth: 0.16,
    showSymbol: false,
    connectNulls: false,
    emphasis: { focus: 'series' },
    lineStyle: { color: item.device.color, width: 2 },
    itemStyle: { color: item.device.color },
    data: item.points.map((point) => [point.timestamp, point.value]),
    ...(config.showRunningState ? { markArea: { silent: true, label: { color: '#8395a7', fontSize: 9 }, data: stoppedAreas(item) } } : {})
  }));

  return {
    animationDuration: 300,
    textStyle: { color: '#a9bdd5', fontFamily: 'Microsoft YaHei, sans-serif' },
    legend: { type: 'scroll', top: 8, left: 14, right: 72, data: series.map((item) => item.name), textStyle: { color: '#b4c9df' }, pageTextStyle: { color: '#8eb5d8' } },
    tooltip: { trigger: 'axis', confine: true, formatter: tooltipFormatter, axisPointer: { type: 'cross', label: { backgroundColor: '#1d648c' } }, backgroundColor: 'rgba(3, 20, 36, .97)', borderColor: '#297eb9', textStyle: { color: '#e8f4ff' } },
    toolbox: { right: 10, top: 3, iconStyle: { borderColor: '#7eaaca' }, emphasis: { iconStyle: { borderColor: '#39f6ff' } }, feature: { dataZoom: { yAxisIndex: 'none', title: { zoom: '框选缩放', back: '缩放回退' } }, brush: { type: ['lineX', 'clear'], title: { lineX: '框选区间', clear: '清除框选' } }, restore: { title: '恢复视图' } } },
    brush: { xAxisIndex: 0, brushMode: 'single', throttleType: 'debounce', throttleDelay: 300 },
    grid: { left: compact ? 50 : 58, right: 24, top: 50, bottom: 60, containLabel: true },
    xAxis: { type: 'time', name: '时间', nameLocation: 'middle', nameGap: 30, axisLine: { lineStyle: { color: '#526e88' } }, axisLabel: { color: '#8fa9c2', hideOverlap: true }, splitLine: { show: false } },
    yAxis: { type: 'value', scale: true, name: `${config.axisName}（${config.unit}）`, nameLocation: 'middle', nameRotate: 90, nameGap: 42, axisLine: { show: true, lineStyle: { color: '#526e88' } }, axisLabel: { color: '#8fa9c2' }, splitLine: { lineStyle: { color: 'rgba(88, 137, 178, .16)' } } },
    dataZoom: [
      { type: 'inside', filterMode: 'none', minSpan: 5 },
      { type: 'slider', filterMode: 'none', height: 16, bottom: 7, borderColor: 'rgba(68, 135, 193, .3)', backgroundColor: 'rgba(3, 19, 34, .65)', fillerColor: 'rgba(38, 168, 255, .18)', handleStyle: { color: '#26a8ff' }, textStyle: { color: '#7895b4', fontSize: 9 } }
    ],
    series
  };
}
