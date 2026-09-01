<template>
  <div class="process-wrap aeration-process">
    <svg viewBox="0 0 1220 520" role="img" aria-label="智能曝气清水闭环工艺图">
      <defs>
        <linearGradient id="aeration-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#40c9f0" stop-opacity="0.78" />
          <stop offset="1" stop-color="#147aaa" stop-opacity="0.9" />
        </linearGradient>
        <linearGradient id="aeration-module" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0d456d" />
          <stop offset="1" stop-color="#062842" />
        </linearGradient>
      </defs>

      <rect x="1" y="1" width="1218" height="518" rx="4" fill="rgba(1, 17, 31, 0.78)" stroke="rgba(54, 145, 196, 0.48)" />

      <g class="scene-label">
        <rect x="28" y="26" width="290" height="64" rx="5" />
        <text x="48" y="52">清水曝气闭环</text>
        <text x="48" y="75">DO 偏差驱动风机与气量响应</text>
      </g>

      <g class="legend" transform="translate(1010 24)">
        <rect width="180" height="104" rx="5" />
        <line x1="18" y1="29" x2="62" y2="29" class="water-sample" />
        <text x="74" y="34">清水主流</text>
        <line x1="18" y1="56" x2="62" y2="56" class="air-sample" />
        <text x="74" y="61">曝气气路</text>
        <line x1="18" y1="82" x2="62" y2="82" class="signal-sample" />
        <text x="74" y="87">信号 / 联锁</text>
      </g>

      <g class="blower-module">
        <rect x="700" y="24" width="270" height="142" rx="8" class="module-frame" />
        <text x="835" y="51" class="module-title">曝气执行模块</text>
        <rect x="755" y="68" width="160" height="66" rx="8" class="blower-box" />
        <g transform="translate(835 101)">
          <g class="fan" :class="{ stopped: !blowerRunning }">
            <circle r="25" />
            <path d="M0 0 L20 -11 M0 0 L-18 -13 M0 0 L-2 22" />
            <circle r="5" class="fan-hub" />
          </g>
        </g>
        <text x="835" y="153" class="blower-value">风机 {{ activeBlowerPercent }}% / {{ blowerRunning ? '自动运行' : '已停止' }}</text>
      </g>

      <path d="M26 331 H128" class="water-line" />
      <path d="M128 323 L142 331 L128 339 Z" class="water-flow-arrow" />
      <text x="26" y="305" class="process-label">清水 / 模拟进水</text>

      <g class="adjustment-tank">
        <text x="246" y="235" class="process-title">调节水箱</text>
        <rect x="146" y="255" width="200" height="134" rx="7" class="tank-outline" />
        <path d="M156 302 C210 288 278 309 336 296 V378 H156 Z" class="water-fill" />
        <text x="246" y="417" class="process-caption">进水缓冲边界</text>
      </g>

      <path d="M364 331 H455" class="water-line" />
      <path d="M455 323 L469 331 L455 339 Z" class="water-flow-arrow" />

      <g class="aerobic-pool">
        <text x="650" y="210" class="pool-title">好氧池（清水曝气演示）</text>
        <rect x="470" y="230" width="360" height="180" rx="7" class="tank-outline" />
        <path d="M482 282 C574 264 704 292 818 274 V398 H482 Z" class="water-fill" />

        <g class="do-sensor">
          <text x="756" y="225">DO-01 {{ doValue }}</text>
          <rect x="742" y="238" width="28" height="102" rx="8" />
          <line x1="756" y1="340" x2="756" y2="379" />
          <circle cx="756" cy="384" r="6" />
        </g>

        <g class="diffuser">
          <path d="M560 370 H756" />
          <circle v-for="x in [582, 620, 658, 696, 734]" :key="x" :cx="x" cy="370" r="5" />
        </g>

        <g v-if="blowerRunning" class="bubbles" aria-hidden="true">
          <circle v-for="bubble in bubbles" :key="bubble.key" :cx="bubble.x" :cy="bubble.y" :r="bubble.r" :style="{ animationDelay: bubble.delay }" />
        </g>

        <text x="650" y="434" class="target-label">目标 {{ targetMin }} - {{ targetMax }}，当前 {{ doValue }}</text>
      </g>

      <path d="M846 331 C880 331 885 394 934 394 H1144" class="water-line" />
      <path d="M1144 386 L1158 394 L1144 402 Z" class="water-flow-arrow" />
      <text x="1010" y="420" class="process-label">达标出水</text>

      <path
        d="M835 137 C824 195 806 265 758 366"
        class="air-line"
        :class="{ stopped: !blowerRunning }"
      />
      <path d="M-13 -7 L0 0 L-13 7 Z" class="air-flow-arrow" transform="translate(758 366) rotate(115)" />
      <g class="air-meter">
        <rect x="802" y="218" width="78" height="29" rx="5" />
        <text x="841" y="237">AFM-01</text>
        <text x="888" y="238" class="air-flow-value">{{ airFlow }} Nm³/h</text>
      </g>

      <path d="M756 408 V470 H841 V250" class="signal-line" />
      <text x="816" y="497" class="feedback-label">DO / 气量反馈闭环</text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  doValue: { type: Number, default: 6.4 },
  airFlow: { type: Number, default: 23 },
  blowerPercent: { type: Number, default: 54 },
  blowerRunning: { type: Boolean, default: true },
  targetMin: { type: Number, default: 6.7 },
  targetMax: { type: Number, default: 7.5 },
});

const activeBlowerPercent = computed(() => props.blowerRunning ? props.blowerPercent : 0);
const bubbles = Object.freeze([
  { key: 1, x: 590, y: 344, r: 5, delay: '0s' },
  { key: 2, x: 620, y: 326, r: 4, delay: '0.3s' },
  { key: 3, x: 651, y: 349, r: 6, delay: '0.7s' },
  { key: 4, x: 681, y: 316, r: 4, delay: '1s' },
  { key: 5, x: 711, y: 342, r: 5, delay: '1.3s' },
  { key: 6, x: 738, y: 309, r: 4, delay: '0.5s' },
]);
</script>

<style scoped>
.aeration-process { width: 100%; overflow: hidden; border: 1px solid rgba(45, 142, 196, 0.35); border-radius: 4px; background: rgba(1, 17, 31, 0.78); }
.aeration-process svg { display: block; width: 100%; height: auto; }
text { fill: #cfe8f6; font-family: 'Microsoft YaHei', sans-serif; font-size: 13px; letter-spacing: 0; }
.scene-label rect { fill: rgba(6, 55, 87, 0.88); stroke: #2b9bca; }
.scene-label text:first-of-type { fill: #62dcff; font-size: 17px; font-weight: 700; }
.scene-label text:last-of-type { fill: #91b5ca; font-size: 12px; }
.legend rect { fill: rgba(2, 34, 57, 0.94); stroke: rgba(82, 157, 198, 0.5); }
.legend text { font-size: 12px; }
.water-sample, .water-line { stroke: #37cfff; stroke-width: 6; fill: none; }
.water-flow-arrow { fill: #37cfff; }
.air-sample, .air-line { stroke: #ffb347; stroke-width: 5; fill: none; stroke-dasharray: 11 8; }
.air-flow-arrow { fill: #ffb347; }
.signal-sample, .signal-line { stroke: #55dfa1; stroke-width: 2.5; fill: none; stroke-dasharray: 8 6; }
.module-frame { fill: rgba(4, 31, 51, 0.96); stroke: #4c8aad; stroke-width: 2; stroke-dasharray: 7 5; }
.module-title, .process-title, .pool-title { text-anchor: middle; fill: #f0f9ff; font-size: 17px; font-weight: 700; }
.blower-box { fill: url('#aeration-module'); stroke: #38bde8; stroke-width: 2; }
.fan { transform-box: fill-box; transform-origin: center; animation: fan-rotate 1.8s linear infinite; }
.fan.stopped { animation-play-state: paused; opacity: 0.5; }
.fan circle { fill: #3fc9ef; stroke: #a9eeff; stroke-width: 2; }
.fan path { stroke: #063d63; stroke-width: 7; stroke-linecap: round; }
.fan .fan-hub { fill: #063d63; stroke: none; }
.blower-value { text-anchor: middle; fill: #ffc65c; font-size: 12px; font-weight: 700; }
.process-label { fill: #d8eef9; font-size: 13px; font-weight: 700; }
.tank-outline { fill: rgba(4, 39, 62, 0.94); stroke: #75a5be; stroke-width: 3; }
.water-fill { fill: url('#aeration-water'); }
.process-caption { text-anchor: middle; fill: #82aabe; font-size: 12px; }
.do-sensor text { text-anchor: middle; fill: #64e5a8; font-size: 13px; font-weight: 700; }
.do-sensor rect { fill: #d8f5fd; stroke: #7396a8; stroke-width: 3; }
.do-sensor line { stroke: #7396a8; stroke-width: 3; }
.do-sensor circle { fill: #64e5a8; }
.diffuser path { fill: none; stroke: #698897; stroke-width: 7; stroke-linecap: round; }
.diffuser circle { fill: #90b5c6; }
.bubbles circle { fill: rgba(217, 247, 255, 0.9); animation: bubble-rise 1.8s ease-in-out infinite; }
.target-label { text-anchor: middle; fill: #64e5a8; font-size: 13px; font-weight: 700; }
.air-line { animation: air-flow 0.9s linear infinite; }
.air-line.stopped { animation: none; opacity: 0.28; }
.air-meter rect { fill: #533a13; stroke: #d99d3e; }
.air-meter text { text-anchor: middle; fill: #ffd478; font-size: 11px; font-weight: 700; }
.air-meter .air-flow-value { text-anchor: start; fill: #ffc65c; }
.feedback-label { text-anchor: middle; fill: #64e5a8; font-size: 13px; font-weight: 700; }
@keyframes fan-rotate { to { transform: rotate(360deg); } }
@keyframes air-flow { to { stroke-dashoffset: -38; } }
@keyframes bubble-rise { 0% { transform: translateY(10px); opacity: 0.2; } 45% { opacity: 0.95; } 100% { transform: translateY(-45px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .fan, .air-line, .bubbles circle { animation: none; } }
</style>
