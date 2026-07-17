<template>
  <div class="time-range-picker">
    <div class="range-presets" aria-label="时间范围">
      <button v-for="preset in presets" :key="preset.key" type="button" :class="{ active: rangeKey === preset.key }" @click="choosePreset(preset.key)">{{ preset.label }}</button>
    </div>
    <div v-if="rangeKey === 'custom'" class="custom-range">
      <input v-model="startValue" type="datetime-local" aria-label="自定义开始时间" @change="submitCustom">
      <span>至</span>
      <input v-model="endValue" type="datetime-local" aria-label="自定义结束时间" @change="submitCustom">
      <em v-if="validationError">{{ validationError }}</em>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { TimeRangeKey } from '../../../config/trendConfig.ts';
import type { CustomTimeRange } from '../../../data/realtime-trend-data.ts';

const props = defineProps<{ rangeKey: TimeRangeKey; customRange?: CustomTimeRange }>();
const emit = defineEmits<{ change: [key: TimeRangeKey, custom?: CustomTimeRange] }>();
const presets: Array<{ key: TimeRangeKey; label: string }> = [
  { key: '10m', label: '近10分钟' }, { key: '1h', label: '近1小时' }, { key: '24h', label: '近24小时' }, { key: 'custom', label: '自定义' }
];
const toInput = (timestamp: number) => new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const now = Date.now();
const startValue = ref(toInput(props.customRange?.startTime ?? now - 3_600_000));
const endValue = ref(toInput(props.customRange?.endTime ?? now));
const validationError = ref('');
function choosePreset(key: TimeRangeKey) { key === 'custom' ? emit('change', key, { startTime: new Date(startValue.value).getTime(), endTime: new Date(endValue.value).getTime() }) : emit('change', key); }
function submitCustom() {
  const custom = { startTime: new Date(startValue.value).getTime(), endTime: new Date(endValue.value).getTime() };
  validationError.value = custom.startTime >= custom.endTime ? '开始时间须早于结束时间' : '';
  if (!validationError.value) emit('change', 'custom', custom);
}
</script>

<style scoped>
.time-range-picker { display: flex; gap: 6px; align-items: center; min-width: 0; }
.range-presets { display: flex; gap: 4px; }.range-presets button { padding: 4px 7px; font-size: 9px; white-space: nowrap; }
.custom-range { position: relative; display: flex; gap: 4px; align-items: center; color: #7898b6; font-size: 9px; }
.custom-range input { width: 130px; height: 25px; padding: 0 4px; border: 1px solid rgba(74, 151, 207, .34); border-radius: 4px; background: rgba(2, 15, 28, .85); color: #cfe1f0; font-size: 9px; }
.custom-range em { position: absolute; left: 0; top: 27px; color: #ff8f86; font-style: normal; white-space: nowrap; }
</style>
