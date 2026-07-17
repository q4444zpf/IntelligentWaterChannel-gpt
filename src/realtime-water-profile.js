import { GATES, SENSOR_GROUPS } from './data/monitoring-data.js';

export const PROFILE_GATES = Object.freeze([
  { id: 'G0', distance: 70 },
  { id: 'G1', distance: 170 },
  { id: 'G2', distance: 280 },
  { id: 'G3', distance: 390 },
  { id: 'G4', distance: 500 },
  { id: 'G5', distance: 610 },
  { id: 'G6', distance: 720 }
]);

export const PROFILE_SEGMENTS = Object.freeze([
  { label: '前池', start: 0, end: 70 },
  { label: '渠①', start: 70, end: 170 },
  { label: '渠②', start: 170, end: 280 },
  { label: '渠③', start: 280, end: 390 },
  { label: '渠④', start: 390, end: 500 },
  { label: '渠⑤', start: 500, end: 610 },
  { label: '渠⑥', start: 610, end: 720 },
  { label: '集水池', start: 720, end: 830 }
]);

const WATER_SENSOR_DISTANCES = Object.freeze({
  'WL-01': 120,
  'WL-02': 225,
  'WL-03': 335,
  'WL-04': 445,
  'WL-05': 555,
  'WL-06': 830
});

function parseReading(value, state) {
  if (state === '离线' || value === '--') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function driftValue(value, tick, index, scale = 0.004) {
  if (value === null) return null;
  return Number((value + Math.sin(tick * 0.72 + index * 0.91) * scale).toFixed(3));
}

function toNode({ id, label, distance, value, state }, tick, index) {
  const measured = driftValue(parseReading(value, state), tick, index);
  const simulated = measured === null
    ? null
    : Number((measured + Math.sin(index * 0.63 + 0.4) * 0.006 - 0.003).toFixed(3));
  return { id, label, distance, measured, simulated, state };
}

export function buildWaterProfileSnapshot({
  gates = GATES,
  sensorGroups = SENSOR_GROUPS,
  tick = 0,
  timestamp = Date.now()
} = {}) {
  const waterRows = sensorGroups.find((group) => group.name === '水位计')?.rows ?? [];
  const nodes = [];

  gates.forEach((gate) => {
    const distance = PROFILE_GATES.find((item) => item.id === gate.id)?.distance;
    if (distance === undefined) return;
    nodes.push({ id: `${gate.id}-前`, label: gate.id === 'G0' ? '前池' : `${gate.id}闸前`, distance: Math.max(0, distance - 8), value: gate.before, state: gate.state });
    nodes.push({ id: `${gate.id}-后`, label: `${gate.id}闸后`, distance: distance + 8, value: gate.after, state: gate.state });
  });

  waterRows.forEach((row) => {
    const distance = WATER_SENSOR_DISTANCES[row.name];
    if (distance === undefined) return;
    nodes.push({
      id: row.name,
      label: row.location === '集水池' ? '集水池' : `${row.location}水位计`,
      distance,
      value: row.value,
      state: row.state
    });
  });

  nodes.sort((left, right) => left.distance - right.distance);
  return {
    timestamp,
    nodes: nodes.map((node, index) => toNode(node, tick, index))
  };
}

export function createMockWaterProfileSource({
  gates = GATES,
  sensorGroups = SENSOR_GROUPS,
  now = Date.now
} = {}) {
  let tick = 0;
  return async () => buildWaterProfileSnapshot({ gates, sensorGroups, tick: tick++, timestamp: now() });
}
