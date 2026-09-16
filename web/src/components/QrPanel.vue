<script setup lang="ts">
import QRCode from 'qrcode';
import { onMounted, ref, watch } from 'vue';

const props = defineProps<{ url: string; caption?: string }>();
const dataUrl = ref('');

async function render() {
  dataUrl.value = await QRCode.toDataURL(props.url, {
    width: 320,
    margin: 1,
    color: { dark: '#1F2A16', light: '#FFFFFF' },
  });
}

onMounted(render);
watch(() => props.url, render);
</script>

<template>
  <div class="qr-panel">
    <img v-if="dataUrl" :src="dataUrl" alt="签到二维码" />
    <div class="qr-panel__caption">{{ caption ?? '扫码签到' }}</div>
  </div>
</template>

<style scoped>
.qr-panel {
  background: #fff;
  border-radius: 20px;
  padding: 18px 22px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  box-shadow: 0 6px 24px rgba(46, 100, 23, 0.18);
}
.qr-panel img {
  width: 220px;
  height: 220px;
}
.qr-panel__caption {
  font-family: 'ZCOOL QingKe HuangYou', 'Noto Sans SC', sans-serif;
  font-size: 34px;
  color: #2e6417;
}
</style>
