<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import QRCode from 'qrcode';
import { api } from '@/lib/api';

// 独立签到屏：大二维码 + 签到码 + 轮换倒计时，可投在任意副屏
interface Config {
  code: string;
  rotate_seconds: number;
  updated_at: number;
  server_now: number;
  geo_required: boolean;
}

const config = ref<Config | null>(null);
const nowMs = ref(Date.now());
const clockOffset = ref(0); // 服务器时间 - 本地时间，消除两端时钟不一致
const dataUrl = ref('');

let pollTimer: ReturnType<typeof setInterval> | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;

async function load() {
  try {
    const c = await api<Config>('/api/checkin/config');
    clockOffset.value = c.server_now - Date.now();
    config.value = c;
    dataUrl.value = await QRCode.toDataURL(
      `${location.origin}/checkin?code=${c.code}`,
      { width: 640, margin: 2, color: { dark: '#1F2A16', light: '#FFFFFF' } },
    );
  } catch { /* 网络抖动，下个周期重试 */ }
}

onMounted(() => {
  load();
  pollTimer = setInterval(load, 3000); // 轮换开启时 3 秒内换上新码
  clockTimer = setInterval(() => (nowMs.value = Date.now()), 250);
});
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
  if (clockTimer) clearInterval(clockTimer);
});

// 按服务器时钟计算的"现在"
const serverNow = computed(() => nowMs.value + clockOffset.value);

const remaining = computed(() => {
  const c = config.value;
  if (!c || !c.rotate_seconds) return null;
  return Math.max(0, Math.ceil((c.updated_at + c.rotate_seconds * 1000 - serverNow.value) / 1000));
});

const barWidth = computed(() => {
  const c = config.value;
  if (!c || !c.rotate_seconds || !c.updated_at) return '100%';
  const frac = Math.min(
    1,
    Math.max(0, (c.updated_at + c.rotate_seconds * 1000 - serverNow.value) / (c.rotate_seconds * 1000)),
  );
  return `${(frac * 100).toFixed(1)}%`;
});
</script>

<template>
  <div class="cs-page">
    <h1 class="cs-title">扫码签到</h1>

    <div class="cs-qr-card">
      <img v-if="dataUrl" :src="dataUrl" alt="签到二维码" />
      <div v-else class="cs-loading">加载中…</div>
    </div>

    <div v-if="remaining !== null" class="cs-countdown">
      <div class="cs-countdown__track">
        <div class="cs-countdown__bar" :style="{ width: barWidth }"></div>
      </div>
      <span>{{ remaining > 0 ? `${remaining} 秒后自动换码` : '正在换码…' }}</span>
    </div>
    <div v-else class="cs-hint">二维码长期有效</div>

    <div v-if="config?.geo_required" class="cs-geo">📍 需在现场范围内签到</div>
  </div>
</template>

<style>
/* OBS 合成：整页透明 */
body:has(.cs-page) {
  background: transparent;
}
</style>

<style scoped>
.cs-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3vh;
  background: transparent; /* OBS 浏览器源直接抠像合成 */
  color: #1f2a16;
  padding: 4vh 4vw;
}
.cs-title {
  font-family: 'ZCOOL QingKe HuangYou', 'Noto Sans SC', sans-serif;
  font-size: 7vmin;
  font-weight: 400;
  letter-spacing: 0.12em;
  margin: 0;
  color: #1f2a16; /* 黑字 */
}
.cs-qr-card {
  background: #fff;
  border-radius: 3vmin;
  padding: 2.4vmin;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
}
.cs-qr-card img {
  display: block;
  width: 52vmin;
  height: 52vmin;
}
.cs-loading {
  width: 52vmin;
  height: 52vmin;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa78c;
  font-size: 3vmin;
}
.cs-countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2vmin;
  font-size: 2.6vmin;
  opacity: 0.9;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.65);
}
.cs-countdown__track {
  width: 40vmin;
  height: 0.8vmin;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}
.cs-countdown__bar {
  height: 100%;
  background: #9ada85;
  transition: width 0.3s linear;
}
.cs-hint {
  font-size: 2.6vmin;
  opacity: 0.7;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.65);
}
.cs-geo {
  font-size: 2.6vmin;
  opacity: 0.9;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.65);
}
</style>
