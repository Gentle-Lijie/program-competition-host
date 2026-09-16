<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
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

interface Performer {
  id: number;
  name: string;
  class: string;
  arrived: number;
  arrived_at: string | null;
}

const performers = ref<Performer[]>([]);
const search = ref('');
const message = ref('');

// 导入对话框
const importing = ref(false);
const csvPreview = ref<{ rows: RosterRow[]; errors: { line: number; message: string }[] } | null>(null);

async function load() {
  performers.value = await api('/api/admin/performers');
}
onMounted(load);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return performers.value;
  return performers.value.filter(
    (p) => p.name.toLowerCase().includes(q) || p.class.toLowerCase().includes(q),
  );
});

// 按班级分组（保持班级排序）
const groups = computed(() => {
  const map = new Map<string, Performer[]>();
  for (const p of filtered.value) {
    if (!map.has(p.class)) map.set(p.class, []);
    map.get(p.class)!.push(p);
  }
  return [...map.entries()].map(([cls, list]) => ({
    cls,
    list,
    arrived: list.filter((p) => p.arrived).length,
  }));
});

const total = computed(() => performers.value.length);
const arrivedTotal = computed(() => performers.value.filter((p) => p.arrived).length);

// 单个勾选（乐观更新，失败回滚）
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
    p.arrived = before;
  }
}

// 整班全到/全取消
async function markClass(cls: string, arrived: boolean, list: Performer[]) {
  list.forEach((p) => ((p.arrived = arrived ? 1 : 0), (p.arrived_at = arrived ? new Date().toLocaleString('sv-SE').slice(0, 19) : null)));
  try {
    await api(`/api/admin/performers/class/${encodeURIComponent(cls)}/arrived`, {
      method: 'PATCH',
      body: JSON.stringify({ arrived }),
    });
  } catch {
    load();
  }
}

async function remove(p: Performer) {
  if (!confirm(`从名单移除「${p.class} ${p.name}」？`)) return;
  await api(`/api/admin/performers/${p.id}`, { method: 'DELETE' });
  await load();
}

async function clearAll() {
  if (!confirm('确定清空整个名单？（签到进度将一并清除）')) return;
  await api('/api/admin/performers', { method: 'DELETE' });
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
      body: JSON.stringify({ rows: csvPreview.value.rows }),
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
      <h2 class="text-xl font-bold">表演者签到</h2>
      <Badge variant="secondary">已到 {{ arrivedTotal }} / {{ total }}</Badge>
      <div class="flex-1 min-w-40">
        <Input v-model="search" placeholder="搜索姓名或班级…" class="max-w-56" />
      </div>
      <Button variant="outline" @click="importing = true">导入名单</Button>
      <Button v-if="total" variant="outline" class="text-destructive" @click="clearAll">清空名单</Button>
    </div>

    <div v-if="message" class="text-sm text-muted-foreground">{{ message }}</div>

    <div v-if="!total" class="rounded-lg border bg-card p-10 text-center text-muted-foreground">
      名单为空，点「导入名单」上传 CSV（列序：<code>姓名, 班级</code>，支持表头自动识别与 Excel GBK 编码）
    </div>

    <div v-for="g in groups" :key="g.cls" class="rounded-lg border bg-card overflow-hidden">
      <div class="flex items-center gap-3 px-4 py-2.5 border-b bg-secondary/50">
        <span class="font-bold">{{ g.cls }}</span>
        <Badge :variant="g.arrived === g.list.length ? 'default' : 'secondary'" class="bg-brand text-primary-foreground">
          {{ g.arrived }} / {{ g.list.length }}
        </Badge>
        <div class="flex-1" />
        <Button
          v-if="g.arrived === g.list.length"
          variant="ghost" size="sm"
          @click="markClass(g.cls, false, g.list)"
        >全取消</Button>
        <Button v-else variant="ghost" size="sm" @click="markClass(g.cls, true, g.list)">全部到场</Button>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="p in g.list"
          :key="p.id"
          class="flex items-center gap-3 px-4 py-2 border-b border-r border-border/40 last:border-b-0"
        >
          <Switch :model-value="!!p.arrived" @update:model-value="(v) => toggle(p, v)" />
          <span class="flex-1 truncate" :class="p.arrived ? 'text-muted-foreground line-through' : ''">
            {{ p.name }}
          </span>
          <span v-if="p.arrived_at" class="text-xs text-muted-foreground tabular-nums">{{ p.arrived_at.slice(11) }}</span>
          <button class="text-xs text-muted-foreground hover:text-destructive" @click="remove(p)">✕</button>
        </div>
      </div>
    </div>

    <!-- 导入名单 -->
    <Dialog :open="importing" @update:open="(v) => (importing = v)">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导入表演者名单</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-2">
          <div class="text-sm text-muted-foreground">
            列序：<code>姓名, 班级</code>；首行为表头（含「姓名」「班级」）时自动按表头映射；支持 Excel GBK 编码；重复的人自动跳过。
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
                    <TableHead>班级</TableHead>
                    <TableHead>姓名</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(r, i) in csvPreview.rows.slice(0, 50)" :key="i">
                    <TableCell>{{ r.class }}</TableCell>
                    <TableCell>{{ r.name }}</TableCell>
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
