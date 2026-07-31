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
  const nodes = (Array.isArray(topology) ? topology : []).map((node, order) => {
    const tag = node?.tag || '';
    const measured = parseReading(tag ? values[tag] : undefined);

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
