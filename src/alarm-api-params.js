export function formatAlarmDateTime(value) {
  return typeof value === 'string' ? value.replace('T', ' ') : value;
}

export function buildAlarmParams({
  current = 1,
  size = 20,
  groupId,
  start,
  end,
  warnConfigName,
  grade,
  content,
  deviceType,
  deviceName,
  handlingStatus,
  channel,
} = {}) {
  return {
    current,
    size,
    groupId,
    startDate: formatAlarmDateTime(start),
    endDate: formatAlarmDateTime(end),
    ...(warnConfigName?.trim() ? { warnConfigName: warnConfigName.trim() } : {}),
    ...(grade ? { grade } : {}),
    ...(content?.trim() ? { content: content.trim() } : {}),
    ...(deviceType && deviceType !== '全部' ? { deviceType } : {}),
    ...(deviceName?.trim() ? { deviceName: deviceName.trim() } : {}),
    ...(handlingStatus !== '' && handlingStatus !== null && handlingStatus !== undefined
      ? { handlingStatus }
      : {}),
    ...(channel && channel !== '全部' ? { channel } : {}),
  };
}
