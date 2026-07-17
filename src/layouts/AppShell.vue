<template>
  <div class="app-shell">
    <AppHeader :active-page="activePage" @navigate="$emit('navigate', $event)" />
    <main><slot /></main>
  </div>
</template>

<script setup>
import AppHeader from '../components/AppHeader.vue';

defineProps({
  activePage: { type: String, required: true }
});

defineEmits(['navigate']);
</script>
