<template>
  <section class="page page-history active">
    <div class="sub-tabs">
      <button :class="{ active: activeTab === 'analysis' }" @click="showTab('analysis')">历史数据查询与曲线分析</button>
      <button :class="{ active: activeTab === 'replay' }" @click="showTab('replay')">传感器时序总览与节点水位回放</button>
    </div>

    <section v-show="activeTab === 'analysis'" class="history-tab active">
      <section class="panel history-query">
        <div class="history-query-fields">
          <label class="query-field">开始时间<input v-model="draft.start" type="datetime-local"></label>
          <label class="query-field">结束时间<input v-model="draft.end" type="datetime-local"></label>
          <div ref="devicePicker" class="query-field device-picker-field">
            <span>设备选择</span>
            <button type="button" class="device-picker-trigger" aria-controls="history-device-options" :aria-expanded="pickerOpen" @click="pickerOpen = !pickerOpen">
              <span>已选 {{ draft.deviceIds.length }} 台设备</span><b>{{ pickerOpen ? '收起' : '展开' }}</b>
            </button>
            <div v-if="pickerOpen" id="history-device-options" class="device-picker-menu">
              <div class="device-picker-tools">
                <input v-model.trim="deviceSearch" type="search" placeholder="搜索编号、类型或位置" aria-label="搜索设备">
                <button type="button" @click="selectAllDevices">全选</button><button type="button" @click="clearDevices">清空</button>
              </div>
              <div class="device-option-list">
                <label v-for="device in filteredDevices" :key="device.id" class="device-option">
                  <input type="checkbox" :checked="draft.deviceIds.includes(device.id)" @change="toggleDevice(device.id)">
                  <strong>{{ device.id }}</strong><span>{{ device.type }}</span><span>{{ device.location }}</span>
                </label>
              </div>
            </div>
          </div>
          <label class="query-field">数据粒度
            <select v-model.number="draft.intervalSeconds"><option :value="5">5 秒</option><option :value="60">1 分钟</option><option :value="300">5 分钟</option><option :value="900">15 分钟</option></select>
          </label>
          <label class="query-field">数据状态
            <select v-model="draft.status"><option>全部</option><option>在线</option><option>异常</option><option>离线</option></select>
          </label>
        </div>
        <div class="selected-device-row" aria-live="polite">
          <span class="selected-device-label">已选设备</span>
          <button v-for="device in selectedDevices" :key="device.id" type="button" class="selected-device-tag" :title="`移除 ${device.id}`" @click="toggleDevice(device.id)">
            {{ device.id }}<span>{{ device.type }} · {{ device.location }}</span><b aria-hidden="true">x</b>
          </button>
          <span v-if="!selectedDevices.length" class="selection-empty">尚未选择设备</span>
        </div>
        <div class="history-query-actions">
          <p v-if="error" class="query-error" role="alert">{{ error }}</p>
          <p v-else class="query-summary">支持综合趋势对比与分设备独立曲线，设备按水槽前后位置排列。</p>
          <button class="primary" :disabled="loading || !draft.deviceIds.length" @click="queryAndClose">{{ loading ? '正在查询...' : '查询' }}</button>
          <button :disabled="loading" @click="resetAndClose">重置</button><button :disabled="loading" @click="queryAndClose">刷新</button>
          <button class="success" :disabled="!canExport" @click="exportCsv">导出CSV</button>
        </div>
      </section>

      <section class="panel history-results-panel">
        <div class="history-results-head">
          <div class="history-result-tabs" role="tablist" aria-label="历史结果视图">
            <button v-for="tab in resultTabs" :key="tab.key" type="button" role="tab" :aria-selected="resultTab === tab.key" :class="{ active: resultTab === tab.key }" @click="resultTab = tab.key">
              {{ tab.label }} <span>{{ tab.key === 'table' ? rows.length : results.length }}</span>
            </button>
          </div>
          <div class="history-result-summary">{{ rangeLabel }} · {{ results.length }} 台设备 · {{ rows.length }} 条记录</div>
        </div>
        <CombinedHistoryChart v-if="resultTab === 'combined'" :results="results" :range-label="rangeLabel" />
        <div v-else-if="resultTab === 'devices' && results.length" class="history-chart-grid">
          <DeviceHistoryChart v-for="result in results" :key="result.device.id" :result="result" :range-label="rangeLabel" />
        </div>
        <div v-else-if="resultTab === 'devices'" class="history-empty">当前条件下没有历史数据</div>
        <div v-else class="history-table-view" role="tabpanel" aria-label="历史数据表格">
          <div class="history-table-scroll"><table class="data-table">
            <thead><tr><th>时间</th><th>设备类型</th><th>设备名称</th><th>所属渠道</th><th>数据项</th><th>数值</th><th>单位</th><th>状态</th></tr></thead>
            <tbody>
              <tr v-for="row in visibleRows" :key="`${row.timestampValue}-${row.name}`"><td>{{ row.timestamp }}</td><td>{{ row.type }}</td><td>{{ row.name }}</td><td>{{ row.location }}</td><td>{{ row.metric }}</td><td>{{ row.value }}</td><td>{{ row.unit }}</td><td><StatusText :value="row.state" /></td></tr>
              <tr v-if="!rows.length"><td colspan="8" class="table-empty">当前条件下没有历史数据</td></tr>
            </tbody>
          </table></div>
          <div class="pager">共 {{ rows.length }} 条 <span>当前展示前 {{ visibleRows.length }} 条</span></div>
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
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import CombinedHistoryChart from '../components/history/CombinedHistoryChart.vue';
import DeviceHistoryChart from '../components/history/DeviceHistoryChart.vue';
import QueryField from '../components/common/QueryField.vue';
import StatusText from '../components/common/StatusText.vue';
import { useCanvasChart } from '../composables/useCanvasChart.js';
import { useHistoryQuery } from '../composables/useHistoryQuery.js';
import { REPLAY_QUERY, REPLAY_ROWS } from '../data/monitoring-data.js';
import { drawProfileChart } from '../utils/canvas-charts.js';

const activeTab = ref('analysis');
const resultTab = ref('combined');
const pickerOpen = ref(false);
const devicePicker = ref(null);
const resultTabs = [{ key: 'combined', label: '综合曲线' }, { key: 'devices', label: '分设备曲线' }, { key: 'table', label: '数据表格' }];
const { canExport, clearDevices, deviceSearch, draft, error, exportCsv, filteredDevices, loading, rangeLabel, resetQuery, results, rows, runQuery, selectAllDevices, selectedDevices, toggleDevice, visibleRows } = useHistoryQuery();
const { canvasRef: profileChart, redraw: redrawProfile } = useCanvasChart(drawProfileChart);

function showTab(tab) { activeTab.value = tab; if (tab === 'replay') nextTick(redrawProfile); }
async function queryAndClose() { if (await runQuery()) pickerOpen.value = false; }
async function resetAndClose() { await resetQuery(); pickerOpen.value = false; }
function onPointerDown(event) { if (pickerOpen.value && !devicePicker.value?.contains(event.target)) pickerOpen.value = false; }
function onKeydown(event) { if (event.key === 'Escape') pickerOpen.value = false; }

onMounted(() => { document.addEventListener('pointerdown', onPointerDown); document.addEventListener('keydown', onKeydown); });
onBeforeUnmount(() => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeydown); });
</script>
