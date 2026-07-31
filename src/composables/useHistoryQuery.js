import { computed, ref } from 'vue';
import {
  exportBigWaterChannelHistory,
  getBigWaterChannelHistory,
  getBigWaterChannelHistoryDevices,
} from '../api/history.js';
import {
  filterHistoryDeviceOptions,
  normalizeHistoryDevices,
  sortHistoryDeviceOptionIds,
} from '../history-device-data.js';
import {
  DEFAULT_DEVICE_IDS,
  createTodayHistoryRange,
  validateHistoryQuery
} from '../history-data.js';
import { normalizeHistoryChartResults } from '../history-chart-data.js';
import { normalizeHistoryPage } from '../history-table-data.js';

const DEFAULT_QUERY = Object.freeze({
  deviceIds: [...DEFAULT_DEVICE_IDS],
  deviceType: '全部',
  channel: '全部',
  intervalSeconds: 300,
  status: '全部'
});

const createDefaultQuery = () => ({
  ...DEFAULT_QUERY,
  ...createTodayHistoryRange(),
  deviceIds: [...DEFAULT_QUERY.deviceIds],
});

export function useHistoryQuery() {
  const deviceSearch = ref('');
  const devicesLoading = ref(false);
  const exporting = ref(false);
  const loading = ref(false);
  const error = ref('');
  const historyDevices = ref([]);
  const draft = ref(createDefaultQuery());
  const appliedQuery = ref(createDefaultQuery());
  const results = ref([]);
  const rows = ref([]);
  const historyTotal = computed(() => rows.value.length);
  const chartRowCount = computed(() => results.value
    .reduce((total, result) => total + result.points.length, 0));
  const selectedDevices = computed(() => sortHistoryDeviceOptionIds(historyDevices.value, draft.value.deviceIds)
    .map((id) => historyDevices.value.find((device) => device.id === id))
    .filter(Boolean));
  const historyDeviceTypes = computed(() => [
    '全部',
    ...new Set(historyDevices.value.map((device) => device.type).filter(Boolean)),
  ]);
  const historyChannels = computed(() => [
    '全部',
    ...new Set(historyDevices.value.map((device) => device.location).filter(Boolean)),
  ]);
  const selectableDevices = computed(() => filterHistoryDeviceOptions(historyDevices.value, {
    deviceType: draft.value.deviceType,
    channel: draft.value.channel,
  }));
  const filteredDevices = computed(() => filterHistoryDeviceOptions(historyDevices.value, {
    deviceType: draft.value.deviceType,
    channel: draft.value.channel,
    keyword: deviceSearch.value,
  }));
  const rangeLabel = computed(() => `${appliedQuery.value.start.replace('T', ' ')} 至 ${appliedQuery.value.end.replace('T', ' ')}`);
  const canExport = computed(() => !loading.value && !exporting.value && historyTotal.value > 0);

  async function loadHistoryDevices() {
    devicesLoading.value = true;
    try {
      const devices = normalizeHistoryDevices(await getBigWaterChannelHistoryDevices());
      historyDevices.value = devices;
      const retainedIds = sortHistoryDeviceOptionIds(devices, draft.value.deviceIds);
      draft.value.deviceIds = retainedIds.length ? retainedIds : devices.slice(0, 1).map((device) => device.id);
      if (!devices.length) {
        error.value = '当前设备分组下没有可选设备';
        return false;
      }
      return true;
    } catch (requestError) {
      historyDevices.value = [];
      draft.value.deviceIds = [];
      error.value = requestError?.message || '获取历史设备列表失败';
      return false;
    } finally {
      devicesLoading.value = false;
    }
  }

  async function initialize() {
    if (!await loadHistoryDevices()) return false;
    return runQuery();
  }

  async function requestHistory(query = appliedQuery.value) {
    const responsePage = await getBigWaterChannelHistory({
      current: 1,
      size: -1,
      start: query.start,
      end: query.end,
      intervalSeconds: query.intervalSeconds,
      deviceIds: query.deviceIds,
    });
    const normalized = normalizeHistoryPage(responsePage);
    rows.value = normalized.rows;
    results.value = normalizeHistoryChartResults(
      responsePage.records,
      historyDevices.value,
      query.deviceIds,
    );
  }

  function toggleDevice(id) {
    const ids = draft.value.deviceIds;
    draft.value.deviceIds = ids.includes(id)
      ? ids.filter((item) => item !== id)
      : sortHistoryDeviceOptionIds(historyDevices.value, [...ids, id]);
    error.value = draft.value.deviceIds.length ? '' : '请至少选择一台设备';
  }

  function selectAllDevices() {
    draft.value.deviceIds = sortHistoryDeviceOptionIds(
      historyDevices.value,
      filteredDevices.value.map((device) => device.id),
    );
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
    try {
      const nextQuery = {
        ...draft.value,
        deviceIds: sortHistoryDeviceOptionIds(historyDevices.value, draft.value.deviceIds),
      };
      appliedQuery.value = nextQuery;
      await requestHistory(nextQuery);
      return true;
    } catch (requestError) {
      results.value = [];
      rows.value = [];
      error.value = requestError?.message || '获取历史数据失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  function applyDeviceFilters() {
    const selectableIds = new Set(selectableDevices.value.map((device) => device.id));
    const retainedIds = draft.value.deviceIds.filter((id) => selectableIds.has(id));
    draft.value.deviceIds = retainedIds.length
      ? sortHistoryDeviceOptionIds(historyDevices.value, retainedIds)
      : selectableDevices.value.slice(0, 1).map((device) => device.id);
    deviceSearch.value = '';
    error.value = draft.value.deviceIds.length ? '' : '当前筛选条件下没有可选设备';
  }

  function resetQuery() {
    draft.value = createDefaultQuery();
    draft.value.deviceIds = historyDevices.value.slice(0, 1).map((device) => device.id);
    error.value = '';
    deviceSearch.value = '';
    return runQuery();
  }

  async function exportCsv() {
    if (!canExport.value) return;
    error.value = '';
    exporting.value = true;
    try {
      const { blob, fileName } = await exportBigWaterChannelHistory({
        start: appliedQuery.value.start,
        end: appliedQuery.value.end,
        intervalSeconds: appliedQuery.value.intervalSeconds,
        deviceIds: appliedQuery.value.deviceIds,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      error.value = requestError?.message || '导出历史数据失败';
    } finally {
      exporting.value = false;
    }
  }

  return {
    canExport,
    applyDeviceFilters,
    chartRowCount,
    clearDevices,
    deviceSearch,
    devicesLoading,
    draft,
    error,
    exportCsv,
    exporting,
    filteredDevices,
    historyTotal,
    historyChannels,
    historyDevices,
    historyDeviceTypes,
    initialize,
    loading,
    rangeLabel,
    resetQuery,
    results,
    rows,
    runQuery,
    selectAllDevices,
    selectableDevices,
    selectedDevices,
    toggleDevice,
  };
}
