<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';
import { api } from '@/lib/api';
import { resolveState, type Program } from '@/lib/programState';
import { usePolling } from '@/composables/usePolling';
import { useNow } from '@/composables/useNow';

// 大屏唯一入口：基于 WONDERFUL_US.html 原版设计，动态呈现节目单（严格还原，背景固定原版）
const programs = usePolling<Program[]>(() => api('/api/programs'), 10_000);
const state = usePolling<{ override_id: number }>(() => api('/api/programs/state'), 5_000);

const now = useNow();
const currentId = computed(
  () => resolveState(programs.data ?? [], now.value, state.data?.override_id).current?.id ?? null,
);

function hhmm(p: Program) {
  return p.start_time.slice(11);
}

// 行内容自适应：
// 1) 高度方向：行多时整体缩基准字号（下限 40px），仍放不下则面板内滚动
// 2) 宽度方向：单行超宽自动缩字号，保证任何字不被截断（不省略号、不换行）
function fitRows() {
  const container = document.querySelector<HTMLElement>('.rows');
  if (!container) return;
  container.style.fontSize = '';
  const rowEls = [...container.querySelectorAll<HTMLElement>(':scope > .row')];
  if (!rowEls.length) return;

  // 高度自适应
  const cs = getComputedStyle(container);
  const gap = parseFloat(cs.rowGap) || 0;
  const availH = container.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const base = parseFloat(getComputedStyle(rowEls[0]).fontSize);
  const rcs = getComputedStyle(rowEls[0]);
  const perRow = parseFloat(rcs.lineHeight) + parseFloat(rcs.paddingTop) + parseFloat(rcs.paddingBottom) + gap;
  const needH = rowEls.length * perRow - gap;
  if (needH > availH && needH > 0) {
    container.style.fontSize = `${Math.max(40, Math.floor(base * (availH / needH)))}px`;
  }

  // 宽度自适应
  document.querySelectorAll<HTMLElement>('.row-inner').forEach((el) => {
    el.style.fontSize = '';
    const row = el.parentElement as HTMLElement;
    const avail = row.clientWidth;
    if (el.scrollWidth > avail && el.scrollWidth > 0) {
      const b = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = `${Math.max(24, Math.floor((b * avail) / el.scrollWidth))}px`;
      // 二次校正：吸收取整与亚像素偏差
      if (el.scrollWidth > avail) {
        const cur = parseFloat(el.style.fontSize);
        el.style.fontSize = `${Math.max(20, Math.floor((cur * avail) / el.scrollWidth))}px`;
      }
    }
  });
}

watch(() => programs.data, () => nextTick(fitRows));
onMounted(() => {
  fitRows();
  // 原版字体异步加载，加载完成前后各补测几次（回退字体与原版宽度不同）
  document.fonts?.ready.then(() => nextTick(fitRows));
  [300, 1000, 2500].forEach((ms) => setTimeout(fitRows, ms));
  window.addEventListener('resize', fitRows);
});
onBeforeUnmount(() => window.removeEventListener('resize', fitRows));
</script>

<template>
  <main class="slide" aria-label="WONDERFUL US 节目单">
    <div class="panel">
      <!-- 节目行在面板内部滚动 -->
      <div class="rows">
        <div
          v-for="p in programs.data ?? []"
          :key="p.id"
          class="row"
          :class="{ 'row--current': p.id === currentId }"
        >
          <div class="row-inner">
            <span class="code">{{ p.performer }}</span>
            <span class="song">{{ p.name }}</span>
            <span class="time">{{ hhmm(p) }}</span>
          </div>
        </div>
        <div v-if="!(programs.data ?? []).length" class="empty">暂无节目，请到后台添加</div>
      </div>
    </div>
    <img class="music" src="/assets/WONDERFUL_US_music.svg" alt="" aria-hidden="true" />
    <div class="bottom-art" aria-hidden="true"></div>

    <h1 class="title">WONDERFUL US</h1>
    <div class="program-label">节目单</div>
  </main>
</template>

<style>
/* 大屏页全局：body:has(.slide) 只在本页生效 */
body:has(.slide) {
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #111;
}
</style>

<style scoped>
.slide {
  position: relative;
  width: min(100vw, 177.777778vh);
  height: min(100vh, 56.25vw);
  overflow: hidden;
  container-type: size;
  background: #fff;
  isolation: isolate;
  background: url('/assets/WONDERFUL_US_background.png') center / 100% 100% no-repeat;
}

.panel {
  position: absolute;
  left: 3.7377%;
  top: 17.8273%;
  width: 92.4519%;
  height: 77.4975%;
  border-radius: 0.25%;
  background: rgba(255, 255, 255, 0.47843);
  z-index: 1;
}

.music {
  position: absolute;
  left: 27.4256%;
  top: 30%;
  width: 45.071%;
  height: 65.307%;
  opacity: 0.21999;
  z-index: 2;
  pointer-events: none;
}

.bottom-art {
  position: absolute;
  left: 0;
  top: 79.0123%;
  width: 100%;
  height: 20.9877%;
  background: url('/assets/WONDERFUL_US_bottom.png') 0 0 / 100% 100% no-repeat;
  z-index: 3;
  pointer-events: none;
}

.title {
  position: absolute;
  z-index: 4;
  margin: 0;
  left: 3.7377%;
  top: 4.3074%;
  width: 65.1397%;
  height: 17%;
  color: #2e6417;
  font-family: 'Broadway Engraved', serif;
  font-size: 6.393cqw;
  font-weight: 400;
  line-height: 1.4;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.program-label {
  position: absolute;
  z-index: 4;
  left: 66.3568%;
  top: 2.5427%;
  width: 24.8965%;
  height: 17.5474%;
  color: #2e6417;
  font-family: 'Wonderful Chinese Display', serif;
  font-size: 7.383cqw;
  font-weight: 400;
  line-height: 1.4;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== 节目行：面板内部滚动 ===== */
.rows {
  position: absolute;
  inset: 0;
  padding: 3.6% 0 2%;
  overflow-y: auto;
  scrollbar-width: none;
  display: flex;
  flex-direction: column;
  gap: 0.45em; /* 行与行的上下间距（随字号等比缩放） */
  font-size: 5cqw; /* 基准字号，行多时由 fitRows 整体缩小 */
}
.rows::-webkit-scrollbar {
  display: none;
}

.row {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center; /* 三字段拼成一组，整体水平居中 */
  padding: 0.22em 0; /* 行内上下留白 */
  color: #005300;
  font-family: 'Wonderful Chinese Black', sans-serif;
  font-size: 1.5em; /* 跟随 .rows 的基准字号 */
  font-weight: 400;
  line-height: 1;
  opacity: 0.82;
}
/* 当前行：高亮紧贴内容成一整块 */
.row--current {
  opacity: 1;
}
.row--current .row-inner {
  background: rgba(154, 218, 133, 0.32);
  border-radius: 0.6cqw;
  padding: 0.06em 0.6em;
}
.row-inner {
  display: flex;
  align-items: baseline;
  gap: 0.55em; /* em 单位：随缩放字号等比缩，保证 fit 计算精确 */
  white-space: nowrap;
  max-width: 100%;
}
.code,
.song,
.time {
  white-space: nowrap;
}
.time {
  font-variant-numeric: tabular-nums;
}

.empty {
  margin: auto;
  font-family: 'Wonderful Chinese Black', sans-serif;
  font-size: 0.75em;
  color: rgba(0, 83, 0, 0.5);
}
</style>
