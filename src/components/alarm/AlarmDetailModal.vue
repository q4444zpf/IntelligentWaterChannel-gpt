<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <section class="panel detail-panel alarm-modal" role="dialog" aria-modal="true" aria-labelledby="alarm-modal-title">
        <div class="modal-head"><h2 id="alarm-modal-title">报警详情 / 处理</h2><button class="modal-close" aria-label="关闭" @click="$emit('close')">×</button></div>
        <dl><dt>报警编号</dt><dd>{{ alarm.code }}</dd><dt>报警设备</dt><dd>{{ alarm.device }}（{{ alarm.deviceType }}）</dd><dt>所属位置</dt><dd>{{ alarm.location }}</dd><dt>报警等级</dt><dd><span class="tag" :class="{ 'danger-tag': alarm.level === '严重' }">{{ alarm.level }}</span></dd><dt>报警时间</dt><dd>2026-07-08 {{ alarm.time }}</dd><dt>报警信息</dt><dd>{{ alarm.message }}</dd></dl>
        <label class="textarea-label">处理说明<textarea v-model="remark"></textarea></label>
        <div class="button-row"><button class="primary" @click="$emit('confirm', remark)">确认处理</button><button @click="$emit('close')">取消</button></div>
        <h3>关联曲线（{{ alarm.device }} 开度反馈）</h3><canvas ref="alarmChart" height="190"></canvas>
        <div class="button-row"><button class="primary" @click="$emit('locate')">定位到实时监控</button><button class="primary ghost" @click="$emit('view-history')">查看历史曲线</button></div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import { useCanvasChart } from '../../composables/useCanvasChart.js';
import { drawAlarmChart } from '../../utils/canvas-charts.js';

defineProps({ alarm: { type: Object, required: true } });
defineEmits(['close', 'confirm', 'locate', 'view-history']);
const remark = ref('现场检查反馈正常，已重启控制器，开度反馈恢复。');
const { canvasRef: alarmChart } = useCanvasChart(drawAlarmChart);
</script>
