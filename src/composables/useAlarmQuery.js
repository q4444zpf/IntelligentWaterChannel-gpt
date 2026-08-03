import { computed, ref } from 'vue';
import {
  getBigWaterChannelAlarms,
  getBigWaterChannelAlarmStatistics,
} from '../api/alarm.js';
import { getBigWaterChannelHistoryDevices } from '../api/history.js';
import {
  buildAlarmCsv,
  normalizeAlarmPage,
  normalizeAlarmStatistics,
  validateAlarmQuery,
} from '../alarm-data.js';
import { normalizeHistoryDevices } from '../history-device-data.js';
import { createTodayHistoryRange } from '../history-data.js';

const createDefaultQuery = () => ({
  ...createTodayHistoryRange(),
  warnConfigName: '',
  grade: '',
  content: '',
  deviceType: '全部',
  deviceName: '',
  handlingStatus: '',
  channel: '全部',
});

export function useAlarmQuery() {
  const draft = ref(createDefaultQuery());
  const appliedQuery = ref(createDefaultQuery());
  const rows = ref([]);
  const current = ref(1);
  const pageSize = ref(20);
  const total = ref(0);
  const statistics = ref(normalizeAlarmStatistics());
  const loading = ref(false);
  const exporting = ref(false);
  const devicesLoading = ref(false);
  const error = ref('');
  const historyDevices = ref([]);
  const deviceTypes = computed(() => [
    '全部',
    ...new Set(historyDevices.value.map((device) => device.type).filter(Boolean)),
  ]);
  const channels = computed(() => [
    '全部',
    ...new Set(historyDevices.value.map((device) => device.location).filter(Boolean)),
  ]);
  const canExport = computed(() => total.value > 0 && !loading.value && !exporting.value);

  async function loadDeviceOptions() {
    devicesLoading.value = true;
    try {
      historyDevices.value = normalizeHistoryDevices(await getBigWaterChannelHistoryDevices());
    } catch (requestError) {
      historyDevices.value = [];
      error.value = requestError?.message || '获取告警筛选设备配置失败';
    } finally {
      devicesLoading.value = false;
    }
  }

  async function requestPage(query, nextCurrent, nextPageSize, includeStatistics = true) {
    loading.value = true;
    error.value = '';
    try {
      const [pageResponse, statisticsResponse] = await Promise.all([
        getBigWaterChannelAlarms({
          ...query,
          current: nextCurrent,
          size: nextPageSize,
        }),
        includeStatistics ? getBigWaterChannelAlarmStatistics(query) : Promise.resolve(null),
      ]);
      const page = normalizeAlarmPage(pageResponse);
      rows.value = page.rows;
      current.value = page.current;
      pageSize.value = nextPageSize;
      total.value = page.total;
      if (statisticsResponse) statistics.value = normalizeAlarmStatistics(statisticsResponse);
      return true;
    } catch (requestError) {
      rows.value = [];
      total.value = 0;
      if (includeStatistics) statistics.value = normalizeAlarmStatistics();
      error.value = requestError?.message || '获取告警列表失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function runQuery() {
    const validationError = validateAlarmQuery(draft.value);
    if (validationError) {
      error.value = validationError;
      return false;
    }
    appliedQuery.value = { ...draft.value };
    return requestPage(appliedQuery.value, 1, pageSize.value);
  }

  function changePage(nextCurrent, nextPageSize) {
    return requestPage(appliedQuery.value, nextCurrent, nextPageSize, false);
  }

  function refresh() {
    return requestPage(appliedQuery.value, current.value, pageSize.value);
  }

  function resetQuery() {
    draft.value = createDefaultQuery();
    appliedQuery.value = { ...draft.value };
    return requestPage(appliedQuery.value, 1, pageSize.value);
  }

  async function exportCsv() {
    if (!canExport.value) return;
    exporting.value = true;
    error.value = '';
    try {
      const page = normalizeAlarmPage(await getBigWaterChannelAlarms({
        ...appliedQuery.value,
        current: 1,
        size: -1,
      }));
      const blob = new Blob([`\uFEFF${buildAlarmCsv(page.rows)}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `蛇形水槽告警_${Date.now()}.csv`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      error.value = requestError?.message || '导出告警CSV失败';
    } finally {
      exporting.value = false;
    }
  }

  async function initialize() {
    await Promise.all([loadDeviceOptions(), requestPage(appliedQuery.value, 1, pageSize.value)]);
  }

  return {
    canExport,
    channels,
    changePage,
    current,
    deviceTypes,
    devicesLoading,
    draft,
    error,
    exportCsv,
    exporting,
    initialize,
    loading,
    pageSize,
    refresh,
    resetQuery,
    rows,
    runQuery,
    statistics,
    total,
  };
}
