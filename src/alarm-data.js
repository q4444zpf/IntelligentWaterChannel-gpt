function parseTimestamp(value) {
  if (typeof value !== 'string' || !value) return 0;
  const timestamp = new Date(value.replace(' ', 'T')).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function validateAlarmQuery({ start, end }) {
  if (!start || !end) return '请选择完整的开始和结束时间';
  if (new Date(start).getTime() > new Date(end).getTime()) return '开始时间不能晚于结束时间';
  return '';
}

export function normalizeAlarmPage(page) {
  const records = Array.isArray(page?.records) ? page.records : [];
  const current = Math.max(1, Number(page?.current) || 1);
  const size = Number(page?.size) > 0 ? Number(page.size) : Math.max(1, records.length);
  const total = Math.max(0, Number(page?.total) || 0);

  return {
    current,
    size,
    total,
    rows: records.map((record, index) => {
      const handlingStatus = Number(record?.handlingStatus) === 1 ? 1 : 0;
      return {
        key: String(record?.id || `${record?.uid || 'alarm'}-${record?.warnTime || index}`),
        id: String(record?.id || ''),
        uid: String(record?.uid || ''),
        code: record?.code || '--',
        warnTime: record?.warnTime || '--',
        timestampValue: parseTimestamp(record?.warnTime),
        deviceName: record?.deviceName || '--',
        deviceSn: record?.deviceSn || '--',
        deviceType: record?.deviceType || '--',
        location: record?.location || '--',
        warnConfigName: record?.warnConfigName || '--',
        content: record?.content || '--',
        grade: record?.grade || '',
        gradeName: record?.gradeName || '--',
        handlingStatus,
        handlingRemark: record?.handlingRemark || '',
        handlingUser: record?.handlingUser || '',
        handled: handlingStatus === 1 ? '已处理' : '未处理',
        device: record?.deviceName || '--',
        type: record?.warnConfigName || '--',
        message: record?.content || '--',
        level: record?.gradeName || '--',
        time: record?.warnTime || '--',
      };
    }),
  };
}

export function normalizeAlarmStatistics(value) {
  const count = (field) => Math.max(0, Number(value?.[field]) || 0);
  return {
    total: count('total'),
    unhandled: count('unhandled'),
    handled: count('handled'),
    fatal: count('fatal'),
    offline: count('offline'),
    waterLevel: count('waterLevel'),
    gate: count('gate'),
  };
}

function escapeCsvField(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildAlarmCsv(rows) {
  const headers = ['报警时间', '设备名称', '设备类型', '所属渠道', '报警类型', '报警信息', '报警等级', '处理状态'];
  const body = rows.map((row) => [
    row.warnTime,
    row.deviceName,
    row.deviceType,
    row.location,
    row.warnConfigName,
    row.content,
    row.gradeName,
    row.handled,
  ]);
  return [headers, ...body].map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
}
