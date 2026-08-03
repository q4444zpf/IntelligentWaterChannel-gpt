import {
  createWaterLevelThresholdLines,
  isWaterLevelMetric,
} from './water-level-thresholds.js';

function formatTime(timestamp) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(timestamp));
}

export function buildAlarmHistoryChartOption(result, query, alarmTimestamp) {
  const { device, points } = result;
  const color = isWaterLevelMetric(device) ? '#26a8ff' : '#35c97f';
  const markLines = [{
    name: '告警时刻',
    xAxis: alarmTimestamp,
    label: {
      show: true,
      formatter: formatTime(alarmTimestamp),
      position: 'insideEndTop',
      rotate: 0,
      align: 'center',
      verticalAlign: 'bottom',
      color: '#ff6258',
      fontWeight: 700,
    },
    lineStyle: { color: '#ff5148', type: 'solid', width: 2 },
  }];
  if (isWaterLevelMetric(device)) {
    markLines.push(...createWaterLevelThresholdLines().map((line) => ({
      ...line,
      label: { ...line.label, position: 'insideEndTop' },
    })));
  }

  return {
    animationDuration: 350,
    textStyle: { color: '#a9bdd5', fontFamily: 'Microsoft YaHei, sans-serif' },
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'cross', label: { backgroundColor: '#1d5d8f' } },
      backgroundColor: 'rgba(3, 20, 36, .97)',
      borderColor: '#297eb9',
      textStyle: { color: '#e8f4ff' },
      valueFormatter: (value) => value === null || value === undefined
        ? '--'
        : `${Number(value).toFixed(device.precision)} ${device.unit}`,
    },
    grid: { left: 12, right: 12, top: 38, bottom: 12, containLabel: true },
    xAxis: {
      type: 'time',
      min: new Date(query.start).getTime(),
      max: new Date(query.end).getTime(),
      axisLine: { lineStyle: { color: '#47627e' } },
      axisLabel: { color: '#8da8c8', hideOverlap: true },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: `${device.metric} (${device.unit})`,
      scale: device.unit !== '%',
      min: device.unit === '%' ? 0 : undefined,
      max: device.unit === '%' ? 100 : undefined,
      nameTextStyle: { color: '#b9cee6' },
      axisLine: { show: true, lineStyle: { color: '#47627e' } },
      axisLabel: { color: '#8da8c8' },
      splitLine: { lineStyle: { color: 'rgba(93, 139, 181, .16)' } },
    },
    series: [{
      name: `${device.name || device.id} ${device.metric}`,
      type: 'line',
      showSymbol: false,
      connectNulls: false,
      lineStyle: { width: 2, color },
      itemStyle: { color },
      data: points.map((point) => [point.timestamp, point.value]),
      markLine: { silent: true, symbol: ['none', 'none'], data: markLines },
    }],
  };
}
