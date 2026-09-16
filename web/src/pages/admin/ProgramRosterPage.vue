<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';

// 单个节目的表演者签到页：按「表演者=班级代码」从全局名单匹配，班级分组表格逐个签到
interface Performer {
  id: number;
  class: string;
  name: string;
  student_no: string;
  arrived: number;
  arrived_at: string | null;
}

const route = useRoute();
const router = useRouter();
const programId = Number(route.params.programId);

const program = ref<{ id: number; name: string; performer: string; start_time: string } | null>(null);
const performers = ref<Performer[]>([]);
const search = ref('');
const message = ref('');

// 节目表演者字段 → 班级列表（"BDMA2601+MS2601" → 两个班）
function classesOf(performer: string): string[] {
  return performer.split(/[+\s、，,]+/).map((s) => s.trim()).filter(Boolean);
}

async function load() {
  const all = await api<{ id: number; name: string; performer: string; start_time: string }[]>(
    '/api/admin/programs/full',
  );
  program.value = all.find((p) => p.id === programId) ?? null;
  if (program.value) {
    const classes = classesOf(program.value.performer);
    performers.value = classes.length
      ? await api(`/api/admin/performers?classes=${encodeURIComponent(classes.join(','))}`)
      : [];
  }
}
onMounted(load);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return performers.value;
  return performers.value.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.student_no.toLowerCase().includes(q) ||
      p.class.toLowerCase().includes(q),
  );
});

// 表格数据：班级分组头行 + 成员行
const tableRows = computed(() => {
  const out: Array<
    { kind: 'group'; key: string; class: string; total: number; arrived: number } |
    { kind: 'person'; key: string; p: Performer }
  > = [];
  let lastClass: string | null = null;
  let group: Performer[] = [];
  const flush = () => {
    if (!group.length) return;
    out.push({
      kind: 'group',
      key: `g-${lastClass}`,
      class: lastClass || '未分班',
      total: group.length,
      arrived: group.filter((p) => p.arrived).length,
    });
    for (const p of group) out.push({ kind: 'person', key: `p-${p.id}`, p });
    group = [];
  };
  for (const p of filtered.value) {
    if (p.class !== lastClass) {
      flush();
      lastClass = p.class;
    }
    group.push(p);
  }
  flush();
  return out;
});

const total = computed(() => performers.value.length);
const arrivedTotal = computed(() => performers.value.filter((p) => p.arrived).length);

async function toggle(p: Performer) {
  const arrived = !p.arrived;
  const before = p.arrived;
  p.arrived = arrived ? 1 : 0;
  p.arrived_at = arrived ? new Date().toLocaleString('sv-SE').slice(0, 19) : null;
  try {
    await api(`/api/admin/performers/${p.id}/arrived`, {
      method: 'PATCH',
      body: JSON.stringify({ arrived }),
    });
  } catch {
    p.arrived = before; // 回滚
  }
}

async function markAll(arrived: boolean) {
  performers.value.forEach((p) => {
    p.arrived = arrived ? 1 : 0;
    p.arrived_at = arrived ? new Date().toLocaleString('sv-SE').slice(0, 19) : null;
  });
  try {
    await api(`/api/admin/performers/program/${programId}/arrived`, {
      method: 'PATCH',
      body: JSON.stringify({ arrived }),
    });
  } catch {
    load();
  }
}

async function remove(p: Performer) {
  if (!confirm(`从名单移除「${p.name}」？`)) return;
  await api(`/api/admin/performers/${p.id}`, { method: 'DELETE' });
  await load();
}

async function clearRoster() {
  const classes = program.value ? classesOf(program.value.performer).join('、') : '';
  if (!confirm(`确定删除班级 ${classes} 的全部名单？这是全局删除，其他节目也会受影响`)) return;
  await api(`/api/admin/performers/program/${programId}`, { method: 'DELETE' });
  await load();
}
</script>

<template>
  <div class="grid gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="ghost" size="sm" @click="router.push('/admin/arrived')">← 全部节目</Button>
      <h2 class="text-xl font-bold">{{ program?.name ?? '…' }}</h2>
      <Badge v-if="program" variant="outline">{{ program.performer }}</Badge>
      <Badge v-if="total" variant="secondary">已签到 {{ arrivedTotal }} / {{ total }}</Badge>
      <div class="flex-1" />
      <Input v-if="total" v-model="search" placeholder="搜索姓名/学号/班级…" class="max-w-52" />
    </div>
    <div v-if="program" class="text-sm text-muted-foreground">开始时间 {{ program.start_time }}</div>

    <div v-if="message" class="text-sm text-muted-foreground">{{ message }}</div>

    <div v-if="total" class="flex flex-wrap items-center gap-3">
      <Button v-if="arrivedTotal === total" variant="outline" @click="markAll(false)">全部取消</Button>
      <Button v-else @click="markAll(true)">全部签到</Button>
      <Button variant="outline" class="text-destructive" @click="clearRoster">删除班级名单</Button>
    </div>

    <div v-if="!total" class="rounded-lg border bg-card p-10 text-center text-muted-foreground">
      没有匹配的名单：请在「全部节目」页用「导入名单」上传含
      <code>{{ program?.performer }}</code> 班级的名单（<code>班级, 姓名, 学号</code>）
    </div>

    <div v-else class="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-32">班级</TableHead>
            <TableHead class="w-40">学号</TableHead>
            <TableHead>姓名</TableHead>
            <TableHead class="w-28 text-center">状态</TableHead>
            <TableHead class="w-32">签到时间</TableHead>
            <TableHead class="w-24 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-for="row in tableRows" :key="row.key">
            <!-- 班级分组头行 -->
            <tr v-if="row.kind === 'group'" class="bg-secondary/50">
              <td colspan="6" class="px-4 py-1.5 font-bold text-sm">
                {{ row.class }}
                <Badge variant="outline" class="ml-2">{{ row.arrived }} / {{ row.total }}</Badge>
              </td>
            </tr>
            <!-- 成员行 -->
            <TableRow v-else>
              <TableCell class="text-muted-foreground">{{ row.p.class }}</TableCell>
              <TableCell class="tabular-nums">{{ row.p.student_no }}</TableCell>
              <TableCell class="font-medium">{{ row.p.name }}</TableCell>
              <TableCell class="text-center">
                <Badge v-if="row.p.arrived" class="bg-brand text-primary-foreground">已签到</Badge>
                <Badge v-else variant="outline">未签到</Badge>
              </TableCell>
              <TableCell class="text-muted-foreground tabular-nums">{{ row.p.arrived_at?.slice(11) ?? '—' }}</TableCell>
              <TableCell class="text-right">
                <Button variant="ghost" size="sm" :class="row.p.arrived ? 'text-destructive' : 'text-primary'" @click="toggle(row.p)">
                  {{ row.p.arrived ? '取消' : '签到' }}
                </Button>
                <Button variant="ghost" size="sm" class="text-muted-foreground" @click="remove(row.p)">移除</Button>
              </TableCell>
            </TableRow>
          </template>
          <TableRow v-if="!tableRows.length">
            <TableCell colspan="6" class="text-center text-muted-foreground py-10">没有匹配的人</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
