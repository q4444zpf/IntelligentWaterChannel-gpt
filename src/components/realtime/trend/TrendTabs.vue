<template>
  <div class="trend-tabs" role="tablist" aria-label="实时趋势类型">
    <button v-for="tab in tabs" :key="tab.key" type="button" role="tab" :aria-selected="activeKey === tab.key" :class="{ active: activeKey === tab.key }" @click="emit('update:activeKey', tab.key)">{{ tab.label }}</button>
  </div>
</template>

<script setup lang="ts">
import type { TrendTabKey } from '../../../config/trendConfig.ts';
defineProps<{ activeKey: TrendTabKey }>();
const emit = defineEmits<{ 'update:activeKey': [key: TrendTabKey] }>();
const tabs: Array<{ key: TrendTabKey; label: string }> = [
  { key: 'node', label: '节点水位变化' }, { key: 'flow', label: '流量计趋势' },
  { key: 'level', label: '水位计趋势' }, { key: 'pump', label: '泵频率趋势' },
  { key: 'siphon', label: '倒虹吸压力' }
];
</script>

<style scoped>
.trend-tabs { display: flex; gap: 5px; align-items: center; min-width: 0; }
.trend-tabs button { padding: 5px 9px; font-size: 11px; white-space: nowrap; }
</style>
