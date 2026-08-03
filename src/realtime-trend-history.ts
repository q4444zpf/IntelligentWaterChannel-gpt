import type { TrendPoint, TrendType } from './config/trendConfig.ts';

function parseTimestamp(value: unknown): number | null {
  if (!value) return null;
  const normalized = typeof value === 'string' ? value.replace(' ', 'T') : value;
  const timestamp = new Date(normalized as string | number | Date).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function parseValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatTrendHistoryDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const part = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}`
    + `T${part(date.getHours())}:${part(date.getMinutes())}:${part(date.getSeconds())}`;
}

export function normalizeTrendHistoryPoints(
  records: readonly Record<string, unknown>[],
  type: TrendType,
  deviceId: string,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (const record of records) {
    if (String(record.uid ?? '') !== deviceId) continue;
    const timestamp = parseTimestamp(record.timestamp);
    const value = parseValue(record.value);
    if (timestamp === null || value === null) continue;
    points.push({
      timestamp,
      value,
      ...(type === 'pump' ? { running: value > 0 } : {}),
    });
  }
  return points.sort((left, right) => left.timestamp - right.timestamp);
}
