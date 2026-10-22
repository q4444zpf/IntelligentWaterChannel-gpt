import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGateOpeningControlRequest,
  buildPumpControlRequest,
  buildValveOpeningControlRequest,
} from '../src/realtime-control.js';

test('builds the gate opening model API request', () => {
  assert.deepEqual(buildGateOpeningControlRequest('2082047504001417217', 10), {
    url: '/iot/instruct/ctrl/setOpening',
    payload: {
      uid: '2082047504001417217',
      param: { PublicPayload: 10 },
    },
  });
});

test('rejects an invalid gate opening before sending a request', async () => {
  assert.throws(
    () => buildGateOpeningControlRequest('2082047504001417217', 91),
    /0 至 90 mm/,
  );
});

test('builds the pump MQTT control request', () => {
  assert.deepEqual(
    buildPumpControlRequest('2092915057435348994', { running: true, frequency: 35 }),
    {
      url: '/iot/instruct/ctrl/setData',
      payload: {
        uid: '2092915057435348994',
        param: {
          PublicPayload: JSON.stringify({ stats: true, frequency: 35 }),
        },
      },
    },
  );
});

test('rejects an invalid pump frequency before sending a request', () => {
  assert.throws(
    () => buildPumpControlRequest('2092915057435348994', { running: false, frequency: 51 }),
    /0 至 50 Hz/,
  );
});

test('builds the valve opening MQTT control request', () => {
  assert.deepEqual(buildValveOpeningControlRequest('2094374545467707394', 52), {
    url: '/iot/instruct/ctrl/setValveOpening',
    payload: {
      uid: '2094374545467707394',
      param: {
        PublicPayload: JSON.stringify({ opening: 52 }),
      },
    },
  });
});

test('rejects an invalid valve opening before sending a request', () => {
  assert.throws(
    () => buildValveOpeningControlRequest('2094374545467707394', 101),
    /0 至 100%/,
  );
});
