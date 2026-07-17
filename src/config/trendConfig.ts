export type TrendType = 'flow' | 'level' | 'pump' | 'siphon';
export type TrendTabKey = 'node' | TrendType;
export type TimeRangeKey = '10m' | '1h' | '24h' | 'custom';
export type DeviceState = '在线' | '异常' | '离线';
export type TrendUnit = 'L/s' | 'm' | 'Hz' | 'MPa';

export interface TrendDevice {
  id: string;
  name: string;
  type: TrendType;
  location: string;
  region: string;
  unit: TrendUnit;
  state: DeviceState;
  color: string;
  order: number;
}

export interface TrendConfig {
  key: TrendType;
  label: string;
  shortLabel: string;
  axisName: string;
  metric: string;
  unit: TrendUnit;
  precision: number;
  regionLabel: string;
  supportsRegion: boolean;
  showStatistics: boolean;
  showRunningState: boolean;
}

export interface TrendPoint {
  timestamp: number;
  value: number | null;
  running?: boolean;
}

export interface TrendSeries {
  device: TrendDevice;
  points: TrendPoint[];
}

export interface TrendSnapshot {
  timestamp: number;
  series: TrendSeries[];
}

export const TREND_CONFIGS: Record<TrendType, TrendConfig> = {
  flow: { key: 'flow', label: '流量计趋势分析', shortLabel: '流量计趋势', axisName: '流量', metric: '流量', unit: 'L/s', precision: 2, regionLabel: '区域', supportsRegion: false, showStatistics: false, showRunningState: false },
  level: { key: 'level', label: '水位计趋势分析', shortLabel: '水位计趋势', axisName: '水位高度', metric: '水位', unit: 'm', precision: 3, regionLabel: '渠道/区域', supportsRegion: true, showStatistics: true, showRunningState: false },
  pump: { key: 'pump', label: '泵频率趋势分析', shortLabel: '泵频率', axisName: '运行频率', metric: '频率', unit: 'Hz', precision: 1, regionLabel: '泵站', supportsRegion: false, showStatistics: true, showRunningState: true },
  siphon: { key: 'siphon', label: '倒虹吸压力', shortLabel: '倒虹吸压力', axisName: '压力', metric: '压力', unit: 'MPa', precision: 3, regionLabel: '区域', supportsRegion: false, showStatistics: false, showRunningState: false }
};

const device = (type: TrendType, id: string, name: string, location: string, region: string, state: DeviceState, color: string, order: number): TrendDevice => ({
  type, id, name, location, region, state, color, order, unit: TREND_CONFIGS[type].unit
});

export const TREND_DEVICES: Record<TrendType, readonly TrendDevice[]> = {
  flow: [
    device('flow', 'FM-01', '进水总管流量计', '前池进水总管', '前池', '在线', '#39f6ff', 1),
    device('flow', 'FM-02', '中段渠道流量计', '渠③', '渠③', '在线', '#4f93ff', 2),
    device('flow', 'FM-03', '末端渠道流量计', '渠⑥', '渠⑥', '在线', '#53d99f', 3)
  ],
  level: [
    device('level', 'WL-01', '渠①水位计', '渠①', '渠①', '在线', '#39f6ff', 1),
    device('level', 'WL-02', '渠②水位计', '渠②', '渠②', '在线', '#4f93ff', 2),
    device('level', 'WL-03', '渠③水位计', '渠③', '渠③', '在线', '#53d99f', 3),
    device('level', 'WL-04', '渠④水位计', '渠④', '渠④', '异常', '#f0bd5b', 4),
    device('level', 'WL-05', '渠⑤水位计', '渠⑤', '渠⑤', '在线', '#c68cff', 5),
    device('level', 'WL-06', '集水池水位计', '集水池', '集水池', '在线', '#ff7f96', 6)
  ],
  pump: [
    device('pump', 'P1', '一号变频泵', '前池泵站', '前池泵站', '在线', '#39f6ff', 1)
  ],
  siphon: [
    device('siphon', 'SI-01', '倒虹吸①压力', '渠①-渠②', '倒虹吸①', '在线', '#39f6ff', 1),
    device('siphon', 'SI-02', '倒虹吸②压力', '渠②-渠③', '倒虹吸②', '在线', '#4f93ff', 2),
    device('siphon', 'SI-03', '倒虹吸③压力', '渠③-渠④', '倒虹吸③', '异常', '#f0bd5b', 3),
    device('siphon', 'SI-04', '倒虹吸④压力', '渠⑤-渠⑥', '倒虹吸④', '在线', '#53d99f', 4)
  ]
};

export function getDefaultDeviceIds(type: TrendType): string[] {
  return TREND_DEVICES[type].filter((item) => item.state === '在线').map((item) => item.id);
}

export function getDefaultDeviceId(type: TrendType): string {
  return TREND_DEVICES[type].find((item) => item.state === '在线')?.id ?? TREND_DEVICES[type][0]?.id ?? '';
}

export function sortDeviceIds(type: TrendType, ids: readonly string[]): string[] {
  const selected = new Set(ids);
  return TREND_DEVICES[type].filter((item) => selected.has(item.id)).map((item) => item.id);
}
