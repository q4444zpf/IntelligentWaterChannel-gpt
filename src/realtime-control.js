const GATE_OPENING_API_CODE = 'setOpening';
const GATE_OPENING_PARAM_FIELD = 'PublicPayload';

export function buildGateOpeningControlRequest(uid, opening) {
  const normalizedUid = String(uid ?? '').trim();
  if (!normalizedUid) {
    throw new Error('当前闸门缺少设备标识，无法下发开度');
  }

  const normalizedOpening = Number(opening);
  if (!Number.isFinite(normalizedOpening) || normalizedOpening < 0 || normalizedOpening > 80) {
    throw new Error('闸门开度必须在 0 至 80 mm 之间');
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
