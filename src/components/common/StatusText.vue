<template>
  <span><span class="dot" :class="statusClass"></span>{{ value }}</span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: { type: String, required: true }
});

const statusClass = computed(() => {
  if (props.value === '在线' || props.value === '正常') return 'ok';
  if (props.value === '离线') return 'off';
  return 'bad';
});
</script>
