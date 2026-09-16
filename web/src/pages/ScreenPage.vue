<script setup lang="ts">
import { computed } from 'vue';
import { api } from '@/lib/api';
import { computeCurrentNext, type Program } from '@/lib/programState';
import { usePolling } from '@/composables/usePolling';
import { useNow } from '@/composables/useNow';

// 大屏唯一入口：基于 WONDERFUL_US.html 原版设计，动态呈现节目单（严格还原，背景固定原版）
const programs = usePolling<Program[]>(() => api('/api/programs'), 10_000);

const now = useNow();
const currentId = computed(
  () => computeCurrentNext(programs.data ?? [], now.value).current?.id ?? null,
);

function hhmm(p: Program) {
  return p.start_time.slice(11);
}
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
          <span class="code">{{ p.performer }}</span>
          <span class="song">{{ p.name }}</span>
          <span class="time">{{ hhmm(p) }}</span>
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
  gap: 0.8%;
}
.rows::-webkit-scrollbar {
  display: none;
}

.row {
  position: relative;
  flex: 1 1 0;
  min-height: 9%;
  max-height: 12.2%;
  color: #005300;
  font-family: 'Wonderful Chinese Black', sans-serif;
  font-size: 3.97cqw;
  font-weight: 400;
  line-height: 1.4;
  opacity: 0.82;
}
.row--current {
  opacity: 1;
  background: rgba(154, 218, 133, 0.28);
  border-radius: 0.6cqw;
}
.code,
.song,
.time {
  position: absolute;
  top: 0;
  height: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.code {
  left: 16.25%;
  width: 22.58%;
  text-align: center;
}
.song {
  left: 35.24%;
  width: 17.76%;
  text-align: left;
}
.time {
  left: 51.63%;
  width: 35.29%;
  text-align: left;
  font-variant-numeric: tabular-nums;
}

.empty {
  margin: auto;
  font-family: 'Wonderful Chinese Black', sans-serif;
  font-size: 3cqw;
  color: rgba(0, 83, 0, 0.5);
}
</style>
