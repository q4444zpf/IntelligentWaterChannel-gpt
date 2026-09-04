function formatDateTime(value) {
  if (!value) return undefined;
  const formatted = value.replace('T', ' ');
  return formatted.length === 16 ? `${formatted}:00` : formatted;
}

function formatCollectStatus(value) {
  if (value === true || value === '正常') return true;
  if (value === false || value === '异常') return false;
  return undefined;
}

export function buildHistoryParams({ current, size, groupId, start, end, intervalSeconds, deviceIds, status }) {
  return {
    current,
    size,
    ...buildHistoryFilterParams({ groupId, start, end, intervalSeconds, deviceIds, status }),
  };
}

export function buildHistoryFilterParams({ groupId, start, end, intervalSeconds, deviceIds, status }) {
  const collectStatus = formatCollectStatus(status);
  return {
    groupId,
    startTime: formatDateTime(start),
    endTime: formatDateTime(end),
    intervalSeconds,
    deviceUids: deviceIds,
    ...(collectStatus === undefined ? {} : { status: collectStatus }),
  };
}

export function buildHistoryReplayParams({ groupId, start, end, intervalSeconds, channels }) {
  return {
    groupId,
    startTime: formatDateTime(start),
    endTime: formatDateTime(end),
    intervalSeconds,
    channels,
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
