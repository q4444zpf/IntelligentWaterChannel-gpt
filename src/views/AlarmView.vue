<template>
  <section class="page page-alarm active">
    <a-config-provider :locale="zhCN" :theme="alarmTheme">
      <section class="panel query-panel history-query alarm-query">
        <div class="form-fields history-form-fields alarm-form-fields">
          <a-form :model="draft" layout="vertical">
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
        <div class="form-actions history-query-actions">
          <a-button type="primary" :loading="loading" @click="runQuery">查询</a-button>
          <a-button :disabled="loading" @click="resetQuery">重置</a-button>
          <a-button :disabled="loading" @click="refresh">刷新</a-button>
          <a-button class="success" :loading="exporting" :disabled="!canExport" @click="exportCsv">导出报警CSV</a-button>
        </div>
        <p v-if="error" class="query-error query-feedback" role="alert">{{ error }}</p>
      </section>

      <section class="stat-grid" aria-label="告警统计">
        <div v-for="stat in alarmStats" :key="stat.label" class="stat-card" :class="stat.level">
          {{ stat.label }}<strong>{{ stat.value }}</strong><span>条</span>
        </div>
      </section>

      <section class="panel alarm-results-panel">
        <div class="panel-head alarm-results-head">
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
          :scroll="{ x: 1360 }"
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
              <a-button type="link" size="small" @click="emit('open-alarm', record)">处理</a-button>
              <a-button type="link" size="small" @click="emit('navigate', 'realtime')">定位</a-button>
              <a-button type="link" size="small" @click="emit('navigate', 'history')">曲线</a-button>
            </span>
          </template>
        </a-table>
      </section>
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
import StatusText from '../components/common/StatusText.vue';
import { useAlarmQuery } from '../composables/useAlarmQuery.js';

dayjs.locale('zh-cn');

const emit = defineEmits(['navigate', 'open-alarm']);
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
  { label: '报警总数', value: statistics.value.total },
  { label: '未处理', value: statistics.value.unhandled, level: 'red' },
  { label: '已处理', value: statistics.value.handled, level: 'green' },
  { label: '严重报警', value: statistics.value.fatal, level: 'red' },
  { label: '设备离线', value: statistics.value.offline },
  { label: '水位超限', value: statistics.value.waterLevel, level: 'orange' },
  { label: '闸门异常', value: statistics.value.gate, level: 'orange' },
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

onMounted(initialize);
</script>
