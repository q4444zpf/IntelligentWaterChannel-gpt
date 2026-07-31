function formatTime(timestamp) {
  if (!timestamp) return '等待 MQTT 数据';
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
      + `<div>${params[0]?.marker ?? ''}最新水位 <b>${formatValue(node.measured)}</b></div>`
      + `<div>设备状态 <b>${node.state}</b></div>`;
  };

  const thresholdLines = [
    { name: '上限', yAxis: 0.5, label: { formatter: '上限 0.50 m', color: '#ff7d75' }, lineStyle: { color: '#ef6262', type: 'dashed' } },
    { name: '下限', yAxis: 0.2, label: { formatter: '下限 0.20 m', color: '#f0bd5b' }, lineStyle: { color: '#d99c38', type: 'dashed' } }
  ];

  return {
    animationDuration: 400,
    animationDurationUpdate: 650,
    animationEasingUpdate: 'cubicInOut',
    title: {
      text: '节点水位空间剖面',
      subtext: `最新时间：${formatTime(snapshot.timestamp)}`,
      left: 18,
      top: 8,
      textStyle: { color: '#eaf7ff', fontSize: 14, fontWeight: 600 },
      subtextStyle: { color: '#7ea2bf', fontSize: 10 },
    },
    textStyle: { color: '#a9bdd5', fontFamily: 'Microsoft YaHei, sans-serif' },
    legend: { data: ['最新水位'], top: 10, right: 20, textStyle: { color: '#b9d2e8' } },
    tooltip: {
      trigger: 'axis', confine: true, formatter: tooltipFormatter,
      axisPointer: { type: 'cross', label: { backgroundColor: '#1c668d' } },
      backgroundColor: 'rgba(3, 20, 36, .97)', borderColor: '#298ab3', textStyle: { color: '#e8f7ff' }
    },
    grid: { left: 62, right: 30, top: 62, bottom: 72, containLabel: true },
    xAxis: {
      type: 'category', data: nodes.map((node) => node.label), name: '', boundaryGap: false,
      axisLine: { lineStyle: { color: '#55718c' } }, axisLabel: { color: '#91abc4', hideOverlap: true, interval: 0, rotate: 28, fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(91, 139, 181, .12)' } }
    },
    yAxis: {
      type: 'value', min: 0, name: '水位（m）', nameLocation: 'middle', nameRotate: 90, nameGap: 42,
      axisLine: { show: true, lineStyle: { color: '#55718c' } }, axisLabel: { color: '#91abc4', formatter: '{value}' },
      splitLine: { lineStyle: { color: 'rgba(91, 139, 181, .17)' } }
    },
    series: [
      {
        id: 'latest-water-level', name: '最新水位', type: 'line', smooth: true, connectNulls: false, symbol: 'circle', symbolSize: 7,
        data: nodes.map((node) => node.measured),
        lineStyle: { color: '#39f6ff', width: 3, type: 'solid', shadowColor: 'rgba(57, 246, 255, .7)', shadowBlur: 9 },
        itemStyle: { color: '#39f6ff', borderColor: '#d9fdff', borderWidth: 1 },
        label: {
          show: true,
          position: 'top',
          color: '#d9fdff',
          formatter: ({ value }) => value === null || value === undefined
            ? ''
            : Number(value).toFixed(3),
        },
        markLine: { silent: true, symbol: ['none', 'none'], data: thresholdLines }
      }
    ]
  };
}
