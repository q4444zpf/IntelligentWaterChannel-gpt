export const WEB_TOPO_SCENES = Object.freeze({
  dosing: Object.freeze({
    webTopoId: '1791519294925814692',
    deviceGroupId: 96,
  }),
  aeration: Object.freeze({
    webTopoId: '1791519294846509296',
    deviceGroupId: 103,
  }),
});

export function getWebTopoSceneConfig(scene) {
  return WEB_TOPO_SCENES[scene] || WEB_TOPO_SCENES.dosing;
}

// 保持既有水槽模块的默认配置读取方式不变。
export const WEB_TOPO_CONFIG = WEB_TOPO_SCENES.dosing;
