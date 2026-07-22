<template>
  <div class="welcome-screen">

    <div class="tech-lines"></div>
    <div class="bg-overlay"></div>

    <div class="welcome-content">
      <div class="welcome-logo" aria-hidden="true">
        <div class="logo-mark"></div>
      </div>

      <p class="welcome-label">DIGITAL TWIN MONITORING PLATFORM</p>

      <h1 class="welcome-title">智能水槽三维实时监控系统</h1>

      <p class="welcome-desc">
        融合三维数字孪生与实时感知，集中呈现水槽工况、设备状态、实验数据与运行预警。
      </p>

      <button class="enter-btn" @click="enterWorkbench">进入工作台</button>
    </div>

    <div class="bottom-glow"></div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

function enterWorkbench() {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  router.push({ name: isLoggedIn ? 'main' : 'login' });
}
</script>

<style scoped>
.welcome-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #02111f;
}


.tech-lines {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(rgba(77, 184, 255, 0.065) 1px, transparent 1px),
    linear-gradient(90deg, rgba(77, 184, 255, 0.05) 1px, transparent 1px),
    linear-gradient(
      90deg,
      transparent 0%,
      rgba(64, 175, 255, 0.16) 49.9%,
      rgba(64, 175, 255, 0.36) 50%,
      rgba(64, 175, 255, 0.16) 50.1%,
      transparent 100%
    );
  background-size: 92px 92px, 92px 92px, 100% 1px;
  opacity: 0.42;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.85), transparent 42%, transparent 100%);
  animation: gridDrift 18s linear infinite;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  background:
    radial-gradient(
      ellipse 560px 250px at 50% 51%,
      rgba(0, 10, 22, 0.5) 0%,
      rgba(0, 12, 26, 0.26) 48%,
      transparent 72%
    ),
    linear-gradient(
      90deg,
      rgba(0, 9, 19, 0.42) 0%,
      transparent 22%,
      transparent 78%,
      rgba(0, 9, 19, 0.48) 100%
    ),
    linear-gradient(
      0deg,
      rgba(0, 8, 17, 0.78) 0%,
      rgba(0, 13, 28, 0.44) 26%,
      rgba(0, 17, 35, 0.2) 58%,
      rgba(0, 12, 24, 0.38) 100%
    );
}

.welcome-content {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 760px;
  padding: 0 32px;
  text-align: center;
  animation: contentSettle 0.7s ease-out both;
}

.welcome-content::before,
.welcome-content::after {
  content: "";
  width: min(420px, 72vw);
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(80, 190, 255, 0.64), transparent);
  box-shadow: 0 0 18px rgba(28, 156, 255, 0.38);
}

.welcome-content::before {
  margin-bottom: 2px;
}

.welcome-content::after {
  width: min(260px, 56vw);
  margin-top: -2px;
  opacity: 0.72;
}

.welcome-logo {
  position: relative;
  display: grid;
  place-items: center;
  width: 78px;
  height: 82px;
  margin-bottom: -2px;
  animation: riseIn 0.7s 0.08s ease-out both;
}

.welcome-logo::before {
  content: "";
  position: absolute;
  inset: 11px 2px 7px;
  border: 1px solid rgba(96, 202, 255, 0.22);
  transform: rotate(45deg);
  box-shadow: 0 0 24px rgba(38, 162, 255, 0.24);
}

.logo-mark {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 60px;
  background: linear-gradient(145deg, #7ee3ff 0%, #1da4ff 45%, #0067dc 100%);
  clip-path: polygon(50% 0, 92% 54%, 72% 100%, 28% 100%, 8% 54%);
  box-shadow:
    0 0 20px rgba(64, 189, 255, 0.58),
    0 0 44px rgba(0, 118, 255, 0.32);
  animation: logoGlow 3s ease-in-out infinite;
}

@keyframes logoGlow {
  0%,
  100% {
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

.welcome-title {
  position: relative;
  margin: 0;
  color: #f4fbff;
  font-size: 36px;
  font-weight: 800;
  letter-spacing: 2px;
  overflow: hidden;
  text-shadow:
    0 2px 12px rgba(0, 6, 15, 0.8),
    0 0 28px rgba(31, 154, 255, 0.36);
  animation: riseIn 0.7s 0.28s ease-out both, titleBreath 4.8s 1.1s ease-in-out infinite;
}

.welcome-title::after {
  content: "";
  position: absolute;
  top: -20%;
  bottom: -20%;
  left: -28%;
  width: 22%;
  background: linear-gradient(90deg, transparent, rgba(160, 230, 255, 0.72), transparent);
  transform: skewX(-18deg);
  opacity: 0;
  animation: titleSweep 5.4s 1.3s ease-in-out infinite;
}

.welcome-label {
  margin: -2px 0 -4px;
  color: rgba(166, 221, 255, 0.88);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2.4px;
  line-height: 1;
  text-shadow:
    0 1px 8px rgba(0, 5, 14, 0.92),
    0 0 14px rgba(38, 162, 255, 0.28);
  animation: riseIn 0.7s 0.2s ease-out both, labelSignal 3.2s 1s ease-in-out infinite;
}

.welcome-desc {
  max-width: 650px;
  margin: -2px 0 12px;
  color: rgba(213, 233, 249, 0.88);
  font-size: 15px;
  line-height: 1.7;
  letter-spacing: 0.2px;
  text-shadow: 0 2px 10px rgba(0, 5, 14, 0.92);
  animation: riseIn 0.7s 0.38s ease-out both;
}

.enter-btn {
  min-width: 148px;
  height: 42px;
  padding: 0 32px;
  color: #f4fbff;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #1788f2 0%, #075abd 100%);
  border: 1px solid rgba(98, 198, 255, 0.68);
  border-radius: 6px;
  cursor: pointer;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 8px 26px rgba(0, 112, 230, 0.34),
    0 0 24px rgba(46, 171, 255, 0.2);
  transition: all 0.3s ease;
  animation: riseIn 0.7s 0.5s ease-out both, buttonPulse 4.2s 1.4s ease-in-out infinite;
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

.enter-btn:active {
  transform: translateY(0);
}

.bottom-glow {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(31, 160, 255, 0.9),
    rgba(106, 223, 255, 0.92),
    rgba(31, 160, 255, 0.9),
    transparent
  );
  box-shadow: 0 -8px 28px rgba(0, 147, 255, 0.26);
  animation: bottomSignal 3.8s ease-in-out infinite;
}

@keyframes contentSettle {
  from {
    transform: translateY(8px);
  }

  to {
    transform: translateY(0);
  }
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

@keyframes gridDrift {
  from {
    background-position: 0 0, 0 0, 0 0;
  }

  to {
    background-position: 92px 92px, 92px 92px, 0 0;
  }
}

@keyframes labelSignal {
  0%,
  100% {
    opacity: 0.76;
    text-shadow:
      0 1px 8px rgba(0, 5, 14, 0.92),
      0 0 12px rgba(38, 162, 255, 0.22);
  }

  50% {
    opacity: 1;
    text-shadow:
      0 1px 8px rgba(0, 5, 14, 0.92),
      0 0 22px rgba(92, 205, 255, 0.44);
  }
}

@keyframes titleBreath {
  0%,
  100% {
    text-shadow:
      0 2px 12px rgba(0, 6, 15, 0.8),
      0 0 24px rgba(31, 154, 255, 0.28);
  }

  50% {
    text-shadow:
      0 2px 12px rgba(0, 6, 15, 0.82),
      0 0 36px rgba(68, 186, 255, 0.46);
  }
}

@keyframes titleSweep {
  0%,
  18% {
    left: -30%;
    opacity: 0;
  }

  28% {
    opacity: 0.34;
  }

  44% {
    left: 108%;
    opacity: 0;
  }

  100% {
    left: 108%;
    opacity: 0;
  }
}

@keyframes buttonPulse {
  0%,
  100% {
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
  0%,
  100% {
    opacity: 0.72;
  }

  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tech-lines,
  .welcome-content,
  .welcome-logo,
  .logo-mark,
  .welcome-label,
  .welcome-title,
  .welcome-title::after,
  .welcome-desc,
  .enter-btn,
  .bottom-glow {
    animation: none;
  }
}

@media (max-width: 900px) {
  .welcome-title {
    font-size: 30px;
    letter-spacing: 1px;
  }

  .welcome-desc {
    max-width: 560px;
    font-size: 14px;
  }
}

@media (max-width: 640px) {
  .bg-overlay {
    background:
      radial-gradient(
        ellipse 360px 230px at 50% 49%,
        rgba(0, 10, 22, 0.55),
        rgba(0, 12, 26, 0.18) 66%,
        transparent 78%
      ),
      linear-gradient(0deg, rgba(0, 8, 17, 0.82), rgba(0, 13, 28, 0.28) 48%, rgba(0, 12, 24, 0.42));
  }

  .welcome-content {
    gap: 13px;
    padding: 0 22px;
  }

  .welcome-logo {
    width: 66px;
    height: 70px;
  }

  .logo-mark {
    width: 40px;
    height: 50px;
  }

  .welcome-title {
    font-size: 26px;
  }

  .welcome-desc {
    font-size: 13px;
  }
}
</style>
