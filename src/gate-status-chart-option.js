const ONLINE_GRADIENT = [
  { offset: 0, color: '#05F9FD' },
  { offset: 1, color: '#096BF8' },
];

const OFFLINE_GRADIENT = [
  { offset: 0, color: 'rgba(184, 76, 86, 0.46)' },
  { offset: 1, color: 'rgba(82, 82, 94, 0.3)' },
];

function verticalGradient(colorStops) {
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops,
  };
}

function openingValue(value) {
  const numeric = Number.parseFloat(String(value));
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function axisMaximum(values) {
  const maximum = Math.max(0, ...values);
  if (maximum === 0) return 1;

  const target = maximum * 1.15;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;
  const interval = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return interval * magnitude;
}

function formatOpening(value) {
  if (value === null) return '--';
  return Number(value).toFixed(3).replace(/\.?0+$/, '');
}

export function buildGateStatusChartOption(gates = []) {
  const normalizedGates = (Array.isArray(gates) ? gates : []).map((gate) => {
    const online = gate?.state === '在线';
    const opening = online ? openingValue(gate?.open) : null;
    return {
      id: gate?.id || gate?.name || '--',
      opening,
      state: online ? '在线' : '离线',
    };
  });
  const max = axisMaximum(normalizedGates.map((gate) => gate.opening ?? 0));
  const axisPrecision = max < 1 ? 2 : max < 10 ? 1 : 0;

  return {
    animation: true,
    animationDuration: 420,
    animationDurationUpdate: 700,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicInOut',
    backgroundColor: 'transparent',
    grid: { left: 4, right: 8, top: 8, bottom: 2, containLabel: true },
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(3, 20, 36, 0.96)',
      borderColor: '#258fc5',
      textStyle: { color: '#e8f7ff', fontSize: 11 },
      formatter: (params) => {
        const data = params?.[0]?.data;
        if (!data) return '';
        return `<strong>${data.gateId}</strong><br>开度：${data.openingLabel} mm<br>状态：${data.state}`;
      },
    },
    xAxis: {
      type: 'category',
      data: normalizedGates.map((gate) => gate.id),
      axisLine: { lineStyle: { color: 'rgba(56, 138, 189, 0.48)' } },
      axisTick: { show: false },
      axisLabel: { color: '#20d9ff', fontSize: 10, fontWeight: 600, interval: 0 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max,
      splitNumber: 5,
      name: '开度（mm）',
      nameTextStyle: { color: '#7599b6', fontSize: 9, padding: [0, 0, 0, -4] },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#537b99',
        fontSize: 9,
        formatter: (value) => Number(value).toFixed(axisPrecision),
      },
      splitLine: { lineStyle: { color: 'rgba(39, 117, 170, 0.16)', type: 'dashed' } },
    },
    series: [{
      id: 'gate-opening',
      name: '闸门开度',
      type: 'bar',
      barMaxWidth: 20,
      barMinHeight: 1,
      data: normalizedGates.map((gate) => ({
        id: gate.id,
        name: gate.id,
        value: gate.opening ?? 0,
        gateId: gate.id,
        openingLabel: formatOpening(gate.opening),
        state: gate.state,
        itemStyle: {
          color: verticalGradient(gate.state === '在线' ? ONLINE_GRADIENT : OFFLINE_GRADIENT),
          borderRadius: [7, 7, 0, 0],
          shadowBlur: gate.state === '在线' ? 8 : 0,
          shadowColor: gate.state === '在线' ? 'rgba(5, 249, 253, 0.42)' : 'transparent',
        },
      })),
    }],
  };
}
