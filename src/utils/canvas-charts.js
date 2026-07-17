function drawLineChart(canvas, options = {}) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const width = rect.width;
  const height = rect.height;
  const pad = { l: 54, r: 34, t: 26, b: 42 };
  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, width, height, pad);
  const colors = ['#25a8ff', '#54d262', '#ffd238', '#9a66ff', '#21d4e8', '#ff8736', '#6fb6ff'];
  const labels = options.labels || ['渠①', '渠②', '渠③', '渠④', '渠⑤', '渠⑥', '集水池'];
  const count = 72;
  labels.forEach((label, index) => {
    const base = 0.42 - index * 0.035;
    const values = Array.from({ length: count }, (_, point) => base + Math.sin(point / 7 + index) * 0.018 + Math.sin(point / 2.7 + index * 2) * 0.006 + (options.drop && point > 36 ? -0.08 + index * 0.005 : 0));
    drawSeries(ctx, values, pad, width, height, colors[index % colors.length], 0.05, 0.62);
    drawLegend(ctx, label, colors[index % colors.length], 460 + index * 82, height - 18);
  });
  drawThreshold(ctx, pad, width, height, 0.50, '#ff5148', '上限 0.50 m');
  drawThreshold(ctx, pad, width, height, 0.20, '#ffd21f', '下限 0.20 m');
  if (options.alarm) drawAlarmMark(ctx, pad.l + (width - pad.l - pad.r) * 0.58, pad.t + 62, '09:21:10');
}

export function drawProfileChart(canvas) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const width = rect.width;
  const height = rect.height;
  const pad = { l: 54, r: 28, t: 28, b: 100 };
  drawGrid(ctx, width, height, pad);
  const labels = ['前池', 'G0闸前', 'G0闸后', '渠①', 'G1闸前', 'G1闸后', '渠②', 'G2闸前', 'G2闸后', '渠③', '倒虹吸①', '倒虹吸②', '渠④', 'G5闸前', 'G5闸后', '渠⑤', '倒虹吸③', '倒虹吸④', '渠⑥', '集水池'];
  const values = [0.384, 0.401, 0.338, 0.412, 0.398, 0.344, 0.395, 0.401, 0.341, 0.412, 0.296, 0.293, 0.403, 0.389, 0.329, 0.397, 0.289, 0.287, 0.392, 0.384];
  const previous = values.map((value, index) => value - 0.035 + Math.sin(index) * 0.01);
  drawSeries(ctx, previous, pad, width, height, '#7d9ab8', 0, 0.62, true);
  drawSeries(ctx, values, pad, width, height, '#2aa1ff', 0, 0.62);
  values.forEach((value, index) => {
    const x = pad.l + index / (values.length - 1) * (width - pad.l - pad.r);
    const y = mapY(value, pad, height, 0, 0.62);
    ctx.fillStyle = '#39b3ff';
    ctx.font = '12px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(3), x, y - 13);
    ctx.fillStyle = index % 3 === 0 ? '#1e77d8' : '#18b969';
    ctx.beginPath();
    ctx.arc(x, height - 68, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#85c9ff';
    ctx.stroke();
    ctx.save();
    ctx.translate(x, height - 42);
    ctx.rotate(-0.04);
    ctx.fillStyle = '#c8d8eb';
    ctx.fillText(labels[index], 0, 0);
    ctx.restore();
  });
  drawThreshold(ctx, pad, width, height, 0.50, '#ff5148', '');
  drawThreshold(ctx, pad, width, height, 0.20, '#ffd21f', '');
  drawAlarmMark(ctx, pad.l + 10 / 19 * (width - pad.l - pad.r), mapY(0.46, pad, height, 0, 0.62), '报警点');
}

function drawGrid(ctx, width, height, pad) {
  ctx.fillStyle = 'rgba(2, 14, 27, .7)';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(78, 143, 203, .18)';
  ctx.lineWidth = 1;
  for (let index = 0; index <= 6; index += 1) {
    const y = pad.t + index / 6 * (height - pad.t - pad.b);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(width - pad.r, y); ctx.stroke();
    ctx.fillStyle = '#aebfd5'; ctx.font = '12px Microsoft YaHei'; ctx.textAlign = 'right';
    ctx.fillText((0.60 - index * 0.10).toFixed(2), pad.l - 10, y + 4);
  }
  for (let index = 0; index <= 10; index += 1) {
    const x = pad.l + index / 10 * (width - pad.l - pad.r);
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, height - pad.b); ctx.stroke();
  }
}

function drawSeries(ctx, values, pad, width, height, color, min = 0.05, max = 0.62, dashed = false) {
  ctx.strokeStyle = color; ctx.lineWidth = dashed ? 1 : 2; ctx.setLineDash(dashed ? [5, 5] : []); ctx.beginPath();
  values.forEach((value, index) => {
    const x = pad.l + index / (values.length - 1) * (width - pad.l - pad.r);
    const y = mapY(value, pad, height, min, max);
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke(); ctx.setLineDash([]);
  values.forEach((value, index) => {
    if (values.length > 25 && index % 8 !== 0) return;
    const x = pad.l + index / (values.length - 1) * (width - pad.l - pad.r);
    const y = mapY(value, pad, height, min, max);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
  });
}

function mapY(value, pad, height, min, max) {
  return pad.t + (max - value) / (max - min) * (height - pad.t - pad.b);
}

function drawThreshold(ctx, pad, width, height, value, color, label) {
  const y = mapY(value, pad, height, 0, 0.62);
  ctx.strokeStyle = color; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(width - pad.r, y); ctx.stroke(); ctx.setLineDash([]);
  if (label) { ctx.fillStyle = color; ctx.font = '13px Microsoft YaHei'; ctx.textAlign = 'right'; ctx.fillText(label, width - pad.r - 6, y - 6); }
}

function drawLegend(ctx, text, color, x, y) {
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 26, y - 4); ctx.stroke();
  ctx.fillStyle = '#c6d8eb'; ctx.font = '12px Microsoft YaHei'; ctx.textAlign = 'left'; ctx.fillText(text, x + 32, y);
}

function drawAlarmMark(ctx, x, y, text) {
  ctx.strokeStyle = '#ff4e45'; ctx.fillStyle = '#ff4e45'; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 92); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Microsoft YaHei'; ctx.textAlign = 'center'; ctx.fillText('!', x, y + 5);
  ctx.fillStyle = '#ff5b52'; ctx.fillText(text, x, y - 12);
}

export const drawRealtimeChart = (canvas) => drawLineChart(canvas);
export const drawAlarmChart = (canvas) => drawLineChart(canvas, { drop: true, labels: ['开度反馈(%)', '设定开度(%)'], alarm: true });
