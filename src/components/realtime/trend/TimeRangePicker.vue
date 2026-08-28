<template>
  <div class="time-range-picker">
    <label class="range-select">
      <span>时间</span>
      <select :value="rangeKey" aria-label="时间范围" @change="handlePresetChange">
        <option v-for="preset in presets" :key="preset.key" :value="preset.key">{{ preset.label }}</option>
      </select>
    </label>
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
function handlePresetChange(event: Event) {
  choosePreset((event.target as HTMLSelectElement).value as TimeRangeKey);
}
function submitCustom() {
  const custom = { startTime: new Date(startValue.value).getTime(), endTime: new Date(endValue.value).getTime() };
  validationError.value = custom.startTime >= custom.endTime ? '开始时间须早于结束时间' : '';
  if (!validationError.value) emit('change', 'custom', custom);
}
</script>

<style scoped>
.time-range-picker {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
}

.range-select {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #82a2bd;
  font-size: 10px;
}

.range-select select {
  width: 96px;
  height: 27px;
  border: 1px solid rgba(72, 151, 207, .42);
  border-radius: 4px;
  outline: 0;
  padding: 0 22px 0 7px;
  background: rgba(2, 18, 32, .92);
  color: #d9ecff;
  font-size: 10px;
}

.range-select select:focus {
  border-color: #39a9ef;
  box-shadow: 0 0 0 2px rgba(57, 169, 239, .12);
}

.custom-range {
  position: absolute;
  top: 31px;
  right: 0;
  z-index: 8;
  display: flex;
  width: max-content;
  align-items: center;
  gap: 4px;
  border: 1px solid rgba(74, 151, 207, .42);
  padding: 6px;
  background: rgba(2, 18, 32, .97);
  box-shadow: 0 8px 18px rgba(0, 8, 18, .45);
  color: #7898b6;
  font-size: 9px;
}

.custom-range input {
  width: 112px;
  height: 25px;
  border: 1px solid rgba(74, 151, 207, .34);
  border-radius: 4px;
  padding: 0 4px;
  background: rgba(2, 15, 28, .85);
  color: #cfe1f0;
  font-size: 9px;
}

.custom-range em {
  position: absolute;
  top: 39px;
  right: 6px;
  color: #ff8f86;
  font-style: normal;
  white-space: nowrap;
}
</style>
