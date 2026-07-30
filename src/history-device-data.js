function compareText(left, right) {
  return left.localeCompare(right, 'zh-CN', { numeric: true });
}

export function normalizeHistoryDevices(records) {
  const devices = [];
  const seenIds = new Set();

  for (const record of Array.isArray(records) ? records : []) {
    const id = String(record?.id ?? '').trim();
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);
    devices.push({
      id,
      name: String(record?.name || id),
      type: String(record?.type || '其他设备'),
      location: String(record?.location || '未配置'),
      unit: String(record?.unit || ''),
    });
  }

  return devices.sort((left, right) => compareText(left.name, right.name));
}

export function filterHistoryDeviceOptions(
  devices,
  { deviceType = '全部', channel = '全部', keyword = '' } = {},
) {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase('zh-CN');
  return devices.filter((device) => {
    const matchesType = deviceType === '全部' || device.type === deviceType;
    const matchesChannel = channel === '全部' || device.location.includes(channel);
    const matchesKeyword = !normalizedKeyword
      || `${device.id} ${device.name} ${device.type} ${device.location}`
        .toLocaleLowerCase('zh-CN')
        .includes(normalizedKeyword);
    return matchesType && matchesChannel && matchesKeyword;
  });
}

export function sortHistoryDeviceOptionIds(devices, ids) {
  const orderById = new Map(devices.map((device, index) => [device.id, index]));
  return [...new Set(ids)]
    .filter((id) => orderById.has(id))
    .sort((left, right) => orderById.get(left) - orderById.get(right));
}
