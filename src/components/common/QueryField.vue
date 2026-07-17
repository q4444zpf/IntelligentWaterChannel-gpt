<template>
  <label class="query-field">
    {{ field.label }}
    <span class="fake-input" v-html="field.value"></span>
  </label>
</template>

<script setup>
defineProps({
  field: { type: Object, required: true }
});
</script>
