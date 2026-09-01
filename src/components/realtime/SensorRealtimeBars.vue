<template>
  <div class="sensor-realtime-bars" role="list" :aria-label="ariaLabel">
    <div v-for="item in normalizedItems" :key="item.key" class="sensor-bar" role="listitem">
      <div class="sensor-bar__head">
        <span>{{ item.label }}</span>
        <strong>
          {{ item.displayValue }}
          <small v-if="item.unit">{{ item.unit }}</small>
        </strong>
      </div>
      <div
        class="sensor-bar__track"
        role="progressbar"
        :aria-label="`${item.label} ${item.displayValue}${item.unit ? ` ${item.unit}` : ''}`"
        :aria-valuemin="0"
        :aria-valuemax="item.max"
        :aria-valuenow="item.value"
      >
        <span
          class="sensor-bar__fill"
          :style="{ width: `${item.percent}%`, '--sensor-bar-color': item.color }"
        ></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  items: { type: Array, default: () => [] },
  ariaLabel: { type: String, default: '传感器实时数据' },
});

const normalizedItems = computed(() => props.items.map((item, index) => {
  const max = Math.max(1, Number(item.max) || 1);
  const value = Math.min(max, Math.max(0, Number(item.value) || 0));
  const precision = Math.max(0, Number(item.precision) || 0);
  return {
    ...item,
    key: item.key || item.label || index,
    max,
    value,
    percent: (value / max) * 100,
    displayValue: value.toFixed(precision),
    color: item.color || '#39d8ff',
  };
}));
</script>

<style scoped>
.sensor-realtime-bars {
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 0;
  grid-template-rows: repeat(4, minmax(44px, 1fr));
  gap: 8px;
  padding: 7px 5px 9px;
}

.sensor-bar {
  display: flex;
  min-height: 0;
  flex-direction: column;
  justify-content: center;
  gap: 7px;
}

.sensor-bar__head {
  display: flex;
  min-width: 0;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.sensor-bar__head > span {
  overflow: hidden;
  color: #b9d5e7;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sensor-bar__head strong {
  flex: 0 0 auto;
  color: #f4fbff;
  font-size: 17px;
  font-weight: 700;
}

.sensor-bar__head small {
  margin-left: 3px;
  color: #8fb3ca;
  font-size: 10px;
  font-weight: 500;
}

.sensor-bar__track {
  position: relative;
  height: 12px;
  flex: 0 0 12px;
  overflow: hidden;
  border: 1px solid rgba(71, 151, 200, 0.34);
  border-radius: 2px;
  background: rgba(18, 62, 92, 0.5);
}

.sensor-bar__fill {
  display: block;
  height: 100%;
  border-radius: 1px;
  background: var(--sensor-bar-color);
  box-shadow: 0 0 10px color-mix(in srgb, var(--sensor-bar-color) 55%, transparent);
}

@media (max-height: 820px) {
  .sensor-realtime-bars { gap: 5px; padding-top: 4px; padding-bottom: 5px; }
  .sensor-bar { gap: 4px; }
  .sensor-bar__head strong { font-size: 15px; }
  .sensor-bar__track { height: 9px; flex-basis: 9px; }
}
</style>
