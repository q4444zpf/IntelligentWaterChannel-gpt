<template>
  <div class="app-shell">
    <div class="app-shell__background" aria-hidden="true">
      <div class="app-shell__background-mask"></div>
      <img class="app-shell__background-image" :src="backgroundImage" alt="">
    </div>
    <div class="app-shell__frame" aria-hidden="true">
      <img class="app-shell__frame-side app-shell__frame-side--left" :src="borderImage" alt="">
      <img class="app-shell__frame-side app-shell__frame-side--right" :src="borderImage" alt="">
    </div>
    <AppHeader :active-page="activePage" @navigate="$emit('navigate', $event)" />
    <main><slot /></main>
  </div>
</template>

<script setup>
import borderImage from '../assets/bg-border.png';
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
  height: 100dvh;
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

.app-shell__frame {
  position: absolute;
  inset: 13px;
  z-index: 3;
  overflow: hidden;
  pointer-events: none;
}

.app-shell__frame-side {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40%;
  height: 100%;
  object-fit: fill;
}

.app-shell__frame-side--left {
  left: 0;
  object-position: left center;
}

.app-shell__frame-side--right {
  right: 0;
  object-position: right center;
  transform: scaleX(-1);
}

.app-shell > :not(.app-shell__background):not(.app-shell__frame) {
  position: relative;
  z-index: 1;
}

.app-shell > main {
  padding: 8px 41px 40px;
  min-height: 0;
  display: flex;
  flex: 1;
}

:deep(.page-realtime) {
  height: 100%;
  gap: 36px;
}

:deep(.page-history.active),
:deep(.page-alarm.active) {
  min-height: 0;
}
</style>
