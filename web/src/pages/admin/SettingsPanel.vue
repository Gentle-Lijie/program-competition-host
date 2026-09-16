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

// 轮换
const rotation = ref(0);
const rotationInput = ref('0');
const rotationMsg = ref('');

// 地理围栏
const fence = ref<{ lat: number; lng: number; radius: number } | null>(null);
const fenceInput = ref({ lat: '', lng: '', radius: '' });
const fenceMsg = ref('');

// 签到提示文案
const msgInput = ref({ wrong_code: '', geo_no_location: '', geo_out_of_range: '', duplicate: '' });
const msgSaved = ref(false);
const msgHint = ref('');

onMounted(async () => {
  const [c, r, f, m] = await Promise.all([
    api<{ code: string }>('/api/admin/settings/checkin-code'),
    api<{ seconds: number }>('/api/admin/settings/checkin-rotation'),
    api<{ lat: number; lng: number; radius: number } | null>('/api/admin/settings/geofence'),
    api<{ wrong_code: string; geo_no_location: string; geo_out_of_range: string; duplicate: string }>(
      '/api/admin/settings/checkin-messages',
    ),
  ]);
  code.value = c.code;
  input.value = c.code;
  rotation.value = r.seconds;
  rotationInput.value = String(r.seconds);
  msgInput.value = m;
  if (f) {
    fence.value = f;
    fenceInput.value = { lat: String(f.lat), lng: String(f.lng), radius: String(f.radius) };
  }
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
    message.value = '签到码已更新，签到屏将在数秒内自动刷新';
    setTimeout(() => (saved.value = false), 2000);
  } catch (e) {
    message.value = e instanceof Error ? e.message : '保存失败';
  }
}

async function saveRotation() {
  rotationMsg.value = '';
  try {
    const r = await api<{ seconds: number }>('/api/admin/settings/checkin-rotation', {
      method: 'PUT',
      body: JSON.stringify({ seconds: Number(rotationInput.value) }),
    });
    rotation.value = r.seconds;
    rotationMsg.value = r.seconds ? `已开启：每 ${r.seconds} 秒自动换码` : '已关闭轮换';
  } catch (e) {
    rotationMsg.value = e instanceof Error ? e.message : '保存失败';
  }
}

async function saveFence() {
  fenceMsg.value = '';
  try {
    await api('/api/admin/settings/geofence', {
      method: 'PUT',
      body: JSON.stringify({
        lat: Number(fenceInput.value.lat),
        lng: Number(fenceInput.value.lng),
        radius: Number(fenceInput.value.radius),
      }),
    });
    fence.value = { ...fenceInput.value } as never;
    fenceMsg.value = '围栏已启用';
  } catch (e) {
    fenceMsg.value = e instanceof Error ? e.message : '保存失败';
  }
}

async function clearFence() {
  await api('/api/admin/settings/geofence', { method: 'DELETE' });
  fence.value = null;
  fenceInput.value = { lat: '', lng: '', radius: '' };
  fenceMsg.value = '已关闭定位验证';
}

function useCurrentLocation() {
  if (!('geolocation' in navigator)) {
    fenceMsg.value = '当前设备不支持定位';
    return;
  }
  if (!window.isSecureContext) {
    fenceMsg.value = '定位需要 HTTPS 环境（当前页面不是安全上下文）';
    return;
  }
  fenceMsg.value = '定位中…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      fenceInput.value.lat = pos.coords.latitude.toFixed(6);
      fenceInput.value.lng = pos.coords.longitude.toFixed(6);
      fenceMsg.value = '已填入当前位置，检查半径后保存';
    },
    (err) => {
      const hints: Record<number, string> = {
        1: '定位被拒绝：检查浏览器地址栏权限，以及系统「设置 → 隐私与安全性 → 定位服务」里是否勾选了浏览器',
        2: '暂时拿不到位置（网络/定位服务不可用），稍后重试',
        3: '定位超时，请重试',
      };
      fenceMsg.value = hints[err.code] ?? `获取定位失败（${err.message}）`;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
  );
}

async function saveMessages() {
  msgHint.value = '';
  try {
    await api('/api/admin/settings/checkin-messages', {
      method: 'PUT',
      body: JSON.stringify(msgInput.value),
    });
    msgSaved.value = true;
    setTimeout(() => (msgSaved.value = false), 2000);
  } catch (e) {
    msgHint.value = e instanceof Error ? e.message : '保存失败';
  }
}
</script>

<template>
  <div class="grid gap-4">
    <h2 class="text-xl font-bold">签到设置</h2>

    <div class="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle>签到码</CardTitle></CardHeader>
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
        <CardHeader><CardTitle>签到二维码预览</CardTitle></CardHeader>
        <CardContent class="flex flex-col items-start gap-3">
          <QrPanel :url="checkinUrl" />
          <code class="text-xs text-muted-foreground break-all">{{ checkinUrl }}</code>
          <p class="text-sm text-muted-foreground">
            投屏请用<a href="/checkin/screen" target="_blank" class="text-primary underline">独立签到屏 ↗</a>（自动跟随换码）。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>定时换码</CardTitle></CardHeader>
        <CardContent class="grid gap-4">
          <div class="grid gap-2">
            <Label for="rotation">每 N 秒自动换一个码（0 = 关闭）</Label>
            <div class="flex items-center gap-3">
              <Input id="rotation" v-model="rotationInput" type="number" min="0" max="86400" class="w-32" />
              <span class="text-sm text-muted-foreground">秒</span>
              <Button variant="outline" :disabled="Number(rotationInput) === rotation" @click="saveRotation">
                保存
              </Button>
            </div>
            <p class="text-sm text-muted-foreground">
              范围 10–86400 秒。开启后签到屏自动换码；{{ rotation ? `当前：每 ${rotation} 秒` : '当前：关闭' }}。
            </p>
            <span v-if="rotationMsg" class="text-sm text-primary">{{ rotationMsg }}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>定位验证（地理围栏）</CardTitle></CardHeader>
        <CardContent class="grid gap-4">
          <p class="text-sm text-muted-foreground">
            配置圆心与半径后，签到必须位于圆内（手机需允许定位；站点须 HTTPS）。
            {{ fence ? `当前：半径 ${fence.radius} 米` : '当前：未启用' }}
          </p>
          <div class="grid grid-cols-3 gap-3">
            <div class="grid gap-1">
              <Label for="lat">纬度</Label>
              <Input id="lat" v-model="fenceInput.lat" placeholder="31.025xxx" />
            </div>
            <div class="grid gap-1">
              <Label for="lng">经度</Label>
              <Input id="lng" v-model="fenceInput.lng" placeholder="121.44xxx" />
            </div>
            <div class="grid gap-1">
              <Label for="radius">半径（米）</Label>
              <Input id="radius" v-model="fenceInput.radius" placeholder="200" />
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <Button variant="outline" @click="useCurrentLocation">📍 用当前位置作圆心</Button>
            <Button :disabled="!fenceInput.lat || !fenceInput.lng || !fenceInput.radius" @click="saveFence">
              启用围栏
            </Button>
            <Button v-if="fence" variant="outline" class="text-destructive" @click="clearFence">关闭</Button>
          </div>
          <span v-if="fenceMsg" class="text-sm text-primary">{{ fenceMsg }}</span>
        </CardContent>
      </Card>

      <Card class="md:col-span-2">
        <CardHeader><CardTitle>签到提示文案</CardTitle></CardHeader>
        <CardContent class="grid gap-4">
          <div class="grid md:grid-cols-3 gap-4">
            <div class="grid gap-1">
              <Label for="m1">签到失败（码错误/信息不全）</Label>
              <Input id="m1" v-model="msgInput.wrong_code" maxlength="100" />
            </div>
            <div class="grid gap-1">
              <Label for="m2">未授权定位</Label>
              <Input id="m2" v-model="msgInput.geo_no_location" maxlength="100" />
            </div>
            <div class="grid gap-1">
              <Label for="m3">不在签到范围（占位符：{'{distance}'} 米数、{'{lat}'}/{'{lng}'} 坐标）</Label>
              <Input id="m3" v-model="msgInput.geo_out_of_range" maxlength="100" />
            </div>
            <div class="grid gap-1">
              <Label for="m4">重复签到</Label>
              <Input id="m4" v-model="msgInput.duplicate" maxlength="100" />
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Button @click="saveMessages">{{ msgSaved ? '✓ 已保存' : '保存文案' }}</Button>
            <span v-if="msgHint" class="text-sm text-destructive">{{ msgHint }}</span>
            <span v-else class="text-sm text-muted-foreground">观众签到页实时生效</span>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
