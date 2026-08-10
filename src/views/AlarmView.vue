<template>
  <section class="page page-alarm active alarm-page">
    <a-config-provider :locale="zhCN" :theme="alarmTheme">
      <div class="alarm-page-layout">
        <aside class="alarm-filter-panel" aria-label="报警查询条件">
          <span class="alarm-filter-corner-mark" aria-hidden="true">
            <span class="alarm-filter-corner-line alarm-filter-corner-line--horizontal"></span>
            <span class="alarm-filter-corner-line alarm-filter-corner-line--vertical"></span>
          </span>
          <span class="alarm-filter-arrow" aria-hidden="true"></span>

          <div class="alarm-filter-scroll">
            <a-form class="alarm-filter-form" :model="draft" layout="vertical">
              <a-form-item label="开始时间">
                <a-date-picker v-model:value="startTimeValue" show-time format="YYYY-MM-DD HH:mm:ss" :allow-clear="false" />
              </a-form-item>
              <a-form-item label="结束时间">
                <a-date-picker v-model:value="endTimeValue" show-time format="YYYY-MM-DD HH:mm:ss" :allow-clear="false" />
              </a-form-item>
              <a-form-item label="报警类型">
                <a-input v-model:value="draft.warnConfigName" allow-clear placeholder="请输入报警类型" />
              </a-form-item>
              <a-form-item label="报警等级">
                <a-select v-model:value="draft.grade">
                  <a-select-option value="">全部</a-select-option>
                  <a-select-option v-for="grade in alarmGrades" :key="grade.value" :value="grade.value">{{ grade.label }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="报警信息">
                <a-input v-model:value="draft.content" allow-clear placeholder="请输入报警信息关键字" />
              </a-form-item>
              <a-form-item label="设备类型">
                <a-select v-model:value="draft.deviceType" :loading="devicesLoading">
                  <a-select-option v-for="type in deviceTypes" :key="type" :value="type">{{ type }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="设备名称">
                <a-input v-model:value="draft.deviceName" allow-clear placeholder="请输入设备名称" />
              </a-form-item>
              <a-form-item label="处理状态">
                <a-select v-model:value="draft.handlingStatus">
                  <a-select-option value="">全部</a-select-option>
                  <a-select-option :value="0">未处理</a-select-option>
                  <a-select-option :value="1">已处理</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="所属渠道">
                <a-select v-model:value="draft.channel" :loading="devicesLoading">
                  <a-select-option v-for="channel in channels" :key="channel" :value="channel">{{ channel }}</a-select-option>
                </a-select>
              </a-form-item>
            </a-form>
          </div>

          <div class="alarm-filter-actions">
            <div class="alarm-filter-primary-actions">
              <a-button type="primary" :loading="loading" @click="runQuery">查询</a-button>
              <a-button :disabled="loading" @click="resetQuery">重置</a-button>
              <a-button :disabled="loading" @click="refresh">刷新</a-button>
            </div>
            <a-button class="success alarm-export-button" :loading="exporting" :disabled="!canExport" @click="exportCsv">导出CSV</a-button>
          </div>
          <p v-if="error" class="query-error alarm-filter-feedback" role="alert">{{ error }}</p>
        </aside>

        <main class="alarm-main">
          <section class="alarm-stat-grid" aria-label="告警统计">
            <article v-for="stat in alarmStats" :key="stat.key" class="alarm-stat-card">
              <div class="alarm-stat-label">
                <AlarmStatIcon :kind="stat.icon" />
                <span>{{ stat.label }}</span>
              </div>
              <strong class="alarm-stat-value" :class="`alarm-stat-value--${stat.tone}`">{{ stat.value }}</strong>
            </article>
          </section>

          <section class="alarm-results-panel">
            <div class="alarm-results-head">
              <h2>报警列表</h2>
              <span>共 {{ total }} 条告警</span>
            </div>
            <a-table
              class="history-ant-table alarm-ant-table"
              size="small"
              :columns="alarmColumns"
              :data-source="rows"
              :loading="loading"
              :locale="alarmTableLocale"
              :pagination="alarmPagination"
              :scroll="{
                x: 1360,
                y: 'clamp(260px, calc(100dvh - 400px), 650px)',
                scrollToFirstRowOnChange: true,
              }"
              row-key="key"
              @change="handleTableChange"
            >
              <template #bodyCell="{ column, record }">
                <a-tag v-if="column.key === 'gradeName'" :color="gradeColor(record.grade)">{{ record.gradeName }}</a-tag>
                <span v-else-if="column.key === 'handlingStatus'" class="alarm-handling-status">
                  <StatusText :value="record.handlingStatus === 1 ? '正常' : '异常'" />
                  {{ record.handled }}
                </span>
                <span v-else-if="column.key === 'action'" class="alarm-table-actions">
                  <a-button type="link" size="small" @click="emit('open-alarm', record)">{{ record.handlingStatus === 1 ? '详情' : '处理' }}</a-button>
                  <a-button type="link" size="small" @click="locateAlarm(record)">定位</a-button>
                  <a-button type="link" size="small" @click="emit('view-history', record)">曲线</a-button>
                </span>
              </template>
            </a-table>
          </section>
        </main>
      </div>
    </a-config-provider>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import {
  Button as AButton,
  ConfigProvider as AConfigProvider,
  DatePicker as ADatePicker,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  Select as ASelect,
  SelectOption as ASelectOption,
  Table as ATable,
  Tag as ATag,
  theme as antTheme,
} from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import AlarmStatIcon from '../components/alarm/AlarmStatIcon.vue';
import StatusText from '../components/common/StatusText.vue';
import { useAlarmQuery } from '../composables/useAlarmQuery.js';

dayjs.locale('zh-cn');

const emit = defineEmits(['navigate', 'open-alarm', 'view-history']);
const alarmGrades = [
  { value: 'fatal', label: '严重' },
  { value: 'urgent', label: '紧急' },
  { value: 'warn', label: '告警' },
  { value: 'notice', label: '通知' },
  { value: 'normal', label: '解除' },
  { value: 'status', label: '状态' },
];
const alarmColumns = [
  { title: '报警时间', dataIndex: 'warnTime', key: 'warnTime', width: 180, fixed: 'left' },
  { title: '设备名称', dataIndex: 'deviceName', key: 'deviceName', width: 150 },
  { title: '设备类型', dataIndex: 'deviceType', key: 'deviceType', width: 100 },
  { title: '所属渠道', dataIndex: 'location', key: 'location', width: 120 },
  { title: '报警类型', dataIndex: 'warnConfigName', key: 'warnConfigName', width: 150 },
  { title: '报警信息', dataIndex: 'content', key: 'content', width: 280, ellipsis: true },
  { title: '报警等级', dataIndex: 'gradeName', key: 'gradeName', width: 100 },
  { title: '处理状态', dataIndex: 'handlingStatus', key: 'handlingStatus', width: 110 },
  { title: '操作', key: 'action', width: 160, fixed: 'right' },
];
const alarmTableLocale = { emptyText: '当前条件下没有告警记录' };
const alarmTheme = {
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
const {
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
} = useAlarmQuery();
const alarmStats = computed(() => [
  { key: 'total', label: '报警总数', value: statistics.value.total, icon: 'total', tone: 'cyan' },
  { key: 'unhandled', label: '未处理', value: statistics.value.unhandled, icon: 'unhandled', tone: 'orange' },
  { key: 'handled', label: '已处理', value: statistics.value.handled, icon: 'handled', tone: 'green' },
  { key: 'fatal', label: '严重警告', value: statistics.value.fatal, icon: 'fatal', tone: 'red' },
  { key: 'offline', label: '设备离线', value: statistics.value.offline, icon: 'offline', tone: 'yellow' },
  { key: 'water', label: '水位超限', value: statistics.value.waterLevel, icon: 'water', tone: 'cyan' },
  { key: 'gate', label: '闸门异常', value: statistics.value.gate, icon: 'gate', tone: 'pink' },
]);
const alarmPagination = computed(() => ({
  current: current.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  pageSizeOptions: ['20', '50', '100'],
  showQuickJumper: total.value > pageSize.value,
  showTotal: (value) => `共 ${value} 条`,
}));
const startTimeValue = computed({
  get: () => draft.value.start ? dayjs(draft.value.start) : null,
  set: (value) => { draft.value.start = value ? value.format('YYYY-MM-DDTHH:mm:ss') : ''; },
});
const endTimeValue = computed({
  get: () => draft.value.end ? dayjs(draft.value.end) : null,
  set: (value) => { draft.value.end = value ? value.format('YYYY-MM-DDTHH:mm:ss') : ''; },
});

function handleTableChange(pagination) {
  void changePage(pagination.current || 1, pagination.pageSize || pageSize.value);
}

function gradeColor(grade) {
  return {
    fatal: 'red',
    urgent: 'volcano',
    warn: 'orange',
    notice: 'blue',
    normal: 'green',
    status: 'cyan',
  }[grade] || 'default';
}

function locateAlarm(record) {
  const channelName = typeof record?.location === 'string' ? record.location.trim() : '';
  emit('navigate', 'realtime', channelName && channelName !== '--' ? { channelName } : undefined);
}

onMounted(initialize);
defineExpose({ refresh });
</script>

<style scoped>
@font-face {
  font-family: 'YouSheTitle';
  src: url('../assets/优设标题黑.ttf') format('truetype');
  font-display: swap;
}

.alarm-page {
  gap: 0;
  padding-top: 10px;
  overflow: hidden;
}

.alarm-page-layout {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 16px;
}

.alarm-filter-panel {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  padding: 14px 16px 12px;
  overflow: visible;
  border: 1px solid rgba(48, 145, 224, 0.35);
  border-radius: 0 8px 8px 8px;
  background: rgba(3, 30, 58, 0.58);
  box-shadow: inset 0 0 28px rgba(13, 118, 196, 0.08);
}

.alarm-filter-panel::before {
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

.alarm-filter-corner-mark {
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

.alarm-filter-corner-line {
  display: block;
  background: #6ed9f7;
  box-shadow: 0 0 6px rgba(110, 217, 247, 0.65);
}

.alarm-filter-corner-line--horizontal {
  grid-column: 1 / -1;
  grid-row: 1;
}

.alarm-filter-corner-line--vertical {
  grid-column: 1;
  grid-row: 1 / -1;
}

.alarm-filter-arrow {
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

.alarm-filter-scroll {
  min-height: 0;
  flex: 1 1 auto;
  padding-top: 3px;
  overflow-y: auto;
  scrollbar-color: rgba(47, 155, 225, 0.55) transparent;
  scrollbar-width: thin;
}

:deep(.alarm-filter-form .ant-form-item) {
  margin-bottom: 8px;
}

:deep(.alarm-filter-form .ant-form-item-label) {
  padding: 0 0 3px;
}

:deep(.alarm-filter-form .ant-form-item-label > label) {
  height: auto;
  color: #a9c0d7;
  font-size: 11px;
  line-height: 17px;
}

:deep(.alarm-filter-form .ant-picker),
:deep(.alarm-filter-form .ant-select),
:deep(.alarm-filter-form .ant-input-affix-wrapper) {
  width: 100%;
}

:deep(.alarm-filter-form .ant-picker),
:deep(.alarm-filter-form .ant-select-selector),
:deep(.alarm-filter-form .ant-input-affix-wrapper) {
  min-height: 30px;
  border-color: rgba(31, 139, 218, 0.42) !important;
  background: rgba(2, 34, 66, 0.82) !important;
}

.alarm-filter-actions {
  display: grid;
  flex: 0 0 auto;
  gap: 9px;
  padding-top: 8px;
}

.alarm-filter-primary-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.alarm-filter-actions :deep(.ant-btn) {
  width: 100%;
  min-width: 0;
  padding-inline: 5px;
}

.alarm-export-button {
  border-color: rgba(45, 168, 234, 0.62);
  background: linear-gradient(180deg, rgba(37, 139, 202, 0.96), rgba(21, 91, 150, 0.96));
}

.alarm-filter-feedback {
  flex: 0 0 auto;
  margin: 8px 0 0;
  font-size: 11px;
}

.alarm-main {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.alarm-stat-grid {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.alarm-stat-card {
  position: relative;
  isolation: isolate;
  display: flex;
  height: 96px;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 16px 12px 13px;
  overflow: hidden;
  background: url('../assets/alarm-card.png') center / 100% 100% no-repeat;
}

.alarm-stat-card::before {
  position: absolute;
  z-index: -1;
  inset: 20px 12%;
  background: rgba(3, 34, 66, 0.55);
  content: '';
}

.alarm-stat-label {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #dcecff;
  font-size: 13px;
  line-height: 28px;
  white-space: nowrap;
}

.alarm-stat-value,
.alarm-results-head h2 {
  font-family: 'YouSheTitle', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-weight: normal;
  letter-spacing: 0;
}

.alarm-stat-value {
  display: block;
  overflow: hidden;
  font-size: 28px;
  line-height: 30px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-stat-value--cyan {
  color: #05fcfd;
  text-shadow: 0 0 10px rgba(5, 252, 253, 0.42);
}

.alarm-stat-value--orange {
  color: #ff7132;
  text-shadow: 0 0 10px rgba(226, 71, 14, 0.44);
}

.alarm-stat-value--green {
  color: #31de6d;
  text-shadow: 0 0 10px rgba(49, 222, 109, 0.42);
}

.alarm-stat-value--red {
  color: #ff5454;
  text-shadow: 0 0 10px rgba(211, 47, 47, 0.46);
}

.alarm-stat-value--yellow {
  color: #e4ce23;
  text-shadow: 0 0 10px rgba(228, 206, 35, 0.42);
}

.alarm-stat-value--pink {
  color: #ff4f76;
  text-shadow: 0 0 10px rgba(255, 79, 118, 0.44);
}

.alarm-results-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.alarm-results-head {
  display: flex;
  min-height: 38px;
  flex: 0 0 38px;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
}

.alarm-results-head h2 {
  margin: 0;
  color: #f2f8ff;
  font-size: 24px;
  line-height: 38px;
}

.alarm-results-head > span {
  color: #d3e2ee;
  font-size: 12px;
}

.alarm-ant-table {
  min-height: 0;
  flex: 1;
  padding: 0;
  overflow: hidden;
}

:deep(.alarm-ant-table .ant-table-body) {
  scrollbar-color: rgba(47, 155, 225, 0.55) transparent;
  scrollbar-width: thin;
}

:deep(.alarm-ant-table .ant-table),
:deep(.alarm-ant-table .ant-table-container) {
  border: 0;
  border-radius: 0;
  background: transparent;
}

:deep(.alarm-ant-table .ant-table-thead > tr > th) {
  padding: 9px 12px;
  border: 0;
  background: rgba(22, 103, 157, 0.96);
  color: #ecf8ff;
  font-size: 12px;
}

:deep(.alarm-ant-table .ant-table-tbody > tr > td) {
  padding: 8px 12px;
  border: 0;
  background: rgba(32, 101, 150, 0.2);
  color: #c9dbea;
  font-size: 12px;
}

:deep(.alarm-ant-table .ant-table-tbody > tr:nth-child(even) > td) {
  background: transparent;
}

:deep(.alarm-ant-table .ant-table-tbody > tr:hover > td) {
  background: rgba(27, 104, 158, 0.76) !important;
}

:deep(.alarm-ant-table .ant-pagination) {
  margin: 12px 4px 0;
}

.alarm-handling-status,
.alarm-table-actions {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.alarm-handling-status {
  gap: 5px;
}

.alarm-table-actions {
  gap: 5px;
}

.alarm-table-actions :deep(.ant-btn-link) {
  height: 24px;
  padding: 0 7px;
  border: 1px solid rgba(0, 229, 255, 0.68);
  border-radius: 2px;
  color: #00e5ff;
  line-height: 22px;
}

.alarm-table-actions :deep(.ant-btn-link:hover) {
  border-color: #70f4ff;
  background: rgba(0, 229, 255, 0.1);
  color: #70f4ff;
}

@media (max-width: 1300px) {
  .alarm-page-layout { grid-template-columns: 190px minmax(0, 1fr); gap: 10px; }
  .alarm-stat-grid { gap: 6px; }
  .alarm-stat-card { padding-inline: 7px; }
  .alarm-stat-label { gap: 4px; font-size: 12px; }
  .alarm-stat-value { font-size: 25px; }
}

@media (max-width: 900px) {
  .alarm-page { overflow-y: auto; }
  .alarm-page-layout { grid-template-columns: 1fr; overflow: visible; }
  .alarm-filter-panel { overflow: visible; }
  .alarm-filter-scroll { overflow: visible; }
  :deep(.alarm-filter-form) { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 12px; }
  .alarm-main { overflow: visible; }
  .alarm-stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .alarm-results-panel { min-height: 620px; }
}

@media (max-width: 640px) {
  .alarm-page { padding-inline: 6px; }
  :deep(.alarm-filter-form) { grid-template-columns: 1fr; }
  .alarm-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .alarm-stat-card { height: 90px; }
  .alarm-results-head { align-items: flex-start; flex-direction: column; height: auto; padding-block: 6px; }
}
</style>
