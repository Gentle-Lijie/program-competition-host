<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import type { Program } from '@/lib/programState';
import { useNow } from '@/composables/useNow';

interface FullProgram extends Program {
  arrived: number;
}

const programs = ref<FullProgram[]>([]);
const now = useNow();
const nowKey = computed(() => {
  const d = now.value;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
});

async function load() {
  programs.value = await api('/api/admin/programs/full');
}
onMounted(load);

async function toggle(p: FullProgram, arrived: boolean) {
  p.arrived = arrived ? 1 : 0; // 乐观更新
  try {
    await api(`/api/admin/programs/${p.id}/arrived`, {
      method: 'PATCH',
      body: JSON.stringify({ arrived }),
    });
  } catch {
    p.arrived = arrived ? 0 : 1; // 回滚
  }
}

const arrivedCount = computed(() => programs.value.filter((p) => p.arrived).length);
</script>

<template>
  <div class="grid gap-4">
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-bold">表演者签到</h2>
      <Badge variant="secondary">{{ arrivedCount }} / {{ programs.length }} 已到场</Badge>
      <div class="flex-1" />
      <Button variant="outline" size="sm" @click="load">刷新</Button>
    </div>

    <div class="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-44">开始时间</TableHead>
            <TableHead>节目名称</TableHead>
            <TableHead>表演者</TableHead>
            <TableHead class="w-28">状态</TableHead>
            <TableHead class="w-32 text-center">到场签到</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="!programs.length">
            <TableCell colspan="5" class="text-center text-muted-foreground py-10">暂无节目</TableCell>
          </TableRow>
          <TableRow v-for="p in programs" :key="p.id">
            <TableCell class="tabular-nums">
              {{ p.start_time }}
              <Badge v-if="p.start_time <= nowKey" variant="outline" class="ml-1">已开演</Badge>
            </TableCell>
            <TableCell class="font-medium">{{ p.name }}</TableCell>
            <TableCell>{{ p.performer }}</TableCell>
            <TableCell>
              <Badge v-if="p.arrived" class="bg-brand text-primary-foreground">已到场</Badge>
              <Badge v-else variant="outline">未到场</Badge>
            </TableCell>
            <TableCell class="text-center">
              <Switch :model-value="!!p.arrived" @update:model-value="(v) => toggle(p, v)" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
