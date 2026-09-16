<script setup lang="ts">
import { computed } from 'vue';
import MarqueeText from '@/components/MarqueeText.vue';
import { api } from '@/lib/api';
import { computeCurrentNext, type Program } from '@/lib/programState';
import { usePolling } from '@/composables/usePolling';
import { useNow } from '@/composables/useNow';

// 大屏提示栏：固定底条，上方透明供 OBS 叠加
const programs = usePolling<Program[]>(() => api('/api/programs'), 10_000);
const now = useNow();

const state = computed(() => computeCurrentNext(programs.data ?? [], now.value));

function label(p: Program | null): string {
  return p ? `${p.name} — 表演者：${p.performer}` : '暂无';
}
function clock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
</script>

<template>
  <div class="bar-page">
    <div class="bar">
      <div class="bar__clock">{{ clock(now) }}</div>
      <div class="bar__side">
        <span class="bar__label">当前节目</span>
        <MarqueeText>{{ label(state.current) }}</MarqueeText>
      </div>
      <div class="bar__divider"></div>
      <div class="bar__side">
        <span class="bar__label">下一节目</span>
        <MarqueeText>{{ label(state.next) }}</MarqueeText>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bar-page {
  width: 100vw;
  height: 100vh;
  position: relative;
  background: transparent; /* 供采集卡/OBS 抠像叠加 */
}
.bar {
  --bar-height: 10vh;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--bar-height);
  display: flex;
  align-items: center;
  gap: 3vw;
  padding: 0 2.5vw;
  background: rgba(34, 34, 34, 0.88);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.4);
  color: #fff;
  overflow: hidden;
}
.bar__clock {
  font-family: 'ZCOOL QingKe HuangYou', 'Noto Sans SC', sans-serif;
  font-size: calc(var(--bar-height) * 0.42);
  color: #c9f0a6;
  font-variant-numeric: tabular-nums;
  flex: none;
}
.bar__side {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}
.bar__label {
  opacity: 0.7;
  font-size: calc(var(--bar-height) * 0.32);
  margin-right: 1em;
  flex-shrink: 0;
}
.bar__side :deep(.marquee__text) {
  font-size: calc(var(--bar-height) * 0.42);
}
.bar__divider {
  width: 2px;
  height: 55%;
  background: rgba(255, 255, 255, 0.25);
  flex: none;
}
</style>
