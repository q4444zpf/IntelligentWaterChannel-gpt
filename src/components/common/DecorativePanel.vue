<template>
  <section class="decorative-panel" :class="directionClass">
    <header class="decorative-panel__heading">
      <div class="decorative-panel__heading-main">
        <span class="decorative-panel__corner-mark" aria-hidden="true">
          <span class="decorative-panel__corner-mark-line decorative-panel__corner-mark-line--horizontal"></span>
          <span class="decorative-panel__corner-mark-line decorative-panel__corner-mark-line--vertical"></span>
        </span>

        <img
          class="decorative-panel__arrow"
          :src="arrowImage"
          alt=""
          aria-hidden="true"
        >

        <h2 class="decorative-panel__title">{{ title }}</h2>

        <button
          v-if="actionText"
          class="decorative-panel__action"
          type="button"
          @click="handleActionClick"
        >
          {{ actionText }}
        </button>
      </div>

      <img
        class="decorative-panel__glow"
        :src="glowImage"
        alt=""
        aria-hidden="true"
      >
    </header>

    <div class="decorative-panel__content">
      <slot />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import arrowImage from '../../assets/panel-arrow-placeholder.png';
import glowImage from '../../assets/panel-glow-placeholder.png';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  direction: {
    type: String,
    default: 'right',
    validator: (value) => value === 'left' || value === 'right',
  },
  actionText: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['action-click']);

const directionClass = computed(() => `decorative-panel--${props.direction}`);

function handleActionClick(event) {
  emit('action-click', event);
}
</script>

<style scoped>
@font-face {
  font-family: 'YouSheTitle';
  src: url('../../assets/优设标题黑.ttf') format('truetype');
  font-display: swap;
}

.decorative-panel {
  --panel-border-accent: #1f9df2;
  --panel-title-color: #f4fbff;
  --panel-accent: #6ed9f7;
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  background: transparent;
}

.decorative-panel__heading {
  position: relative;
  display: block;
  height: 41px;
  min-height: 41px;
  flex: 0 0 auto;
  background: transparent;
}

.decorative-panel__heading-main {
  position: relative;
  display: block;
  height: 41px;
  min-height: 41px;
  padding: 0;
  box-sizing: border-box;
  border: 1px solid rgba(67, 187, 250, 0.82);
  border-bottom: 0;
  background: transparent;
}

.decorative-panel--right .decorative-panel__heading-main {
  border-radius: 0 30px 0 0;
}

.decorative-panel--left .decorative-panel__heading-main {
  border-radius: 30px 0 0 0;
}

.decorative-panel__corner-mark {
  position: absolute;
  top: -1px;
  left: -1px;
  display: grid;
  width: 14px;
  height: 14px;
  grid-template-columns: 2px 1fr;
  grid-template-rows: 2px 1fr;
}

.decorative-panel--left .decorative-panel__corner-mark {
  right: -1px;
  left: auto;
  transform: scaleX(-1);
}

.decorative-panel__corner-mark-line {
  display: block;
  background: var(--panel-accent);
  box-shadow: 0 0 6px rgba(110, 217, 247, 0.65);
}

.decorative-panel__corner-mark-line--horizontal {
  grid-column: 1 / -1;
  grid-row: 1;
}

.decorative-panel__corner-mark-line--vertical {
  grid-column: 1;
  grid-row: 1 / -1;
}

.decorative-panel__arrow {
  position: absolute;
  top: 0;
  right: 0;
  display: block;
  height: 100%;
  object-fit: contain;
  opacity: 0.95;
}

.decorative-panel--left .decorative-panel__arrow {
  right: auto;
  left: 0;
  transform: scaleX(-1);
}

.decorative-panel--left .decorative-panel__title {
  left: 62px;
}

.decorative-panel__title {
  position: absolute;
  top: 10px;
  left: 22px;
  display: flex;
  height: 21px;
  align-items: center;
  margin: 0;
  padding: 0;
  overflow: visible;
  color: var(--panel-title-color);
  font-family: 'YouSheTitle', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 24px;
  font-variation-settings: 'opsz' auto;
  font-weight: normal;
  letter-spacing: 0;
  line-height: 21px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.decorative-panel__title::before {
  display: none;
  content: none;
}

.decorative-panel__action {
  position: absolute;
  top: 8px;
  right: 18px;
  max-width: 42%;
  overflow: hidden;
  border: 0;
  padding: 4px 2px;
  background: transparent;
  color: #d6efff;
  font-size: 15px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.decorative-panel__action::after {
  display: inline-block;
  margin-left: 8px;
  color: var(--panel-accent);
  content: '›';
  font-size: 24px;
  line-height: 0;
  vertical-align: -2px;
}

.decorative-panel__action:hover,
.decorative-panel__action:focus-visible {
  color: #ffffff;
  outline: 0;
  text-shadow: 0 0 10px rgba(110, 217, 247, 0.8);
}

.decorative-panel__action:focus-visible {
  border-radius: 3px;
  box-shadow: 0 0 0 2px rgba(110, 217, 247, 0.35);
}

.decorative-panel__glow {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: block;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0.9;
  pointer-events: none;
}

.decorative-panel--left .decorative-panel__glow {
  left: 24px;
}

.decorative-panel__content {
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  padding: 14px;
  border: 1px solid transparent;
  border-image: linear-gradient(180deg, rgba(31, 157, 242, 0.18) 0%, var(--panel-border-accent) 100%) 1;
  background: rgba(2, 22, 46, 0.74);
  color: #d9ecff;
}

@media (max-width: 560px) {
  .decorative-panel {
    min-height: 240px;
  }

  .decorative-panel__heading-main {
    padding: 0;
  }

  .decorative-panel__action {
    max-width: 38%;
    font-size: 13px;
  }
}
</style>
