import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'screen', component: () => import('@/pages/ScreenPage.vue') },
    { path: '/bar', name: 'bar', component: () => import('@/pages/BarPage.vue') },
    { path: '/checkin', name: 'checkin', component: () => import('@/pages/CheckinPage.vue') },
    { path: '/checkin/screen', name: 'checkin-screen', component: () => import('@/pages/CheckinScreenPage.vue') },
    { path: '/admin', component: () => import('@/pages/admin/AdminLayout.vue'),
      children: [
        { path: '', redirect: '/admin/programs' },
        { path: 'control', component: () => import('@/pages/admin/ControlPanel.vue') },
        { path: 'programs', component: () => import('@/pages/admin/ProgramsPanel.vue') },
        { path: 'arrived', component: () => import('@/pages/admin/ArrivedPanel.vue') },
        { path: 'arrived/:programId', component: () => import('@/pages/admin/ProgramRosterPage.vue') },
        { path: 'checkins', component: () => import('@/pages/admin/CheckinPanel.vue') },
        { path: 'settings', component: () => import('@/pages/admin/SettingsPanel.vue') },
      ],
    },
    { path: '/admin/login', redirect: '/admin' },
  ],
});

export default router;
