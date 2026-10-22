const GATE_OPENING_API_CODE = 'setOpening';
const GATE_OPENING_PARAM_FIELD = 'PublicPayload';
const PUMP_CONTROL_API_CODE = 'setData';
const PUMP_CONTROL_PARAM_FIELD = 'PublicPayload';
const VALVE_OPENING_API_CODE = 'setValveOpening';
const VALVE_OPENING_PARAM_FIELD = 'PublicPayload';

export function buildGateOpeningControlRequest(uid, opening) {
  const normalizedUid = String(uid ?? '').trim();
  if (!normalizedUid) {
    throw new Error('当前闸门缺少设备标识，无法下发开度');
  }

  const normalizedOpening = Number(opening);
  if (!Number.isFinite(normalizedOpening) || normalizedOpening < 0 || normalizedOpening > 90) {
    throw new Error('闸门开度必须在 0 至 90 mm 之间');
  }

  return {
    url: `/iot/instruct/ctrl/${GATE_OPENING_API_CODE}`,
    payload: {
      uid: normalizedUid,
      param: {
        [GATE_OPENING_PARAM_FIELD]: normalizedOpening,
      },
    },
  };
}

export function buildPumpControlRequest(uid, { running, frequency }) {
  const normalizedUid = String(uid ?? '').trim();
  if (!normalizedUid) {
    throw new Error('当前水泵缺少设备标识，无法下发控制');
  }

  const normalizedFrequency = Number(frequency);
  if (!Number.isFinite(normalizedFrequency) || normalizedFrequency < 0 || normalizedFrequency > 50) {
    throw new Error('水泵频率必须在 0 至 50 Hz 之间');
  }

  return {
    url: `/iot/instruct/ctrl/${PUMP_CONTROL_API_CODE}`,
    payload: {
      uid: normalizedUid,
      param: {
        [PUMP_CONTROL_PARAM_FIELD]: JSON.stringify({
          stats: Boolean(running),
          frequency: normalizedFrequency,
        }),
      },
    },
  };
}

export function buildValveOpeningControlRequest(uid, opening) {
  const normalizedUid = String(uid ?? '').trim();
  if (!normalizedUid) {
    throw new Error('当前阀门缺少设备标识，无法下发开度');
  }

  const normalizedOpening = Number(opening);
  if (!Number.isFinite(normalizedOpening) || normalizedOpening < 0 || normalizedOpening > 100) {
    throw new Error('阀门开度必须在 0 至 100% 之间');
  }

  return {
    url: `/iot/instruct/ctrl/${VALVE_OPENING_API_CODE}`,
    payload: {
      uid: normalizedUid,
      param: {
        [VALVE_OPENING_PARAM_FIELD]: JSON.stringify({ opening: normalizedOpening }),
      },
    },
  };
}
