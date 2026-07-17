import assert from 'node:assert/strict';
import test from 'node:test';

import { createRealtimeTrendController } from '../src/realtime-trend-controller.ts';

function scheduler() {
  const active = new Set();
  return { active, setInterval(fn) { active.add(fn); return fn; }, clearInterval(fn) { active.delete(fn); } };
}

test('keeps selections independent between trend tabs', () => {
  const controller = createRealtimeTrendController({ source: async () => ({ timestamp: 1, series: [] }) });
  controller.setSelectedIds(['FM-01']);
  controller.setTrendType('level');
  controller.setSelectedIds(['WL-01']);
  controller.setTrendType('flow');
  assert.deepEqual(controller.state.selectedIds, ['FM-01']);
});

test('suppresses empty and concurrent refreshes', async () => {
  let calls = 0;
  let resolve;
  const controller = createRealtimeTrendController({ source: () => { calls += 1; return new Promise((done) => { resolve = done; }); } });
  controller.setSelectedIds([]);
  await controller.refresh();
  assert.equal(calls, 0);
  controller.setSelectedIds(['FM-01']);
  const first = controller.refresh();
  const second = controller.refresh();
  assert.equal(calls, 1);
  resolve({ timestamp: 1, series: [] });
  await Promise.all([first, second]);
});

test('retains data on failure and manages one polling interval', async () => {
  const timer = scheduler();
  let fail = false;
  let calls = 0;
  const controller = createRealtimeTrendController({
    source: async () => { calls += 1; if (fail) throw new Error('network'); return { timestamp: calls, series: [] }; },
    scheduler: timer,
    now: () => 1_000_000
  });
  await controller.start();
  assert.equal(timer.active.size, 1);
  fail = true;
  await controller.refresh();
  assert.equal(controller.state.snapshot.timestamp, 1);
  assert.match(controller.state.error, /刷新失败/);
  controller.pause();
  assert.equal(timer.active.size, 0);
  fail = false;
  await controller.resume();
  assert.equal(timer.active.size, 1);
  controller.dispose();
  assert.equal(timer.active.size, 0);
});
