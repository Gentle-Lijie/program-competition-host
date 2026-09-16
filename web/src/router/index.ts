import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  // 哈希路由：静态托管（EdgeOne Pages 等）无需 SPA fallback 配置
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'screen', component: () => import('@/pages/ScreenPage.vue') },
    { path: '/bar', name: 'bar', component: () => import('@/pages/BarPage.vue') },
    { path: '/checkin', name: 'checkin', component: () => import('@/pages/CheckinPage.vue') },
    { path: '/checkin/screen', name: 'checkin-screen', component: () => import('@/pages/CheckinScreenPage.vue') },
    { path: '/admin', component: () => import('@/pages/admin/AdminLayout.vue'),
      children: [
        { path: '', redirect: '/admin/programs' },
        { path: 'programs', component: () => import('@/pages/admin/ProgramsPanel.vue') },
        { path: 'arrived', component: () => import('@/pages/admin/ArrivedPanel.vue') },
        { path: 'arrived/:programId', component: () => import('@/pages/admin/ProgramRosterPage.vue') },
        { path: 'checkins', component: () => import('@/pages/admin/CheckinPanel.vue') },
        { path: 'settings', component: () => import('@/pages/admin/SettingsPanel.vue') },
      ],
    },
    { path: '/admin/login', name: 'admin-login', component: () => import('@/pages/admin/AdminLogin.vue') },
  ],
});

export default router;
