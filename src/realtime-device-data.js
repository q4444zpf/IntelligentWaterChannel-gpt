function tagValue(values, tag) {
  if (typeof tag !== 'string' || !tag) return undefined;
  return values[tag];
}

function hasValue(values, tag) {
  const value = tagValue(values, tag);
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'string' && value.toLowerCase() === 'offline') return false;
  return true;
}

function displayValue(values, tag) {
  return hasValue(values, tag) ? String(tagValue(values, tag)) : '--';
}

function deviceState(values, tags) {
  return tags.some((tag) => hasValue(values, tag)) ? '在线' : '离线';
}

function gateColor(state) {
  return state === '在线' ? 'green' : 'off';
}

function booleanValue(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return false;
  return ['true', '1', 'on', 'open', 'running', '开', '开启'].includes(value.trim().toLowerCase());
}

function numberValue(value) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : 0;
}

function objectValue(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim().startsWith('{')) return {};
  try {
    const parsedValue = JSON.parse(value);
    return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
      ? parsedValue
      : {};
  } catch {
    return {};
  }
}

function hasOwnValue(target, field) {
  return Object.prototype.hasOwnProperty.call(target, field);
}

function pumpTelemetry(value, statusField, frequencyField) {
  const telemetry = objectValue(value);
  if (hasOwnValue(telemetry, statusField) || hasOwnValue(telemetry, frequencyField)) {
    return {
      running: booleanValue(telemetry[statusField]),
      frequency: numberValue(telemetry[frequencyField]),
    };
  }

  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : value;
  const stopped = normalizedValue === null || normalizedValue === undefined || normalizedValue === ''
    || normalizedValue === false || normalizedValue === 'false' || normalizedValue === 'offline';
  const frequency = numberValue(value);
  return {
    running: !stopped && (booleanValue(value) || Number.isFinite(Number(value))),
    frequency: stopped ? 0 : frequency,
  };
}

export function buildRealtimeTableData(deviceGroups, values = {}) {
  const gates = [];
  const gateList = [];
  const valves = [];
  const sensorGroupMap = new Map();
  let pump = null;

  for (const deviceGroup of Array.isArray(deviceGroups) ? deviceGroups : []) {
    for (const gate of Array.isArray(deviceGroup?.gate) ? deviceGroup.gate : []) {
      const state = deviceState(values, [gate.openingTag]);
      const gateData = {
        id: gate.openingTag || gate.name || '--',
        uid: gate.uid == null ? '' : String(gate.uid),
        name: gate.name || gate.openingTag || '--',
        location: gate.location || gate.place || '',
        openingTag: gate.openingTag || '',
        upLevelTag: gate.upLevelTag || '',
        downLevelTag: gate.downLevelTag || '',
        maxOpening: Number.isFinite(Number(gate.maxOpening)) && Number(gate.maxOpening) > 0
          ? Number(gate.maxOpening)
          : 90,
        open: displayValue(values, gate.openingTag),
        before: displayValue(values, gate.upLevelTag),
        after: displayValue(values, gate.downLevelTag),
        state,
        color: gateColor(state),
      };
      gates.push(gateData);
      gateList.push(gateData);
    }

    if (!pump && deviceGroup?.pump) {
      const pumpConfig = deviceGroup.pump;
      const tag = pumpConfig.tag || 'Pump';
      const statusField = pumpConfig.statusField || 'stats';
      const frequencyField = pumpConfig.frequencyField || 'frequency';
      const telemetry = pumpTelemetry(tagValue(values, tag), statusField, frequencyField);
      const maxFrequency = Number(pumpConfig.maxFrequency);
      pump = {
        uid: pumpConfig.uid == null ? '' : String(pumpConfig.uid),
        name: pumpConfig.name || '水泵',
        location: pumpConfig.location || pumpConfig.place || '',
        tag,
        statusField,
        frequencyField,
        maxFrequency: Number.isFinite(maxFrequency) && maxFrequency > 0 ? maxFrequency : 50,
        running: telemetry.running,
        frequency: telemetry.frequency,
        state: deviceState(values, [tag]),
      };
    }

    for (const valveConfig of Array.isArray(deviceGroup?.valve) ? deviceGroup.valve : []) {
      const tag = valveConfig.tag || '';
      const openingField = valveConfig.openingField || 'opening';
      const value = tagValue(values, tag);
      const telemetry = objectValue(value);
      const opening = hasOwnValue(telemetry, openingField) ? telemetry[openingField] : value;
      const maxOpening = Number(valveConfig.maxOpening);
      valves.push({
        id: tag || valveConfig.name || '--',
        uid: valveConfig.uid == null ? '' : String(valveConfig.uid),
        name: valveConfig.name || tag || '阀门',
        location: valveConfig.location || valveConfig.place || '',
        label: tag ? tag.toUpperCase() : (valveConfig.name || '--'),
        tag,
        openingField,
        maxOpening: Number.isFinite(maxOpening) && maxOpening > 0 ? maxOpening : 100,
        opening: numberValue(opening),
        state: deviceState(values, [tag]),
      });
    }

    for (const sensorGroup of Array.isArray(deviceGroup?.other) ? deviceGroup.other : []) {
      const groupName = sensorGroup.name || '其他设备';
      if (!sensorGroupMap.has(groupName)) {
        sensorGroupMap.set(groupName, { name: groupName, rows: [] });
      }

      const rows = sensorGroupMap.get(groupName).rows;
      for (const sensor of Array.isArray(sensorGroup.data) ? sensorGroup.data : []) {
        rows.push({
          name: sensor.name || sensor.tag || '--',
          location: sensor.place || '--',
          value: displayValue(values, sensor.tag),
          unit: sensor.unit || '--',
          tag: sensor.tag || '',
          state: deviceState(values, [sensor.tag]),
        });
      }
    }
  }

  return { gates, gateList, pump, valves, sensorGroups: [...sensorGroupMap.values()] };
}

export function mergeRealtimeValues(target, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;

  for (const [tag, value] of Object.entries(payload)) {
    if (tag) target[tag] = value;
  }
}
