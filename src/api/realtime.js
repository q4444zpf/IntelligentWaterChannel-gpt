import { WEB_TOPO_CONFIG } from '../config/webTopoConfig.js';
import { TREND_PRODUCT_TYPES } from '../config/trendConfig.ts';
import { ApiError, http } from '../utils/request.js';

export async function getRealtimeGroupDevices(groupId = WEB_TOPO_CONFIG.deviceGroupId) {
  const response = await http.get('/iot/device/selectRealTimeGroupDevince', {
    params: { groupId },
  });

  if (response?.code !== 200 || !Array.isArray(response.data)) {
    throw new ApiError(
      response?.message || response?.msg || '获取实时设备配置失败',
      response?.code,
    );
  }

  return response.data;
}

export async function getRealtimeWaterProfileTopology(
  groupId = WEB_TOPO_CONFIG.deviceGroupId,
) {
  const response = await http.get('/iot/device/bigWaterChannel/realtime/profile/topology', {
    params: { groupId },
  });

  if (response?.code !== 200 || !Array.isArray(response.data)) {
    throw new ApiError(
      response?.message || response?.msg || '获取节点水位拓扑失败',
      response?.code,
    );
  }

  return response.data;
}

export async function getRealtimeTrendDevices(
  trendType,
  groupId = WEB_TOPO_CONFIG.deviceGroupId,
) {
  const productType = TREND_PRODUCT_TYPES[trendType];
  if (!productType) {
    throw new ApiError('不支持的实时趋势设备类型');
  }

  const response = await http.get('/iot/device/bigWaterChannel/realtime/trend/devices', {
    params: { groupId, productType },
  });

  if (response?.code !== 200 || !Array.isArray(response.data)) {
    throw new ApiError(
      response?.message || response?.msg || '获取实时趋势设备失败',
      response?.code,
    );
  }

  return response.data;
}
