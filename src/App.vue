<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark"></span>智能水槽三维实时监控系统</div>
      <nav class="main-tabs" aria-label="主导航">
        <button
          v-for="tab in pageTabs"
          :key="tab.key"
          class="nav-tab"
          :class="{ active: activePage === tab.key }"
          @click="showPage(tab.key)"
        >
          {{ tab.label }} <span v-if="tab.badge" class="badge">{{ tab.badge }}</span>
        </button>
      </nav>
      <div class="meta">工况：明满流混合实验</div>
      <div class="meta">实验编号：EXP-20260708-001</div>
      <div class="meta">模式：手动控制</div>
      <div class="status-strip">
        <span class="status ok">PLC 在线</span>
        <span class="status ok">WebSocket 已连接</span>
        <span class="status ok">数据库 正常</span>
      </div>
      <time class="clock">09:35:21</time>
    </header>

    <main>
      <section v-show="activePage === 'realtime'" class="page page-realtime active">
        <aside class="left-stack">
          <section class="panel gate-panel">
            <h2>闸门实时状态</h2>
            <table class="data-table compact">
              <thead><tr><th>设备</th><th>开度</th><th>闸前(m)</th><th>闸后(m)</th><th>状态</th></tr></thead>
              <tbody>
                <tr v-for="gate in gates" :key="gate.id">
                  <td><span class="device-chip" :class="`chip-${gate.color}`">{{ gate.id }}</span></td>
                  <td>{{ gate.open }}</td>
                  <td>{{ gate.before }}</td>
                  <td>{{ gate.after }}</td>
                  <td><StatusText :value="gate.state" /></td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="panel sensor-panel">
            <h2>传感器实时状态</h2>
            <div v-for="group in sensorGroups" :key="group.name" class="sensor-section">
              <div class="sensor-title">{{ group.name }}</div>
              <table class="data-table compact">
                <tbody>
                  <tr v-for="row in group.rows" :key="row.name">
                    <td>{{ row.name }}</td>
                    <td>{{ row.location }}</td>
                    <td>{{ row.value }}</td>
                    <td>{{ row.unit }}</td>
                    <td><StatusText :value="row.state" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </aside>

        <section class="center-stack">
          <section class="panel twin-panel">
            <div class="panel-head">
              <h2>三维水槽工艺监控</h2>
              <div class="mini-actions">
                <button v-for="action in viewActions" :key="action">{{ action }}</button>
              </div>
            </div>
            <div class="twin-stage">
              <img src="/智能水槽系统设计图与说明/00_原始三维水槽工艺图.png" alt="智能水槽三维工艺图">
              <span class="flow-arrow a1"></span><span class="flow-arrow a2"></span><span class="flow-arrow a3"></span>
              <div class="float-tag t1">渠①水位<br><b>0.40 m</b></div>
              <div class="float-tag t2">G2 <span class="dot ok"></span><br>闸前 0.38 m<br>闸后 0.35 m<br>开度 42%</div>
              <div class="float-tag t3">FM-01 流量计<br><b>18.2 L/s</b></div>
              <div class="float-tag t4">渠⑥水位<br><b>0.32 m</b></div>
              <div class="float-tag t5">P1 运行中 <span class="dot ok"></span><br>频率 32 Hz<br>压力 0.23 MPa</div>
              <div class="float-tag alarm t6">G6 闸门异常<br><b>反馈超时</b></div>
            </div>
          </section>

          <section class="panel chart-panel">
            <div class="panel-head">
              <h2>实时趋势分析</h2>
              <div class="tabs small-tabs">
                <button v-for="(tab, index) in realtimeChartTabs" :key="tab" :class="{ active: index === 0 }">{{ tab }}</button>
              </div>
              <div class="mini-actions">
                <button v-for="(action, index) in realtimeChartActions" :key="action" :class="{ active: index === 0 }">{{ action }}</button>
              </div>
            </div>
            <canvas ref="realtimeChart" height="210"></canvas>
          </section>
        </section>

        <aside class="right-stack">
          <section class="panel control-panel">
            <h2>手动控制设备</h2>
            <div class="control-card">
              <h3>闸门控制</h3>
              <div class="form-grid">
                <label>设备类型<span>闸门</span></label><label>设备选择<span>G2</span></label>
                <label>当前开度<span>42 %</span></label><label>目标开度<span>50 %</span></label>
              </div>
              <input type="range" value="50">
              <div class="state-line"><span class="ok-text">连接状态：在线</span><span>控制模式：手动</span><span class="ok-text">执行状态：待命</span></div>
              <div class="button-row"><button class="primary">下发指令</button><button class="danger">停止</button><button>复位</button></div>
            </div>
            <div class="control-card">
              <h3>水泵控制</h3>
              <div class="form-grid">
                <label>设备选择<span>P1</span></label><label>当前频率<span>32 Hz</span></label>
                <label>目标频率<span>35 Hz</span></label><label>运行状态<span>运行中</span></label>
              </div>
              <input type="range" value="70">
              <div class="button-row"><button class="success">启动</button><button class="danger">停止</button><button class="primary">设置频率</button></div>
            </div>
            <p class="hint">安全提示：确认设备状态与现场安全后，再执行控制操作。</p>
          </section>

          <section class="panel alarm-mini">
            <div class="panel-head"><h2>实时报警信息</h2><button class="link-btn" @click="showPage('alarm')">查看全部</button></div>
            <div v-for="(alarm, index) in alarms.slice(0, 3)" :key="alarm.time" class="alarm-item" :class="{ handled: index === 2 }">
              <span>{{ alarm.time }}</span>
              <div><strong>{{ alarm.device }} {{ alarm.type }}</strong><small>{{ alarm.message }}</small></div>
              <span class="state-pill">{{ alarm.handled }}</span>
            </div>
          </section>
        </aside>
      </section>

      <section v-show="activePage === 'alarm'" class="page page-alarm active">
        <section class="panel query-panel alarm-query">
          <QueryField v-for="field in alarmQuery" :key="field.label" :field="field" />
          <button class="primary">查询</button><button>重置</button><button class="success">导出报警CSV</button>
        </section>
        <section class="stat-grid">
          <div v-for="stat in alarmStats" :key="stat.label" class="stat-card" :class="stat.level">
            {{ stat.label }}<strong>{{ stat.value }}</strong><span>条</span>
          </div>
        </section>
        <section class="alarm-layout alarm-layout-full">
          <div class="panel">
            <h2>报警列表</h2>
            <table class="data-table alarm-table">
              <thead><tr><th>报警时间</th><th>设备名称</th><th>设备类型</th><th>所属位置</th><th>报警类型</th><th>报警信息</th><th>报警等级</th><th>处理状态</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="(alarm, index) in alarms" :key="`${alarm.time}-${alarm.device}`" :class="{ selected: index === 0 }">
                  <td>2026-07-08 {{ alarm.time }}</td><td>{{ alarm.device }}</td><td>{{ alarm.deviceType }}</td><td>{{ alarm.location }}</td>
                  <td>{{ alarm.type }}</td><td>{{ alarm.message }}</td><td><span class="tag" :class="{ 'danger-tag': alarm.level === '严重' }">{{ alarm.level }}</span></td>
                  <td><StatusText :value="alarm.handled === '已处理' ? '正常' : '异常'" /> {{ alarm.handled }}</td>
                  <td><a href="#" @click.prevent="openAlarmModal(alarm)">处理</a>　<a href="#" @click.prevent="showPage('realtime')">定位</a>　<a href="#" @click.prevent="showPage('history')">曲线</a></td>
                </tr>
              </tbody>
            </table>
            <div class="pager">共 28 条 <span>10条/页</span><button>1</button><button>2</button><button>3</button></div>
          </div>
        </section>
      </section>

      <section v-show="activePage === 'history'" class="page page-history active">
        <div class="sub-tabs">
          <button :class="{ active: activeHistoryTab === 'analysis' }" @click="showHistoryTab('analysis')">历史数据查询与曲线分析</button>
          <button :class="{ active: activeHistoryTab === 'replay' }" @click="showHistoryTab('replay')">传感器时序总览与节点水位回放</button>
        </div>

        <section v-show="activeHistoryTab === 'analysis'" class="history-tab active">
          <section class="panel history-query">
            <div class="history-query-fields">
              <label class="query-field">开始时间
                <input v-model="historyDraft.start" type="datetime-local">
              </label>
              <label class="query-field">结束时间
                <input v-model="historyDraft.end" type="datetime-local">
              </label>
              <div ref="devicePicker" class="query-field device-picker-field">
                <span>设备选择</span>
                <button
                  type="button"
                  class="device-picker-trigger"
                  aria-controls="history-device-options"
                  :aria-expanded="devicePickerOpen"
                  @click="devicePickerOpen = !devicePickerOpen"
                >
                  <span>已选 {{ historyDraft.deviceIds.length }} 台设备</span><b>{{ devicePickerOpen ? '收起' : '展开' }}</b>
                </button>
                <div v-if="devicePickerOpen" id="history-device-options" class="device-picker-menu">
                  <div class="device-picker-tools">
                    <input v-model.trim="deviceSearch" type="search" placeholder="搜索编号、类型或位置" aria-label="搜索设备">
                    <button type="button" @click="selectAllDevices">全选</button>
                    <button type="button" @click="clearDevices">清空</button>
                  </div>
                  <div class="device-option-list">
                    <label v-for="device in filteredDevices" :key="device.id" class="device-option">
                      <input
                        type="checkbox"
                        :checked="historyDraft.deviceIds.includes(device.id)"
                        @change="toggleDevice(device.id)"
                      >
                      <strong>{{ device.id }}</strong><span>{{ device.type }}</span><span>{{ device.location }}</span>
                    </label>
                  </div>
                </div>
              </div>
              <label class="query-field">数据粒度
                <select v-model.number="historyDraft.intervalSeconds">
                  <option :value="5">5 秒</option><option :value="60">1 分钟</option><option :value="300">5 分钟</option><option :value="900">15 分钟</option>
                </select>
              </label>
              <label class="query-field">数据状态
                <select v-model="historyDraft.status">
                  <option>全部</option><option>在线</option><option>异常</option><option>离线</option>
                </select>
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
              <p v-if="historyError" class="query-error" role="alert">{{ historyError }}</p>
              <p v-else class="query-summary">设备按水槽前后位置排列，查询后每台设备独立显示曲线。</p>
              <button class="primary" :disabled="historyLoading || !historyDraft.deviceIds.length" @click="runHistoryQuery">{{ historyLoading ? '正在查询...' : '查询' }}</button>
              <button :disabled="historyLoading" @click="resetHistoryQuery">重置</button>
              <button :disabled="historyLoading" @click="refreshHistoryQuery">刷新</button>
              <button class="success" :disabled="!canExportHistory" @click="exportHistoryCsv">导出CSV</button>
            </div>
          </section>
          <section class="panel history-chart-section">
            <div class="panel-head">
              <h2>历史曲线分析</h2>
              <div class="history-result-summary">{{ historyRangeLabel }} · {{ historyResults.length }} 台设备 · {{ historyRows.length }} 条记录</div>
            </div>
            <div v-if="historyResults.length" class="history-chart-grid">
              <DeviceHistoryChart
                v-for="result in historyResults"
                :key="result.device.id"
                :result="result"
                :range-label="historyRangeLabel"
              />
            </div>
            <div v-else class="history-empty">当前条件下没有历史数据</div>
          </section>
          <section class="panel">
            <h2>历史数据表格</h2>
            <table class="data-table">
              <thead><tr><th>时间</th><th>设备类型</th><th>设备名称</th><th>所属渠道</th><th>数据项</th><th>数值</th><th>单位</th><th>状态</th></tr></thead>
              <tbody>
                <tr v-for="row in visibleHistoryRows" :key="`${row.timestampValue}-${row.name}`">
                  <td>{{ row.timestamp }}</td><td>{{ row.type }}</td><td>{{ row.name }}</td><td>{{ row.location }}</td><td>{{ row.metric }}</td><td>{{ row.value }}</td><td>{{ row.unit }}</td><td><StatusText :value="row.state" /></td>
                </tr>
                <tr v-if="!historyRows.length"><td colspan="8" class="table-empty">当前条件下没有历史数据</td></tr>
              </tbody>
            </table>
            <div class="pager">共 {{ historyRows.length }} 条 <span>当前展示前 {{ visibleHistoryRows.length }} 条</span></div>
          </section>
        </section>

        <section v-show="activeHistoryTab === 'replay'" class="history-tab active">
          <section class="panel query-panel replay-query">
            <QueryField v-for="field in replayQuery" :key="field.label" :field="field" />
            <button class="primary">查询</button><button>重置</button><button>播放</button><button>暂停</button><button class="success">导出CSV</button>
          </section>
          <section class="panel chart-panel large replay-card">
            <div class="panel-head"><h2>节点水位空间剖面（按渠道 / 闸门位置）</h2><div class="legend"><span>当前时刻（2026-07-08 09:30:20）</span><span>上一时刻（09:30:15）</span><span class="limit-red">上限 0.50 m</span><span class="limit-yellow">下限 0.20 m</span></div></div>
            <canvas ref="profileChart" height="330"></canvas>
          </section>
          <section class="timeline panel"><button class="primary">播放</button><button>暂停</button><button>停止</button><button class="active">1x</button><button>2x</button><button>4x</button><input type="range" value="50"><strong>当前时间：2026-07-08 09:30:20</strong></section>
          <section class="panel">
            <h2>传感器时序总览表</h2>
            <table class="data-table">
              <thead><tr><th>时间</th><th>WL-01（渠① / 水位 / m）</th><th>WL-02（渠② / 水位 / m）</th><th>WL-03（渠③ / 水位 / m）</th><th>FM-01（分水口 / 流量 / L/s）</th><th>PT-01（泵出口 / 压力 / MPa）</th><th>G2（渠③ / 开度 / %）</th><th>P1（前池 / 频率 / Hz）</th></tr></thead>
              <tbody>
                <tr v-for="(row, index) in replayRows" :key="row.time" :class="{ selected: index === replayRows.length - 1 }">
                  <td>{{ row.time }}</td><td>{{ row.wl01 }}</td><td>{{ row.wl02 }}</td><td>{{ row.wl03 }}</td><td>{{ row.fm01 }}</td><td>{{ row.pt01 }}</td><td>{{ row.g2 }}</td><td>{{ row.p1 }}</td>
                </tr>
              </tbody>
            </table>
            <div class="pager">共 12,480 条 <button>1</button><button>2</button><button>3</button><span>...</span><button>208</button><span>每页显示 50</span></div>
          </section>
        </section>
      </section>
    </main>

    <Teleport to="body">
      <div v-if="alarmModalOpen && selectedAlarm" class="modal-backdrop" @click.self="closeAlarmModal">
        <section class="panel detail-panel alarm-modal" role="dialog" aria-modal="true" aria-labelledby="alarm-modal-title">
          <div class="modal-head">
            <h2 id="alarm-modal-title">报警详情 / 处理</h2>
            <button class="modal-close" aria-label="关闭" @click="closeAlarmModal">×</button>
          </div>
          <dl>
            <dt>报警编号</dt><dd>{{ selectedAlarm.code }}</dd>
            <dt>报警设备</dt><dd>{{ selectedAlarm.device }}（{{ selectedAlarm.deviceType }}）</dd>
            <dt>所属位置</dt><dd>{{ selectedAlarm.location }}</dd>
            <dt>报警等级</dt><dd><span class="tag" :class="{ 'danger-tag': selectedAlarm.level === '严重' }">{{ selectedAlarm.level }}</span></dd>
            <dt>报警时间</dt><dd>2026-07-08 {{ selectedAlarm.time }}</dd>
            <dt>报警信息</dt><dd>{{ selectedAlarm.message }}</dd>
          </dl>
          <label class="textarea-label">处理说明<textarea v-model="handleRemark"></textarea></label>
          <div class="button-row"><button class="primary" @click="confirmAlarmHandle">确认处理</button><button @click="closeAlarmModal">取消</button></div>
          <h3>关联曲线（{{ selectedAlarm.device }} 开度反馈）</h3>
          <canvas ref="alarmChart" height="190"></canvas>
          <div class="button-row">
            <button class="primary" @click="locateAlarm">定位到实时监控</button>
            <button class="primary ghost" @click="viewAlarmHistory">查看历史曲线</button>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import DeviceHistoryChart from './components/DeviceHistoryChart.vue';
import {
  DEFAULT_DEVICE_IDS,
  DEVICES,
  buildHistoryResults,
  buildHistoryRows,
  sortDeviceIds,
  toHistoryCsv,
  validateHistoryQuery
} from './history-data.js';

const activePage = ref('realtime');
const activeHistoryTab = ref('analysis');
const alarmModalOpen = ref(false);
const selectedAlarm = ref(null);
const handleRemark = ref('现场检查反馈正常，已重启控制器，开度反馈恢复。');
const realtimeChart = ref(null);
const alarmChart = ref(null);
const profileChart = ref(null);
const devicePicker = ref(null);
const devicePickerOpen = ref(false);
const deviceSearch = ref('');
const historyLoading = ref(false);
const historyError = ref('');
const defaultHistoryQuery = Object.freeze({
  start: '2026-07-08T09:00',
  end: '2026-07-08T10:00',
  deviceIds: [...DEFAULT_DEVICE_IDS],
  intervalSeconds: 300,
  status: '全部'
});
const createDefaultHistoryQuery = () => ({ ...defaultHistoryQuery, deviceIds: [...defaultHistoryQuery.deviceIds] });
const historyDraft = ref(createDefaultHistoryQuery());
const appliedHistoryQuery = ref(createDefaultHistoryQuery());
const historyResults = ref(buildHistoryResults(appliedHistoryQuery.value));
const historyRows = computed(() => buildHistoryRows(historyResults.value));
const visibleHistoryRows = computed(() => historyRows.value.slice(0, 50));
const selectedDevices = computed(() => sortDeviceIds(historyDraft.value.deviceIds)
  .map((id) => DEVICES.find((device) => device.id === id))
  .filter(Boolean));
const filteredDevices = computed(() => {
  const keyword = deviceSearch.value.toLocaleLowerCase('zh-CN');
  if (!keyword) return DEVICES;
  return DEVICES.filter((device) => `${device.id} ${device.type} ${device.location}`.toLocaleLowerCase('zh-CN').includes(keyword));
});
const historyRangeLabel = computed(() => `${appliedHistoryQuery.value.start.replace('T', ' ')} 至 ${appliedHistoryQuery.value.end.replace('T', ' ')}`);
const canExportHistory = computed(() => !historyLoading.value && historyRows.value.length > 0);

const StatusText = defineComponent({
  props: { value: { type: String, required: true } },
  setup(props) {
    return () => h('span', [h('span', { class: ['dot', statusClass(props.value)] }), props.value]);
  }
});

const QueryField = defineComponent({
  props: { field: { type: Object, required: true } },
  setup(props) {
    return () => h('label', { class: 'query-field' }, [
      props.field.label,
      h('span', { class: 'fake-input', innerHTML: props.field.value })
    ]);
  }
});

const pageTabs = [
  { key: 'realtime', label: '实时监控' },
  { key: 'history', label: '历史数据' },
  { key: 'alarm', label: '报警数据', badge: 3 }
];

const viewActions = ['默认视角', '俯视图', '正视图', '左视图', '右视图', '自动漫游', '复位'];
const realtimeChartTabs = ['节点水位曲线', '流量计曲线', '水位计曲线', '泵频率曲线', '倒虹吸曲线'];
const realtimeChartActions = ['近5分钟', '近30分钟', '近1小时', '刷新', '全屏'];

const gates = [
  { id: 'G0', open: '60%', before: '0.42', after: '0.40', state: '在线', color: 'red' },
  { id: 'G1', open: '100%', before: '0.40', after: '0.38', state: '在线', color: 'red' },
  { id: 'G2', open: '42%', before: '0.38', after: '0.35', state: '在线', color: 'orange' },
  { id: 'G3', open: '30%', before: '0.36', after: '0.34', state: '在线', color: 'green' },
  { id: 'G4', open: '25%', before: '0.35', after: '0.33', state: '离线', color: 'off' },
  { id: 'G5', open: '80%', before: '0.37', after: '0.36', state: '在线', color: 'red' },
  { id: 'G6', open: '50%', before: '0.34', after: '0.32', state: '异常', color: 'red' }
];

const sensors = {
  水位计: [
    ['WL-01', '渠①', '0.40', 'm', '在线'],
    ['WL-02', '渠②', '0.38', 'm', '在线'],
    ['WL-03', '渠③', '0.37', 'm', '在线'],
    ['WL-04', '渠④', '0.37', 'm', '异常'],
    ['WL-05', '渠⑤', '0.32', 'm', '在线'],
    ['WL-06', '集水池', '0.32', 'm', '在线']
  ],
  流量计: [['FM-01', '渠③', '18.20', 'L/s', '在线']],
  压力计: [
    ['PT-01', '水泵出口', '0.23', 'MPa', '在线'],
    ['PT-02', '倒虹吸①-②', '0.12', 'MPa', '在线'],
    ['PT-03', '倒虹吸③-④', '--', 'MPa', '离线']
  ]
};

const sensorGroups = computed(() => Object.entries(sensors).map(([name, rows]) => ({
  name,
  rows: rows.map(([deviceName, location, value, unit, state]) => ({ name: deviceName, location, value, unit, state }))
})));

const alarms = [
  { code: 'ALM-20260708-0001', time: '09:21:10', device: 'G6', deviceType: '闸门', location: '渠⑥', type: '闸门异常', message: '开度反馈超时', level: '严重', handled: '未处理' },
  { code: 'ALM-20260708-0002', time: '09:23:45', device: 'WL-04', deviceType: '水位计', location: '渠④', type: '水位超过上限', message: '水位异常', level: '重要', handled: '未处理' },
  { code: 'ALM-20260708-0003', time: '09:25:12', device: 'PT-03', deviceType: '压力计', location: '倒虹吸③-④', type: '压力计连接中断', message: '设备离线', level: '一般', handled: '已处理' },
  { code: 'ALM-20260708-0004', time: '09:12:08', device: 'WL-02', deviceType: '水位计', location: '渠②', type: '水位低于下限', message: '水位超限', level: '重要', handled: '已处理' },
  { code: 'ALM-20260708-0005', time: '08:58:31', device: 'G2', deviceType: '闸门', location: '渠②', type: '电机过载保护', message: '闸门异常', level: '重要', handled: '已处理' },
  { code: 'ALM-20260708-0006', time: '08:45:17', device: 'FM-01', deviceType: '电磁流量计', location: '进水总管', type: '数据通信中断', message: '通信异常', level: '一般', handled: '已处理' },
  { code: 'ALM-20260708-0007', time: '08:31:56', device: 'PT-01', deviceType: '压力计', location: '进水总管', type: '压力超过上限', message: '压力超限', level: '重要', handled: '已处理' },
  { code: 'ALM-20260708-0008', time: '08:20:09', device: 'G5', deviceType: '闸门', location: '渠⑤', type: '限位开关故障', message: '闸门异常', level: '一般', handled: '已处理' },
  { code: 'ALM-20260708-0009', time: '08:05:44', device: 'WL-06', deviceType: '水位计', location: '渠⑥', type: '水位波动超限', message: '水位超限', level: '一般', handled: '已处理' },
  { code: 'ALM-20260708-0010', time: '07:52:33', device: 'G1', deviceType: '闸门', location: '渠①', type: '闸门控制器离线', message: '设备离线', level: '一般', handled: '已处理' }
];

const alarmStats = [
  { label: '报警总数', value: 28 }, { label: '未处理', value: 5, level: 'red' }, { label: '已处理', value: 23, level: 'green' },
  { label: '严重报警', value: 2, level: 'red' }, { label: '设备离线', value: 4 }, { label: '水位超限', value: 8, level: 'orange' }, { label: '闸门异常', value: 3, level: 'orange' }
];

const replayRows = [
  ['2026-07-08 09:00:00', '0.402', '0.380', '0.390', '12.50', '0.230', '42', '32.0'],
  ['2026-07-08 09:00:05', '0.402', '0.381', '0.392', '12.60', '0.231', '42', '32.0'],
  ['2026-07-08 09:00:10', '0.405', '0.383', '0.395', '12.70', '0.233', '42', '32.0'],
  ['2026-07-08 09:00:15', '0.407', '0.384', '0.397', '12.80', '0.234', '42', '32.0'],
  ['2026-07-08 09:30:20', '0.384', '0.338', '0.412', '13.20', '0.236', '43', '32.6']
].map(([time, wl01, wl02, wl03, fm01, pt01, g2, p1]) => ({ time, wl01, wl02, wl03, fm01, pt01, g2, p1 }));

const replayQuery = [['开始时间', '2026-07-08 09:00:00'], ['结束时间', '2026-07-08 10:00:00'], ['数据粒度', '5秒'], ['渠道范围', '全部']].map(([label, value]) => ({ label, value }));
const alarmQuery = [['开始时间', '2026-07-08 00:00:00'], ['结束时间', '2026-07-08 23:59:59'], ['报警类型', '全部'], ['报警等级', '全部'], ['报警信息', '请输入报警信息关键字'], ['设备类型', '全部'], ['设备名称', '请输入设备名称'], ['处理状态', '全部'], ['所属渠道', '全部']].map(([label, value]) => ({ label, value }));

function statusClass(value) {
  if (value === '在线' || value === '正常') return 'ok';
  if (value === '离线') return 'off';
  return 'bad';
}

function showPage(page) {
  activePage.value = page;
  nextTick(drawAllCharts);
}

function showHistoryTab(tab) {
  activeHistoryTab.value = tab;
  nextTick(drawAllCharts);
}

function openAlarmModal(alarm) {
  selectedAlarm.value = alarm;
  handleRemark.value = '现场检查反馈正常，已重启控制器，开度反馈恢复。';
  alarmModalOpen.value = true;
  nextTick(drawAllCharts);
}

function closeAlarmModal() {
  alarmModalOpen.value = false;
}

function confirmAlarmHandle() {
  closeAlarmModal();
}

function locateAlarm() {
  closeAlarmModal();
  showPage('realtime');
}

function viewAlarmHistory() {
  closeAlarmModal();
  showPage('history');
}

function toggleDevice(id) {
  const ids = historyDraft.value.deviceIds;
  historyDraft.value.deviceIds = ids.includes(id) ? ids.filter((item) => item !== id) : sortDeviceIds([...ids, id]);
  historyError.value = historyDraft.value.deviceIds.length ? '' : '请至少选择一台设备';
}

function selectAllDevices() {
  historyDraft.value.deviceIds = DEVICES.map((device) => device.id);
  historyError.value = '';
}

function clearDevices() {
  historyDraft.value.deviceIds = [];
  historyError.value = '请至少选择一台设备';
}

async function runHistoryQuery() {
  const error = validateHistoryQuery(historyDraft.value);
  if (error) {
    historyError.value = error;
    return;
  }
  historyError.value = '';
  historyLoading.value = true;
  await new Promise((resolve) => window.setTimeout(resolve, 180));
  const nextQuery = { ...historyDraft.value, deviceIds: sortDeviceIds(historyDraft.value.deviceIds) };
  const results = buildHistoryResults(nextQuery);
  historyResults.value = nextQuery.status === '全部'
    ? results
    : results.filter((result) => result.device.state === nextQuery.status);
  appliedHistoryQuery.value = nextQuery;
  historyLoading.value = false;
  devicePickerOpen.value = false;
}

function resetHistoryQuery() {
  historyDraft.value = createDefaultHistoryQuery();
  historyError.value = '';
  deviceSearch.value = '';
  runHistoryQuery();
}

function refreshHistoryQuery() {
  runHistoryQuery();
}

function exportHistoryCsv() {
  if (!canExportHistory.value) return;
  const blob = new Blob([toHistoryCsv(historyRows.value)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `历史数据_${appliedHistoryQuery.value.start.replaceAll(':', '')}_${appliedHistoryQuery.value.end.replaceAll(':', '')}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function handleDocumentPointerDown(event) {
  if (devicePickerOpen.value && !devicePicker.value?.contains(event.target)) devicePickerOpen.value = false;
}

function handleDocumentKeydown(event) {
  if (event.key === 'Escape') devicePickerOpen.value = false;
}

function drawLineChart(canvas, options = {}) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const w = rect.width;
  const hgt = rect.height;
  const pad = { l: 54, r: 34, t: 26, b: 42 };
  ctx.clearRect(0, 0, w, hgt);
  drawGrid(ctx, w, hgt, pad);
  const colors = ['#25a8ff', '#54d262', '#ffd238', '#9a66ff', '#21d4e8', '#ff8736', '#6fb6ff'];
  const labels = options.labels || ['渠①', '渠②', '渠③', '渠④', '渠⑤', '渠⑥', '集水池'];
  const count = 72;
  labels.forEach((label, index) => {
    const base = 0.42 - index * 0.035;
    const values = Array.from({ length: count }, (_, point) => base + Math.sin(point / 7 + index) * 0.018 + Math.sin(point / 2.7 + index * 2) * 0.006 + (options.drop && point > 36 ? -0.08 + index * 0.005 : 0));
    drawSeries(ctx, values, pad, w, hgt, colors[index % colors.length], 0.05, 0.62);
    drawLegend(ctx, label, colors[index % colors.length], 460 + index * 82, hgt - 18);
  });
  drawThreshold(ctx, pad, w, hgt, 0.50, '#ff5148', '上限 0.50 m');
  drawThreshold(ctx, pad, w, hgt, 0.20, '#ffd21f', '下限 0.20 m');
  if (options.alarm) drawAlarmMark(ctx, pad.l + (w - pad.l - pad.r) * 0.58, pad.t + 62, '09:21:10');
}

function drawProfileChart(canvas) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const w = rect.width;
  const hgt = rect.height;
  const pad = { l: 54, r: 28, t: 28, b: 100 };
  drawGrid(ctx, w, hgt, pad);
  const labels = ['前池', 'G0闸前', 'G0闸后', '渠①', 'G1闸前', 'G1闸后', '渠②', 'G2闸前', 'G2闸后', '渠③', '倒虹吸①', '倒虹吸②', '渠④', 'G5闸前', 'G5闸后', '渠⑤', '倒虹吸③', '倒虹吸④', '渠⑥', '集水池'];
  const values = [0.384, 0.401, 0.338, 0.412, 0.398, 0.344, 0.395, 0.401, 0.341, 0.412, 0.296, 0.293, 0.403, 0.389, 0.329, 0.397, 0.289, 0.287, 0.392, 0.384];
  const previous = values.map((value, index) => value - 0.035 + Math.sin(index) * 0.01);
  drawSeries(ctx, previous, pad, w, hgt, '#7d9ab8', 0, 0.62, true);
  drawSeries(ctx, values, pad, w, hgt, '#2aa1ff', 0, 0.62);
  values.forEach((value, index) => {
    const x = pad.l + index / (values.length - 1) * (w - pad.l - pad.r);
    const y = mapY(value, pad, hgt, 0, 0.62);
    ctx.fillStyle = '#39b3ff';
    ctx.font = '12px Microsoft YaHei';
    ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(3), x, y - 13);
    ctx.fillStyle = index % 3 === 0 ? '#1e77d8' : '#18b969';
    ctx.beginPath();
    ctx.arc(x, hgt - 68, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#85c9ff';
    ctx.stroke();
    ctx.save();
    ctx.translate(x, hgt - 42);
    ctx.rotate(-0.04);
    ctx.fillStyle = '#c8d8eb';
    ctx.fillText(labels[index], 0, 0);
    ctx.restore();
  });
  drawThreshold(ctx, pad, w, hgt, 0.50, '#ff5148', '');
  drawThreshold(ctx, pad, w, hgt, 0.20, '#ffd21f', '');
  drawAlarmMark(ctx, pad.l + 10 / 19 * (w - pad.l - pad.r), mapY(0.46, pad, hgt, 0, 0.62), '报警点');
}

function drawGrid(ctx, width, height, pad) {
  ctx.fillStyle = 'rgba(2, 14, 27, .7)';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(78, 143, 203, .18)';
  ctx.lineWidth = 1;
  for (let index = 0; index <= 6; index += 1) {
    const y = pad.t + index / 6 * (height - pad.t - pad.b);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(width - pad.r, y);
    ctx.stroke();
    ctx.fillStyle = '#aebfd5';
    ctx.font = '12px Microsoft YaHei';
    ctx.textAlign = 'right';
    ctx.fillText((0.60 - index * 0.10).toFixed(2), pad.l - 10, y + 4);
  }
  for (let index = 0; index <= 10; index += 1) {
    const x = pad.l + index / 10 * (width - pad.l - pad.r);
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, height - pad.b);
    ctx.stroke();
  }
}

function drawSeries(ctx, values, pad, width, height, color, min = 0.05, max = 0.62, dashed = false) {
  ctx.strokeStyle = color;
  ctx.lineWidth = dashed ? 1 : 2;
  ctx.setLineDash(dashed ? [5, 5] : []);
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = pad.l + index / (values.length - 1) * (width - pad.l - pad.r);
    const y = mapY(value, pad, height, min, max);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
  values.forEach((value, index) => {
    if (values.length > 25 && index % 8 !== 0) return;
    const x = pad.l + index / (values.length - 1) * (width - pad.l - pad.r);
    const y = mapY(value, pad, height, min, max);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function mapY(value, pad, height, min, max) {
  return pad.t + (max - value) / (max - min) * (height - pad.t - pad.b);
}

function drawThreshold(ctx, pad, width, height, value, color, label) {
  const y = mapY(value, pad, height, 0, 0.62);
  ctx.strokeStyle = color;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(pad.l, y);
  ctx.lineTo(width - pad.r, y);
  ctx.stroke();
  ctx.setLineDash([]);
  if (label) {
    ctx.fillStyle = color;
    ctx.font = '13px Microsoft YaHei';
    ctx.textAlign = 'right';
    ctx.fillText(label, width - pad.r - 6, y - 6);
  }
}

function drawLegend(ctx, text, color, x, y) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x + 26, y - 4);
  ctx.stroke();
  ctx.fillStyle = '#c6d8eb';
  ctx.font = '12px Microsoft YaHei';
  ctx.textAlign = 'left';
  ctx.fillText(text, x + 32, y);
}

function drawAlarmMark(ctx, x, y, text) {
  ctx.strokeStyle = '#ff4e45';
  ctx.fillStyle = '#ff4e45';
  ctx.beginPath();
  ctx.moveTo(x, y + 4);
  ctx.lineTo(x, y + 92);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Microsoft YaHei';
  ctx.textAlign = 'center';
  ctx.fillText('!', x, y + 5);
  ctx.fillStyle = '#ff5b52';
  ctx.fillText(text, x, y - 12);
}

function drawAllCharts() {
  drawLineChart(realtimeChart.value);
  drawLineChart(alarmChart.value, { drop: true, labels: ['开度反馈(%)', '设定开度(%)'], alarm: true });
  drawProfileChart(profileChart.value);
}

onMounted(() => {
  nextTick(drawAllCharts);
  window.addEventListener('resize', drawAllCharts);
  document.addEventListener('pointerdown', handleDocumentPointerDown);
  document.addEventListener('keydown', handleDocumentKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', drawAllCharts);
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
  document.removeEventListener('keydown', handleDocumentKeydown);
});
</script>
