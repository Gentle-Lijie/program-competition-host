<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import QrPanel from '@/components/QrPanel.vue';
import { api } from '@/lib/api';

const code = ref('');
const input = ref('');
const message = ref('');
const saved = ref(false);

onMounted(async () => {
  const r = await api<{ code: string }>('/api/admin/settings/checkin-code');
  code.value = r.code;
  input.value = r.code;
});

const checkinUrl = computed(() => `${location.origin}/checkin?code=${code.value}`);

async function save() {
  try {
    const r = await api<{ code: string }>('/api/admin/settings/checkin-code', {
      method: 'PUT',
      body: JSON.stringify({ code: input.value }),
    });
    code.value = r.code;
    saved.value = true;
    message.value = '签到码已更新，大屏二维码将在一分钟内自动刷新';
    setTimeout(() => (saved.value = false), 2000);
  } catch (e) {
    message.value = e instanceof Error ? e.message : '保存失败';
  }
}
</script>

<template>
  <div class="grid gap-4">
    <h2 class="text-xl font-bold">签到设置</h2>

    <div class="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>签到码</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4">
          <div class="grid gap-2">
            <Label for="code">4-8 位数字（当前：{{ code }}）</Label>
            <Input id="code" v-model="input" inputmode="numeric" maxlength="8" class="w-40" />
          </div>
          <div class="flex items-center gap-3">
            <Button :disabled="input === code" @click="save">
              {{ saved ? '✓ 已保存' : '更新签到码' }}
            </Button>
            <span v-if="message" class="text-sm text-muted-foreground">{{ message }}</span>
          </div>
          <p class="text-sm text-muted-foreground">
            换码后旧二维码立即失效（扫码打开的旧页面需重新扫码）。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>签到二维码预览</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col items-start gap-3">
          <QrPanel :url="checkinUrl" />
          <code class="text-xs text-muted-foreground break-all">{{ checkinUrl }}</code>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
