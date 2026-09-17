<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { resolveState, type Program } from '@/lib/programState';
import { usePolling } from '@/composables/usePolling';
import { useNow } from '@/composables/useNow';

// 切台控制：独立的当前/下一节目管理页（手动推进晚会进程）
const programs = usePolling<Program[]>(() => api('/api/programs'), 10_000);
const state = usePolling<{ override_id: number }>(() => api('/api/programs/state'), 3_000);
const now = useNow();

const current = computed(
  () => resolveState(programs.data ?? [], now.value, state.data?.override_id).current,
);
const next = computed(
  () => resolveState(programs.data ?? [], now.value, state.data?.override_id).next,
);
const manual = computed(() => !!state.data?.override_id);

const list = computed(() =>
  [...(programs.data ?? [])].sort((a, b) => a.start_time.localeCompare(b.start_time)),
);
const progress = computed(() => {
  if (!current.value) return '—';
  const idx = list.value.findIndex((p) => p.id === current.value!.id);
  return `${idx + 1} / ${list.value.length}`;
});

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
</script>

<template>
  <div class="grid gap-6">
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-bold">切台控制</h2>
      <Badge v-if="manual" class="bg-amber-500 text-white">手动模式</Badge>
      <Badge v-else variant="secondary">自动（按时间）</Badge>
      <div class="flex-1" />
      <Badge variant="outline">进度 {{ progress }}</Badge>
    </div>

    <div class="grid sm:grid-cols-2 gap-4">
      <div class="rounded-lg border bg-card p-6">
        <div class="text-sm text-muted-foreground mb-1">当前节目</div>
        <div class="text-2xl font-bold">{{ current?.name ?? '（未开始）' }}</div>
        <div class="text-muted-foreground mt-1">{{ current?.performer }} · {{ current?.start_time }}</div>
      </div>
      <div class="rounded-lg border bg-card p-6">
        <div class="text-sm text-muted-foreground mb-1">下一节目</div>
        <div class="text-2xl font-bold">{{ next?.name ?? '（没有了）' }}</div>
        <div class="text-muted-foreground mt-1">{{ next?.performer }} · {{ next?.start_time }}</div>
      </div>
    </div>

    <div class="flex flex-wrap gap-4">
      <Button size="lg" variant="outline" class="h-14 px-8 text-lg" @click="back()">◀ 上一节</Button>
      <Button size="lg" class="h-14 px-10 text-lg" @click="advance()">下一个节目 ▶</Button>
      <Button v-if="manual" size="lg" variant="outline" class="h-14 px-8 text-lg" @click="resetAuto()">
        回到自动
      </Button>
    </div>

    <p class="text-sm text-muted-foreground">
      「下一个节目」同时作用于大屏高亮与提示栏；「回到自动」恢复按开始时间流转。
    </p>
  </div>
</template>
