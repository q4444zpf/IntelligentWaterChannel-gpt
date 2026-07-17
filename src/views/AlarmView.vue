<template>
  <section class="page page-alarm active">
    <section class="panel query-panel alarm-query"><QueryField v-for="field in ALARM_QUERY" :key="field.label" :field="field" /><button class="primary">查询</button><button>重置</button><button class="success">导出报警CSV</button></section>
    <section class="stat-grid"><div v-for="stat in ALARM_STATS" :key="stat.label" class="stat-card" :class="stat.level">{{ stat.label }}<strong>{{ stat.value }}</strong><span>条</span></div></section>
    <section class="alarm-layout alarm-layout-full"><div class="panel"><h2>报警列表</h2><table class="data-table alarm-table">
      <thead><tr><th>报警时间</th><th>设备名称</th><th>设备类型</th><th>所属位置</th><th>报警类型</th><th>报警信息</th><th>报警等级</th><th>处理状态</th><th>操作</th></tr></thead>
      <tbody><tr v-for="(alarm, index) in ALARMS" :key="`${alarm.time}-${alarm.device}`" :class="{ selected: index === 0 }"><td>2026-07-08 {{ alarm.time }}</td><td>{{ alarm.device }}</td><td>{{ alarm.deviceType }}</td><td>{{ alarm.location }}</td><td>{{ alarm.type }}</td><td>{{ alarm.message }}</td><td><span class="tag" :class="{ 'danger-tag': alarm.level === '严重' }">{{ alarm.level }}</span></td><td><StatusText :value="alarm.handled === '已处理' ? '正常' : '异常'" /> {{ alarm.handled }}</td><td><a href="#" @click.prevent="$emit('open-alarm', alarm)">处理</a>　<a href="#" @click.prevent="$emit('navigate', 'realtime')">定位</a>　<a href="#" @click.prevent="$emit('navigate', 'history')">曲线</a></td></tr></tbody>
    </table><div class="pager">共 28 条 <span>10条/页</span><button>1</button><button>2</button><button>3</button></div></div></section>
  </section>
</template>

<script setup>
import QueryField from '../components/common/QueryField.vue';
import StatusText from '../components/common/StatusText.vue';
import { ALARMS, ALARM_QUERY, ALARM_STATS } from '../data/monitoring-data.js';

defineEmits(['navigate', 'open-alarm']);
</script>
