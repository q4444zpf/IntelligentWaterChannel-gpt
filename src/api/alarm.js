import { WEB_TOPO_CONFIG } from '../config/webTopoConfig.js';
import { buildAlarmParams } from '../alarm-api-params.js';
import { ApiError, http } from '../utils/request.js';

export async function getBigWaterChannelAlarms({
  current = 1,
  size = 20,
  groupId = WEB_TOPO_CONFIG.deviceGroupId,
  ...filters
} = {}) {
  const response = await http.get('/iot/device/bigWaterChannel/alarm', {
    params: buildAlarmParams({ current, size, groupId, ...filters }),
  });

  if (response?.code !== 200 || !Array.isArray(response.data?.records)) {
    throw new ApiError(
      response?.message || response?.msg || '获取告警列表失败',
      response?.code,
    );
  }

  return response.data;
}

export async function getBigWaterChannelAlarmStatistics({
  groupId = WEB_TOPO_CONFIG.deviceGroupId,
  ...filters
} = {}) {
  const { current, size, ...params } = buildAlarmParams({ groupId, ...filters });
  const response = await http.get('/iot/device/bigWaterChannel/alarm/statistics', { params });

  if (response?.code !== 200 || !response.data || typeof response.data !== 'object') {
    throw new ApiError(
      response?.message || response?.msg || '获取告警统计失败',
      response?.code,
    );
  }

  return response.data;
}

export async function getBigWaterChannelAlarmNotificationTopic(
  groupId = WEB_TOPO_CONFIG.deviceGroupId,
) {
  const response = await http.get('/iot/device/bigWaterChannel/alarm/notification/topic', {
    params: { groupId },
  });

  if (response?.code !== 200 || typeof response.data !== 'string' || !response.data.trim()) {
    throw new ApiError(
      response?.message || response?.msg || '获取告警通知主题失败',
      response?.code,
    );
  }

  return response.data.trim();
}

export async function handleAlarm({ id, handlingRemark }) {
  if (!id) throw new ApiError('缺少告警记录ID');
  const response = await http.post('/iot/vls/warnHandle', {
    id,
    handlingRemark,
  });

  if (response?.code !== 200 || response.data !== true) {
    throw new ApiError(
      response?.message || response?.msg || '处理告警失败',
      response?.code,
    );
  }

  return response;
}
