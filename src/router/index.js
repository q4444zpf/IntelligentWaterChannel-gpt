import { createRouter, createWebHistory } from 'vue-router';
import WelcomePage from '../views/WelcomePage.vue';
import LoginPage from '../views/LoginPage.vue';
import MainPage from '../views/MainPage.vue';
import { clearAuth, initializeAuth } from '../stores/auth.js';
import { getToken } from '../utils/auth.js';
import { setUnauthorizedHandler } from '../utils/request.js';

const routes = [
  {
    path: '/',
    name: 'welcome',
    component: WelcomePage,
  },
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
  },
  {
    path: '/main',
    name: 'main',
    component: MainPage,
    meta: { requiresAuth: true },
  },
];

// 修复Edge浏览器不能最小化的问题
const isEdge = /edg\//i.test(navigator.userAgent)
if (isEdge) {
  const rawReplaceState = history.replaceState
  history.replaceState = function (...args) {
    // 页面隐藏时不执行 replaceState
    if (document.visibilityState === 'hidden') {
      return
    }
    return rawReplaceState.apply(this, args)
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes,
});

function loginRoute(form) {
  return {
    name: 'login',
    query: form && form !== '/login' ? { form } : undefined,
  };
}

router.beforeEach(async (to) => {
  const token = getToken();

  if (to.meta.requiresAuth && !token) {
    return loginRoute(to.fullPath);
  }

  if (!token) {
    return true;
  }

  try {
    await initializeAuth();
  } catch {
    clearAuth();
    return to.meta.requiresAuth ? loginRoute(to.fullPath) : true;
  }

  if (to.name === 'login' || to.name === 'welcome') {
    return { name: 'main' };
  }

  return true;
});

setUnauthorizedHandler(() => {
  const currentRoute = router.currentRoute.value;
  clearAuth();
  if (currentRoute.name !== 'login') {
    router.replace(loginRoute(currentRoute.fullPath)).catch(() => {});
  }
});

export default router;
