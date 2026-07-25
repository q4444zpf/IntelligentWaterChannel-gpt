import { createRouter, createWebHistory } from 'vue-router';
import WelcomePage from '../views/WelcomePage.vue';
import LoginPage from '../views/LoginPage.vue';
import MainPage from '../views/MainPage.vue';

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

// 简单的登录状态守卫
router.beforeEach((to, from, next) => {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

  if (to.meta.requiresAuth && !isLoggedIn) {
    next({ name: 'login' });
  } else if ((to.name === 'login' || to.name === 'welcome') && isLoggedIn) {
    // 已登录就不要再回到登录/欢迎页
    next({ name: 'main' });
  } else {
    next();
  }
});

export default router;
