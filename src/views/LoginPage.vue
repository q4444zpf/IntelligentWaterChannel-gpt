<template>
  <div class="login-page">
    <div class="background-mask" aria-hidden="true"></div>
    <img class="page-background" :src="backgroundImage" alt="" aria-hidden="true" />

    <header class="brand-header" aria-label="智能水槽监控系统">
      <img class="brand-logo" :src="logoImage" alt="" />
      <img class="brand-title" :src="titleImage" alt="智能水槽监控系统" />
    </header>

      <section class="product-intro" aria-label="智能水槽三维实时监控系统">
        <img
          class="product-slogan"
          :src="sloganImage"
          alt="智能水槽三维实时监控系统，融合三维数字孪生与实时感知，集中呈现水槽工况、设备状态、实验数据与运行预警"
        />
        <img class="product-model" :src="sloganModelImage" alt="" aria-hidden="true" />
      </section>

      <section class="login-card" :class="{ shaking: shake }" aria-labelledby="login-title">
        <div class="login-card-content">
          <header class="login-header">
            <h1 id="login-title">欢迎登录</h1>
            <div class="line">
              <div class="line-inner1"/>
              <div class="line-inner2"/>
              <div class="line-inner3"/>
            </div>
            <p>数字孪生监控平台</p>
          </header>

          <form class="login-form" @submit.prevent="handleLogin">
            <div class="field-row">
              <label for="login-username">账&nbsp;&nbsp;&nbsp;号</label>
              <div class="input-area">
                <UserOutlined aria-hidden="true" />
                <input
                  id="login-username"
                  v-model="username"
                  type="text"
                  placeholder="请输入用户名"
                  autocomplete="username"
                  :disabled="loading"
                  @focus="shake = false"
                />
              </div>
            </div>

            <div class="field-row">
              <label for="login-password">密&nbsp;&nbsp;&nbsp;码</label>
              <div class="input-area">
                <LockOutlined aria-hidden="true" />
                <input
                  id="login-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="请输入密码"
                  autocomplete="current-password"
                  :disabled="loading"
                  @focus="shake = false"
                />
                <button
                  class="password-toggle"
                  type="button"
                  :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                  :title="showPassword ? '隐藏密码' : '显示密码'"
                  @click="showPassword = !showPassword"
                >
                  <EyeInvisibleOutlined v-if="showPassword" />
                  <EyeOutlined v-else />
                </button>
              </div>
            </div>

            <div class="field-row captcha-row">
              <label for="login-captcha">验证码</label>
              <div class="captcha-control">
                <div class="input-area">
                  <SafetyCertificateOutlined aria-hidden="true" />
                  <input
                    id="login-captcha"
                    v-model="captchaInput"
                    type="text"
                    placeholder="请输入验证码"
                    maxlength="4"
                    :disabled="loading"
                    @focus="shake = false"
                  />
                </div>
                <button
                  class="captcha-button"
                  type="button"
                  title="点击刷新验证码"
                  aria-label="刷新验证码"
                  :disabled="loading"
                  @click="refreshCaptcha"
                >
                  <img v-if="captchaUrl" :src="captchaUrl" alt="验证码" />
                  <ReloadOutlined v-else />
                </button>
              </div>
            </div>

            <p class="login-error" :class="{ visible: errorMsg }" aria-live="polite">
              {{ errorMsg || '\u00a0' }}
            </p>

            <button
              class="login-button"
              type="submit"
              :disabled="loading || !username || !password || !captchaInput"
            >
              <LoadingOutlined v-if="loading" class="loading-icon" />
              <span v-else>登录</span>
            </button>
          </form>

          <p class="support-text">若遇登录问题，请联系管理员</p>
        </div>
        <img class="form-bottom" :src="formBottomImage" alt="" aria-hidden="true" />
      </section>

    <nav class="feature-nav" aria-label="平台功能">
      <ul>
        <li>
          <span>三维数字孪生</span>
          <span class="feature-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
              <path d="M3 7l9 5 9-5" />
              <path d="M12 12v10" />
            </svg>
          </span>
        </li>
        <li>
          <span>实时监控</span>
          <span class="feature-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </span>
        </li>
        <li>
          <span>报警管理</span>
          <span class="feature-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </span>
        </li>
        <li>
          <span>历史数据分析</span>
          <span class="feature-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
          </span>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup>
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  LoadingOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import backgroundImage from '../assets/login/bg.jpg';
import formBottomImage from '../assets/login/form-bottom.png';
import logoImage from '../assets/login/logo.png';
import sloganModelImage from '../assets/login/slogan-img.png';
import sloganImage from '../assets/login/slogan.png';
import titleImage from '../assets/login/title.png';
import { getCaptchaUrl, getCode } from '../api/auth.js';
import { SUCCESS_CODE } from '../constants/auth.js';
import { authenticate } from '../stores/auth.js';

const router = useRouter();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMsg = ref('');
const shake = ref(false);

const captchaCode = ref('');
const captchaInput = ref('');
const captchaUrl = ref('');

async function refreshCaptcha() {
  try {
    const response = await getCode();
    if (response?.code !== SUCCESS_CODE) {
      throw new Error(response?.message || '验证码加载失败');
    }

    captchaCode.value = String(response.data);
    captchaUrl.value = getCaptchaUrl(captchaCode.value);
  } catch (error) {
    captchaCode.value = '';
    captchaUrl.value = '';
    errorMsg.value = error.message || '验证码加载失败，请稍后重试';
  }
}

onMounted(refreshCaptcha);

async function handleLogin() {
  if (loading.value) return;

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

  if (!captchaCode.value) {
    errorMsg.value = '验证码尚未加载，请点击图片重试';
    return;
  }

  loading.value = true;
  try {
    await authenticate({
      code: captchaCode.value,
      captcha: captchaInput.value.trim(),
      username: username.value.trim(),
      password: password.value,
    });

    const form = router.currentRoute.value.query.form;
    const target = typeof form === 'string' && form.startsWith('/') ? form : { name: 'main' };
    await router.replace(target);
  } catch (error) {
    errorMsg.value = error.message || '登录失败，请重试';
    captchaInput.value = '';
    shake.value = true;
    await refreshCaptcha();
    setTimeout(() => shake.value = false, 500);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  position: fixed;
  inset: 0;
  z-index: 9998;
  min-height: 100svh;
  overflow: hidden;
  background: #ffffff;
  color: #17314a;
}

.page-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  mix-blend-mode: overlay;
  opacity: 1;
  object-fit: cover;
  object-position: center;
}

.background-mask {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0.5;
  background: linear-gradient(197deg, #197cfd 18%, #e5eff3 46%, #e9f2fb 82%);
  pointer-events: none;
}

.brand-header {
  position: absolute;
  left: 16px;
  top: 22px;
  width: 755px;
  height: 90px;
  z-index: 2;
  opacity: 1;
  background: linear-gradient(270deg, #d8d8d800 0%, #ffffffb3 60%, #ffffff00 94%);
}

.brand-logo {
  position: absolute;
  left: 35px;
  top: -10px;
  width: 94px;
  height: 117px;
  opacity: 1;
  object-fit: cover;
  object-position: center;
}

.brand-title {
  position: absolute;
  left: 156px;
  top: 12px;
  width: 418px;
  height: 70px;
  opacity: 1;
}

.product-intro {
  min-width: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.product-slogan {
  position: absolute;
  left: 163px;
  top: 20vh;
  opacity: 1;
  width: 629px;
  height: auto;
}

.product-model {
  position: absolute;
  left: 30px;
  bottom: 60px;
  width: auto;
  opacity: 1;
  height: 56vh;
  object-fit: contain;
  filter: drop-shadow(0 28px 30px rgba(23, 111, 183, 0.16));
}

.login-card {
  position: absolute;
  right: 145px;
  top: 15vh;
  width: 479px;
  height: 588px;
  overflow: hidden;
  border-radius: 12px;
  opacity: 1;

  background: rgba(255, 255, 255, 0.85);

  box-shadow: 0 8px 12px 0 rgba(162, 203, 236, 0.6);
}

.login-card.shaking {
  animation: card-shake 0.5s ease;
}

.login-card-content {
  position: relative;
  z-index: 2;
  padding: 48px 42px 88px;
}

.login-header {
  margin-bottom: 50px;
  text-align: center;
}

.login-header h1 {
  margin: 0;
  color: #226CEC;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: 0;
}

.line {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.line-inner1,
.line-inner2,
.line-inner3 {
  width: 20px;
  height: 4px;
}

.line-inner1 {
  background: #074BC2;
}

.line-inner2 {
  background: #0A84CF;
}

.line-inner3 {
  background: #60BAFF;
}

.login-header p {
  margin: 28px 0 0;
  color: #6f7882;
  font-size: 16px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.field-row {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  min-height: 44px;
  overflow: hidden;
  border: 1px solid #c4cbd1;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.84);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-row:focus-within {
  border-color: #2187ea;
  box-shadow: 0 0 0 3px rgba(33, 135, 234, 0.12);
}

.field-row > label {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #c4cbd1;
  background: rgba(239, 247, 251, 0.92);
  color: #313a43;
  font-size: 14px;
  white-space: nowrap;
}

.input-area {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  color: #9ca4ab;
}

.input-area > svg {
  flex: 0 0 auto;
  width: 17px;
  height: 17px;
}

.input-area input {
  min-width: 0;
  flex: 1;
  height: 42px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #24374a;
  font-size: 14px;
}

.input-area input::placeholder {
  color: #a8adb2;
}

.input-area input:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.password-toggle,
.captcha-button {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: #7d8a94;
  cursor: pointer;
}

.password-toggle {
  width: 32px;
  height: 32px;
  padding: 0;
}

.password-toggle:hover,
.password-toggle:focus-visible,
.captcha-button:hover,
.captcha-button:focus-visible {
  color: #0a70d8;
  outline: 0;
}

.captcha-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  min-width: 0;
}

.captcha-button {
  width: 112px;
  height: 42px;
  padding: 2px;
  border-left: 1px solid #d4d9dd;
  overflow: hidden;
}

.captcha-button img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
  object-fit: fill;
}

.captcha-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.login-error {
  min-height: 18px;
  margin: -12px 0 -8px;
  color: transparent;
  font-size: 13px;
  text-align: center;
}

.login-error.visible {
  color: #d83b34;
}

.login-button {
  width: 100%;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  background: #228cea;
  box-shadow: 0 8px 14px rgba(33, 126, 220, 0.24);
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
}

.login-button:hover:not(:disabled) {
  background: #0d76db;
  box-shadow: 0 10px 20px rgba(33, 126, 220, 0.3);
  transform: translateY(-1px);
}

.login-button:focus-visible {
  outline: 3px solid rgba(24, 125, 225, 0.28);
  outline-offset: 2px;
}

.login-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.loading-icon {
  animation: loading-spin 0.9s linear infinite;
}

.support-text {
  margin: 34px 0 0;
  color: #9aacc3;
  font-size: 13px;
  text-align: center;
}

.form-bottom {
  position: absolute;
  z-index: 1;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: auto;
  pointer-events: none;
}

.feature-nav {
  position: absolute;
  right: clamp(56px, 6.9vw, 132px);
  bottom: clamp(32px, 7.2vh, 78px);
  z-index: 3;
}

.feature-nav ul {
  display: flex;
  align-items: center;
  gap: clamp(18px, 2vw, 38px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.feature-nav li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #243443;
  font-size: 14px;
  white-space: nowrap;
}

.feature-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid #268cf1;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.54);
  color: #0878e9;
}

.feature-icon svg {
  width: 24px;
  height: 24px;
}

@keyframes card-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-7px); }
  40%, 80% { transform: translateX(7px); }
}

@keyframes loading-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1280px) {
  .product-model {
    width: min(92%, 650px);
  }

  .feature-nav {
    right: 48px;
  }

  .feature-nav ul {
    gap: 16px;
  }

  .feature-nav li {
    gap: 6px;
    font-size: 12px;
  }

  .feature-icon {
    width: 38px;
    height: 38px;
  }
}

@media (max-width: 980px) {
  .login-page {
    position: fixed;
    overflow-y: auto;
  }

  .page-background {
    position: fixed;
    object-position: 62% center;
  }

  .background-mask {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
  }

  .brand-header {
    position: relative;
    top: auto;
    left: auto;
    width: min(100% - 32px, 520px);
    margin: 22px auto 0;
  }

  .brand-logo {
    width: 58px;
  }

  .brand-title {
    width: min(72vw, 360px);
  }

  .product-intro {
    display: none;
  }

  .login-card {
    min-height: 0;
  }

  .login-card-content {
    padding: 36px 28px 78px;
  }

  .login-header {
    margin-bottom: 32px;
  }

  .feature-nav {
    position: relative;
    right: auto;
    bottom: auto;
    width: 16px;
    margin: 24px auto;
  }

  .feature-nav ul {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .feature-nav li {
    justify-content: space-between;
    min-width: 0;
    padding: 7px 9px 7px 12px;
    border: 1px solid rgba(38, 140, 241, 0.22);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.62);
    font-size: 13px;
  }
}

@media (max-width: 520px) {
  .brand-header {
    gap: 10px;
  }

  .brand-logo {
    width: 48px;
  }

  .brand-title {
    width: min(72vw, 290px);
  }

  .login-card-content {
    padding: 30px 18px 70px;
  }

  .login-header h1 {
    font-size: 25px;
  }

  .login-header p {
    margin-top: 12px;
    font-size: 14px;
  }

  .login-form {
    gap: 18px;
  }

  .field-row {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .captcha-control {
    grid-template-columns: minmax(0, 1fr) 88px;
  }

  .captcha-button {
    width: 88px;
  }

  .input-area {
    gap: 7px;
    padding: 0 8px;
  }

  .feature-nav ul {
    grid-template-columns: 1fr;
  }
}

@media (max-height: 820px) and (min-width: 981px) {
  .login-card {
    min-height: 520px;
  }

  .login-card-content {
    padding-top: 30px;
  }

  .login-header {
    margin-bottom: 28px;
  }

  .login-header p {
    margin-top: 12px;
  }

  .login-form {
    gap: 16px;
  }

  .support-text {
    margin-top: 20px;
  }

  .feature-nav {
    bottom: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
