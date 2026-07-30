import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatReplayValue,
  normalizeHistoryReplay,
  parseReplayValue,
} from '../src/history-replay-data.js';

test('preserves backend topology order for aligned replay rows', () => {
  const replay = normalizeHistoryReplay({
    channels: ['前池', '渠①', '渠①'],
    nodes: [
      { key: 'level1', name: '水位计1', label: '前池', channel: '前池', unit: 'm' },
      { key: 'level2', name: '水位计2', label: '渠①', channel: '渠①', unit: 'm' },
    ],
    rows: [
      { timestamp: '2026-07-30 09:00:05', values: { level1: '0.402', level2: null } },
      { timestamp: '2026-07-30 09:00:00', values: { level1: '0.401', level2: '0.380' } },
    ],
  });

  assert.deepEqual(replay.nodes.map((node) => node.key), ['level1', 'level2']);
  assert.deepEqual(replay.channels, ['前池', '渠①']);
  assert.deepEqual(replay.rows.map((row) => row.timestamp), [
    '2026-07-30 09:00:00',
    '2026-07-30 09:00:05',
  ]);
  assert.equal(replay.rows[1].level2, null);
});

test('parses numeric replay values and rejects missing values', () => {
  assert.equal(parseReplayValue('0.384'), 0.384);
  assert.equal(parseReplayValue(null), null);
  assert.equal(parseReplayValue('invalid'), null);
});

test('formats replay table values with three decimal places', () => {
  assert.equal(formatReplayValue(33), '33.000');
  assert.equal(formatReplayValue('0.3846'), '0.385');
  assert.equal(formatReplayValue(null), '--');
});
