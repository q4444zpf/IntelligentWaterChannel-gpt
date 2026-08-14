import { ApiError, baseURL, http } from '../../../utils/request.js';

export async function getWebTopoScene(webTopoId, options = {}) {
  const forceReload = Boolean(options.forceReload);
  const response = await http.get(`/ghxx/bWebTopo3d/getTopo3dData/${encodeURIComponent(webTopoId)}`, {
    headers: forceReload ? { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } : undefined,
  });

  if (response?.code !== 200 || !response.data) {
    const message = response?.code === 200
      ? '未获取到三维组态场景数据'
      : response?.msg || '获取三维组态场景失败';
    throw new ApiError(message, response?.code);
  }

  return response.data;
}

export function resolveWebTopoAssetUrl(path) {
  if (/^(?:https?:)?\/\//i.test(path)) return path;
  return `${baseURL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
