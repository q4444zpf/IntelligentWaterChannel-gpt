import { GATES, SENSOR_GROUPS } from './data/monitoring-data.js';

export const PROFILE_GATES = Object.freeze([
  { id: 'G0', label: 'G0闸后', beforeOrder: 0, afterOrder: 1 },
  { id: 'G1', label: 'G1闸前', beforeOrder: 3, afterOrder: 4 },
  { id: 'G2', label: 'G2闸前', beforeOrder: 6, afterOrder: 7 },
  { id: 'G3', label: 'G3闸前', beforeOrder: 9, afterOrder: 10 },
  { id: 'G4', label: 'G4闸前', beforeOrder: 12, afterOrder: 13 },
  { id: 'G5', label: 'G5闸前', beforeOrder: 15, afterOrder: 16 },
  { id: 'G6', label: 'G6闸前', beforeOrder: 17, afterOrder: 18 }
]);

export const PROFILE_SEGMENTS = Object.freeze([
  { label: '前池', start: '前池', end: 'G0闸后' },
  { label: '渠①', start: 'G0闸后', end: 'G1闸后' },
  { label: '渠②', start: 'G1闸后', end: 'G2闸后' },
  { label: '渠③', start: 'G2闸后', end: 'G3闸后' },
  { label: '渠④', start: 'G3闸后', end: 'G4闸后' },
  { label: '渠⑤', start: 'G4闸后', end: 'G5闸后' },
  { label: '渠⑥', start: 'G5闸后', end: 'G6闸后' },
  { label: '集水池', start: 'G6闸后', end: '集水池' }
]);

const WATER_SENSOR_ORDERS = Object.freeze({
  'WL-01': 2,
  'WL-02': 5,
  'WL-03': 8,
  'WL-04': 11,
  'WL-05': 14,
  'WL-06': 19
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

function toNode({ id, label, order, value, state }, tick, index) {
  const measured = driftValue(parseReading(value, state), tick, index);
  const simulated = measured === null
    ? null
    : Number((measured + Math.sin(index * 0.63 + 0.4) * 0.006 - 0.003).toFixed(3));
  return { id, label, order, measured, simulated, state };
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
    const profileGate = PROFILE_GATES.find((item) => item.id === gate.id);
    if (!profileGate) return;
    nodes.push({ id: `${gate.id}-前`, label: gate.id === 'G0' ? '前池' : `${gate.id}闸前`, order: profileGate.beforeOrder, value: gate.before, state: gate.state });
    nodes.push({ id: `${gate.id}-后`, label: `${gate.id}闸后`, order: profileGate.afterOrder, value: gate.after, state: gate.state });
  });

  waterRows.forEach((row) => {
    const order = WATER_SENSOR_ORDERS[row.name];
    if (order === undefined) return;
    nodes.push({
      id: row.name,
      label: row.location === '集水池' ? '集水池' : `${row.location}水位计`,
      order,
      value: row.value,
      state: row.state
    });
  });

  nodes.sort((left, right) => left.order - right.order);
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
