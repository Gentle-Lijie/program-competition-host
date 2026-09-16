<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { parseRosterCsvFile, type RosterRow } from '@/lib/csv';

// 单个节目的表演者签到页：姓名 + 学号，一个一个勾
interface Performer {
  id: number;
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

// 导入对话框
const importing = ref(false);
const csvPreview = ref<{ rows: RosterRow[]; errors: { line: number; message: string }[] } | null>(null);

async function load() {
  const all = await api<{ id: number; name: string; performer: string; start_time: string }[]>(
    '/api/admin/programs/full',
  );
  program.value = all.find((p) => p.id === programId) ?? null;
  performers.value = await api(`/api/admin/performers?program_id=${programId}`);
  if (!program.value) {
    message.value = '节目不存在';
  }
}
onMounted(load);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return performers.value;
  return performers.value.filter(
    (p) => p.name.toLowerCase().includes(q) || p.student_no.toLowerCase().includes(q),
  );
});

const total = computed(() => performers.value.length);
const arrivedTotal = computed(() => performers.value.filter((p) => p.arrived).length);

async function toggle(p: Performer, arrived: boolean) {
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
  if (!confirm(`确定清空「${program.value?.name}」的名单？签到进度将一并清除`)) return;
  await api(`/api/admin/performers/program/${programId}`, { method: 'DELETE' });
  await load();
}

async function onCsvFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  csvPreview.value = await parseRosterCsvFile(file);
  (e.target as HTMLInputElement).value = '';
}

async function importCsv() {
  if (!csvPreview.value?.rows.length) return;
  try {
    const r = await api<{ inserted: number; errors: string[] }>('/api/admin/performers/batch', {
      method: 'POST',
      body: JSON.stringify({ program_id: programId, rows: csvPreview.value.rows }),
    });
    message.value = `导入 ${r.inserted} 人${r.errors.length ? `，跳过 ${r.errors.length} 人` : ''}`;
    csvPreview.value = null;
    importing.value = false;
    await load();
  } catch (e) {
    message.value = e instanceof Error ? e.message : '导入失败';
  }
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
      <Input v-if="total" v-model="search" placeholder="搜索姓名或学号…" class="max-w-52" />
    </div>
    <div v-if="program" class="text-sm text-muted-foreground">
      开始时间 {{ program.start_time }}
    </div>

    <div v-if="message" class="text-sm text-muted-foreground">{{ message }}</div>

    <div class="flex flex-wrap items-center gap-3">
      <Button variant="outline" @click="importing = true">导入名单</Button>
      <template v-if="total">
        <Button v-if="arrivedTotal === total" variant="outline" @click="markAll(false)">全部取消</Button>
        <Button v-else @click="markAll(true)">全部签到</Button>
        <Button variant="outline" class="text-destructive" @click="clearRoster">清空名单</Button>
      </template>
    </div>

    <div v-if="!total" class="rounded-lg border bg-card p-10 text-center text-muted-foreground">
      名单为空，点「导入名单」上传 CSV（列序：<code>姓名, 学号</code>，支持表头自动识别与 Excel GBK 编码）
    </div>

    <div v-else class="rounded-lg border bg-card overflow-hidden">
      <div class="grid sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="p in filtered"
          :key="p.id"
          class="flex items-center gap-3 px-4 py-2.5 border-b border-r border-border/40"
        >
          <Switch :model-value="!!p.arrived" @update:model-value="(v) => toggle(p, v)" />
          <div class="flex-1 min-w-0">
            <div class="truncate" :class="p.arrived ? 'text-muted-foreground line-through' : 'font-medium'">
              {{ p.name }}
            </div>
            <div v-if="p.student_no" class="text-xs text-muted-foreground tabular-nums">学号 {{ p.student_no }}</div>
          </div>
          <span v-if="p.arrived_at" class="text-xs text-muted-foreground tabular-nums">{{ p.arrived_at.slice(11) }}</span>
          <button class="text-xs text-muted-foreground hover:text-destructive" @click="remove(p)">✕</button>
        </div>
      </div>
      <div v-if="!filtered.length" class="p-8 text-center text-muted-foreground text-sm">没有匹配的人</div>
    </div>

    <!-- 导入名单 -->
    <Dialog :open="importing" @update:open="(v) => (importing = v)">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导入名单 · {{ program?.name }}</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-2">
          <div class="text-sm text-muted-foreground">
            列序：<code>姓名, 学号</code>；首行为表头（含「姓名」「学号」）时自动按表头映射；支持 Excel GBK 编码；重复的人自动跳过。
          </div>
          <input type="file" accept=".csv,text/csv" class="text-sm" @change="onCsvFile" />
          <div v-if="csvPreview" class="grid gap-2">
            <div class="text-sm">
              解析出 <b class="text-primary">{{ csvPreview.rows.length }}</b> 人
              <template v-if="csvPreview.errors.length">
                ，<b class="text-destructive">{{ csvPreview.errors.length }}</b> 行有误：
                <div v-for="e in csvPreview.errors.slice(0, 5)" :key="e.line" class="text-destructive">
                  第 {{ e.line }} 行：{{ e.message }}
                </div>
              </template>
            </div>
            <div class="max-h-56 overflow-auto rounded border text-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>学号</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(r, i) in csvPreview.rows.slice(0, 50)" :key="i">
                    <TableCell>{{ r.name }}</TableCell>
                    <TableCell class="tabular-nums">{{ r.student_no }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div v-if="csvPreview.rows.length > 50" class="px-3 py-2 text-muted-foreground">
                …仅预览前 50 人
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="importing = false">取消</Button>
          <Button :disabled="!csvPreview?.rows.length" @click="importCsv">
            导入 {{ csvPreview?.rows.length ?? 0 }} 人
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
