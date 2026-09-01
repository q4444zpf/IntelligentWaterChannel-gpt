<template>
  <div class="process-wrap">
    <svg
      class="process-svg"
      viewBox="0 0 1500 520"
      role="img"
      aria-label="智能加药扰动、混凝、絮凝、沉淀、清水闭环过程图"
    >
      <defs>
        <linearGradient id="process-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3aa8d8" stop-opacity="0.78" />
          <stop offset="1" stop-color="#11689c" stop-opacity="0.9" />
        </linearGradient>
        <linearGradient id="process-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0c3556" stop-opacity="0.96" />
          <stop offset="1" stop-color="#061e37" stop-opacity="0.98" />
        </linearGradient>
        <filter id="process-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <marker id="process-arrow" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto" viewBox="0 0 14 12">
          <path d="M0,1 L0,11 L13,6 z" fill="#36c9ff" />
        </marker>
        <marker id="pac-arrow" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="12" refX="12" refY="6" orient="auto" viewBox="0 0 14 12">
          <path d="M0,1 L0,11 L13,6 z" fill="#ff5e57" />
        </marker>
        <marker id="feedback-arrow" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="10" refX="10" refY="5" orient="auto" viewBox="0 0 12 10">
          <path d="M0,1 L0,9 L11,5 z" fill="#47dfa0" />
        </marker>
      </defs>

      <rect width="1500" height="520" rx="10" fill="rgba(2, 20, 39, 0.9)" />
      <g class="process-grid" opacity="0.24">
        <path v-for="x in 15" :key="`x-${x}`" :d="`M${x * 100} 0 V520`" />
        <path v-for="y in 5" :key="`y-${y}`" :d="`M0 ${y * 100} H1500`" />
      </g>

      <g class="legend" transform="translate(1234 28)">
        <rect width="232" height="98" rx="6" fill="rgba(5, 34, 59, 0.94)" stroke="#376a8e" />
        <line x1="20" y1="25" x2="73" y2="25" class="main-flow" />
        <text x="88" y="30">主水流</text>
        <line x1="20" y1="50" x2="73" y2="50" class="pac-flow" />
        <text x="88" y="55">PAC加药</text>
        <line x1="20" y1="76" x2="73" y2="76" class="feedback-flow" />
        <text x="88" y="81">信号 / 闭环</text>
      </g>

      <g class="dosing-module">
        <rect x="482" y="24" width="446" height="156" rx="9" fill="url(#process-panel)" stroke="#4e9bc5" stroke-dasharray="7 5" />
        <text x="705" y="52" class="module-title">加药执行模块</text>
        <g transform="translate(528 75)">
          <text x="48" y="-9" class="device-title">PAC 配药箱</text>
          <rect width="96" height="72" rx="6" class="device-shell" />
          <rect x="9" y="28" width="78" height="35" rx="3" fill="#37aee6" opacity="0.75" />
          <path d="M9 28 C30 21, 55 34, 87 28" class="water-line" />
          <line x1="48" y1="5" x2="48" y2="55" class="mixer-shaft" />
          <ellipse cx="48" cy="56" rx="19" ry="5" class="mixer-blade" />
        </g>
        <g transform="translate(715 78)">
          <text x="66" y="-9" class="device-title">PAC 计量泵</text>
          <rect width="132" height="68" rx="9" class="pump-shell" />
          <circle cx="36" cy="34" r="25" fill="#2bb7ed" stroke="#65e4ff" stroke-width="3" />
          <g :class="{ 'pump-rotor--running': pumpRunning }" class="pump-rotor">
            <circle cx="36" cy="34" r="7" fill="#07395e" />
            <circle cx="36" cy="19" r="5" class="rotor-node" />
            <circle cx="49" cy="43" r="5" class="rotor-node" />
            <circle cx="23" cy="43" r="5" class="rotor-node" />
          </g>
          <rect x="78" y="17" width="38" height="34" rx="4" fill="#173b55" />
          <text x="66" y="88" class="pump-reading">{{ pumpRunning ? pumpPercent : 0 }}% / PAC</text>
        </g>
        <path
          d="M837 115 C770 190, 615 190, 462 248"
          class="pac-dose-line"
          :class="{ idle: !pumpRunning }"
          marker-end="url(#pac-arrow)"
        />
        <text x="665" y="199" class="pac-label">PAC 投加</text>
      </g>

      <text x="20" y="303" class="endpoint-label">来水 / 进水</text>
      <line x1="22" y1="324" x2="91" y2="324" class="main-flow animated-flow" marker-end="url(#process-arrow)" />

      <g v-for="(stage, index) in stages" :key="stage.name">
        <line
          v-if="index > 0"
          :x1="stage.x - 47"
          y1="324"
          :x2="stage.x - 12"
          y2="324"
          class="main-flow animated-flow"
          marker-end="url(#process-arrow)"
        />
        <text :x="stage.x + stage.width / 2" y="235" class="stage-name">{{ stage.name }}</text>
        <path
          v-if="stage.type !== 'sedimentation'"
          :d="`M${stage.x} 250 V374 Q${stage.x} 384 ${stage.x + 10} 384 H${stage.x + stage.width - 10} Q${stage.x + stage.width} 384 ${stage.x + stage.width} 374 V250`"
          class="tank-shell"
        />
        <path
          v-else
          :d="`M${stage.x} 250 V350 L${stage.x + stage.width / 2} 400 L${stage.x + stage.width} 350 V250`"
          class="tank-shell"
        />
        <path
          v-if="stage.type !== 'sedimentation'"
          :d="`M${stage.x + 8} 289 H${stage.x + stage.width - 8} V375 H${stage.x + 8} Z`"
          :fill="stage.color"
          opacity="0.78"
        />
        <path
          v-else
          :d="`M${stage.x + 9} 289 H${stage.x + stage.width - 9} V346 L${stage.x + stage.width / 2} 389 L${stage.x + 9} 346 Z`"
          :fill="stage.color"
          opacity="0.65"
        />
        <path :d="`M${stage.x + 8} 290 C${stage.x + 45} 280, ${stage.x + stage.width - 55} 302, ${stage.x + stage.width - 8} 290`" class="water-line" />
        <line
          v-if="stage.type === 'flocculation'"
          v-for="divider in [1, 2]"
          :key="divider"
          :x1="stage.x + (stage.width / 3) * divider"
          y1="260"
          :x2="stage.x + (stage.width / 3) * divider"
          y2="377"
          class="tank-divider"
        />
        <path
          v-if="stage.type === 'sedimentation'"
          :d="`M${stage.x + 32} 360 Q${stage.x + stage.width / 2} 329 ${stage.x + stage.width - 32} 360 L${stage.x + stage.width / 2} 390 Z`"
          fill="#ac7941"
          opacity="0.82"
        />
        <g v-if="stage.mixer" :transform="`translate(${stage.x + stage.width / 2} 0)`">
          <rect x="-10" y="272" width="20" height="16" rx="3" fill="#9bc4d8" />
          <line y1="288" y2="350" class="mixer-shaft" />
          <g class="tank-mixer">
            <ellipse cx="-22" cy="350" rx="23" ry="5" class="mixer-blade" />
            <ellipse cx="22" cy="350" rx="23" ry="5" class="mixer-blade" />
          </g>
        </g>
        <circle
          v-for="particle in stage.particles"
          :key="particle"
          :cx="stage.x + 18 + ((particle * 29) % (stage.width - 36))"
          :cy="314 + ((particle * 17) % 48)"
          :r="2 + (particle % 3)"
          fill="#68481f"
          opacity="0.52"
        />
        <text :x="stage.x + stage.width / 2" y="421" class="stage-reading">{{ stage.reading }}</text>
      </g>

      <g transform="translate(218 257)">
        <rect x="-102" y="12" width="94" height="47" rx="5" class="meter-label" />
        <text x="-55" y="32" class="meter-name">前馈浊度仪</text>
        <text x="-55" y="51" class="meter-code">TUB-01</text>
        <rect x="-7" width="14" height="91" rx="4" class="meter-probe" />
        <rect x="-9" y="-15" width="18" height="20" rx="3" fill="#b7d9e7" />
      </g>
      <g transform="translate(1365 246)">
        <rect x="-52" y="-62" width="104" height="46" rx="5" class="meter-label" />
        <text y="-43" class="meter-name">后馈浊度仪</text>
        <text y="-24" class="meter-code">TUB-02</text>
        <rect x="-7" width="14" height="91" rx="4" class="meter-probe" />
        <rect x="-9" y="-15" width="18" height="20" rx="3" fill="#b7d9e7" />
      </g>

      <line x1="1398" y1="324" x2="1462" y2="324" class="main-flow animated-flow" marker-end="url(#process-arrow)" />
      <text x="1453" y="365" class="endpoint-label" text-anchor="middle">达标排放</text>
      <text x="1453" y="388" class="endpoint-label" text-anchor="middle">或回用</text>

      <path d="M218 384 V462 H1365 V397" class="feedback-flow" marker-end="url(#feedback-arrow)" />
      <path d="M562 462 V392" class="feedback-flow" marker-end="url(#feedback-arrow)" />
      <text x="815" y="489" class="feedback-label">信号 / 控制 / 反馈闭环</text>
      <text x="815" y="511" class="running-label">{{ pumpRunning ? '自动投加执行正常' : 'PAC 泵已停止' }}</text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  preTurbidity: { type: Number, default: 42 },
  postTurbidity: { type: Number, default: 16 },
  pumpPercent: { type: Number, default: 48 },
  pumpRunning: { type: Boolean, default: true },
});

function turbidityColor(value) {
  const ratio = Math.min(1, Math.max(0, value) / 80);
  const red = Math.round(42 + ratio * 88);
  const green = Math.round(166 - ratio * 48);
  const blue = Math.round(218 - ratio * 92);
  return `rgb(${red}, ${green}, ${blue})`;
}

const stages = computed(() => {
  const pre = props.preTurbidity;
  const post = props.postTurbidity;
  const values = [pre, pre * 0.76, pre * 0.55, post * 1.12, post];
  return [
    { name: '扰动池', x: 100, width: 180, value: values[0], mixer: true, particles: 7 },
    { name: '混凝池', x: 370, width: 180, value: values[1], mixer: true, particles: 6 },
    { name: '分格絮凝池', x: 625, width: 240, value: values[2], type: 'flocculation', particles: 12 },
    { name: '辐流沉淀池', x: 940, width: 210, value: values[3], type: 'sedimentation', particles: 5 },
    { name: '清水池', x: 1210, width: 180, value: values[4], particles: 2 },
  ].map((stage) => ({
    ...stage,
    color: turbidityColor(stage.value),
    reading: `${stage.name === '扰动池' ? 'TUB-01 ' : stage.name === '清水池' ? 'TUB-02 ' : ''}${stage.value.toFixed(1)} NTU`,
  }));
});
</script>

<style scoped>
.process-wrap {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(54, 156, 218, 0.38);
  border-radius: 4px;
  background: rgba(2, 20, 39, 0.9);
  box-shadow: inset 0 0 36px rgba(27, 121, 181, 0.08);
}

.process-svg {
  display: block;
  width: 100%;
  height: auto;
  min-height: 360px;
}

.process-grid path { fill: none; stroke: #37759b; stroke-width: 1; }
.legend text,
.device-title,
.pump-reading,
.pac-label,
.stage-reading,
.feedback-label,
.running-label { fill: #b8d8e9; font-size: 14px; font-weight: 700; text-anchor: middle; }
.legend text { text-anchor: start; }
.main-flow { fill: none; stroke: #36c9ff; stroke-width: 8; stroke-linecap: round; }
.pac-flow,
.pac-dose-line { fill: none; stroke: #ff5e57; stroke-width: 5; stroke-linecap: round; }
.feedback-flow { fill: none; stroke: #47dfa0; stroke-width: 3; stroke-dasharray: 8 7; }
.module-title { fill: #f2fbff; font-size: 19px; font-weight: 700; text-anchor: middle; }
.device-shell { fill: #0b2b47; stroke: #6ca7c7; stroke-width: 2; }
.pump-shell { fill: #0b2b47; stroke: #4f99c6; stroke-width: 2; }
.water-line { fill: none; stroke: #68d8ff; stroke-width: 2.5; }
.mixer-shaft { stroke: #b7d9e7; stroke-width: 4; stroke-linecap: round; }
.mixer-blade { fill: #d9f2fa; stroke: #7eb1c9; stroke-width: 2; }
.rotor-node { fill: #b9efff; stroke: #0b5583; stroke-width: 2; }
.pump-rotor { transform-origin: 36px 34px; }
.pump-rotor--running { animation: pump-rotate 1s linear infinite; }
.pac-dose-line { stroke-dasharray: 10 8; animation: pac-flow 0.9s linear infinite; }
.pac-dose-line.idle { animation: none; opacity: 0.3; }
.pac-label { fill: #ff9792; font-size: 15px; }
.endpoint-label { fill: #e9f8ff; font-size: 17px; font-weight: 700; }
.stage-name { fill: #f2fbff; font-size: 18px; font-weight: 700; text-anchor: middle; }
.stage-reading { fill: #b8d8e9; }
.tank-shell { fill: rgba(10, 44, 69, 0.74); stroke: #769bb1; stroke-width: 3; }
.tank-divider { stroke: #6f91a4; stroke-width: 2.5; }
.meter-label { fill: rgba(7, 39, 63, 0.96); stroke: #6b99b2; }
.meter-name,
.meter-code { fill: #eaf8ff; font-size: 13px; font-weight: 700; text-anchor: middle; }
.meter-code { font-size: 15px; fill: #66e4ff; }
.meter-probe { fill: #d9f2fa; stroke: #7198ad; stroke-width: 3; }
.feedback-label { fill: #64e5a8; font-size: 15px; }
.running-label { fill: #47dfa0; }
.animated-flow { stroke-dasharray: 20 9; animation: water-flow 1.1s linear infinite; }

@keyframes water-flow { to { stroke-dashoffset: -29; } }
@keyframes pac-flow { to { stroke-dashoffset: -36; } }
@keyframes pump-rotate { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .animated-flow,
  .pac-dose-line,
  .pump-rotor--running { animation: none; }
}
</style>
