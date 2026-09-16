<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';

const router = useRouter();
const token = ref('');
const error = ref('');
const loading = ref(false);

async function login() {
  if (!token.value.trim()) return;
  loading.value = true;
  error.value = '';
  try {
    setToken(token.value.trim());
    await api('/api/admin/verify');
    router.replace('/admin/programs');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '校验失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle class="font-display text-center text-3xl text-primary">后台登录</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4">
        <div class="grid gap-2">
          <Label for="token">管理密钥（ADMIN_TOKEN）</Label>
          <Input
            id="token"
            v-model="token"
            type="password"
            placeholder="服务器启动时设置的 ADMIN_TOKEN"
            @keyup.enter="login"
          />
        </div>
        <div v-if="error" class="text-sm text-destructive">{{ error }}</div>
        <Button :disabled="loading || !token" @click="login">
          {{ loading ? '校验中…' : '进入后台' }}
        </Button>
      </CardContent>
    </Card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
</style>
