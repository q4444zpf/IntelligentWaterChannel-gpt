<template>
  <label class="trend-device-select">
    <span>设备</span>
    <select :value="modelValue" aria-label="趋势设备" @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
      <option v-for="device in devices" :key="device.id" :value="device.id">{{ device.id }} · {{ device.location }}</option>
    </select>
  </label>
</template>

<script setup lang="ts">
import type { TrendDevice } from '../../../config/trendConfig.ts';
defineProps<{ devices: readonly TrendDevice[]; modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [deviceId: string] }>();
</script>

<style scoped>
.trend-device-select { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; color: #82a2bd; font-size: 10px; }
.trend-device-select select { width: 154px; height: 27px; padding: 0 24px 0 8px; border: 1px solid rgba(72, 151, 207, .42); border-radius: 4px; outline: 0; background: rgba(2, 18, 32, .92); color: #d9ecff; font-size: 10px; }
.trend-device-select select:focus { border-color: #39a9ef; box-shadow: 0 0 0 2px rgba(57, 169, 239, .12); }
</style>
