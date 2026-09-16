<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

const route = useRoute();
const code = String(route.query.code ?? '');

const name = ref('');
const affiliation = ref('');
const submitting = ref(false);
const error = ref('');
const done = ref<{ seq: number; count: number } | null>(null);
const geoRequired = ref(false);
const messages = ref<{ wrong_code?: string; geo_no_location?: string; geo_out_of_range?: string }>({});

onMounted(async () => {
  try {
    const c = await api<{ geo_required: boolean; messages: typeof messages.value }>(
      '/api/checkin/config',
    );
    geoRequired.value = c.geo_required;
    messages.value = c.messages ?? {};
  } catch { /* 配置拉取失败不阻塞表单 */ }
});

// 获取定位（服务端配置了地理围栏时必须）；提示文案用后台配置
function getLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      error.value = '当前浏览器不支持定位，请换用手机浏览器';
      return resolve(null);
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        error.value = messages.value.geo_no_location || '请允许定位权限后签到';
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  });
}

async function submit() {
  if (!name.value.trim() || !affiliation.value.trim()) {
    error.value = '请填写姓名和班级';
    return;
  }
  submitting.value = true;
  error.value = '';
  try {
    let loc: { lat: number; lng: number } | null = null;
    if (geoRequired.value) {
      loc = await getLocation();
      if (!loc) return;
    }
    done.value = await api<{ seq: number; count: number }>('/api/checkin', {
      method: 'POST',
      body: JSON.stringify({ name: name.value, affiliation: affiliation.value, code, ...loc }),
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : '签到失败';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="checkin-page">
    <Card v-if="!done" class="w-full max-w-sm">
      <CardHeader>
        <CardTitle class="font-display text-center text-3xl text-primary">观众签到</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4">
        <div class="grid gap-2">
          <Label for="name">姓名</Label>
          <Input id="name" v-model="name" placeholder="你的姓名" maxlength="50" @keyup.enter="submit" />
        </div>
        <div class="grid gap-2">
          <Label for="affiliation">班级 / 单位</Label>
          <Input id="affiliation" v-model="affiliation" placeholder="如 EG2601" maxlength="50" @keyup.enter="submit" />
        </div>
        <div v-if="!code" class="text-sm text-destructive">签到链接无效，请扫描现场二维码</div>
        <div v-if="geoRequired" class="text-sm text-muted-foreground">📍 本场签到需要定位权限，提交时将请求定位</div>
        <div v-if="error" class="text-sm text-destructive">{{ error }}</div>
        <Button :disabled="submitting || !code" @click="submit">
          {{ submitting ? '提交中…' : '签 到' }}
        </Button>
      </CardContent>
    </Card>

    <Card v-else class="w-full max-w-sm text-center">
      <CardContent class="grid gap-3 py-10">
        <div class="text-6xl">✅</div>
        <div class="font-display text-3xl text-primary">签到成功</div>
        <div class="text-muted-foreground">你是第 {{ done.seq }} 位签到的观众</div>
      </CardContent>
    </Card>
  </div>
</template>

<style scoped>
.checkin-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
</style>
