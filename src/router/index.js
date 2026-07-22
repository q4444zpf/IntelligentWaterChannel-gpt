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
