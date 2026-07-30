function formatDateTime(value) {
  if (!value) return undefined;
  const formatted = value.replace('T', ' ');
  return formatted.length === 16 ? `${formatted}:00` : formatted;
}

export function buildHistoryParams({ current, size, groupId, start, end, intervalSeconds, deviceIds }) {
  return {
    current,
    size,
    ...buildHistoryFilterParams({ groupId, start, end, intervalSeconds, deviceIds }),
  };
}

export function buildHistoryFilterParams({ groupId, start, end, intervalSeconds, deviceIds }) {
  return {
    groupId,
    startTime: formatDateTime(start),
    endTime: formatDateTime(end),
    intervalSeconds,
    deviceUids: deviceIds,
  };
}

export function buildHistoryReplayParams({ groupId, start, end, intervalSeconds, channel }) {
  return {
    groupId,
    startTime: formatDateTime(start),
    endTime: formatDateTime(end),
    intervalSeconds,
    channel,
  };
}

export function parseDownloadFilename(contentDisposition) {
  if (!contentDisposition) return '';
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  const basicMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  const encodedName = utf8Match?.[1] || basicMatch?.[1] || '';
  try {
    return decodeURIComponent(encodedName);
  } catch {
    return encodedName;
  }
}
