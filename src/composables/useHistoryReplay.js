import { computed, onBeforeUnmount, ref } from 'vue';
import { getBigWaterChannelHistoryReplay } from '../api/history.js';
import { createTodayHistoryRange } from '../history-data.js';
import { normalizeHistoryReplay } from '../history-replay-data.js';

const createDefaultQuery = () => ({
  ...createTodayHistoryRange(),
  intervalSeconds: 5,
  channel: '全部',
});

function validateReplayQuery(query) {
  if (!query.start || !query.end) return '请选择完整的开始和结束时间';
  if (new Date(query.start).getTime() > new Date(query.end).getTime()) {
    return '开始时间不能晚于结束时间';
  }
  return '';
}

function escapeCsvValue(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function useHistoryReplay() {
  const draft = ref(createDefaultQuery());
  const appliedQuery = ref(createDefaultQuery());
  const channels = ref([]);
  const nodes = ref([]);
  const rows = ref([]);
  const activeIndex = ref(-1);
  const loading = ref(false);
  const playing = ref(false);
  const error = ref('');
  let initialized = false;
  let playTimer = null;

  const currentRow = computed(() => rows.value[activeIndex.value] || null);
  const previousRow = computed(() => activeIndex.value > 0
    ? rows.value[activeIndex.value - 1]
    : null);
  const canExport = computed(() => rows.value.length > 0 && !loading.value);
  const rangeLabel = computed(() => `${appliedQuery.value.start.replace('T', ' ')} 至 ${appliedQuery.value.end.replace('T', ' ')}`);

  function pause() {
    if (playTimer !== null) window.clearInterval(playTimer);
    playTimer = null;
    playing.value = false;
  }

  function setActiveIndex(value) {
    const next = Math.min(Math.max(0, Number(value) || 0), Math.max(0, rows.value.length - 1));
    activeIndex.value = rows.value.length ? next : -1;
  }

  function selectRow(row) {
    pause();
    setActiveIndex(row?.key);
  }

  function play() {
    if (playing.value || rows.value.length < 2) return;
    if (activeIndex.value >= rows.value.length - 1) activeIndex.value = 0;
    playing.value = true;
    playTimer = window.setInterval(() => {
      if (activeIndex.value >= rows.value.length - 1) {
        pause();
        return;
      }
      activeIndex.value += 1;
    }, 1000);
  }

  async function runQuery() {
    const validationError = validateReplayQuery(draft.value);
    if (validationError) {
      error.value = validationError;
      return false;
    }

    pause();
    loading.value = true;
    error.value = '';
    try {
      const nextQuery = { ...draft.value };
      const normalized = normalizeHistoryReplay(await getBigWaterChannelHistoryReplay(nextQuery));
      appliedQuery.value = nextQuery;
      channels.value = normalized.channels;
      nodes.value = normalized.nodes;
      rows.value = normalized.rows;
      activeIndex.value = rows.value.length - 1;
      initialized = true;
      return true;
    } catch (requestError) {
      nodes.value = [];
      rows.value = [];
      activeIndex.value = -1;
      error.value = requestError?.message || '获取节点水位回放数据失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  function initialize() {
    return initialized ? Promise.resolve(true) : runQuery();
  }

  function resetQuery() {
    draft.value = createDefaultQuery();
    return runQuery();
  }

  function exportCsv() {
    if (!canExport.value) return;
    const lines = [
      ['时间', ...nodes.value.map((node) => `${node.name}（${node.label} / ${node.unit}）`)]
        .map(escapeCsvValue)
        .join(','),
      ...rows.value.map((row) => [row.timestamp, ...nodes.value.map((node) => row[node.key])]
        .map(escapeCsvValue)
        .join(',')),
    ];
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `蛇形水槽节点水位回放_${Date.now()}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  onBeforeUnmount(pause);

  return {
    activeIndex,
    appliedQuery,
    canExport,
    channels,
    currentRow,
    draft,
    error,
    exportCsv,
    initialize,
    loading,
    nodes,
    pause,
    play,
    playing,
    previousRow,
    rangeLabel,
    resetQuery,
    rows,
    runQuery,
    selectRow,
    setActiveIndex,
  };
}
