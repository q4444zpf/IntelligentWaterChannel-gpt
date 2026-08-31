import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGateOpeningControlRequest } from '../src/realtime-control.js';

test('builds the gate opening model API request', () => {
  assert.deepEqual(buildGateOpeningControlRequest('2082047504001417217', 35), {
    url: '/iot/instruct/ctrl/setOpening',
    payload: {
      uid: '2082047504001417217',
      param: { PublicPayload: 35 },
    },
  });
});

test('rejects an invalid gate opening before sending a request', async () => {
  assert.throws(
    () => buildGateOpeningControlRequest('2082047504001417217', 81),
    /0 至 80 mm/,
  );
});
