<template>
  <div class="welcome-screen">

    <!-- Background layers -->
    <div class="bg-nebula"></div>
    <div class="bg-grid"></div>
    <div class="bg-grid bg-grid-fine"></div>
    <div class="bg-particles">
      <span
        v-for="(p, i) in particles"
        :key="i"
        class="particle"
        :class="{ 'particle-glow': p.glow }"
        :style="{
          left: p.left,
          top: p.top,
          width: p.size,
          height: p.size,
          opacity: p.opacity,
          animationDelay: p.delay,
          animationDuration: p.duration
        }"
      ></span>
    </div>
    <div class="bg-data-streams">
      <span
        v-for="(s, i) in dataStreams"
        :key="'s-' + i"
        class="data-stream"
        :style="{
          left: s.left,
          width: s.width,
          height: s.height,
          animationDelay: s.delay,
          animationDuration: s.duration
        }"
      ></span>
    </div>
    <div class="bg-horizon"></div>
    <div class="bg-orb bg-orb-1"></div>
    <div class="bg-orb bg-orb-2"></div>
    <div class="bg-orb bg-orb-3"></div>
    <div class="bg-overlay"></div>

    <!-- Top header -->
    <header class="welcome-header">
      <div class="header-brand">
        <div class="brand-mark"></div>
        <span class="brand-text">智能水槽监控系统</span>
      </div>
      <div class="header-status">
        <span class="status-dot"></span>
        <span class="status-text">系统运行中</span>
        <span class="status-divider"></span>
        <span class="status-time">{{ currentTime }}</span>
      </div>
    </header>

    <!-- Main content -->
    <main class="welcome-main">
      <!-- Hero section -->
      <div class="hero-section">
        <div class="hero-logo">
          <div class="logo-ring"></div>
          <div class="logo-mark"></div>
        </div>

        <p class="hero-label">DIGITAL TWIN MONITORING PLATFORM</p>

        <h1 class="hero-title">智能水槽三维实时监控系统</h1>

        <p class="hero-desc">
          融合三维数字孪生与实时感知，集中呈现水槽工况、设备状态、实验数据与运行预警
        </p>

        <button class="enter-btn" @click="enterWorkbench">
          <span>进入工作台</span>
          <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>

      <!-- Feature cards -->
      <div class="features-grid">
        <div class="feature-card" v-for="(f, i) in features" :key="f.title" :style="{ animationDelay: `${0.5 + i * 0.1}s` }">
          <div class="feature-icon" v-html="f.svg"></div>
          <h3 class="feature-title">{{ f.title }}</h3>
          <p class="feature-desc">{{ f.desc }}</p>
        </div>
      </div>

      <!-- Stats bar -->
      <div class="stats-bar">
        <div class="stat-item" v-for="s in stats" :key="s.label">
          <span class="stat-value">{{ s.value }}</span>
          <span class="stat-label">{{ s.label }}</span>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="welcome-footer">
      <span>© 2026 IntelligentWaterChannel · 数字孪生监控平台</span>
      <span class="footer-dot"></span>
      <span class="footer-version">v2.0</span>
    </footer>

    <div class="bottom-glow"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const currentTime = ref('');
let timer = null;

function updateTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  currentTime.value = `${h}:${m}:${s}`;
}

onMounted(() => {
  updateTime();
  timer = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

function enterWorkbench() {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  router.push({ name: isLoggedIn ? 'main' : 'login' });
}

const features = [
  {
    title: '三维数字孪生',
    desc: '高保真三维建模，实时同步水槽运行状态与空间数据',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/></svg>'
  },
  {
    title: '实时监控',
    desc: '多维度传感器数据实时采集，工况全景可视化呈现',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>'
  },
  {
    title: '报警管理',
    desc: '智能阈值预警，多级报警推送与处置流程闭环',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>'
  },
  {
    title: '历史数据分析',
    desc: '多维度历史趋势分析，支持数据回溯与对比导出',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>'
  }
];

const stats = [
  { value: '6', label: '渠道' },
  { value: '7', label: '闸门' },
  { value: '1', label: '水泵' },
  { value: '6', label: '水位计' },
  { value: '3', label: '压力计' },
  { value: '1', label: '流量计' },
    { value: '2', label: '处倒虹' }
];

const particles = Array.from({ length: 50 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  size: `${1 + Math.random() * 3}px`,
  delay: `${Math.random() * 8}s`,
  duration: `${6 + Math.random() * 10}s`,
  opacity: 0.15 + Math.random() * 0.45,
  glow: Math.random() > 0.75
}));

const dataStreams = Array.from({ length: 8 }, () => ({
  left: `${10 + Math.random() * 80}%`,
  width: `${1 + Math.random() * 2}px`,
  height: `${60 + Math.random() * 120}px`,
  delay: `${Math.random() * 6}s`,
  duration: `${4 + Math.random() * 5}s`
}));
</script>

<style scoped>
.welcome-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #02111f;
}

/* ===== Background layers ===== */

.bg-nebula {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0, 80, 180, 0.18), transparent 60%),
    radial-gradient(ellipse 60% 40% at 20% 80%, rgba(0, 120, 220, 0.1), transparent 55%),
    radial-gradient(ellipse 50% 35% at 80% 75%, rgba(0, 90, 200, 0.1), transparent 55%),
    radial-gradient(ellipse 120% 60% at 50% 50%, rgba(2, 17, 31, 0.2), transparent 70%);
}

.bg-grid {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(rgba(77, 184, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(77, 184, 255, 0.05) 1px, transparent 1px);
  background-size: 60px 60px;
  -webkit-mask-image: radial-gradient(ellipse 75% 65% at center, black 25%, transparent 85%);
  mask-image: radial-gradient(ellipse 75% 65% at center, black 25%, transparent 85%);
  animation: gridDrift 20s linear infinite;
}

.bg-grid-fine {
  z-index: 1;
  background:
    linear-gradient(rgba(77, 184, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(77, 184, 255, 0.025) 1px, transparent 1px);
  background-size: 20px 20px;
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at center, black 30%, transparent 80%);
  mask-image: radial-gradient(ellipse 70% 60% at center, black 30%, transparent 80%);
  animation: gridDriftFine 12s linear infinite reverse;
}

.bg-particles {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.particle {
  position: absolute;
  border-radius: 50%;
  background: rgba(100, 200, 255, 0.85);
  box-shadow: 0 0 4px rgba(100, 200, 255, 0.5);
  animation-name: particleFloat;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}

.particle-glow {
  background: radial-gradient(circle, rgba(140, 230, 255, 1), rgba(60, 170, 255, 0.2) 40%, transparent 70%);
  box-shadow: 0 0 10px rgba(100, 210, 255, 0.8), 0 0 24px rgba(40, 160, 255, 0.35);
  animation-name: particlePulse;
}

.bg-data-streams {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}

.data-stream {
  position: absolute;
  top: -160px;
  border-radius: 999px;
  background: linear-gradient(180deg, transparent, rgba(90, 200, 255, 0.25), rgba(140, 230, 255, 0.55), transparent);
  filter: blur(1px);
  opacity: 0.55;
  animation-name: dataStreamFall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.bg-horizon {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 22%;
  z-index: 1;
  pointer-events: none;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(40, 150, 255, 0.15) 20%,
    rgba(90, 210, 255, 0.35) 50%,
    rgba(40, 150, 255, 0.15) 80%,
    transparent 100%
  );
  box-shadow: 0 0 40px rgba(50, 170, 255, 0.25), 0 -12px 60px rgba(40, 150, 255, 0.08);
  animation: horizonPulse 5s ease-in-out infinite;
}

.bg-horizon::before {
  content: "";
  position: absolute;
  left: 50%;
  top: -60px;
  width: 1px;
  height: 120px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, transparent, rgba(80, 190, 255, 0.2), transparent);
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 1;
  pointer-events: none;
}

.bg-orb-1 {
  width: 560px;
  height: 560px;
  left: -14%;
  top: 12%;
  background: radial-gradient(circle, rgba(0, 100, 255, 0.16), transparent 70%);
  animation: orbDrift1 16s ease-in-out infinite;
}

.bg-orb-2 {
  width: 460px;
  height: 460px;
  right: -10%;
  bottom: 6%;
  background: radial-gradient(circle, rgba(0, 180, 255, 0.12), transparent 70%);
  animation: orbDrift2 20s ease-in-out infinite;
}

.bg-orb-3 {
  width: 360px;
  height: 360px;
  left: 50%;
  top: 28%;
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(60, 160, 255, 0.16), transparent 70%);
  animation: orbDrift3 18s ease-in-out infinite;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    radial-gradient(
      ellipse 680px 340px at 50% 46%,
      rgba(0, 10, 22, 0.45) 0%,
      transparent 72%
    ),
    linear-gradient(
      180deg,
      rgba(0, 8, 17, 0.55) 0%,
      transparent 20%,
      transparent 75%,
      rgba(0, 8, 17, 0.55) 100%
    );
}

/* ===== Top header ===== */

.welcome-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 32px;
  border-bottom: 1px solid rgba(44, 148, 255, 0.1);
  background: rgba(2, 17, 31, 0.4);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  animation: fadeInDown 0.6s ease-out both;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  width: 18px;
  height: 22px;
  background: linear-gradient(145deg, #4cc7ff, #006cff);
  clip-path: polygon(50% 0, 92% 54%, 72% 100%, 28% 100%, 8% 54%);
  box-shadow: 0 0 12px rgba(24, 156, 255, 0.6);
}

.brand-text {
  font-size: 15px;
  font-weight: 700;
  color: #c8e0ff;
  letter-spacing: 1px;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #8da8c8;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #39e66d;
  box-shadow: 0 0 8px rgba(57, 230, 109, 0.8);
  animation: dotPulse 2s ease-in-out infinite;
}

.status-text {
  color: #5fdc7f;
  font-weight: 600;
}

.status-divider {
  width: 1px;
  height: 12px;
  background: rgba(100, 160, 220, 0.3);
}

.status-time {
  color: #c8e0ff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}

/* ===== Main content ===== */

.welcome-main {
  position: relative;
  z-index: 5;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 32px;
  gap: 36px;
}

/* ===== Hero section ===== */

.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
  animation: contentSettle 0.7s ease-out both;
}

.hero-logo {
  position: relative;
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  margin-bottom: 6px;
  animation: riseIn 0.7s 0.1s ease-out both;
}

.logo-ring {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(80, 190, 255, 0.18);
  border-radius: 50%;
}

.logo-ring::before,
.logo-ring::after {
  content: "";
  position: absolute;
  inset: -6px;
  border: 1px solid rgba(80, 190, 255, 0.12);
  border-radius: 50%;
}

.logo-ring::before {
  animation: ringExpand 3s ease-out infinite;
}

.logo-ring::after {
  animation: ringExpand 3s 1.5s ease-out infinite;
}

.logo-mark {
  width: 40px;
  height: 50px;
  background: linear-gradient(145deg, #7ee3ff 0%, #1da4ff 45%, #0067dc 100%);
  clip-path: polygon(50% 0, 92% 54%, 72% 100%, 28% 100%, 8% 54%);
  box-shadow:
    0 0 20px rgba(64, 189, 255, 0.55),
    0 0 44px rgba(0, 118, 255, 0.28);
  animation: logoGlow 3s ease-in-out infinite;
}

.hero-label {
  margin: 0;
  color: rgba(166, 221, 255, 0.85);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 3px;
  text-shadow: 0 0 14px rgba(38, 162, 255, 0.3);
  animation: riseIn 0.7s 0.2s ease-out both;
}

.hero-title {
  margin: 0;
  font-size: 42px;
  font-weight: 800;
  letter-spacing: 3px;
  line-height: 1.2;
  background: linear-gradient(180deg, #ffffff 0%, #a8ccff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter:
    drop-shadow(0 2px 12px rgba(0, 6, 15, 0.8))
    drop-shadow(0 0 28px rgba(31, 154, 255, 0.36));
  animation: riseIn 0.7s 0.3s ease-out both;
}

.hero-desc {
  max-width: 720px;
  margin: 0;
  color: rgba(213, 233, 249, 0.85);
  font-size: 15px;
  line-height: 1.7;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 10px rgba(0, 5, 14, 0.92);
  white-space: nowrap;
  animation: riseIn 0.7s 0.4s ease-out both;
}

.enter-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 180px;
  height: 48px;
  padding: 0 36px;
  margin-top: 8px;
  color: #f4fbff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #1788f2 0%, #075abd 100%);
  border: 1px solid rgba(98, 198, 255, 0.68);
  border-radius: 8px;
  cursor: pointer;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 8px 26px rgba(0, 112, 230, 0.34),
    0 0 24px rgba(46, 171, 255, 0.2);
  transition: all 0.3s ease;
  animation: riseIn 0.7s 0.5s ease-out both, buttonPulse 4.2s 1.4s ease-in-out infinite;
}

.btn-arrow {
  width: 18px;
  height: 18px;
  transition: transform 0.3s ease;
}

.enter-btn:hover {
  background: linear-gradient(135deg, #28a2ff 0%, #0867d2 100%);
  border-color: rgba(140, 222, 255, 0.86);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 10px 32px rgba(0, 132, 255, 0.44),
    0 0 34px rgba(56, 184, 255, 0.32);
  transform: translateY(-2px);
}

.enter-btn:hover .btn-arrow {
  transform: translateX(4px);
}

.enter-btn:active {
  transform: translateY(0);
}

/* ===== Feature cards ===== */

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  width: 100%;
  max-width: 920px;
}

.feature-card {
  position: relative;
  padding: 24px 18px;
  border: 1px solid rgba(44, 148, 255, 0.2);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(5, 31, 54, 0.5), rgba(2, 16, 31, 0.6));
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  text-align: center;
  overflow: hidden;
  transition: all 0.35s ease;
  animation: riseIn 0.7s ease-out both;
}

.feature-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(80, 190, 255, 0.5), transparent);
}

.feature-card::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 30%;
  right: 30%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(80, 190, 255, 0.15), transparent);
}

.feature-card:hover {
  border-color: rgba(80, 190, 255, 0.45);
  background: linear-gradient(135deg, rgba(10, 50, 85, 0.6), rgba(4, 28, 50, 0.7));
  transform: translateY(-4px);
  box-shadow:
    0 12px 40px rgba(0, 100, 200, 0.15),
    0 0 20px rgba(40, 170, 255, 0.1);
}

.feature-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin: 0 auto 14px;
  border: 1px solid rgba(80, 190, 255, 0.25);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(20, 100, 180, 0.2), rgba(5, 40, 80, 0.3));
  color: #5ec4ff;
  transition: all 0.35s ease;
}

.feature-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.feature-card:hover .feature-icon {
  border-color: rgba(80, 190, 255, 0.5);
  background: linear-gradient(135deg, rgba(30, 120, 210, 0.3), rgba(10, 50, 100, 0.4));
  color: #8ee0ff;
  box-shadow: 0 0 16px rgba(40, 170, 255, 0.2);
}

.feature-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 700;
  color: #e8f4ff;
  letter-spacing: 1px;
}

.feature-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #8da8c8;
}

/* ===== Stats bar ===== */

.stats-bar {
  display: flex;
  width: 100%;
  max-width: 920px;
  border: 1px solid rgba(44, 148, 255, 0.15);
  border-radius: 10px;
  background: rgba(5, 31, 54, 0.3);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  overflow: hidden;
  animation: riseIn 0.7s 0.9s ease-out both;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 12px;
  border-right: 1px solid rgba(44, 148, 255, 0.08);
}

.stat-item:last-child {
  border-right: none;
}

.stat-value {
  font-size: 26px;
  font-weight: 800;
  color: #e8f4ff;
  letter-spacing: 1px;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 20px rgba(31, 154, 255, 0.3);
}

.stat-label {
  font-size: 12px;
  color: #8da8c8;
  letter-spacing: 1px;
}

/* ===== Footer ===== */

.welcome-footer {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  font-size: 12px;
  color: rgba(141, 168, 200, 0.45);
  letter-spacing: 0.5px;
  animation: fadeInUp 0.6s 1s ease-out both;
}

.footer-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(141, 168, 200, 0.4);
}

.footer-version {
  color: rgba(141, 168, 200, 0.6);
  font-weight: 600;
}

/* ===== Bottom glow ===== */

.bottom-glow {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(31, 160, 255, 0.7),
    rgba(106, 223, 255, 0.8),
    rgba(31, 160, 255, 0.7),
    transparent
  );
  box-shadow: 0 -8px 28px rgba(0, 147, 255, 0.2);
  animation: bottomSignal 3.8s ease-in-out infinite;
}

/* ===== Keyframes ===== */

@keyframes contentSettle {
  from { transform: translateY(8px); }
  to { transform: translateY(0); }
}

@keyframes riseIn {
  from {
    opacity: 0;
    transform: translateY(14px);
    filter: blur(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes gridDrift {
  from { background-position: 0 0; }
  to { background-position: 60px 60px; }
}

@keyframes particleFloat {
  from {
    transform: translateY(0) translateX(0);
  }
  to {
    transform: translateY(-30px) translateX(15px);
  }
}

@keyframes orbDrift1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(40px, 30px) scale(1.1); }
}

@keyframes orbDrift2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-30px, -20px) scale(0.9); }
}

@keyframes logoGlow {
  0%, 100% {
    box-shadow:
      0 0 20px rgba(64, 189, 255, 0.5),
      0 0 44px rgba(0, 118, 255, 0.28);
    filter: brightness(1);
  }
  50% {
    box-shadow:
      0 0 28px rgba(118, 225, 255, 0.72),
      0 0 58px rgba(0, 132, 255, 0.42);
    filter: brightness(1.12);
  }
}

@keyframes ringExpand {
  0% {
    inset: 0;
    opacity: 0.6;
  }
  100% {
    inset: -20px;
    opacity: 0;
  }
}

@keyframes dotPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(57, 230, 109, 0.8); }
  50% { box-shadow: 0 0 14px rgba(57, 230, 109, 1); }
}

@keyframes buttonPulse {
  0%, 100% {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.05) inset,
      0 8px 26px rgba(0, 112, 230, 0.34),
      0 0 24px rgba(46, 171, 255, 0.2);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.08) inset,
      0 9px 30px rgba(0, 132, 255, 0.42),
      0 0 34px rgba(46, 171, 255, 0.3);
  }
}

@keyframes bottomSignal {
  0%, 100% { opacity: 0.72; }
  50% { opacity: 1; }
}

@keyframes gridDriftFine {
  from { background-position: 0 0; }
  to { background-position: 20px 20px; }
}

@keyframes dataStreamFall {
  0% {
    transform: translateY(-20%);
    opacity: 0;
  }
  10% { opacity: 0.55; }
  90% { opacity: 0.55; }
  100% {
    transform: translateY(calc(100vh + 160px));
    opacity: 0;
  }
}

@keyframes horizonPulse {
  0%, 100% {
    opacity: 0.65;
    box-shadow: 0 0 30px rgba(50, 170, 255, 0.2), 0 -10px 50px rgba(40, 150, 255, 0.06);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 55px rgba(50, 170, 255, 0.35), 0 -14px 70px rgba(40, 150, 255, 0.12);
  }
}

@keyframes particlePulse {
  0%, 100% {
    opacity: 0.35;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.6);
  }
}

@keyframes orbDrift3 {
  0%, 100% { transform: translateX(-50%) translateY(0) scale(1); }
  50% { transform: translateX(-50%) translateY(-30px) scale(1.08); }
}

/* ===== Responsive ===== */

@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
    max-width: 600px;
  }

  .hero-title {
    font-size: 36px;
  }
}

@media (max-width: 768px) {
  .welcome-header {
    padding: 12px 20px;
  }

  .brand-text {
    font-size: 13px;
  }

  .header-status .status-divider,
  .header-status .status-time {
    display: none;
  }

  .welcome-main {
    padding: 20px;
    gap: 28px;
  }

  .hero-title {
    font-size: 30px;
    letter-spacing: 2px;
  }

  .hero-desc {
    white-space: normal;
    font-size: 14px;
  }

  .enter-btn {
    min-width: 160px;
    height: 44px;
    font-size: 14px;
  }
}

@media (max-width: 560px) {
  .features-grid {
    grid-template-columns: 1fr;
    max-width: 360px;
  }

  .stats-bar {
    flex-wrap: wrap;
    max-width: 360px;
  }

  .stat-item {
    flex: 1 1 50%;
  }

  .stat-item:nth-child(1),
  .stat-item:nth-child(2) {
    border-bottom: 1px solid rgba(44, 148, 255, 0.08);
  }

  .stat-item:nth-child(2) {
    border-right: none;
  }

  .hero-title {
    font-size: 26px;
    letter-spacing: 1px;
  }

  .hero-logo {
    width: 72px;
    height: 72px;
  }

  .logo-mark {
    width: 34px;
    height: 42px;
  }

  .welcome-footer {
    flex-wrap: wrap;
    text-align: center;
    gap: 6px;
    padding: 10px 20px;
  }
}

/* ===== Reduced motion ===== */

@media (prefers-reduced-motion: reduce) {
  .bg-nebula,
  .bg-grid,
  .bg-grid-fine,
  .bg-particles .particle,
  .bg-data-streams .data-stream,
  .bg-horizon,
  .bg-orb,
  .welcome-header,
  .welcome-content,
  .hero-logo,
  .logo-mark,
  .logo-ring::before,
  .logo-ring::after,
  .hero-label,
  .hero-title,
  .hero-desc,
  .enter-btn,
  .feature-card,
  .stats-bar,
  .welcome-footer,
  .bottom-glow,
  .status-dot {
    animation: none;
  }

  .bg-data-streams .data-stream,
  .bg-particles .particle {
    opacity: 0.25;
  }
}
</style>
