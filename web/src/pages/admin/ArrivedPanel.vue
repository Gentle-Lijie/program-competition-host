<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { parseRosterCsvFile, type RosterRow } from '@/lib/csv';
import { useNow } from '@/composables/useNow';

// 表演者签到首页：节目列表 + 外层导入名单（自动识别节目并拆分）
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
const message = ref('');
const now = useNow();

// 导入对话框
const importing = ref(false);
const csvPreview = ref<{ rows: RosterRow[]; errors: { line: number; message: string }[] } | null>(null);

// 按节目汇总预览
const previewByProgram = computed(() => {
  const rows = csvPreview.value?.rows ?? [];
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.program, (map.get(r.program) ?? 0) + 1);
  return [...map.entries()];
});

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

async function onCsvFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  csvPreview.value = await parseRosterCsvFile(file);
  (e.target as HTMLInputElement).value = '';
}

async function importCsv() {
  if (!csvPreview.value?.rows.length) return;
  try {
    const r = await api<{ inserted: number; errors: string[]; by_program: { name: string; inserted: number }[] }>(
      '/api/admin/performers/batch',
      { method: 'POST', body: JSON.stringify({ rows: csvPreview.value.rows }) },
    );
    message.value =
      `共导入 ${r.inserted} 人，分配到 ${r.by_program.length} 个节目` +
      (r.errors.length ? `；${r.errors.length} 行跳过` : '');
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
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-bold">表演者签到</h2>
      <Badge variant="secondary">{{ programs.length }} 个节目</Badge>
      <div class="flex-1" />
      <Input v-model="search" placeholder="搜索节目或表演者…" class="max-w-56" />
      <Button variant="outline" @click="importing = true">导入名单</Button>
    </div>

    <div v-if="message" class="text-sm text-muted-foreground">{{ message }}</div>

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

    <!-- 外层导入：一份 CSV 自动拆分到各节目 -->
    <Dialog :open="importing" @update:open="(v) => (importing = v)">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导入名单（自动识别节目）</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-2">
          <div class="text-sm text-muted-foreground">
            四列：<code>节目, 班级, 姓名, 学号</code>；首行表头（含「节目」「姓名」）自动按表头映射；
            节目按名称匹配（忽略《》与空白）；支持 Excel GBK 编码；同节目重复的人自动跳过。
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
            <div v-if="previewByProgram.length" class="max-h-56 overflow-auto rounded border text-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>节目（识别后）</TableHead>
                    <TableHead class="w-24 text-right">人数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="[name, count] in previewByProgram" :key="name">
                    <TableCell>{{ name }}</TableCell>
                    <TableCell class="text-right tabular-nums">{{ count }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div class="px-3 py-2 text-muted-foreground">注：节目匹配在导入时完成，无法匹配的行会跳过并提示</div>
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
