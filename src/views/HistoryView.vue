<template>
  <section class="page page-history active history-page">
    <section class="history-tab active history-analysis-tab">
      <a-config-provider :locale="zhCN" :theme="historyTheme">
        <div class="history-analysis-layout">
          <aside class="history-filter-panel" aria-label="历史数据筛选条件">
            <span class="history-filter-corner-mark" aria-hidden="true">
              <span class="history-filter-corner-line history-filter-corner-line--horizontal"></span>
              <span class="history-filter-corner-line history-filter-corner-line--vertical"></span>
            </span>
            <span class="history-filter-arrow" aria-hidden="true"></span>
            <div class="history-filter-scroll">
              <a-form class="history-filter-form" :model="draft" layout="vertical">
                <a-form-item label="快捷时间">
                  <div class="history-quick-range-options">
                    <a-button :type="historyQuickRange === 'day' ? 'primary' : 'default'" :disabled="loading || !draft.deviceIds.length" @click="queryQuickRange('day')">本日</a-button>
                    <a-button :type="historyQuickRange === 'week' ? 'primary' : 'default'" :disabled="loading || !draft.deviceIds.length" @click="queryQuickRange('week')">本周</a-button>
                    <a-button :type="historyQuickRange === 'month' ? 'primary' : 'default'" :disabled="loading || !draft.deviceIds.length" @click="queryQuickRange('month')">本月</a-button>
                  </div>
                </a-form-item>
                <a-form-item label="开始时间">
                  <a-date-picker v-model:value="startTimeValue" show-time format="YYYY-MM-DD HH:mm:ss" :allow-clear="false" />
                </a-form-item>
                <a-form-item label="结束时间">
                  <a-date-picker v-model:value="endTimeValue" show-time format="YYYY-MM-DD HH:mm:ss" :allow-clear="false" />
                </a-form-item>
                <a-form-item label="设备类型">
                  <a-select v-model:value="draft.deviceType" @change="applyDeviceFilters">
                    <a-select-option v-for="type in historyDeviceTypes" :key="type" :value="type">{{ type }}</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item>
                  <template #label>
                    <span class="history-device-label">
                      <span>设备名称</span>
                      <a-checkbox
                        v-model:checked="allSelectableDevicesSelected"
                        :indeterminate="deviceSelectionIndeterminate"
                        :disabled="devicesLoading || !selectableDevices.length"
                        @click.stop
                      >全选</a-checkbox>
                    </span>
                  </template>
                  <a-select v-model:value="draft.deviceIds" mode="multiple" show-search option-label-prop="label" :filter-option="filterDeviceOption" :max-tag-count="1" :loading="devicesLoading" :disabled="devicesLoading || !historyDevices.length" placeholder="请选择设备" not-found-content="当前分组下没有设备">
                    <a-select-option v-for="device in selectableDevices" :key="device.id" :value="device.id" :label="device.name">
                      <span class="history-device-option"><strong>{{ device.name }}</strong><span>{{ device.type }}</span><span>{{ device.location }}</span></span>
                    </a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="所属渠道">
                  <a-select v-model:value="draft.channel" @change="applyDeviceFilters">
                    <a-select-option v-for="channel in historyChannels" :key="channel" :value="channel">{{ channel }}</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="数据粒度">
                  <a-select v-model:value="draft.intervalSeconds">
                    <a-select-option :value="5">5秒</a-select-option><a-select-option :value="10">10秒</a-select-option><a-select-option :value="30">30秒</a-select-option><a-select-option :value="60">1分钟</a-select-option><a-select-option :value="300">5分钟</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="数据状态">
                  <a-select v-model:value="draft.status">
                    <a-select-option value="全部">全部</a-select-option><a-select-option value="在线">正常</a-select-option><a-select-option value="异常">异常</a-select-option>
                  </a-select>
                </a-form-item>
              </a-form>
            </div>

            <div class="history-filter-actions">
              <div class="history-filter-primary-actions">
                <a-button type="primary" :loading="loading" :disabled="!draft.deviceIds.length" @click="queryAndClose">查询</a-button>
                <a-button :disabled="loading" @click="resetAndClose">重置</a-button>
                <a-button :disabled="loading" @click="queryAndClose">刷新</a-button>
              </div>
              <a-button class="success history-export-button" :loading="exporting" :disabled="!canExport" @click="exportCsv">导出CSV</a-button>
              <a-button class="success history-export-button" :loading="exporting" :disabled="!canExport" @click="exportExcel">导出Excel</a-button>
              <a-button class="success history-export-button" :loading="exporting" :disabled="!canExport" @click="exportPdf">导出PDF</a-button>
            </div>
            <p v-if="error" class="query-error history-filter-feedback" role="alert">{{ error }}</p>
          </aside>

          <section class="history-results-panel history-workspace-panel">
            <div class="history-results-head">
              <div class="history-result-tabs-ribbon">
                <div class="history-result-tabs" role="tablist" aria-label="历史结果视图">
                  <button v-for="tab in resultTabs" :key="tab.key" type="button" role="tab" :aria-selected="resultTab === tab.key" :class="{ active: resultTab === tab.key }" @click="resultTab = tab.key">
                    {{ tab.label }} <span>{{ tab.key === 'table' ? historyTotal : results.length }}</span>
                  </button>
                </div>
              </div>
              <div class="history-result-summary">{{ rangeLabel }} · {{ results.length }} 台设备 · {{ resultTab === 'table' ? historyTotal : chartRowCount }} 条记录</div>
            </div>

            <CombinedHistoryChart v-if="resultTab === 'combined'" :results="results" :range-label="rangeLabel" />
            <div v-else-if="resultTab === 'devices' && results.length" class="history-chart-grid">
              <DeviceHistoryChart v-for="result in results" :key="result.device.id" :result="result" :range-label="rangeLabel" />
            </div>
            <div v-else-if="resultTab === 'devices'" class="history-empty">当前条件下没有历史数据</div>
            <div v-else class="history-table-view" role="tabpanel" aria-label="历史数据表格">
              <a-table
                class="history-ant-table"
                size="small"
                :columns="historyColumns"
                :data-source="rows"
                :loading="loading"
                :locale="historyTableLocale"
                :pagination="historyPagination"
                :scroll="{ x: 960 }"
                row-key="key"
                @change="handleHistoryTableChange"
              >
                <template #bodyCell="{ column, record }">
                  <StatusText v-if="column.key === 'state'" :value="record.state" />
                </template>
              </a-table>
            </div>
          </section>
        </div>
      </a-config-provider>
    </section>

  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { Button as AButton, Checkbox as ACheckbox, ConfigProvider as AConfigProvider, DatePicker as ADatePicker, Form as AForm, FormItem as AFormItem, Select as ASelect, SelectOption as ASelectOption, Table as ATable, theme as antTheme } from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import CombinedHistoryChart from '../components/history/CombinedHistoryChart.vue';
import DeviceHistoryChart from '../components/history/DeviceHistoryChart.vue';
import StatusText from '../components/common/StatusText.vue';
import { useHistoryQuery } from '../composables/useHistoryQuery.js';

dayjs.locale('zh-cn');

const props = defineProps({
  alarmContext: { type: Object, default: null },
  monitoringScene: { type: String, default: 'dosing' },
});
const emit = defineEmits(['alarm-context-consumed']);
const resultTab = ref('combined');
const tablePage = ref(1);
const historyQuickRange = ref('day');
const resultTabs = [{ key: 'combined', label: '综合曲线' }, { key: 'devices', label: '分设备曲线' }, { key: 'table', label: '数据表格' }];
const historyColumns = [
  { title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 180 },
  { title: '设备类型', dataIndex: 'type', key: 'type', width: 110 },
  { title: '设备名称', dataIndex: 'name', key: 'name', width: 170 },
  { title: '所属渠道', dataIndex: 'location', key: 'location', width: 130 },
  { title: '数据项', dataIndex: 'metric', key: 'metric', width: 130 },
  { title: '数值', dataIndex: 'value', key: 'value', width: 110 },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 80 },
  { title: '状态', dataIndex: 'state', key: 'state', width: 90 },
];
const historyTableLocale = { emptyText: '当前条件下没有历史数据' };
const { applyDeviceFilters, canExport, chartRowCount, clearDevices, devicesLoading, draft, error, exportCsv, exportExcel, exportPdf, exporting, historyChannels, historyDevices, historyDeviceTypes, historyTotal, initialize, loading, rangeLabel, resetQuery, results, rows, runQuery, selectAllDevices, selectableDevices } = useHistoryQuery(props.monitoringScene);
const selectedSelectableDeviceCount = computed(() => {
  const selectedIds = new Set(draft.value.deviceIds);
  return selectableDevices.value.filter((device) => selectedIds.has(device.id)).length;
});
const allSelectableDevicesSelected = computed({
  get: () => selectableDevices.value.length > 0
    && selectedSelectableDeviceCount.value === selectableDevices.value.length,
  set: (checked) => { if (checked) selectAllDevices(); else clearDevices(); },
});
const deviceSelectionIndeterminate = computed(() => selectedSelectableDeviceCount.value > 0
  && selectedSelectableDeviceCount.value < selectableDevices.value.length);
const historyPagination = computed(() => ({
  current: tablePage.value,
  pageSize: 50,
  total: historyTotal.value,
  showSizeChanger: false,
  showQuickJumper: historyTotal.value > 50,
  showTotal: (total) => `共 ${total} 条`,
}));
const historyTheme = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    colorPrimary: '#269cff',
    colorBgBase: '#010f1e',
    colorBgContainer: '#061a2d',
    colorBorder: '#315a80',
    colorText: '#eff7ff',
    colorTextPlaceholder: '#7895b2',
    borderRadius: 5,
    controlHeight: 32,
    fontSize: 13,
  },
};
const startTimeValue = computed({
  get: () => draft.value.start ? dayjs(draft.value.start) : null,
  set: (value) => {
    draft.value.start = value ? value.format('YYYY-MM-DDTHH:mm:ss') : '';
    historyQuickRange.value = '';
  },
});
const endTimeValue = computed({
  get: () => draft.value.end ? dayjs(draft.value.end) : null,
  set: (value) => {
    draft.value.end = value ? value.format('YYYY-MM-DDTHH:mm:ss') : '';
    historyQuickRange.value = '';
  },
});
async function queryAndClose() { tablePage.value = 1; await runQuery(); }
async function resetAndClose() { historyQuickRange.value = 'day'; tablePage.value = 1; await resetQuery(); }
async function queryQuickRange(range) {
  const now = dayjs();
  const unit = range === 'week' ? 'week' : range === 'month' ? 'month' : 'day';
  draft.value.start = now.startOf(unit).format('YYYY-MM-DDTHH:mm:ss');
  draft.value.end = now.endOf(unit).format('YYYY-MM-DDTHH:mm:ss');
  historyQuickRange.value = range;
  await queryAndClose();
}
function handleHistoryTableChange(pagination) { tablePage.value = pagination.current || 1; }
function filterDeviceOption(input, option) {
  const device = selectableDevices.value.find((item) => item.id === option.value);
  return device ? `${device.id} ${device.name} ${device.type} ${device.location}`.toLocaleLowerCase('zh-CN').includes(input.toLocaleLowerCase('zh-CN')) : false;
}

onMounted(async () => {
  const alarmContext = props.alarmContext ? { ...props.alarmContext } : null;
  if (alarmContext) {
    resultTab.value = 'combined';
  }
  await initialize(alarmContext);
  if (alarmContext) emit('alarm-context-consumed');
});
</script>

<style scoped>
.history-page {
  gap: 0;
  overflow: hidden;
}

.history-analysis-tab {
  min-height: 0;
  padding: 0;
}

.history-analysis-layout {
  display: grid;
  width: 100%;
  min-height: 0;
  flex: 1;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 16px;
}

.history-filter-panel,
.history-workspace-panel {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(48, 145, 224, 0.28);
  border-radius: 8px;
  background: rgba(3, 30, 58, 0.58);
  box-shadow: inset 0 0 28px rgba(13, 118, 196, 0.08);
}

.history-filter-panel::before {
  position: absolute;
  z-index: 1;
  top: -30px;
  right: 0;
  left: 0;
  height: 30px;
  pointer-events: none;
  background: url('../assets/panel-glow-placeholder.png') top center / 100% 30px no-repeat;
  content: '';
  opacity: 0.9;
}

.history-filter-panel {
  display: flex;
  flex-direction: column;
  padding: 14px 16px 12px;
  overflow: visible;
  border-top-left-radius: 0;
}

.history-filter-corner-mark {
  position: absolute;
  z-index: 2;
  top: -1px;
  left: -1px;
  display: grid;
  width: 14px;
  height: 14px;
  grid-template-columns: 2px 1fr;
  grid-template-rows: 2px 1fr;
}

.history-filter-corner-line {
  display: block;
  background: #6ed9f7;
  box-shadow: 0 0 6px rgba(110, 217, 247, 0.65);
}

.history-filter-corner-line--horizontal {
  grid-column: 1 / -1;
  grid-row: 1;
}

.history-filter-corner-line--vertical {
  grid-column: 1;
  grid-row: 1 / -1;
}

.history-filter-arrow {
  position: absolute;
  z-index: 2;
  top: -1px;
  right: 12px;
  width: 27px;
  height: 48px;
  pointer-events: none;
  background: url('../assets/panel-arrow-placeholder.png') center / contain no-repeat;
  filter: drop-shadow(0 0 6px rgba(110, 217, 247, 0.45));
  transform: rotate(90deg);
  transform-origin: center;
}

.history-filter-scroll {
  min-height: 0;
  flex: 1 1 auto;
  padding-top: 3px;
  overflow-y: auto;
  scrollbar-color: rgba(47, 155, 225, 0.55) transparent;
  scrollbar-width: thin;
}

:deep(.history-filter-form .ant-form-item) {
  margin-bottom: 8px;
}

:deep(.history-filter-form .ant-form-item-label) {
  padding: 0 0 3px;
}

:deep(.history-filter-form .ant-form-item-label > label) {
  height: auto;
  color: #a9c0d7;
  font-size: 11px;
  line-height: 17px;
}

.history-device-label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.history-quick-range-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.history-quick-range-options :deep(.ant-btn) {
  min-width: 0;
  padding-inline: 4px;
}

.history-device-label :deep(.ant-checkbox-wrapper) {
  color: #a9c0d7;
  font-size: 11px;
}

:deep(.history-filter-form .ant-picker),
:deep(.history-filter-form .ant-select) {
  width: 100%;
}

:deep(.history-filter-form .ant-picker),
:deep(.history-filter-form .ant-select-selector) {
  min-height: 30px;
  border-color: rgba(31, 139, 218, 0.42) !important;
  background: rgba(2, 34, 66, 0.82) !important;
}

:deep(.history-filter-form .ant-select-selection-overflow) {
  flex-wrap: nowrap;
  overflow: hidden;
}

.history-filter-actions {
  display: grid;
  flex: 0 0 auto;
  gap: 9px;
  padding-top: 8px;
}

.history-filter-primary-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.history-filter-actions :deep(.ant-btn) {
  position: relative;
  width: 100%;
  min-width: 0;
  padding-inline: 5px;
  overflow: hidden;
}

.history-filter-primary-actions :deep(.ant-btn-loading-icon) {
  position: absolute;
  left: 5px;
  margin-inline-end: 0;
  font-size: 12px;
}

.history-export-button {
  border-color: rgba(45, 168, 234, 0.62);
  background: linear-gradient(180deg, rgba(37, 139, 202, 0.96), rgba(21, 91, 150, 0.96));
}

.history-filter-feedback {
  flex: 0 0 auto;
  margin: 8px 0 0;
  font-size: 11px;
}

.history-workspace-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.history-results-head {
  z-index: 2;
  display: block;
  flex: 0 0 auto;
  min-height: 0;
  padding: 0;
  border: 0;
}

.history-result-tabs-ribbon {
  min-height: 42px;
  padding: 0 12px;
  background-color: rgba(21, 115, 171, 0.9);
  background-image:
    linear-gradient(90deg, rgba(18, 92, 151, 0.96), rgba(28, 132, 187, 0.62)),
    url('../assets/tabs-bg.png');
  background-repeat: no-repeat;
  background-position: center, right center;
  background-size: 100% 100%, 72% 100%;
}

.history-result-tabs {
  display: flex;
  height: 42px;
  align-items: stretch;
  gap: 0;
}

.history-result-tabs button {
  min-width: 160px;
  height: 42px;
  padding: 0 28px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: #d2e7f6;
  font-size: 12px;
}

.history-result-tabs button:hover {
  border: 0;
  background: rgba(4, 63, 111, 0.3);
  box-shadow: none;
}

.history-result-tabs button.active {
  border: 0;
  background: rgba(4, 55, 99, 0.9);
  box-shadow: none;
  color: #fff;
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 100%, 0 100%);
}

.history-result-tabs button.active:not(:first-child) {
  clip-path: polygon(18px 0, calc(100% - 18px) 0, 100% 100%, 0 100%);
}

.history-result-tabs button span {
  display: inline-grid;
  min-width: 20px;
  height: 20px;
  margin-left: 5px;
  padding: 0 5px;
  place-items: center;
  border-radius: 50%;
  background: #eef8ff;
  color: #315b7d;
  font-size: 11px;
  line-height: 1;
}

.history-result-tabs button.active span {
  background: #fff;
  color: #174568;
}

.history-result-summary {
  min-height: 36px;
  margin: 10px 18px 0;
  padding: 9px 14px;
  background: rgba(9, 54, 96, 0.5);
  color: #88a8c5;
  font-size: 11px;
}

.history-workspace-panel :deep(.combined-history-chart) {
  padding: 8px 18px 12px;
}

.history-workspace-panel :deep(.combined-chart-head) {
  border-color: rgba(50, 139, 211, 0.22);
  background: rgba(2, 28, 53, 0.42);
}

.history-workspace-panel :deep(.combined-chart-canvas) {
  min-height: 320px;
  flex-basis: 320px;
  border-color: rgba(50, 139, 211, 0.22);
  background: rgba(2, 28, 53, 0.42);
}

.history-workspace-panel .history-chart-grid {
  min-height: 0;
  flex: 1 1 0;
  align-content: start;
  grid-auto-rows: 348px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 12px 18px;
  overflow-y: auto;
}

.history-workspace-panel .history-table-view {
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.history-workspace-panel .history-ant-table {
  padding: 12px 18px;
}

@media (max-width: 1100px) {
  .history-analysis-layout { grid-template-columns: 190px minmax(0, 1fr); gap: 10px; }
  .history-result-tabs button { min-width: 140px; padding-inline: 24px; }
}

@media (max-width: 900px) {
  .history-page { overflow-y: auto; }
  .history-analysis-tab { overflow: visible; }
  .history-analysis-layout { grid-template-columns: 1fr; overflow: visible; }
  .history-filter-panel { overflow: visible; }
  .history-filter-scroll { overflow: visible; }
  :deep(.history-filter-form) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }
  .history-workspace-panel { min-height: 620px; }
}

@media (max-width: 640px) {
  .history-page { padding-inline: 6px; }
  :deep(.history-filter-form) { grid-template-columns: 1fr; }
  .history-result-tabs-ribbon { padding: 0 4px; }
  .history-result-tabs button { min-width: 0; flex: 1; padding-inline: 5px; }
  .history-result-tabs button span { display: none; }
  .history-workspace-panel .history-chart-grid { grid-template-columns: 1fr; }
}
</style>
