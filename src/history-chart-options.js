const UNIT_COLORS = {
  m: '#26a8ff',
  '%': '#ff8a4c',
  'L/s': '#24c98a',
  MPa: '#e4b549',
  Hz: '#bd7dff'
};

const SERIES_COLORS = [
  '#26a8ff', '#57d58a', '#ff8a4c', '#e4b549', '#bd7dff',
  '#27c6d9', '#ff6d91', '#82a7ff', '#f0c45d', '#40d4ad'
];

function unitAxisName(device) {
  return `${device.metric} (${device.unit})`;
}

export function buildCombinedChartModel(results) {
  const axisIndexByUnit = new Map();
  const yAxes = [];

  results.forEach(({ device }) => {
    if (axisIndexByUnit.has(device.unit)) return;
    const index = yAxes.length;
    const position = index % 2 === 0 ? 'left' : 'right';
    const offset = Math.floor(index / 2) * 64;
    const color = UNIT_COLORS[device.unit] || SERIES_COLORS[index % SERIES_COLORS.length];
    axisIndexByUnit.set(device.unit, index);
    yAxes.push({
      type: 'value',
      name: unitAxisName(device),
      unit: device.unit,
      position,
      offset,
      scale: device.unit !== '%',
      min: device.unit === '%' ? 0 : undefined,
      max: device.unit === '%' ? 100 : undefined,
      nameTextStyle: { color, padding: [0, 0, 6, 0] },
      axisLine: { show: true, lineStyle: { color } },
      axisTick: { show: true, lineStyle: { color } },
      axisLabel: { color: '#91aac4' },
      splitLine: { show: index === 0, lineStyle: { color: 'rgba(93, 139, 181, .16)' } }
    });
  });

  const maxLeftOffset = Math.max(0, ...yAxes.filter((axis) => axis.position === 'left').map((axis) => axis.offset));
  const maxRightOffset = Math.max(0, ...yAxes.filter((axis) => axis.position === 'right').map((axis) => axis.offset));
  const series = results.map(({ device, points }, index) => ({
    name: `${device.id} ${device.metric}`,
    deviceId: device.id,
    metric: device.metric,
    unit: device.unit,
    precision: device.precision,
    type: 'line',
    yAxisIndex: axisIndexByUnit.get(device.unit),
    showSymbol: false,
    connectNulls: false,
    smooth: 0.16,
    emphasis: { focus: 'series' },
    lineStyle: { width: 2, color: SERIES_COLORS[index % SERIES_COLORS.length] },
    itemStyle: { color: SERIES_COLORS[index % SERIES_COLORS.length] },
    data: points.map((point) => [point.timestamp, point.value])
  }));

  return {
    yAxes,
    series,
    legendNames: series.map((item) => item.name),
    grid: {
      left: 62 + maxLeftOffset,
      right: 62 + maxRightOffset,
      containLabel: true
    }
  };
}
