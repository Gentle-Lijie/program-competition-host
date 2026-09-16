<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

const router = useRouter();
const route = useRoute();
const authed = ref(false);

onMounted(async () => {
  if (!getToken()) {
    router.replace('/admin/login');
    return;
  }
  try {
    await api('/api/admin/verify');
    authed.value = true;
  } catch {
    clearToken();
    router.replace('/admin/login');
  }
});

function logout() {
  clearToken();
  router.replace('/admin/login');
}

const tabs = [
  { to: '/admin/programs', label: '节目管理' },
  { to: '/admin/arrived', label: '表演者签到' },
  { to: '/admin/checkins', label: '观众签到' },
  { to: '/admin/settings', label: '签到设置' },
];
</script>

<template>
  <div v-if="authed" class="admin-layout">
    <header class="admin-header">
      <h1 class="font-display text-2xl text-primary">WONDERFUL US · 后台</h1>
      <nav class="admin-nav">
        <router-link
          v-for="t in tabs"
          :key="t.to"
          :to="t.to"
          class="admin-nav__link"
          :class="{ 'admin-nav__link--active': route.path === t.to }"
        >
          {{ t.label }}
        </router-link>
      </nav>
      <div class="admin-header__right">
        <a href="/#/" target="_blank" class="admin-nav__link">大屏 ↗</a>
        <a href="/#/bar" target="_blank" class="admin-nav__link">提示栏 ↗</a>
        <a href="/#/checkin/screen" target="_blank" class="admin-nav__link">签到屏 ↗</a>
        <button class="admin-nav__link admin-nav__link--logout" @click="logout">退出</button>
      </div>
    </header>
    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
}
.admin-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 28px;
  background: color-mix(in srgb, var(--background) 88%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}
.admin-nav {
  display: flex;
  gap: 4px;
  flex: 1;
}
.admin-nav__link {
  padding: 8px 14px;
  border-radius: 8px;
  color: var(--muted-foreground);
  text-decoration: none;
  font-size: 0.95rem;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}
.admin-nav__link:hover {
  background: var(--accent);
  color: var(--accent-foreground);
}
.admin-nav__link--active {
  background: var(--primary);
  color: var(--primary-foreground);
  font-weight: 500;
}
.admin-nav__link--logout:hover {
  background: var(--destructive);
  color: var(--destructive-foreground);
}
.admin-header__right {
  display: flex;
  gap: 4px;
}
.admin-main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 24px 60px;
}
</style>
