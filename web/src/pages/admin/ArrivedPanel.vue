<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { useNow } from '@/composables/useNow';

// 表演者签到首页：列出所有节目，点击进入该节目的签到页
interface ProgramRow {
  id: number;
  name: string;
  performer: string;
  start_time: string;
  roster_total: number;
  roster_arrived: number;
}

const programs = ref<ProgramRow[]>([]);
const search = ref('');
const now = useNow();

async function load() {
  programs.value = await api('/api/admin/programs/full');
}
onMounted(load);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return programs.value;
  return programs.value.filter(
    (p) => p.name.toLowerCase().includes(q) || p.performer.toLowerCase().includes(q),
  );
});

const nowKey = computed(() => {
  const d = now.value;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
});
</script>

<template>
  <div class="grid gap-4">
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-bold">表演者签到</h2>
      <Badge variant="secondary">{{ programs.length }} 个节目</Badge>
      <div class="flex-1" />
      <Input v-model="search" placeholder="搜索节目或表演者…" class="max-w-56" />
    </div>

    <div class="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-44">开始时间</TableHead>
            <TableHead>节目名称</TableHead>
            <TableHead>表演者</TableHead>
            <TableHead class="w-36 text-center">签到进度</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="!filtered.length">
            <TableCell colspan="4" class="text-center text-muted-foreground py-10">暂无节目</TableCell>
          </TableRow>
          <TableRow v-for="p in filtered" :key="p.id" class="cursor-pointer" @click="$router.push(`/admin/arrived/${p.id}`)">
            <TableCell class="tabular-nums">
              {{ p.start_time }}
              <Badge v-if="p.start_time <= nowKey" variant="outline" class="ml-1">已开演</Badge>
            </TableCell>
            <TableCell class="font-medium">{{ p.name }}</TableCell>
            <TableCell>{{ p.performer }}</TableCell>
            <TableCell class="text-center">
              <Badge v-if="p.roster_total" :variant="p.roster_arrived === p.roster_total ? 'default' : 'secondary'" class="bg-brand text-primary-foreground">
                {{ p.roster_arrived }} / {{ p.roster_total }}
              </Badge>
              <span v-else class="text-muted-foreground text-sm">未导入名单</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
