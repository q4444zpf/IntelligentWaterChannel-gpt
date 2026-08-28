<template>
  <div class="trend-tabs" role="tablist" aria-label="实时趋势类型">
    <button type="button" class="trend-tab-arrow" title="上一个趋势类型" aria-label="上一个趋势类型" @click="switchTab(-1)">
      <LeftOutlined aria-hidden="true" />
    </button>
    <span class="trend-tab-label" role="tab" aria-selected="true">{{ activeTab.label }}</span>
    <button type="button" class="trend-tab-arrow" title="下一个趋势类型" aria-label="下一个趋势类型" @click="switchTab(1)">
      <RightOutlined aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue';
import { computed } from 'vue';
import type { TrendTabKey } from '../../../config/trendConfig.ts';

const props = defineProps<{ activeKey: TrendTabKey }>();
const emit = defineEmits<{ 'update:activeKey': [key: TrendTabKey] }>();
const tabs: Array<{ key: TrendTabKey; label: string }> = [
  { key: 'node', label: '节点水位变化' }, { key: 'flow', label: '流量计趋势' },
  { key: 'level', label: '水位计趋势' }, { key: 'pump', label: '泵频率趋势' },
  { key: 'siphon', label: '倒虹吸压力' }
];
const activeTab = computed(() => tabs.find((tab) => tab.key === props.activeKey) || tabs[0]);

function switchTab(offset: number) {
  const currentIndex = tabs.findIndex((tab) => tab.key === props.activeKey);
  const nextIndex = (Math.max(currentIndex, 0) + offset + tabs.length) % tabs.length;
  emit('update:activeKey', tabs[nextIndex].key);
}
</script>

<style scoped>
.trend-tabs {
  display: grid;
  width: max-content;
  min-width: 0;
  grid-template-columns: 28px 112px 28px;
  align-items: center;
  gap: 6px;
}

.trend-tab-arrow {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  color: #55dcff;
  cursor: pointer;
  filter: drop-shadow(0 0 5px rgba(40, 193, 255, 0.8));
}

.trend-tab-arrow:hover,
.trend-tab-arrow:focus-visible {
  color: #ffffff;
  outline: 0;
}

.trend-tab-arrow:focus-visible {
  box-shadow: inset 0 0 0 1px rgba(110, 234, 255, 0.8);
}

.trend-tab-arrow :deep(svg) {
  width: 16px;
  height: 16px;
}

.trend-tab-label {
  overflow: hidden;
  color: #e9f8ff;
  font-size: 12px;
  font-weight: 600;
  line-height: 28px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 0 7px rgba(46, 192, 255, 0.55);
}
</style>
