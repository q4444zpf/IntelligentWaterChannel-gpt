import assert from 'node:assert/strict';
import test from 'node:test';

import { createRealtimeWaterProfilePoller } from '../src/realtime-water-profile-poller.js';

function createScheduler() {
  const active = new Set();
  return {
    active,
    setInterval(callback) {
      active.add(callback);
      return callback;
    },
    clearInterval(callback) {
      active.delete(callback);
    }
  };
}

test('loads a first snapshot and starts exactly one interval', async () => {
  const scheduler = createScheduler();
  const poller = createRealtimeWaterProfilePoller({
    source: async () => ({ timestamp: 1000, nodes: [{ measured: 0.4 }] }),
    scheduler
  });

  await poller.start();

  assert.equal(poller.state.snapshot.timestamp, 1000);
  assert.equal(poller.state.loading, false);
  assert.equal(scheduler.active.size, 1);
});

test('suppresses concurrent refreshes', async () => {
  let resolve;
  let calls = 0;
  const source = () => {
    calls += 1;
    return new Promise((done) => { resolve = done; });
  };
  const poller = createRealtimeWaterProfilePoller({ source });

  const first = poller.refresh();
  const second = poller.refresh();
  assert.equal(calls, 1);
  resolve({ timestamp: 1000, nodes: [] });
  await Promise.all([first, second]);
});

test('retains the last snapshot and exposes a Chinese error on failure', async () => {
  let fail = false;
  const poller = createRealtimeWaterProfilePoller({
    source: async () => {
      if (fail) throw new Error('network');
      return { timestamp: 1000, nodes: [{ measured: 0.4 }] };
    }
  });

  await poller.refresh();
  fail = true;
  await poller.refresh();

  assert.equal(poller.state.snapshot.timestamp, 1000);
  assert.match(poller.state.error, /刷新失败/);
  assert.equal(poller.state.refreshing, false);
});

test('pauses, resumes immediately, and disposes its sole interval', async () => {
  const scheduler = createScheduler();
  let calls = 0;
  const poller = createRealtimeWaterProfilePoller({
    source: async () => ({ timestamp: ++calls, nodes: [] }),
    scheduler
  });

  await poller.start();
  poller.pause();
  assert.equal(poller.state.paused, true);
  assert.equal(scheduler.active.size, 0);
  await poller.resume();
  assert.equal(calls, 2);
  assert.equal(scheduler.active.size, 1);
  poller.dispose();
  assert.equal(scheduler.active.size, 0);
});
