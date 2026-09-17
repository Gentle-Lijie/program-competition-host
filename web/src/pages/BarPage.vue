<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import MarqueeText from '@/components/MarqueeText.vue';
import { api } from '@/lib/api';
import { resolveState, type Program } from '@/lib/programState';
import { usePolling } from '@/composables/usePolling';
import { useNow } from '@/composables/useNow';

// 大屏提示栏：固定底条，上方透明供 OBS 叠加
// 手动切台：→/N 下一个节目、← 上一个、R 回到自动（按时间）
const programs = usePolling<Program[]>(() => api('/api/programs'), 10_000);
const state = usePolling<{ override_id: number }>(() => api('/api/programs/state'), 5_000);
const now = useNow();
const hovered = ref(false);

const current = computed(
  () => resolveState(programs.data ?? [], now.value, state.data?.override_id).current,
);
const next = computed(
  () => resolveState(programs.data ?? [], now.value, state.data?.override_id).next,
);
const manual = computed(() => !!state.data?.override_id);

function label(p: Program | null): string {
  return p ? `${p.name} — 表演者：${p.performer}` : '暂无';
}
function clock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function advance() {
  await api('/api/programs/current/advance', { method: 'POST' });
  state.refresh();
}
async function back() {
  await api('/api/programs/current/back', { method: 'POST' });
  state.refresh();
}
async function resetAuto() {
  await api('/api/programs/current/override', { method: 'DELETE' });
  state.refresh();
}

// 键盘快捷键（OBS「交互」窗口或普通浏览器中生效，不会出现在采集画面里）
function onKeyDown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    advance();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    back();
  } else if (e.key === 'r' || e.key === 'R') {
    resetAuto();
  }
}
onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
</script>

<template>
  <div class="bar-page">
    <!-- 悬停才显示的切台控制（OBS 采集画面透明不可见） -->
    <div class="bar-ctrl" :class="{ 'bar-ctrl--on': hovered }" @mouseenter="hovered = true" @mouseleave="hovered = false">
      <span v-if="manual" class="bar-ctrl__badge">手动模式</span>
      <button class="bar-ctrl__btn" @click="back()">◀ 上一节</button>
      <button class="bar-ctrl__btn bar-ctrl__btn--main" @click="advance()">下一个节目 ▶</button>
      <button v-if="manual" class="bar-ctrl__btn" @click="resetAuto()">回到自动</button>
    </div>

    <div class="bar">
      <div class="bar__clock">{{ clock(now) }}</div>
      <div class="bar__side">
        <span class="bar__label">当前节目</span>
        <MarqueeText always>{{ label(current) }}</MarqueeText>
      </div>
      <div class="bar__divider"></div>
      <div class="bar__side">
        <span class="bar__label">下一节目</span>
        <MarqueeText>{{ label(next) }}</MarqueeText>
      </div>
    </div>
  </div>
</template>

<style>
/* OBS 合成：提示栏以外的整页透明 */
body:has(.bar-page) {
  background: transparent;
}
</style>

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

/* ===== 切台控制（悬停可见） ===== */
.bar-ctrl {
  position: fixed;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  z-index: 99;
}
.bar-ctrl--on {
  opacity: 1;
  pointer-events: auto;
}
.bar-ctrl__badge {
  background: #e6a700;
  color: #fff;
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 99px;
}
.bar-ctrl__btn {
  background: rgba(34, 34, 34, 0.85);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 14px;
  cursor: pointer;
}
.bar-ctrl__btn--main {
  background: #2e6417;
  border-color: #9ada85;
  font-weight: bold;
}
.bar-ctrl__btn:hover {
  filter: brightness(1.2);
}
</style>
