function parseTimestamp(value) {
  if (typeof value !== 'string' || !value) return 0;
  const timestamp = new Date(value.replace(' ', 'T')).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function parseReplayValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateReplayAxisMax(values) {
  const maximum = Math.max(
    0,
    ...values.filter((value) => Number.isFinite(value)),
  );

  if (maximum <= 0.6) return 0.6;
  if (maximum <= 1) return Math.ceil(maximum * 11) / 10;
  return Math.ceil(maximum * 1.1);
}

export function normalizeHistoryReplay(payload) {
  const nodes = [];
  const nodeKeys = new Set();
  for (const record of Array.isArray(payload?.nodes) ? payload.nodes : []) {
    const key = String(record?.key || '').trim();
    if (!key || nodeKeys.has(key)) continue;
    nodeKeys.add(key);
    nodes.push({
      key,
      name: String(record?.name || key),
      label: String(record?.label || record?.name || key),
      channel: String(record?.channel || ''),
      unit: String(record?.unit || ''),
    });
  }

  const rows = (Array.isArray(payload?.rows) ? payload.rows : [])
    .map((record, index) => {
      const timestamp = String(record?.timestamp || '');
      const row = {
        key: index,
        timestamp: timestamp || '--',
        timestampValue: parseTimestamp(timestamp),
      };
      for (const node of nodes) {
        row[node.key] = record?.values?.[node.key] ?? null;
      }
      return row;
    })
    .sort((left, right) => left.timestampValue - right.timestampValue)
    .map((row, index) => ({ ...row, key: index }));

  return {
    channels: [...new Set((Array.isArray(payload?.channels) ? payload.channels : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean))],
    nodes,
    rows,
  };
}
