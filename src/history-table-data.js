function parseTimestamp(value) {
  if (typeof value !== 'string' || !value) return 0;
  const timestamp = new Date(value.replace(' ', 'T')).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function normalizeHistoryPage(page) {
  const records = Array.isArray(page?.records) ? page.records : [];
  const current = Math.max(1, Number(page?.current) || 1);
  const size = Math.max(1, Number(page?.size) || 50);
  const total = Math.max(0, Number(page?.total) || 0);

  return {
    current,
    size,
    total,
    pageCount: Math.max(1, Math.ceil(total / size)),
    rows: records.map((record, index) => ({
      key: index,
      timestamp: record?.timestamp || '--',
      timestampValue: parseTimestamp(record?.timestamp),
      type: record?.type || '--',
      name: record?.name || '--',
      location: record?.location || '--',
      metric: record?.metric || '--',
      value: record?.value ?? '--',
      unit: record?.unit ?? '',
      state: '正常',
    })),
  };
}
