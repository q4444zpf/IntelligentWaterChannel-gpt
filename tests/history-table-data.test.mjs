import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeHistoryPage } from '../src/history-table-data.js';

test('normalizes a backend history page for the table', () => {
  const page = normalizeHistoryPage({
    current: 2,
    size: 50,
    total: 101,
    records: [{
      timestamp: '2026-07-08 09:30:20',
      type: '水位计',
      name: '水位计1',
      location: '渠①',
      metric: '水位',
      value: '0.384',
      unit: 'm',
    }],
  });

  assert.equal(page.current, 2);
  assert.equal(page.pageCount, 3);
  assert.equal(page.rows[0].timestampValue, new Date('2026-07-08T09:30:20').getTime());
  assert.equal(page.rows[0].state, '正常');
  assert.equal(page.rows[0].value, '0.384');
});

test('uses safe display defaults for incomplete records', () => {
  const page = normalizeHistoryPage({ records: [{}] });

  assert.equal(page.total, 0);
  assert.equal(page.pageCount, 1);
  assert.deepEqual(page.rows[0], {
    key: 0,
    timestamp: '--',
    timestampValue: 0,
    type: '--',
    name: '--',
    location: '--',
    metric: '--',
    value: '--',
    unit: '',
    state: '正常',
  });
});
