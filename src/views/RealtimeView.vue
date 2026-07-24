<template>
  <section class="page page-realtime active">
    <aside class="left-stack">
      <section class="panel gate-panel"><h2>闸门实时状态</h2><table class="data-table compact">
        <thead><tr><th>设备</th><th>开度</th><th>闸前(m)</th><th>闸后(m)</th><th>状态</th></tr></thead>
        <tbody><tr v-for="gate in GATES" :key="gate.id"><td><span class="device-chip" :class="`chip-${gate.color}`">{{ gate.id }}</span></td><td>{{ gate.open }}</td><td>{{ gate.before }}</td><td>{{ gate.after }}</td><td><StatusText :value="gate.state" /></td></tr></tbody>
      </table></section>
      <section class="panel sensor-panel"><h2>传感器实时状态</h2>
        <div v-for="group in SENSOR_GROUPS" :key="group.name" class="sensor-section"><div class="sensor-title">{{ group.name }}</div><table class="data-table compact"><tbody>
          <tr v-for="row in group.rows" :key="row.name"><td>{{ row.name }}</td><td>{{ row.location }}</td><td>{{ row.value }}</td><td>{{ row.unit }}</td><td><StatusText :value="row.state" /></td></tr>
        </tbody></table></div>
      </section>
    </aside>

    <section class="center-stack">
      <section class="panel twin-panel">
        <div class="panel-head"><h2>三维水槽工艺监控</h2><div class="mini-actions"><button v-for="action in VIEW_ACTIONS" :key="action">{{ action }}</button></div></div>
        <iframe
          class="twin-stage"
          src="http://27.185.55.121:9426/preview?webTopoId=2079771269045444608"
          title="三维水槽工艺监控"
          allowfullscreen
        ></iframe>
      </section>
      <TrendAnalysis />
    </section>

    <aside class="right-stack">
      <section class="panel control-panel"><h2>手动控制设备</h2>
        <div class="control-card"><h3>闸门控制</h3><div class="form-grid"><label>设备类型<span>闸门</span></label><label>设备选择<span>G2</span></label><label>当前开度<span>42 %</span></label><label>目标开度<span>50 %</span></label></div><input type="range" value="50"><div class="state-line"><span class="ok-text">连接状态：在线</span><span>控制模式：手动</span><span class="ok-text">执行状态：待命</span></div><div class="button-row"><button class="primary">下发指令</button><button class="danger">停止</button><button>复位</button></div></div>
        <div class="control-card"><h3>水泵控制</h3><div class="form-grid"><label>设备选择<span>P1</span></label><label>当前频率<span>32 Hz</span></label><label>目标频率<span>35 Hz</span></label><label>运行状态<span>运行中</span></label></div><input type="range" value="70"><div class="button-row"><button class="success">启动</button><button class="danger">停止</button><button class="primary">设置频率</button></div></div>
        <p class="hint">安全提示：确认设备状态与现场安全后，再执行控制操作。</p>
      </section>
      <section class="panel alarm-mini"><div class="panel-head"><h2>实时报警信息</h2><button class="link-btn" @click="$emit('navigate', 'alarm')">查看全部</button></div>
        <div v-for="(alarm, index) in ALARMS.slice(0, 3)" :key="alarm.time" class="alarm-item" :class="{ handled: index === 2 }"><span>{{ alarm.time }}</span><div><strong>{{ alarm.device }} {{ alarm.type }}</strong><small>{{ alarm.message }}</small></div><span class="state-pill">{{ alarm.handled }}</span></div>
      </section>
    </aside>
  </section>
</template>

<script setup>
import StatusText from '../components/common/StatusText.vue';
import TrendAnalysis from '../components/realtime/trend/TrendAnalysis.vue';
import { ALARMS, GATES, SENSOR_GROUPS, VIEW_ACTIONS } from '../data/monitoring-data.js';

defineEmits(['navigate']);
</script>
