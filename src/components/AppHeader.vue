<template>
  <header class="topbar">
    <div class="brand"><span class="brand-mark"></span>智能水槽三维实时监控系统</div>
    <nav class="main-tabs" aria-label="主导航">
      <button
        v-for="tab in PAGE_TABS"
        :key="tab.key"
        class="nav-tab"
        :class="{ active: activePage === tab.key }"
        @click="$emit('navigate', tab.key)"
      >
        {{ tab.label }} <span v-if="tab.badge" class="badge">{{ tab.badge }}</span>
      </button>
    </nav>
    <div class="meta">工况：明满流混合实验</div>
    <div class="meta">实验编号：EXP-20260708-001</div>
    <div class="meta">模式：手动控制</div>
    <div class="status-strip">
      <span class="status ok">PLC 在线</span>
      <span class="status ok">WebSocket 已连接</span>
      <span class="status ok">数据库 正常</span>
    </div>
    <time class="clock">09:35:21</time>
  </header>
</template>

<script setup>
import { PAGE_TABS } from '../data/monitoring-data.js';

defineProps({
  activePage: { type: String, required: true }
});

defineEmits(['navigate']);
</script>
