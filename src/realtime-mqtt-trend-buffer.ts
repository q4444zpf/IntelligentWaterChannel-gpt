import type { TrendDevice, TrendPoint, TrendSnapshot, TrendType } from './config/trendConfig.ts';

const TREND_TYPES: TrendType[] = ['flow', 'level', 'pump', 'siphon'];

function numericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createRealtimeMqttTrendBuffer(maxPointsPerDevice = 20_000) {
  const pointsByDevice = new Map<string, TrendPoint[]>();

  function seed(type: TrendType, deviceId: string, historyPoints: readonly TrendPoint[]) {
    const key = `${type}:${deviceId}`;
    const currentPoints = pointsByDevice.get(key) || [];
    const merged = new Map<number, TrendPoint>();
    historyPoints.forEach((point) => merged.set(point.timestamp, point));
    currentPoints.forEach((point) => merged.set(point.timestamp, point));
    const points = [...merged.values()]
      .sort((left, right) => left.timestamp - right.timestamp)
      .slice(-maxPointsPerDevice);
    pointsByDevice.set(key, points);
  }

  function record(
    devicesByType: Record<TrendType, readonly TrendDevice[]>,
    values: Record<string, unknown>,
    timestamp: number,
  ): boolean {
    let changed = false;

    for (const type of TREND_TYPES) {
      for (const device of devicesByType[type]) {
        if (!device.tag || !Object.prototype.hasOwnProperty.call(values, device.tag)) continue;
        const value = numericValue(values[device.tag]);
        if (value === null) continue;

        const key = `${type}:${device.id}`;
        const points = pointsByDevice.get(key) || [];
        const point: TrendPoint = {
          timestamp,
          value,
          ...(type === 'pump' ? { running: value > 0 } : {}),
        };
        if (points.at(-1)?.timestamp === timestamp) {
          points[points.length - 1] = point;
        } else {
          points.push(point);
        }
        if (points.length > maxPointsPerDevice) {
          points.splice(0, points.length - maxPointsPerDevice);
        }
        pointsByDevice.set(key, points);
        changed = true;
      }
    }

    return changed;
  }

  function snapshot(
    type: TrendType,
    device: TrendDevice | undefined,
    startTime: number,
    endTime: number,
    timestamp: number,
    sampleInterval = 0,
  ): TrendSnapshot {
    if (!device) return { timestamp, startTime, endTime, series: [] };
    const points = pointsByDevice.get(`${type}:${device.id}`) || [];
    const visiblePoints = points.filter((point) => point.timestamp >= startTime && point.timestamp <= endTime);
    const sampledPoints = sampleInterval > 0
      ? [...visiblePoints.reduce((buckets, point) => {
          buckets.set(Math.floor(point.timestamp / sampleInterval), point);
          return buckets;
        }, new Map<number, TrendPoint>()).values()]
      : visiblePoints;
    return {
      timestamp,
      startTime,
      endTime,
      series: [{
        device,
        points: sampledPoints,
      }],
    };
  }

  return { record, seed, snapshot };
}
