export function isWaterLevelMetric(value = {}) {
  const type = String(value.type || value.key || '');
  const metric = String(value.metric || value.axisName || '');
  return type === 'level'
    || type.includes('水位')
    || type.includes('液位')
    || metric.includes('水位')
    || metric.includes('液位');
}

export function createWaterLevelThresholdLines({ showLabel = true } = {}) {
  return [
    {
      name: '上限',
      yAxis: 0.5,
      label: { show: showLabel, formatter: '上限 0.50 m', color: '#ff7d75' },
      lineStyle: { color: '#ef6262', type: 'dashed', width: 1.5 },
    },
    {
      name: '下限',
      yAxis: 0.2,
      label: { show: showLabel, formatter: '下限 0.20 m', color: '#f0bd5b' },
      lineStyle: { color: '#d99c38', type: 'dashed', width: 1.5 },
    },
  ];
}

export function createWaterLevelMarkLine(options) {
  return {
    silent: true,
    symbol: ['none', 'none'],
    data: createWaterLevelThresholdLines(options),
  };
}
