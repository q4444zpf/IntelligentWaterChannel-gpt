<template>
  <section class="page page-history active">
    <div class="sub-tabs">
      <button :class="{ active: activeTab === 'analysis' }" @click="showTab('analysis')">历史数据查询与曲线分析</button>
      <button :class="{ active: activeTab === 'replay' }" @click="showTab('replay')">传感器时序总览与节点水位回放</button>
    </div>

    <section v-show="activeTab === 'analysis'" class="history-tab active">
      <section class="panel query-panel history-query">
        <a-config-provider :locale="zhCN" :theme="historyTheme">
          <div class="form-fields history-form-fields">
            <a-form :model="draft" layout="vertical">
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
              <a-form-item label="设备名称">
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
          <div class="form-actions history-query-actions">
            <a-button type="primary" :loading="loading" :disabled="!draft.deviceIds.length" @click="queryAndClose">查询</a-button>
            <a-button :disabled="loading" @click="resetAndClose">重置</a-button><a-button :disabled="loading" @click="queryAndClose">刷新</a-button>
            <a-button class="success" :loading="exporting" :disabled="!canExport" @click="exportCsv">导出CSV</a-button>
          </div>
          <p v-if="error" class="query-error query-feedback" role="alert">{{ error }}</p>
        </a-config-provider>
      </section>

      <section class="panel history-results-panel">
        <div class="history-results-head">
          <div class="history-result-tabs" role="tablist" aria-label="历史结果视图">
            <button v-for="tab in resultTabs" :key="tab.key" type="button" role="tab" :aria-selected="resultTab === tab.key" :class="{ active: resultTab === tab.key }" @click="resultTab = tab.key">
              {{ tab.label }} <span>{{ tab.key === 'table' ? historyTotal : results.length }}</span>
            </button>
          </div>
          <div class="history-result-summary">{{ rangeLabel }} · {{ results.length }} 台设备 · {{ resultTab === 'table' ? historyTotal : chartRowCount }} 条记录</div>
        </div>
        <CombinedHistoryChart v-if="resultTab === 'combined'" :results="results" :range-label="rangeLabel" />
        <div v-else-if="resultTab === 'devices' && results.length" class="history-chart-grid">
          <DeviceHistoryChart v-for="result in results" :key="result.device.id" :result="result" :range-label="rangeLabel" />
        </div>
        <div v-else-if="resultTab === 'devices'" class="history-empty">当前条件下没有历史数据</div>
        <div v-else class="history-table-view" role="tabpanel" aria-label="历史数据表格">
          <a-config-provider :locale="zhCN" :theme="historyTheme">
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
          </a-config-provider>
        </div>
      </section>
    </section>

    <section v-show="activeTab === 'replay'" class="history-tab active">
      <section class="panel query-panel replay-query"><QueryField v-for="field in REPLAY_QUERY" :key="field.label" :field="field" /><button class="primary">查询</button><button>重置</button><button>播放</button><button>暂停</button><button class="success">导出CSV</button></section>
      <section class="panel chart-panel large replay-card">
        <div class="panel-head"><h2>节点水位空间剖面（按渠道 / 闸门位置）</h2><div class="legend"><span>当前时刻（2026-07-08 09:30:20）</span><span>上一时刻（09:30:15）</span><span class="limit-red">上限 0.50 m</span><span class="limit-yellow">下限 0.20 m</span></div></div>
        <canvas ref="profileChart" height="330"></canvas>
      </section>
      <section class="timeline panel"><button class="primary">播放</button><button>暂停</button><button>停止</button><button class="active">1x</button><button>2x</button><button>4x</button><input type="range" value="50"><strong>当前时间：2026-07-08 09:30:20</strong></section>
      <section class="panel"><h2>传感器时序总览表</h2><table class="data-table">
        <thead><tr><th>时间</th><th>WL-01（渠① / 水位 / m）</th><th>WL-02（渠② / 水位 / m）</th><th>WL-03（渠③ / 水位 / m）</th><th>FM-01（分水口 / 流量 / L/s）</th><th>PT-01（泵出口 / 压力 / MPa）</th><th>G2（渠③ / 开度 / %）</th><th>P1（前池 / 频率 / Hz）</th></tr></thead>
        <tbody><tr v-for="(row, index) in REPLAY_ROWS" :key="row.time" :class="{ selected: index === REPLAY_ROWS.length - 1 }"><td>{{ row.time }}</td><td>{{ row.wl01 }}</td><td>{{ row.wl02 }}</td><td>{{ row.wl03 }}</td><td>{{ row.fm01 }}</td><td>{{ row.pt01 }}</td><td>{{ row.g2 }}</td><td>{{ row.p1 }}</td></tr></tbody>
      </table><div class="pager">共 12,480 条 <button>1</button><button>2</button><button>3</button><span>...</span><button>208</button><span>每页显示 50</span></div></section>
    </section>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { Button as AButton, ConfigProvider as AConfigProvider, DatePicker as ADatePicker, Form as AForm, FormItem as AFormItem, Select as ASelect, SelectOption as ASelectOption, Table as ATable, theme as antTheme } from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import CombinedHistoryChart from '../components/history/CombinedHistoryChart.vue';
import DeviceHistoryChart from '../components/history/DeviceHistoryChart.vue';
import QueryField from '../components/common/QueryField.vue';
import StatusText from '../components/common/StatusText.vue';
import { useCanvasChart } from '../composables/useCanvasChart.js';
import { useHistoryQuery } from '../composables/useHistoryQuery.js';
import { REPLAY_QUERY, REPLAY_ROWS } from '../data/monitoring-data.js';
import { drawProfileChart } from '../utils/canvas-charts.js';

dayjs.locale('zh-cn');

const activeTab = ref('analysis');
const resultTab = ref('combined');
const tablePage = ref(1);
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
const { applyDeviceFilters, canExport, chartRowCount, devicesLoading, draft, error, exportCsv, exporting, historyChannels, historyDevices, historyDeviceTypes, historyTotal, initialize, loading, rangeLabel, resetQuery, results, rows, runQuery, selectableDevices } = useHistoryQuery();
const historyPagination = computed(() => ({
  current: tablePage.value,
  pageSize: 50,
  total: historyTotal.value,
  showSizeChanger: false,
  showQuickJumper: historyTotal.value > 50,
  showTotal: (total) => `共 ${total} 条`,
}));
const { canvasRef: profileChart, redraw: redrawProfile } = useCanvasChart(drawProfileChart);
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
  set: (value) => { draft.value.start = value ? value.format('YYYY-MM-DDTHH:mm:ss') : ''; },
});
const endTimeValue = computed({
  get: () => draft.value.end ? dayjs(draft.value.end) : null,
  set: (value) => { draft.value.end = value ? value.format('YYYY-MM-DDTHH:mm:ss') : ''; },
});

function showTab(tab) { activeTab.value = tab; if (tab === 'replay') nextTick(redrawProfile); }
async function queryAndClose() { tablePage.value = 1; await runQuery(); }
async function resetAndClose() { tablePage.value = 1; await resetQuery(); }
function handleHistoryTableChange(pagination) { tablePage.value = pagination.current || 1; }
function filterDeviceOption(input, option) {
  const device = selectableDevices.value.find((item) => item.id === option.value);
  return device ? `${device.id} ${device.name} ${device.type} ${device.location}`.toLocaleLowerCase('zh-CN').includes(input.toLocaleLowerCase('zh-CN')) : false;
}

onMounted(initialize);
</script>
