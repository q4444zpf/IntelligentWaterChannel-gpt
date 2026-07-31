function tagValue(values, tag) {
  if (typeof tag !== 'string' || !tag) return undefined;
  return values[tag];
}

function hasValue(values, tag) {
  const value = tagValue(values, tag);
  return value !== null && value !== undefined && value !== '';
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

export function buildRealtimeTableData(deviceGroups, values = {}) {
  const gates = [];
  const sensorGroupMap = new Map();

  for (const deviceGroup of Array.isArray(deviceGroups) ? deviceGroups : []) {
    for (const gate of Array.isArray(deviceGroup?.gate) ? deviceGroup.gate : []) {
      const state = deviceState(values, [gate.openingTag]);
      gates.push({
        id: gate.openingTag || gate.name || '--',
        name: gate.name || gate.openingTag || '--',
        openingTag: gate.openingTag || '',
        upLevelTag: gate.upLevelTag || '',
        downLevelTag: gate.downLevelTag || '',
        open: displayValue(values, gate.openingTag),
        before: displayValue(values, gate.upLevelTag),
        after: displayValue(values, gate.downLevelTag),
        state,
        color: gateColor(state),
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

  return { gates, sensorGroups: [...sensorGroupMap.values()] };
}

export function mergeRealtimeValues(target, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;

  for (const [tag, value] of Object.entries(payload)) {
    if (tag) target[tag] = value;
  }
}
