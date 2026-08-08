<template>
  <div class="app-shell">
    <div class="app-shell__background" aria-hidden="true">
      <div class="app-shell__background-mask"></div>
      <img class="app-shell__background-image" :src="backgroundImage" alt="">
    </div>
    <AppHeader :active-page="activePage" @navigate="$emit('navigate', $event)" />
    <main><slot /></main>
  </div>
</template>

<script setup>
import backgroundImage from '../assets/login/bg.jpg';
import AppHeader from '../components/AppHeader.vue';

defineProps({
  activePage: { type: String, required: true }
});

defineEmits(['navigate']);
</script>

<style scoped>
.app-shell {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

.app-shell__background {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.app-shell__background-image,
.app-shell__background-mask {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.app-shell__background-image {
  mix-blend-mode: hard-light;
  opacity: 0.3;
  object-fit: cover;
  object-position: center;
  filter: opacity(0.20000000298023224);
}

.app-shell__background-mask {
  opacity: 1;
  background: radial-gradient(50% 50% at 50% 50%, #0d2a54 0%, #002245 100%);
}

.app-shell > :not(.app-shell__background) {
  position: relative;
  z-index: 1;
}
</style>
