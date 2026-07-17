export const PAGE_TABS = Object.freeze([
  { key: 'realtime', label: '实时监控' },
  { key: 'history', label: '历史数据' },
  { key: 'alarm', label: '报警数据', badge: 3 }
]);

export const VIEW_ACTIONS = Object.freeze(['默认视角', '俯视图', '正视图', '左视图', '右视图', '自动漫游', '复位']);
export const GATES = Object.freeze([
  { id: 'G0', open: '60%', before: '0.42', after: '0.40', state: '在线', color: 'red' },
  { id: 'G1', open: '100%', before: '0.40', after: '0.38', state: '在线', color: 'red' },
  { id: 'G2', open: '42%', before: '0.38', after: '0.35', state: '在线', color: 'orange' },
  { id: 'G3', open: '30%', before: '0.36', after: '0.34', state: '在线', color: 'green' },
  { id: 'G4', open: '25%', before: '0.35', after: '0.33', state: '离线', color: 'off' },
  { id: 'G5', open: '80%', before: '0.37', after: '0.36', state: '在线', color: 'red' },
  { id: 'G6', open: '50%', before: '0.34', after: '0.32', state: '异常', color: 'red' }
]);

export const SENSOR_GROUPS = Object.freeze([
  {
    name: '水位计',
    rows: [
      { name: 'WL-01', location: '渠①', value: '0.40', unit: 'm', state: '在线' },
      { name: 'WL-02', location: '渠②', value: '0.38', unit: 'm', state: '在线' },
      { name: 'WL-03', location: '渠③', value: '0.37', unit: 'm', state: '在线' },
      { name: 'WL-04', location: '渠④', value: '0.37', unit: 'm', state: '异常' },
      { name: 'WL-05', location: '渠⑤', value: '0.32', unit: 'm', state: '在线' },
      { name: 'WL-06', location: '集水池', value: '0.32', unit: 'm', state: '在线' }
    ]
  },
  { name: '流量计', rows: [{ name: 'FM-01', location: '渠③', value: '18.20', unit: 'L/s', state: '在线' }] },
  {
    name: '压力计',
    rows: [
      { name: 'PT-01', location: '水泵出口', value: '0.23', unit: 'MPa', state: '在线' },
      { name: 'PT-02', location: '倒虹吸①-②', value: '0.12', unit: 'MPa', state: '在线' },
      { name: 'PT-03', location: '倒虹吸③-④', value: '--', unit: 'MPa', state: '离线' }
    ]
  }
]);

export const ALARMS = Object.freeze([
  { code: 'ALM-20260708-0001', time: '09:21:10', device: 'G6', deviceType: '闸门', location: '渠⑥', type: '闸门异常', message: '开度反馈超时', level: '严重', handled: '未处理' },
  { code: 'ALM-20260708-0002', time: '09:23:45', device: 'WL-04', deviceType: '水位计', location: '渠④', type: '水位超过上限', message: '水位异常', level: '重要', handled: '未处理' },
  { code: 'ALM-20260708-0003', time: '09:25:12', device: 'PT-03', deviceType: '压力计', location: '倒虹吸③-④', type: '压力计连接中断', message: '设备离线', level: '一般', handled: '已处理' },
  { code: 'ALM-20260708-0004', time: '09:12:08', device: 'WL-02', deviceType: '水位计', location: '渠②', type: '水位低于下限', message: '水位超限', level: '重要', handled: '已处理' },
  { code: 'ALM-20260708-0005', time: '08:58:31', device: 'G2', deviceType: '闸门', location: '渠②', type: '电机过载保护', message: '闸门异常', level: '重要', handled: '已处理' },
  { code: 'ALM-20260708-0006', time: '08:45:17', device: 'FM-01', deviceType: '电磁流量计', location: '进水总管', type: '数据通信中断', message: '通信异常', level: '一般', handled: '已处理' },
  { code: 'ALM-20260708-0007', time: '08:31:56', device: 'PT-01', deviceType: '压力计', location: '进水总管', type: '压力超过上限', message: '压力超限', level: '重要', handled: '已处理' },
  { code: 'ALM-20260708-0008', time: '08:20:09', device: 'G5', deviceType: '闸门', location: '渠⑤', type: '限位开关故障', message: '闸门异常', level: '一般', handled: '已处理' },
  { code: 'ALM-20260708-0009', time: '08:05:44', device: 'WL-06', deviceType: '水位计', location: '渠⑥', type: '水位波动超限', message: '水位超限', level: '一般', handled: '已处理' },
  { code: 'ALM-20260708-0010', time: '07:52:33', device: 'G1', deviceType: '闸门', location: '渠①', type: '闸门控制器离线', message: '设备离线', level: '一般', handled: '已处理' }
]);

export const ALARM_STATS = Object.freeze([
  { label: '报警总数', value: 28 }, { label: '未处理', value: 5, level: 'red' },
  { label: '已处理', value: 23, level: 'green' }, { label: '严重报警', value: 2, level: 'red' },
  { label: '设备离线', value: 4 }, { label: '水位超限', value: 8, level: 'orange' },
  { label: '闸门异常', value: 3, level: 'orange' }
]);

export const REPLAY_ROWS = Object.freeze([
  ['2026-07-08 09:00:00', '0.402', '0.380', '0.390', '12.50', '0.230', '42', '32.0'],
  ['2026-07-08 09:00:05', '0.402', '0.381', '0.392', '12.60', '0.231', '42', '32.0'],
  ['2026-07-08 09:00:10', '0.405', '0.383', '0.395', '12.70', '0.233', '42', '32.0'],
  ['2026-07-08 09:00:15', '0.407', '0.384', '0.397', '12.80', '0.234', '42', '32.0'],
  ['2026-07-08 09:30:20', '0.384', '0.338', '0.412', '13.20', '0.236', '43', '32.6']
].map(([time, wl01, wl02, wl03, fm01, pt01, g2, p1]) => ({ time, wl01, wl02, wl03, fm01, pt01, g2, p1 })));

export const REPLAY_QUERY = Object.freeze([
  ['开始时间', '2026-07-08 09:00:00'], ['结束时间', '2026-07-08 10:00:00'],
  ['数据粒度', '5秒'], ['渠道范围', '全部']
].map(([label, value]) => ({ label, value })));

export const ALARM_QUERY = Object.freeze([
  ['开始时间', '2026-07-08 00:00:00'], ['结束时间', '2026-07-08 23:59:59'],
  ['报警类型', '全部'], ['报警等级', '全部'], ['报警信息', '请输入报警信息关键字'],
  ['设备类型', '全部'], ['设备名称', '请输入设备名称'], ['处理状态', '全部'], ['所属渠道', '全部']
].map(([label, value]) => ({ label, value })));
