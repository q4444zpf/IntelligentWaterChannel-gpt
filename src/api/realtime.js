import { WEB_TOPO_CONFIG } from '../config/webTopoConfig.js';
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
