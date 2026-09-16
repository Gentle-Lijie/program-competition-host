<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { usePolling } from '@/composables/usePolling';

interface Checkin {
  id: number;
  name: string;
  affiliation: string;
  created_at: string;
}

interface CheckinsResp {
  total: number;
  page: number;
  pageSize: number;
  rows: Checkin[];
  byAffiliation: { affiliation: string; count: number }[];
}

const data = usePolling<CheckinsResp>(
  () => api('/api/admin/checkins?pageSize=20'),
  10_000,
);

async function clearAll() {
  if (!confirm('确定清空全部签到记录？此操作不可恢复。')) return;
  await api('/api/admin/checkins', { method: 'DELETE' });
  data.refresh();
}
</script>

<template>
  <div class="grid gap-4">
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-bold">观众签到</h2>
      <Badge variant="secondary">共 {{ data.data?.total ?? 0 }} 人</Badge>
      <div class="flex-1" />
      <Button variant="outline" size="sm" @click="data.refresh()">刷新</Button>
      <Button variant="outline" size="sm" class="text-destructive" @click="clearAll">清空记录</Button>
    </div>

    <div v-if="data.data?.byAffiliation?.length" class="flex flex-wrap gap-2">
      <Badge
        v-for="g in data.data.byAffiliation"
        :key="g.affiliation"
        variant="secondary"
        class="text-sm px-3 py-1"
      >
        {{ g.affiliation }} · {{ g.count }} 人
      </Badge>
    </div>

    <div class="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-20">#</TableHead>
            <TableHead>姓名</TableHead>
            <TableHead>班级 / 单位</TableHead>
            <TableHead class="w-44">签到时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="!data.data?.rows?.length">
            <TableCell colspan="4" class="text-center text-muted-foreground py-10">还没有人签到</TableCell>
          </TableRow>
          <TableRow v-for="c in data.data?.rows ?? []" :key="c.id">
            <TableCell class="text-muted-foreground">{{ c.id }}</TableCell>
            <TableCell class="font-medium">{{ c.name }}</TableCell>
            <TableCell>{{ c.affiliation }}</TableCell>
            <TableCell class="tabular-nums">{{ c.created_at }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <div v-if="(data.data?.total ?? 0) > (data.data?.rows?.length ?? 0)" class="text-sm text-muted-foreground">
      仅显示最近 {{ data.data?.rows?.length }} 条（每 10 秒自动刷新）
    </div>
  </div>
</template>
