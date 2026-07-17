import { PROFILE_GATES, PROFILE_SEGMENTS } from './realtime-water-profile.js';

function formatTime(timestamp) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(new Date(timestamp)).replaceAll('/', '-');
}

function formatValue(value) {
  return value === null || value === undefined ? '--' : `${Number(value).toFixed(3)} m`;
}

export function buildRealtimeWaterProfileOption(snapshot) {
  const nodes = snapshot?.nodes ?? [];
  const tooltipFormatter = (params) => {
    const node = nodes[params?.[0]?.dataIndex];
    if (!node) return '';
    return `<strong>${node.label}</strong><div class="profile-tooltip-time">${formatTime(snapshot.timestamp)}</div>`
      + `<div>沿程距离 <b>${node.distance} m</b></div>`
      + `<div>${params[0]?.marker ?? ''}实测水位 <b>${formatValue(node.measured)}</b></div>`
      + `<div>${params[1]?.marker ?? ''}模拟水位 <b>${formatValue(node.simulated)}</b></div>`
      + `<div>设备状态 <b>${node.state}</b></div>`;
  };

  const gateLines = PROFILE_GATES.map((gate) => ({
    name: gate.id,
    xAxis: gate.distance,
    label: { formatter: gate.id, color: '#f4c76a', position: 'insideEndTop' },
    lineStyle: { color: 'rgba(244, 199, 106, .58)', width: 1, type: 'dashed' }
  }));
  const thresholdLines = [
    { name: '上限', yAxis: 0.5, label: { formatter: '上限 0.50 m', color: '#ff7d75' }, lineStyle: { color: '#ef6262', type: 'dashed' } },
    { name: '下限', yAxis: 0.2, label: { formatter: '下限 0.20 m', color: '#f0bd5b' }, lineStyle: { color: '#d99c38', type: 'dashed' } }
  ];

  return {
    animationDuration: 400,
    title: { text: '节点水位曲线', left: 18, top: 8, textStyle: { color: '#eaf7ff', fontSize: 14, fontWeight: 600 } },
    textStyle: { color: '#a9bdd5', fontFamily: 'Microsoft YaHei, sans-serif' },
    legend: { data: ['实测水位', '模拟水位'], type: 'scroll', top: 10, right: 20, textStyle: { color: '#b9d2e8' } },
    tooltip: {
      trigger: 'axis', confine: true, formatter: tooltipFormatter,
      axisPointer: { type: 'cross', label: { backgroundColor: '#1c668d' } },
      backgroundColor: 'rgba(3, 20, 36, .97)', borderColor: '#298ab3', textStyle: { color: '#e8f7ff' }
    },
    grid: { left: 62, right: 30, top: 62, bottom: 72, containLabel: true },
    xAxis: {
      type: 'value', min: 0, max: 830, name: '沿程距离 L（m）', nameLocation: 'middle', nameGap: 34,
      axisLine: { lineStyle: { color: '#55718c' } }, axisLabel: { color: '#91abc4', hideOverlap: true },
      splitLine: { lineStyle: { color: 'rgba(91, 139, 181, .12)' } }
    },
    yAxis: {
      type: 'value', min: 0.15, max: 0.55, name: '节点水位 H（m）', nameLocation: 'middle', nameRotate: 90, nameGap: 42,
      axisLine: { show: true, lineStyle: { color: '#55718c' } }, axisLabel: { color: '#91abc4', formatter: '{value}' },
      splitLine: { lineStyle: { color: 'rgba(91, 139, 181, .17)' } }
    },
    dataZoom: [
      { type: 'inside', filterMode: 'none', minSpan: 15 },
      { type: 'slider', filterMode: 'none', height: 18, bottom: 10, borderColor: 'rgba(65, 139, 191, .3)', backgroundColor: 'rgba(3, 18, 32, .7)', fillerColor: 'rgba(57, 246, 255, .15)', handleStyle: { color: '#39f6ff' }, textStyle: { color: '#7897b3' } }
    ],
    series: [
      {
        name: '实测水位', type: 'line', smooth: 0.18, connectNulls: false, symbol: 'circle', symbolSize: 7,
        data: nodes.map((node) => [node.distance, node.measured]),
        lineStyle: { color: '#39f6ff', width: 3, type: 'solid', shadowColor: 'rgba(57, 246, 255, .7)', shadowBlur: 9 },
        itemStyle: { color: '#39f6ff', borderColor: '#d9fdff', borderWidth: 1 },
        markLine: { silent: true, symbol: ['none', 'none'], data: [...gateLines, ...thresholdLines] },
        markArea: {
          silent: true,
          label: { show: true, position: 'insideBottom', color: '#6f91ad', fontSize: 10 },
          data: PROFILE_SEGMENTS.map((segment, index) => [
            { name: segment.label, xAxis: segment.start, itemStyle: { color: index % 2 ? 'rgba(35, 113, 158, .045)' : 'rgba(49, 183, 211, .075)' } },
            { xAxis: segment.end }
          ])
        }
      },
      {
        name: '模拟水位', type: 'line', smooth: 0.22, connectNulls: false, showSymbol: false,
        data: nodes.map((node) => [node.distance, node.simulated]),
        lineStyle: { color: '#4f93ff', width: 2, type: 'dashed' }, itemStyle: { color: '#4f93ff' }
      }
    ]
  };
}
