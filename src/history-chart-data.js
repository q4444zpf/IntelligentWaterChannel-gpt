const PRECISION_BY_UNIT = Object.freeze({
  m: 3,
  MPa: 3,
  'L/s': 2,
  Hz: 1,
  '%': 1,
});

function parseTimestamp(value) {
  if (!value) return null;
  const normalized = typeof value === 'string' ? value.replace(' ', 'T') : value;
  const timestamp = new Date(normalized).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function parseValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value === true || String(value).toLowerCase() === 'true') return 1;
  if (value === false || String(value).toLowerCase() === 'false') return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeHistoryChartResults(records, devices, selectedIds) {
  const selectedSet = new Set((selectedIds || []).map(String));
  const selectedDevices = (devices || []).filter((device) => selectedSet.has(device.id));
  const recordsByUid = new Map(selectedDevices.map((device) => [device.id, []]));

  for (const record of Array.isArray(records) ? records : []) {
    const uid = String(record?.uid ?? '');
    const deviceRecords = recordsByUid.get(uid);
    if (deviceRecords) deviceRecords.push(record);
  }

  return selectedDevices.map((option, order) => {
    const deviceRecords = recordsByUid.get(option.id) || [];
    const firstRecord = deviceRecords.find((record) => record?.metric || record?.unit);
    const unit = String(firstRecord?.unit ?? option.unit ?? '');
    const metric = String(firstRecord?.metric || option.type || '数值');
    const points = deviceRecords
      .map((record) => ({
        timestamp: parseTimestamp(record?.timestamp),
        value: parseValue(record?.value),
      }))
      .filter((point) => point.timestamp !== null && point.value !== null)
      .sort((left, right) => left.timestamp - right.timestamp);

    return {
      device: {
        ...option,
        order,
        metric,
        unit,
        state: '正常',
        precision: PRECISION_BY_UNIT[unit] ?? 2,
      },
      points,
    };
  });
}
