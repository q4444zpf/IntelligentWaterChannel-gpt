<template>
  <div class="login-screen">
    <!-- 背景装饰 -->
    <div class="login-bg">
      <div class="login-grid"></div>
      <div class="login-glow login-glow-1"></div>
      <div class="login-glow login-glow-2"></div>
    </div>

    <!-- 环形装饰 -->
    <div class="deco-ring deco-ring-1"></div>
    <div class="deco-ring deco-ring-2"></div>

    <!-- 登录卡片 -->
    <div class="login-card" :class="{ shaking: shake }">
      <!-- 头部 -->
      <div class="login-header">
        <div class="login-brand">智能水槽监控系统</div>
        <p class="login-desc">请登录以访问系统</p>
      </div>

      <!-- 表单 -->
      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">
            <svg class="form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="8" r="4"/>
              <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
            </svg>
            用户名
          </label>
          <input
            v-model="username"
            type="text"
            class="form-input"
            placeholder="请输入用户名"
            autocomplete="username"
            :disabled="loading"
            @focus="shake = false"
          />
        </div>

        <div class="form-group">
          <label class="form-label">
            <svg class="form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            密码
          </label>
          <div class="password-wrap">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              placeholder="请输入密码"
              autocomplete="current-password"
              :disabled="loading"
              @focus="shake = false"
              @keyup.enter="handleLogin"
            />
            <button type="button" class="password-toggle" @click="showPassword = !showPassword" tabindex="-1">
              <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 验证码 -->
        <div class="form-group">
          <label class="form-label">
            <svg class="form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            验证码
          </label>
          <div class="captcha-row">
            <input
              v-model="captchaInput"
              type="text"
              class="form-input captcha-input"
              placeholder="请输入验证码"
              maxlength="4"
              :disabled="loading"
              @focus="shake = false"
              @keyup.enter="handleLogin"
            />
            <canvas
              ref="captchaCanvas"
              class="captcha-canvas"
              width="110"
              height="44"
              @click="refreshCaptcha"
              title="点击刷新验证码"
            />
          </div>
        </div>

        <!-- 错误提示 -->
        <p class="login-error" v-if="errorMsg">{{ errorMsg }}</p>

        <!-- 登录按钮 -->
        <button type="submit" class="login-btn" :disabled="loading || !username || !password || !captchaInput">
          <span v-if="!loading">登 录</span>
          <span v-else class="btn-loading">
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
          </span>
        </button>
      </form>

      <!-- 底部提示 -->
      <p class="login-tip">默认账号：admin / admin123</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMsg = ref('');
const shake = ref(false);

const captchaCanvas = ref(null);
const captchaCode = ref('');
const captchaInput = ref('');

// 演示用账号
const VALID_USERS = {
  admin: 'admin123',
  operator: 'oper123',
  viewer: 'view123',
};

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCaptcha() {
  if (!captchaCanvas.value) return;

  const canvas = captchaCanvas.value;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // 随机码
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
  }
  captchaCode.value = code;

  // 背景
  ctx.fillStyle = '#051a30';
  ctx.fillRect(0, 0, w, h);

  // 噪点
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${40 + Math.random() * 60},${100 + Math.random() * 100},${160 + Math.random() * 95},${0.15 + Math.random() * 0.25})`;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 干扰线
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(${50 + Math.random() * 50},${130 + Math.random() * 80},${200 + Math.random() * 55},${0.2 + Math.random() * 0.2})`;
    ctx.lineWidth = 1 + Math.random();
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.lineTo(Math.random() * w, Math.random() * h);
    ctx.stroke();
  }

  // 字符
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const x = 16 + i * 22;
    const y = 30 + (Math.random() - 0.5) * 10;
    const angle = (Math.random() - 0.5) * 0.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
    const colors = ['#4cc7ff', '#2da6ff', '#73ff92', '#ffd21f', '#ff9d22'];
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillText(char, 0, 0);
    ctx.restore();
  }
}

function refreshCaptcha() {
  generateCaptcha();
}

onMounted(() => {
  generateCaptcha();
});

function handleLogin() {
  errorMsg.value = '';
  shake.value = false;

  if (!username.value.trim() || !password.value.trim()) {
    errorMsg.value = '请输入用户名和密码';
    shake.value = true;
    setTimeout(() => shake.value = false, 500);
    return;
  }

  if (!captchaInput.value.trim()) {
    errorMsg.value = '请输入验证码';
    shake.value = true;
    setTimeout(() => shake.value = false, 500);
    return;
  }

  if (captchaInput.value.trim().toUpperCase() !== captchaCode.value) {
    errorMsg.value = '验证码错误，请重新输入';
    captchaInput.value = '';
    shake.value = true;
    refreshCaptcha();
    setTimeout(() => shake.value = false, 500);
    return;
  }

  loading.value = true;

  // 模拟异步验证
  setTimeout(() => {
    const expectedPwd = VALID_USERS[username.value.trim()];

    if (expectedPwd && password.value === expectedPwd) {
      sessionStorage.setItem('isLoggedIn', 'true');
      sessionStorage.setItem('username', username.value.trim());
      router.replace({ name: 'main' });
    } else {
      errorMsg.value = '用户名或密码错误，请重试';
      password.value = '';
      captchaInput.value = '';
      refreshCaptcha();
      shake.value = true;
      setTimeout(() => shake.value = false, 500);
      loading.value = false;
    }
  }, 800);
}
</script>

<style scoped>
.login-screen {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #010a15;
  overflow: hidden;
}

/* 背景装饰 */
.login-bg {
  position: absolute;
  inset: 0;
}
.login-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(21, 147, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(21, 147, 255, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}
.login-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
}
.login-glow-1 {
  width: 500px;
  height: 500px;
  top: -200px;
  right: -150px;
  background: rgba(0, 100, 220, 0.15);
  animation: glowFloat1 8s ease-in-out infinite;
}
.login-glow-2 {
  width: 400px;
  height: 400px;
  bottom: -150px;
  left: -100px;
  background: rgba(0, 160, 255, 0.1);
  animation: glowFloat2 10s ease-in-out infinite;
}
@keyframes glowFloat1 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-60px, 40px); }
}
@keyframes glowFloat2 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(50px, -30px); }
}

/* 环形装饰 */
.deco-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(0, 140, 240, 0.12);
}
.deco-ring-1 {
  width: 600px;
  height: 600px;
  animation: ringRotate 20s linear infinite;
}
.deco-ring-2 {
  width: 750px;
  height: 750px;
  border-color: rgba(0, 140, 240, 0.06);
  animation: ringRotate 30s linear infinite reverse;
}
@keyframes ringRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 登录卡片 */
.login-card {
  position: relative;
  z-index: 2;
  width: 420px;
  padding: 48px 44px 40px;
  background: linear-gradient(
    160deg,
    rgba(5, 31, 54, 0.9),
    rgba(3, 16, 32, 0.95)
  );
  border: 1px solid rgba(44, 150, 255, 0.25);
  border-radius: 12px;
  backdrop-filter: blur(16px);
  box-shadow:
    0 0 60px rgba(0, 100, 220, 0.12),
    inset 0 1px rgba(255, 255, 255, 0.04);
  transition: transform 0.3s ease;
}
.login-card.shaking {
  animation: cardShake 0.5s ease;
}
@keyframes cardShake {
  0%, 100% { transform: translateX(0); }
  10% { transform: translateX(-8px); }
  30% { transform: translateX(8px); }
  50% { transform: translateX(-5px); }
  70% { transform: translateX(5px); }
  90% { transform: translateX(-2px); }
}

/* 头部 */
.login-header {
  text-align: center;
  margin-bottom: 36px;
}
.login-brand {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #eaf5ff;
  text-shadow: 0 0 20px rgba(0, 140, 255, 0.4);
  margin-bottom: 8px;
}
.login-desc {
  margin: 0;
  font-size: 13px;
  color: rgba(150, 195, 235, 0.6);
  letter-spacing: 1px;
}

/* 表单 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(170, 205, 235, 0.75);
  letter-spacing: 0.5px;
}
.form-icon {
  width: 16px;
  height: 16px;
  color: rgba(100, 175, 230, 0.6);
}
.form-input {
  height: 44px;
  padding: 0 14px;
  background: rgba(1, 15, 30, 0.7);
  border: 1px solid rgba(70, 150, 220, 0.25);
  border-radius: 6px;
  color: #eaf5ff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.3s, box-shadow 0.3s;
}
.form-input::placeholder {
  color: rgba(130, 175, 210, 0.35);
}
.form-input:focus {
  border-color: rgba(40, 150, 255, 0.6);
  box-shadow: 0 0 0 3px rgba(0, 120, 255, 0.08),
              0 0 16px rgba(0, 100, 220, 0.1);
}
.form-input:disabled {
  opacity: 0.5;
}

/* 密码框 */
.password-wrap {
  position: relative;
}
.password-wrap .form-input {
  width: 100%;
  padding-right: 44px;
}
.password-toggle {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  color: rgba(130, 180, 210, 0.5);
  cursor: pointer;
  display: grid;
  place-items: center;
  box-shadow: none;
}
.password-toggle:hover {
  color: rgba(170, 210, 240, 0.8);
  background: transparent;
  border: none;
  box-shadow: none;
}
.password-toggle svg {
  width: 18px;
  height: 18px;
}

/* 验证码 */
.captcha-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.captcha-input {
  flex: 1;
  text-transform: uppercase;
  letter-spacing: 4px;
}
.captcha-canvas {
  flex: 0 0 auto;
  width: 110px;
  height: 44px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid rgba(70, 150, 220, 0.25);
  background: #051a30;
  transition: border-color 0.3s, box-shadow 0.3s;
}
.captcha-canvas:hover {
  border-color: rgba(40, 150, 255, 0.6);
  box-shadow: 0 0 0 3px rgba(0, 120, 255, 0.08), 0 0 16px rgba(0, 100, 220, 0.1);
}

/* 错误 */
.login-error {
  margin: -8px 0 0;
  font-size: 13px;
  color: #ff5e52;
  text-align: center;
}

/* 登录按钮 */
.login-btn {
  height: 46px;
  margin-top: 4px;
  border: 1px solid rgba(30, 140, 255, 0.5);
  border-radius: 6px;
  background: linear-gradient(135deg, #0b6dd4, #06429e);
  color: #eaf5ff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow:
    0 4px 20px rgba(0, 100, 220, 0.25),
    inset 0 1px rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-btn:hover:not(:disabled) {
  border-color: rgba(60, 170, 255, 0.7);
  background: linear-gradient(135deg, #127be8, #0752b5);
  box-shadow:
    0 4px 28px rgba(0, 120, 240, 0.4),
    inset 0 1px rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}
.login-btn:active:not(:disabled) {
  transform: translateY(0);
}
.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 加载动画 */
.btn-loading {
  display: flex;
  gap: 6px;
  align-items: center;
}
.loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  animation: dotBounce 1.2s ease infinite;
}
.loading-dot:nth-child(1) { animation-delay: 0s; }
.loading-dot:nth-child(2) { animation-delay: 0.15s; }
.loading-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}

/* 底部提示 */
.login-tip {
  margin: 24px 0 0;
  text-align: center;
  font-size: 12px;
  color: rgba(130, 180, 210, 0.35);
  letter-spacing: 0.5px;
}
</style>
