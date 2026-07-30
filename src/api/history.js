import { WEB_TOPO_CONFIG } from '../config/webTopoConfig.js';
import {
  buildHistoryFilterParams,
  buildHistoryParams,
  buildHistoryReplayParams,
  parseDownloadFilename,
} from '../history-api-params.js';
import { ApiError, http } from '../utils/request.js';

export async function getBigWaterChannelHistoryDevices(
  groupId = WEB_TOPO_CONFIG.deviceGroupId,
) {
  const response = await http.get('/iot/device/bigWaterChannel/history/devices', {
    params: { groupId },
  });

  if (response?.code !== 200 || !Array.isArray(response.data)) {
    throw new ApiError(
      response?.message || response?.msg || '获取历史设备列表失败',
      response?.code,
    );
  }

  return response.data;
}

export async function getBigWaterChannelHistory({
  current = 1,
  size = 50,
  groupId = WEB_TOPO_CONFIG.deviceGroupId,
  start,
  end,
  intervalSeconds,
  deviceIds,
} = {}) {
  const response = await http.get('/iot/device/bigWaterChannel/history', {
    params: buildHistoryParams({ current, size, groupId, start, end, intervalSeconds, deviceIds }),
    paramsSerializer: { indexes: null },
  });

  if (response?.code !== 200 || !Array.isArray(response.data?.records)) {
    throw new ApiError(
      response?.message || response?.msg || '获取历史数据失败',
      response?.code,
    );
  }

  return response.data;
}

export async function getBigWaterChannelHistoryReplay({
  groupId = WEB_TOPO_CONFIG.deviceGroupId,
  start,
  end,
  intervalSeconds,
  channels,
} = {}) {
  const response = await http.get('/iot/device/bigWaterChannel/history/replay', {
    params: buildHistoryReplayParams({ groupId, start, end, intervalSeconds, channels }),
    paramsSerializer: { indexes: null },
  });

  if (response?.code !== 200
    || !Array.isArray(response.data?.nodes)
    || !Array.isArray(response.data?.rows)) {
    throw new ApiError(
      response?.message || response?.msg || '获取节点水位回放数据失败',
      response?.code,
    );
  }

  return response.data;
}

export async function exportBigWaterChannelHistory({
  groupId = WEB_TOPO_CONFIG.deviceGroupId,
  start,
  end,
  intervalSeconds,
  deviceIds,
} = {}) {
  const response = await http.get('/iot/device/bigWaterChannel/history/export', {
    params: buildHistoryFilterParams({ groupId, start, end, intervalSeconds, deviceIds }),
    paramsSerializer: { indexes: null },
    responseType: 'blob',
    rawResponse: true,
  });

  if (!(response?.data instanceof Blob)) {
    throw new ApiError('导出历史数据失败');
  }

  return {
    blob: response.data,
    fileName: parseDownloadFilename(response.headers?.['content-disposition'])
      || `蛇形水槽历史数据_${Date.now()}.csv`,
  };
}
