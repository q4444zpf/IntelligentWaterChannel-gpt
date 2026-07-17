import { computed, ref } from 'vue';
import {
  DEFAULT_DEVICE_IDS,
  DEVICES,
  buildHistoryResults,
  buildHistoryRows,
  sortDeviceIds,
  toHistoryCsv,
  validateHistoryQuery
} from '../history-data.js';

const DEFAULT_QUERY = Object.freeze({
  start: '2026-07-08T09:00',
  end: '2026-07-08T10:00',
  deviceIds: [...DEFAULT_DEVICE_IDS],
  intervalSeconds: 300,
  status: '全部'
});

const createDefaultQuery = () => ({ ...DEFAULT_QUERY, deviceIds: [...DEFAULT_QUERY.deviceIds] });

export function useHistoryQuery() {
  const deviceSearch = ref('');
  const loading = ref(false);
  const error = ref('');
  const draft = ref(createDefaultQuery());
  const appliedQuery = ref(createDefaultQuery());
  const results = ref(buildHistoryResults(appliedQuery.value));
  const rows = computed(() => buildHistoryRows(results.value));
  const visibleRows = computed(() => rows.value.slice(0, 50));
  const selectedDevices = computed(() => sortDeviceIds(draft.value.deviceIds)
    .map((id) => DEVICES.find((device) => device.id === id))
    .filter(Boolean));
  const filteredDevices = computed(() => {
    const keyword = deviceSearch.value.toLocaleLowerCase('zh-CN');
    if (!keyword) return DEVICES;
    return DEVICES.filter((device) => `${device.id} ${device.type} ${device.location}`.toLocaleLowerCase('zh-CN').includes(keyword));
  });
  const rangeLabel = computed(() => `${appliedQuery.value.start.replace('T', ' ')} 至 ${appliedQuery.value.end.replace('T', ' ')}`);
  const canExport = computed(() => !loading.value && rows.value.length > 0);

  function toggleDevice(id) {
    const ids = draft.value.deviceIds;
    draft.value.deviceIds = ids.includes(id) ? ids.filter((item) => item !== id) : sortDeviceIds([...ids, id]);
    error.value = draft.value.deviceIds.length ? '' : '请至少选择一台设备';
  }

  function selectAllDevices() {
    draft.value.deviceIds = DEVICES.map((device) => device.id);
    error.value = '';
  }

  function clearDevices() {
    draft.value.deviceIds = [];
    error.value = '请至少选择一台设备';
  }

  async function runQuery() {
    const validationError = validateHistoryQuery(draft.value);
    if (validationError) {
      error.value = validationError;
      return false;
    }
    error.value = '';
    loading.value = true;
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    const nextQuery = { ...draft.value, deviceIds: sortDeviceIds(draft.value.deviceIds) };
    const nextResults = buildHistoryResults(nextQuery);
    results.value = nextQuery.status === '全部'
      ? nextResults
      : nextResults.filter((result) => result.device.state === nextQuery.status);
    appliedQuery.value = nextQuery;
    loading.value = false;
    return true;
  }

  function resetQuery() {
    draft.value = createDefaultQuery();
    error.value = '';
    deviceSearch.value = '';
    return runQuery();
  }

  function exportCsv() {
    if (!canExport.value) return;
    const blob = new Blob([toHistoryCsv(rows.value)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `历史数据_${appliedQuery.value.start.replaceAll(':', '')}_${appliedQuery.value.end.replaceAll(':', '')}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return {
    canExport,
    clearDevices,
    deviceSearch,
    draft,
    error,
    exportCsv,
    filteredDevices,
    loading,
    rangeLabel,
    resetQuery,
    results,
    rows,
    runQuery,
    selectAllDevices,
    selectedDevices,
    toggleDevice,
    visibleRows
  };
}
