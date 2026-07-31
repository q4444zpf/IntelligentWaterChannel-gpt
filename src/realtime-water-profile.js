function normalizeTag(tag) {
  return typeof tag === 'string' ? tag.trim().toLowerCase() : '';
}

function normalizeValues(values) {
  const normalized = new Map();
  for (const [tag, value] of Object.entries(values || {})) {
    const key = normalizeTag(tag);
    if (key) normalized.set(key, value);
  }
  return normalized;
}

function parseReading(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * @param {{
 *   topology?: Array<Record<string, any>> | null,
 *   values?: Record<string, unknown>,
 *   timestamp?: number | null
 * }} [options]
 */
export function buildWaterProfileSnapshot(options = {}) {
  const {
    topology = [],
    values = {},
    timestamp = null,
  } = options;
  const normalizedValues = normalizeValues(values);
  const nodes = (Array.isArray(topology) ? topology : []).map((node, order) => {
    const tag = node?.tag || '';
    const measured = parseReading(normalizedValues.get(normalizeTag(tag)));

    return {
      id: node?.key || tag || String(order),
      key: node?.key || '',
      name: node?.name || '',
      label: node?.label || node?.name || tag || `节点${order + 1}`,
      channel: node?.channel || '',
      unit: node?.unit || 'm',
      tag,
      order,
      measured,
      state: measured === null ? '离线' : '在线',
    };
  });

  return { timestamp, nodes };
}
